import type { MetadataRoute } from "next";
import { sanityClient } from "@/lib/sanity";
import { getColeccionSlugs, getProductoSlugs } from "@/lib/queries";
import { demoCollectionDefinitions } from "@/lib/collections";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

type UpdatedRow = {
  _updatedAt?: string;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let catalogLastModified = now;
  const [collectionSlugs, productSlugs] = await Promise.all([
    getColeccionSlugs(),
    getProductoSlugs(),
  ]);
  const demoSlugs = demoCollectionDefinitions.map((collection) => collection.slug);
  const allCollectionSlugs = Array.from(new Set([...collectionSlugs, ...demoSlugs]));

  try {
    const latestCatalogChange = await sanityClient.fetch<UpdatedRow | null>(
      `*[_type in ["producto", "categoria", "subcategoria"]]|order(_updatedAt desc)[0]{_updatedAt}`,
      {},
      { next: { tags: ["producto", "categoria", "subcategoria"] } }
    );

    if (latestCatalogChange?._updatedAt) {
      catalogLastModified = new Date(latestCatalogChange._updatedAt);
    }
  } catch {
    catalogLastModified = now;
  }

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/catalog`,
      lastModified: catalogLastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...allCollectionSlugs.map((slug) => ({
      url: `${siteUrl}/${slug}`,
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...productSlugs.map((slug) => ({
      url: `${siteUrl}/producto/${slug}`,
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ];
}
