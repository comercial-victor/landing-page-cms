// importToSanity.ts
// Ejecuta mutaciones en Sanity usando el cliente autenticado del Studio.
// Solo corre dentro de Sanity Studio — nunca expuesto públicamente.

import type { SanityClient } from "sanity";
import type {
  NormalizedCatalog,
  NormalizedCategoria,
  NormalizedSubcategoria,
  NormalizedProducto,
} from "./normalizeCatalogRows";

export interface ImportProgress {
  step: "categorias" | "subcategorias" | "productos" | "imagenes" | "done";
  current: number;
  total: number;
  message: string;
}

export interface ImportSummary {
  categorias: { created: number; updated: number; errors: number };
  subcategorias: { created: number; updated: number; errors: number };
  productos: { created: number; updated: number; errors: number; imageWarnings: number };
}

type ProgressCallback = (progress: ImportProgress) => void;

// ── Upload image from URL ────────────────────────────────────────
async function uploadImageFromUrl(
  client: SanityClient,
  url: string
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const filename = url.split("/").pop() || "image.jpg";
    const asset = await client.assets.upload("image", blob, { filename });
    return {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
    };
  } catch {
    return null;
  }
}

// ── Check if document exists ─────────────────────────────────────
async function docExists(client: SanityClient, id: string): Promise<boolean> {
  const doc = await client.fetch(`*[_id == $id][0]._id`, { id });
  return !!doc;
}

// ── Import categorías ─────────────────────────────────────────────
async function importCategorias(
  client: SanityClient,
  categorias: NormalizedCategoria[],
  onProgress: ProgressCallback
): Promise<{ created: number; updated: number; errors: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < categorias.length; i++) {
    const cat = categorias[i];
    onProgress({
      step: "categorias",
      current: i + 1,
      total: categorias.length,
      message: `Importando categoría: ${cat.nombre}`,
    });

    try {
      const exists = await docExists(client, cat._id);
      const doc = {
        _id: cat._id,
        _type: "categoria",
        nombre: cat.nombre,
        slug: cat.slug,
        color: cat.color,
        ...(cat.descripcion ? { descripcion: cat.descripcion } : {}),
        orden: cat.orden,
        activo: cat.activo,
      };

      await client.createOrReplace(doc);
      if (exists) updated++; else created++;
    } catch (err) {
      console.error(`Error importando categoría ${cat.nombre}:`, err);
      errors++;
    }
  }

  return { created, updated, errors };
}

// ── Import subcategorías ──────────────────────────────────────────
async function importSubcategorias(
  client: SanityClient,
  subcategorias: NormalizedSubcategoria[],
  onProgress: ProgressCallback
): Promise<{ created: number; updated: number; errors: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < subcategorias.length; i++) {
    const sub = subcategorias[i];
    onProgress({
      step: "subcategorias",
      current: i + 1,
      total: subcategorias.length,
      message: `Importando subcategoría: ${sub.nombre}`,
    });

    try {
      const exists = await docExists(client, sub._id);
      const doc = {
        _id: sub._id,
        _type: "subcategoria",
        nombre: sub.nombre,
        slug: sub.slug,
        categoria: {
          _type: "reference",
          _ref: `categoria-${sub.categoriaSlug}`,
        },
        orden: sub.orden,
        activo: sub.activo,
      };

      await client.createOrReplace(doc);
      if (exists) updated++; else created++;
    } catch (err) {
      console.error(`Error importando subcategoría ${sub.nombre}:`, err);
      errors++;
    }
  }

  return { created, updated, errors };
}

// ── Import productos ──────────────────────────────────────────────
async function importProductos(
  client: SanityClient,
  productos: NormalizedProducto[],
  onProgress: ProgressCallback
): Promise<{ created: number; updated: number; errors: number; imageWarnings: number }> {
  let created = 0;
  let updated = 0;
  let errors = 0;
  let imageWarnings = 0;

  for (let i = 0; i < productos.length; i++) {
    const prod = productos[i];
    onProgress({
      step: "productos",
      current: i + 1,
      total: productos.length,
      message: `Importando producto: ${prod.nombre}`,
    });

    try {
      const exists = await docExists(client, prod._id);

      // Intentar subir imágenes
      const imagenes: Array<{ _type: "image"; _key: string; asset: { _type: "reference"; _ref: string } }> = [];
      if (prod.imagenesUrls && prod.imagenesUrls.length > 0) {
        onProgress({
          step: "imagenes",
          current: i + 1,
          total: productos.length,
          message: `Subiendo imágenes de: ${prod.nombre}`,
        });

        for (let imgIdx = 0; imgIdx < prod.imagenesUrls.length; imgIdx++) {
          const url = prod.imagenesUrls[imgIdx];
          try {
            const uploaded = await uploadImageFromUrl(client, url);
            if (uploaded) {
              imagenes.push({ ...uploaded, _key: `img-${imgIdx}` });
            } else {
              imageWarnings++;
            }
          } catch {
            imageWarnings++;
          }
        }
      }

      const doc: Record<string, unknown> = {
        _id: prod._id,
        _type: "producto",
        nombre: prod.nombre,
        slug: prod.slug,
        tipo: prod.tipo,
        subcategoria: {
          _type: "reference",
          _ref: `subcategoria-${prod.subcategoriaSlug}`,
        },
        precioDesde: prod.precioDesde,
        stock: prod.stock,
        destacado: prod.destacado,
        activo: prod.activo,
        orden: prod.orden,
        mostrarAhorroPack: prod.mostrarAhorroPack,
      };

      // Campos opcionales (no incluir si están vacíos)
      if (prod.descripcion) doc.descripcion = prod.descripcion;
      if (prod.detalles && prod.detalles.length > 0) doc.detalles = prod.detalles;
      if (prod.precio !== null && prod.precio !== undefined) doc.precio = prod.precio;
      if (prod.unidadVenta) doc.unidadVenta = prod.unidadVenta;
      if (prod.tags && prod.tags.length > 0) doc.tags = prod.tags;
      if (prod.whatsappMensaje) doc.whatsappMensaje = prod.whatsappMensaje;
      if (imagenes.length > 0) doc.imagenes = imagenes;

      await client.createOrReplace(doc);
      if (exists) updated++; else created++;
    } catch (err) {
      console.error(`Error importando producto ${prod.nombre}:`, err);
      errors++;
    }
  }

  return { created, updated, errors, imageWarnings };
}

// ── Main import function ──────────────────────────────────────────
export async function importCatalogToSanity(
  client: SanityClient,
  catalog: NormalizedCatalog,
  onProgress: ProgressCallback
): Promise<ImportSummary> {
  // 1. Categorías primero (las subcategorías las necesitan)
  const catResult = await importCategorias(client, catalog.categorias, onProgress);

  // 2. Subcategorías (los productos las necesitan)
  const subResult = await importSubcategorias(client, catalog.subcategorias, onProgress);

  // 3. Productos
  const prodResult = await importProductos(client, catalog.productos, onProgress);

  onProgress({
    step: "done",
    current: catalog.productos.length,
    total: catalog.productos.length,
    message: "Importación completada",
  });

  return {
    categorias: catResult,
    subcategorias: subResult,
    productos: prodResult,
  };
}
