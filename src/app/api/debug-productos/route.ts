import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const publicProductFilter = `
  _type == "producto" &&
  visible != false &&
  !(_id in path("drafts.**")) &&
  !(_id in path("versions.**")) &&
  !(_id in path("producto.migrated.**"))
`;

const privateMigratedProductFilter = `
  _type == "producto" &&
  _id in path("producto.migrated.**")
`;

const productCountQuery = `count(*[${publicProductFilter}])`;
const privateMigratedCountQuery = `count(*[${privateMigratedProductFilter}])`;

const categoryCountQuery = `
  *[
    _type == "categoria"
  ] | order(orden asc) {
    nombre,
    "cantidad": count(*[
      ${publicProductFilter} &&
      subcategoria->categoria._ref == ^._id
    ])
  }
`;

export async function GET() {
  const actualConfig = sanityClient.config();

  const clientActual = sanityClient.withConfig({
    useCdn: false,
  });

  const clientPublished2025 = sanityClient.withConfig({
    apiVersion: "2025-02-19",
    useCdn: false,
    perspective: "published",
  });

  const clientPublished2026 = sanityClient.withConfig({
    apiVersion: "2026-04-24",
    useCdn: false,
    perspective: "published",
  });

  const [
    totalActual,
    totalPublished2025,
    totalPublished2026,
    privateMigratedActual,
    categoriasActual,
    categoriasPublished2025,
    categoriasPublished2026,
  ] = await Promise.all([
    clientActual.fetch(productCountQuery),
    clientPublished2025.fetch(productCountQuery),
    clientPublished2026.fetch(productCountQuery),
    clientActual.fetch(privateMigratedCountQuery),
    clientActual.fetch(categoryCountQuery),
    clientPublished2025.fetch(categoryCountQuery),
    clientPublished2026.fetch(categoryCountQuery),
  ]);

  return NextResponse.json({
    env: {
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
      apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    },
    sanityClientConfig: {
      projectId: actualConfig.projectId,
      dataset: actualConfig.dataset,
      apiVersion: actualConfig.apiVersion,
      useCdn: actualConfig.useCdn,
      perspective: actualConfig.perspective,
    },
    counts: {
      totalActual,
      totalPublished2025,
      totalPublished2026,
      privateMigratedActual,
    },
    categorias: {
      actual: categoriasActual,
      published2025: categoriasPublished2025,
      published2026: categoriasPublished2026,
    },
  });
}