// parseCsv.ts
// Lee archivos .csv usando papaparse

import Papa from "papaparse";
import type { RawRow } from "./normalizeCatalogRows";

export async function parseCsv(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      transform: (value: string) => value.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          reject(new Error(`Error parseando CSV: ${results.errors[0].message}`));
          return;
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
