import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImage } from "@/types";

// IMPORTANTE: useCdn: false para que la revalidación por webhook funcione correctamente.
// Con useCdn: true, Sanity puede devolver datos cacheados del CDN aunque Next.js revalide,
// haciendo que los cambios de texto no se reflejen hasta otra acción.
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-24",
  useCdn: false, // ← obligatorio para revalidación por webhook
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImage) {
  return builder.image(source);
}
