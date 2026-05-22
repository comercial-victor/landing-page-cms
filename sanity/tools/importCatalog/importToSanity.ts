// importToSanity.ts — Importa catálogo normalizado a Sanity
import type { SanityClient } from "sanity";
import type {
  NormalizedCatalog,
  NormCategoria,
  NormSubcategoria,
  NormProducto,
} from "./normalizeCatalogRows";

export interface ImportProgress {
  step: string;
  current: number;
  total: number;
  message: string;
}

export interface ImportSummary {
  categorias: { created: number; updated: number; errors: number };
  subcategorias: { created: number; updated: number; errors: number };
  productos: { created: number; updated: number; errors: number };
}

type ProgressCb = (p: ImportProgress) => void;

async function docExists(client: SanityClient, id: string): Promise<boolean> {
  const doc = await client.fetch(`*[_id == $id][0]._id`, { id });
  return !!doc;
}

async function importCategorias(
  client: SanityClient,
  cats: NormCategoria[],
  onProgress: ProgressCb,
) {
  let created = 0,
    updated = 0,
    errors = 0;
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i];
    onProgress({
      step: "categorias",
      current: i + 1,
      total: cats.length,
      message: `Categoría: ${c.nombre}`,
    });
    try {
      const exists = await docExists(client, c._id);
      await client.createOrReplace({
        _id: c._id,
        _type: "categoria",
        idExcel: c.idExcel,
        nombre: c.nombre,
        slug: c.slug,
        color: c.color,
        ...(c.descripcion ? { descripcion: c.descripcion } : {}),
        orden: c.orden,
        activo: c.activo,
      });
      if (exists) updated++;
      else created++;
    } catch (err) {
      console.error(err);
      errors++;
    }
  }
  return { created, updated, errors };
}

async function importSubcategorias(
  client: SanityClient,
  subs: NormSubcategoria[],
  onProgress: ProgressCb,
) {
  let created = 0,
    updated = 0,
    errors = 0;
  for (let i = 0; i < subs.length; i++) {
    const s = subs[i];
    onProgress({
      step: "subcategorias",
      current: i + 1,
      total: subs.length,
      message: `Subcategoría: ${s.nombre}`,
    });
    try {
      const exists = await docExists(client, s._id);
      await client.createOrReplace({
        _id: s._id,
        _type: "subcategoria",
        idExcel: s.idExcel,
        nombre: s.nombre,
        slug: s.slug,
        categoria: { _type: "reference", _ref: s.categoriaRef },
        orden: s.orden,
        activo: s.activo,
      });
      if (exists) updated++;
      else created++;
    } catch (err) {
      console.error(err);
      errors++;
    }
  }
  return { created, updated, errors };
}

async function importProductos(
  client: SanityClient,
  prods: NormProducto[],
  onProgress: ProgressCb,
) {
  let created = 0,
    updated = 0,
    errors = 0;
  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    onProgress({
      step: "productos",
      current: i + 1,
      total: prods.length,
      message: `Producto ${i + 1}/${prods.length}: ${p.nombre}`,
    });
    try {
      const exists = await docExists(client, p._id);

      // Check if product already has images — preserve them
      let existingImages: unknown[] | undefined;
      if (exists) {
        const existing = await client.fetch(`*[_id == $id][0].imagenes`, {
          id: p._id,
        });
        if (existing && Array.isArray(existing) && existing.length > 0) {
          existingImages = existing;
        }
      }

      const doc: Record<string, unknown> = {
        _id: p._id,
        _type: "producto",
        idExcel: p.idExcel,
        nombre: p.nombre,
        slug: p.slug,
        subcategoria: { _type: "reference", _ref: p.subcategoriaRef },
        marca: p.marca,
        visible: p.visible,
        destacado: p.destacado,
        orden: p.orden,
        manejaStock: p.manejaStock,
        permiteVentaFraccionada: p.permiteVentaFraccionada,
        unidadBase: p.unidadBase,
      };

      // Stock at product level
      if (p.stock != null) doc.stock = p.stock;

      if (p.descripcion) doc.descripcion = p.descripcion;
      if (p.tags && p.tags.length > 0) doc.tags = p.tags;
      if (p.medidas) doc.medidas = p.medidas;
      if (p.observaciones) doc.observaciones = p.observaciones;

      // Preserve existing images
      if (existingImages) doc.imagenes = existingImages;

      // Embed variantes
      if (p.variantes.length > 0) {
        doc.variantes = p.variantes.map((v) => ({
          _key: v._key,
          _type: "variante",
          idExcel: v.idExcel,
          ...(v.nombre ? { nombre: v.nombre } : {}),
          ...(v.color ? { color: v.color } : {}),
          ...(v.tamano ? { tamano: v.tamano } : {}),
          ...(v.otrosAtributos ? { otrosAtributos: v.otrosAtributos } : {}),
          ...(v.stock != null ? { stock: v.stock } : {}),
          visible: v.visible,
        }));
      }

      // Embed presentaciones
      if (p.presentaciones.length > 0) {
        doc.presentaciones = p.presentaciones.map((pr) => ({
          _key: pr._key,
          _type: "presentacion",
          idExcel: pr.idExcel,
          nombre: pr.nombre,
          factorConversion: pr.factorConversion,
          ...(pr.precio != null ? { precio: pr.precio } : {}),
          visibleEnWeb: pr.visibleEnWeb,
          esDefault: pr.esDefault,
        }));
      }

      await client.createOrReplace(
        doc as { _id: string; _type: string; [key: string]: unknown },
      );
      if (exists) updated++;
      else created++;
    } catch (err) {
      console.error(`Error en ${p.nombre}:`, err);
      errors++;
    }
  }
  return { created, updated, errors };
}

export async function importCatalogToSanity(
  client: SanityClient,
  catalog: NormalizedCatalog,
  onProgress: ProgressCb,
): Promise<ImportSummary> {
  const catResult = await importCategorias(
    client,
    catalog.categorias,
    onProgress,
  );
  const subResult = await importSubcategorias(
    client,
    catalog.subcategorias,
    onProgress,
  );
  const prodResult = await importProductos(
    client,
    catalog.productos,
    onProgress,
  );

  onProgress({
    step: "done",
    current: 1,
    total: 1,
    message: "¡Importación completada!",
  });

  return {
    categorias: catResult,
    subcategorias: subResult,
    productos: prodResult,
  };
}
