import "server-only";
import { createClient } from "@sanity/client";

const sanityReadToken =
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_READ_TOKEN ||
  process.env.SANITY_TOKEN;

export const hasSanityReadToken = Boolean(sanityReadToken);

// Cliente SOLO para Server Components, Route Handlers y metadata.
// Si el Studio/Vision autenticado ve más documentos que la web pública,
// un token de lectura permite que el sitio lea el mismo contenido publicado.
export const sanityServerClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-24",
  useCdn: false,
  perspective: "published",
  ...(sanityReadToken ? { token: sanityReadToken } : {}),
});
