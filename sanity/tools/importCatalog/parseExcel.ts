import type { ParsedCatalog, RawCategoria, RawProducto, RawPresentacion, RawTag } from "./normalizeCatalogRows";

export async function parseExcel(file: File): Promise<ParsedCatalog & { warnings: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];

  function readSheet<T>(name: string): T[] {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<T>(ws, { defval: "", raw: false });
  }

  const categorias = readSheet<RawCategoria>("Categorias");
  const productos = readSheet<RawProducto>("Productos");
  const presentaciones = readSheet<RawPresentacion>("Presentaciones");
  const tags = readSheet<RawTag>("Tags");

  if (categorias.length === 0 && productos.length === 0) {
    throw new Error("El archivo no tiene datos en las hojas esperadas (Categorias, Productos, Presentaciones).");
  }

  return { categorias, productos, variantes: [], presentaciones, tags, warnings };
}
