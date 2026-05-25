import type { Collection, ProductoFlat } from "@/types";

export const demoCollectionDefinitions = [
  {
    _id: "demo-collection-halloween",
    titulo: "Halloween",
    subtitulo: "Ideas para armar una vitrina, mesa o fiesta con un toque misterioso y divertido.",
    etiqueta: "Temporada",
    slug: "halloween",
    themeColor: "#8B3FD1",
    keywords: ["halloween", "fiesta", "infantil", "globo", "decoracion", "metalizado"],
  },
  {
    _id: "demo-collection-dia-del-padre",
    titulo: "Día del Padre",
    subtitulo: "Detalles, arreglos y propuestas listas para sorprender sin complicarse.",
    etiqueta: "Regalos",
    slug: "dia-del-padre",
    themeColor: "#2F6EB8",
    keywords: ["padre", "regalo", "metalizado", "globo", "popular", "detalle"],
  },
  {
    _id: "demo-collection-fiestas-patrias",
    titulo: "Fiestas Patrias",
    subtitulo: "Rojo, blanco y celebración: productos para decorar, compartir y ambientar.",
    etiqueta: "Perú",
    slug: "fiestas-patrias",
    themeColor: "#D23838",
    keywords: ["patrias", "peru", "rojo", "blanco", "fiesta", "manualidades", "escolar"],
  },
] as const;

export function collectionPath(collection: Pick<Collection, "slug" | "titulo">) {
  return `/${collection.slug?.current || slugifyCollection(collection.titulo)}`;
}

export function slugifyCollection(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildDemoCollections(productos: ProductoFlat[]): Collection[] {
  return demoCollectionDefinitions.map((definition) => {
    const picked = pickProductsForDemo(productos, definition.keywords);

    return {
      _id: definition._id,
      titulo: definition.titulo,
      subtitulo: definition.subtitulo,
      etiqueta: definition.etiqueta,
      slug: { current: definition.slug },
      themeColor: definition.themeColor,
      visible: true,
      orden: 999,
      items: picked.map((producto) => ({
        _key: `${definition.slug}-${producto._id}`,
        producto,
        visible: true,
      })),
    };
  }).filter((collection) => collection.items.length > 0);
}

export function buildDemoCollectionBySlug(slug: string, productos: ProductoFlat[]) {
  return buildDemoCollections(productos).find((collection) => collection.slug?.current === slug) || null;
}

function pickProductsForDemo(productos: ProductoFlat[], keywords: readonly string[]) {
  const normalizedKeywords = keywords.map(normalize);
  const scored = productos
    .filter((producto) => producto.visible !== false)
    .map((producto) => {
      const haystack = normalize([
        producto.nombre,
        producto.descripcion,
        producto.marca,
        producto._categoria,
        producto._subcategoria,
        ...(producto.tags || []),
      ].filter(Boolean).join(" "));
      const score = normalizedKeywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { producto, score };
    })
    .sort((a, b) => b.score - a.score);

  const withMatches = scored.filter((item) => item.score > 0).slice(0, 8).map((item) => item.producto);
  if (withMatches.length >= 4) return withMatches;

  const fallback = scored.map((item) => item.producto);
  return [...withMatches, ...fallback.filter((producto) => !withMatches.some((item) => item._id === producto._id))].slice(0, 8);
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}
