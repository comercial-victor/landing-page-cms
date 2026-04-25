// parseCsv.ts
// Lee archivos .csv usando papaparse

import type { RawRow } from "./normalizeCatalogRows";

export async function parseCsv(file: File): Promise<RawRow[]> {
  const Papa = await import("papaparse");

  return new Promise((resolve, reject) => {
    Papa.default.parse(file, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
      transform: (value: string) => value.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          const criticalErrors = results.errors.filter((e) => e.type === "Abort");
          if (criticalErrors.length > 0) {
            reject(new Error(`Error parseando CSV: ${criticalErrors[0].message}`));
            return;
          }
        }

        // Normalizar keys a lowercase con underscore
        const rows = (results.data as Record<string, unknown>[]).map((row) => {
          const normalized: Record<string, unknown> = {};
          Object.entries(row).forEach(([key, val]) => {
            const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
            normalized[normalizedKey] = val;
          });
          return normalized as RawRow;
        });

        resolve(rows);
      },
      error: (error: Error) => {
        reject(new Error(`Error parseando CSV: ${error.message}`));
      },
    });
  });
}
