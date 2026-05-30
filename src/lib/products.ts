import type { ProductoFlat } from "@/types";

const PRODUCT_SLUG_MAX_LENGTH = 96;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function productIdSuffix(value?: string) {
  const compact = slugify(value || "").replace(/^prod-?/i, "").replace(/^producto-?/i, "").replace(/-/g, "");
  if (!compact) return "";
  return /^[a-z]/.test(compact) ? compact : `p${compact}`;
}

function fallbackProductSlug(producto: Pick<ProductoFlat, "_id" | "idExcel" | "nombre">) {
  const suffix = productIdSuffix(producto.idExcel || producto._id);
  const base = slugify(producto.nombre);

  if (!suffix) return base.slice(0, PRODUCT_SLUG_MAX_LENGTH);

  const safeBase = base
    .slice(0, Math.max(1, PRODUCT_SLUG_MAX_LENGTH - suffix.length - 1))
    .replace(/-+$/g, "");

  return `${safeBase}-${suffix}`;
}

export function productPath(
  producto: Pick<ProductoFlat, "_id" | "idExcel" | "slug" | "nombre">,
  options?: { collectionSlug?: string },
) {
  const slug = producto.slug?.current || fallbackProductSlug(producto);
  const path = `/producto/${slug}`;
  return options?.collectionSlug
    ? `${path}?coleccion=${encodeURIComponent(options.collectionSlug)}`
    : path;
}
