// parseExcel.ts — Lee el Excel multi-hoja de Comercial Victor
import type { ParsedCatalog, RawCategoria, RawProducto, RawVariante, RawPresentacion, RawTag } from "./normalizeCatalogRows";

export async function parseExcel(file: File): Promise<ParsedCatalog> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });

  function readSheet<T>(name: string): T[] {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<T>(ws, { defval: "", raw: false });
  }

  const categorias = readSheet<RawCategoria>("Categorias");
  const productos = readSheet<RawProducto>("Productos");
  const variantes = readSheet<RawVariante>("Variantes");
  const presentaciones = readSheet<RawPresentacion>("Presentaciones");
  const tags = readSheet<RawTag>("Tags");

  if (categorias.length === 0 && productos.length === 0) {
    throw new Error("El archivo no tiene datos en las hojas esperadas (Categorias, Productos, Variantes, Presentaciones).");
  }

  return { categorias, productos, variantes, presentaciones, tags };
}
