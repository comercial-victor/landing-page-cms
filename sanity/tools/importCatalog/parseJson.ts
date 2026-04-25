// parseJson.ts
// Lee archivos .json y los convierte al formato normalizado

import type { RawRow } from "./normalizeCatalogRows";
import type { JsonFormat } from "./normalizeCatalogRows";

export type ParsedJsonResult =
  | { format: "flat"; rows: RawRow[] }
  | { format: "structured"; data: JsonFormat };

export async function parseJson(file: File): Promise<ParsedJsonResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El archivo JSON no es válido. Verificá la sintaxis.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("El JSON debe ser un objeto o un array.");
  }

  // ── Formato estructurado: { categories, subcategories, products } ──
  if (
    !Array.isArray(parsed) &&
    ("categories" in parsed || "subcategories" in parsed || "products" in parsed)
  ) {
    return { format: "structured", data: parsed as JsonFormat };
  }

  // ── Formato plano: array de filas (mismo formato que CSV) ──────────
  if (Array.isArray(parsed)) {
    const rows = parsed.map((row: Record<string, unknown>) => {
      const normalized: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, val]) => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
        normalized[normalizedKey] = val;
      });
      return normalized as RawRow;
    });
    return { format: "flat", rows };
  }

  throw new Error(
    'Formato JSON no reconocido. Debe ser un array de filas o un objeto con "categories", "subcategories" y "products".'
  );
}
