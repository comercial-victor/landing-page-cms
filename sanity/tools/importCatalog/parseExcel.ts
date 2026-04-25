// parseExcel.ts
// Lee archivos .xlsx y los convierte a RawRow[]

import type { RawRow } from "./normalizeCatalogRows";

export async function parseExcel(file: File): Promise<RawRow[]> {
  // Import dinámico para no romper SSR
  const XLSX = await import("xlsx");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  // Usar la primera hoja
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("El archivo Excel no tiene hojas.");

  const worksheet = workbook.Sheets[sheetName];

  // Convertir a JSON con headers de la primera fila
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false, // todo como string para normalizar
  });

  if (rows.length === 0) {
    throw new Error("La hoja está vacía o no tiene datos.");
  }

  // Normalizar claves a lowercase con underscore
  return rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, val]) => {
      const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
      normalized[normalizedKey] = val;
    });
    return normalized as RawRow;
  });
}
