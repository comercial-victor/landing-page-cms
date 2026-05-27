import type { ProductoFlat } from "@/types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function productPath(producto: Pick<ProductoFlat, "slug" | "nombre">) {
  const slug = producto.slug?.current || slugify(producto.nombre);
  return `/producto/${slug}`;
}
