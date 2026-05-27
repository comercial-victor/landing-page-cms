import type { MetadataRoute } from "next";
import { sanityClient } from "@/lib/sanity";

export const revalidate = 3600;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://comercial-victor.com").replace(/\/$/, "");

type SitemapRow = {
  slug: string;
  updatedAt?: string;
};

type UpdatedRow = {
  _updatedAt?: string;
};

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getProductosParaSitemap(): Promise<SitemapRow[]> {
  return sanityClient.fetch<SitemapRow[]>(
    `*[
      _type == "producto" &&
      visible != false &&
      defined(slug.current) &&
      !(_id in path("drafts.**")) &&
      !(_id in path("versions.**")) &&
      !(_id in path("producto.migrated.**"))
    ] | order(_updatedAt desc) {
      "slug": slug.current,
      "updatedAt": _updatedAt
    }`,
    {},
    { next: { tags: ["producto"], revalidate: 3600 } }
  );
}

async function getColeccionesParaSitemap(): Promise<SitemapRow[]> {
  return sanityClient.fetch<SitemapRow[]>(
    `*[
      _type == "album" &&
      visible != false &&
      defined(slug.current) &&
      !(_id in path("drafts.**")) &&
      !(_id in path("versions.**")) &&
      !(_id in path("producto.migrated.**")) &&
      count(items[visible != false && producto->visible != false]) > 0
    ] | order(_updatedAt desc) {
      "slug": slug.current,
      "updatedAt": _updatedAt
    }`,
    {},
    { next: { tags: ["album", "producto"], revalidate: 3600 } }
  );
}

async function getLastModified(types: string[]): Promise<Date | undefined> {
  try {
    const latestChange = await sanityClient.fetch<UpdatedRow | null>(
      `*[
        _type in $types &&
        !(_id in path("drafts.**")) &&
      !(_id in path("versions.**")) &&
      !(_id in path("producto.migrated.**"))
      ] | order(_updatedAt desc)[0] {
        _updatedAt
      }`,
      { types },
      { next: { tags: types, revalidate: 3600 } }
    );

    return toDate(latestChange?._updatedAt);
  } catch {
    return undefined;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productos, colecciones, catalogLastModified, collectionsLastModified] = await Promise.all([
    getProductosParaSitemap(),
    getColeccionesParaSitemap(),
    getLastModified(["producto", "categoria", "subcategoria"]),
    getLastModified(["album", "producto"]),
  ]);

  return [
    {
      url: `${siteUrl}/`,
      lastModified: catalogLastModified,
    },
    {
      url: `${siteUrl}/catalog`,
      lastModified: catalogLastModified,
    },
    {
      url: `${siteUrl}/colecciones`,
      lastModified: collectionsLastModified,
    },
    ...colecciones.map((coleccion) => ({
      url: `${siteUrl}/colecciones/${coleccion.slug}`,
      lastModified: toDate(coleccion.updatedAt) || collectionsLastModified,
    })),
    ...productos.map((producto) => ({
      url: `${siteUrl}/producto/${producto.slug}`,
      lastModified: toDate(producto.updatedAt) || catalogLastModified,
    })),
  ];
}
