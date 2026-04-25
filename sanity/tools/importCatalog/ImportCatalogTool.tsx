// ImportCatalogTool.tsx
// Herramienta de importación masiva de catálogo para Sanity Studio.
// Vive dentro del Studio — requiere login de Sanity para acceder.

import React, { useState, useRef, useCallback } from "react";
import { useClient } from "sanity";
import { parseExcel } from "./parseExcel";
import { parseCsv } from "./parseCsv";
import { parseJson } from "./parseJson";
import {
  normalizeRows,
  normalizeJson,
  type NormalizedCatalog,
  type RowError,
} from "./normalizeCatalogRows";
import {
  importCatalogToSanity,
  type ImportProgress,
  type ImportSummary,
} from "./importToSanity";

// ── Styles (inline para no depender de CSS externo) ───────────────
const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "32px 24px",
    fontFamily: "inherit",
  },
  header: {
    marginBottom: 32,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 8px",
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    margin: 0,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 16px",
    color: "#111827",
  },
  dropzone: {
    border: "2px dashed #d1d5db",
    borderRadius: 10,
    padding: "40px 24px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
    background: "#f9fafb",
  },
  dropzoneActive: {
    borderColor: "#D2386C",
    background: "#fdf2f8",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    marginTop: 16,
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  btnPrimary: {
    background: "#D2386C",
    color: "#fff",
  },
  btnSecondary: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
  },
  btnSuccess: {
    background: "#059669",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "16px 20px",
    textAlign: "center" as const,
  },
  statNum: {
    fontSize: 32,
    fontWeight: 700,
    color: "#D2386C",
    lineHeight: 1,
    display: "block",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  errorRow: {
    display: "grid",
    gridTemplateColumns: "50px 1fr 2fr",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 13,
    alignItems: "start",
  },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
  },
  badgeError: { background: "#fee2e2", color: "#dc2626" },
  badgeWarning: { background: "#fef3c7", color: "#d97706" },
  badgeOk: { background: "#d1fae5", color: "#059669" },
  progressBar: {
    height: 8,
    background: "#e5e7eb",
    borderRadius: 999,
    overflow: "hidden",
    margin: "12px 0",
  },
  progressFill: {
    height: "100%",
    background: "#D2386C",
    borderRadius: 999,
    transition: "width 0.3s ease",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  },
  summaryItem: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 10,
    display: "block",
  },
};

type Step = "upload" | "preview" | "importing" | "done";

export function ImportCatalogTool() {
  const client = useClient({ apiVersion: "2026-04-24" });

  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<NormalizedCatalog | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setCatalog(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // ── Parse file ───────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);

    try {
      let result: NormalizedCatalog;
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "xlsx" || ext === "xls") {
        const rows = await parseExcel(file);
        result = normalizeRows(rows);
      } else if (ext === "csv") {
        const rows = await parseCsv(file);
        result = normalizeRows(rows);
      } else if (ext === "json") {
        const parsed = await parseJson(file);
        if (parsed.format === "structured") {
          result = normalizeJson(parsed.data);
        } else {
          result = normalizeRows(parsed.rows);
        }
      } else {
        throw new Error("Formato no soportado. Usa .xlsx, .csv o .json");
      }

      setCatalog(result);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error desconocido al parsear el archivo");
    } finally {
      setParsing(false);
    }
  };

  // ── Import ───────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!catalog) return;
    setStep("importing");
    setProgress(null);

    try {
      const result = await importCatalogToSanity(client, catalog, (p) => {
        setProgress(p);
      });
      setSummary(result);
      setStep("done");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error durante la importación");
      setStep("preview");
    }
  };

  // ── Reset ────────────────────────────────────────────────────────
  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setCatalog(null);
    setParseError(null);
    setProgress(null);
    setSummary(null);
  };

  const hasCriticalErrors = catalog?.errors.some((e) => e.critical) ?? false;
  const progressPct = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>📦 Importar catálogo</h1>
        <p style={s.subtitle}>
          Importa categorías, subcategorías y productos desde un archivo Excel, CSV o JSON.
          Solo usuarios autorizados en Sanity Studio pueden usar esta herramienta.
        </p>
      </div>

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <div style={s.card}>
          <p style={s.cardTitle}>1. Seleccioná el archivo</p>

          <div
            style={{
              ...s.dropzone,
              ...(dragging ? s.dropzoneActive : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#374151" }}>
              Arrastrá el archivo acá o hacé clic para seleccionarlo
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              Formatos soportados: .xlsx, .csv, .json
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {file && (
            <div style={s.fileInfo}>
              <span style={{ fontSize: 24 }}>
                {file.name.endsWith(".json") ? "📋" : file.name.endsWith(".csv") ? "📊" : "📗"}
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          {parseError && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 14 }}>
              ⚠️ {parseError}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button
              style={{
                ...s.btn,
                ...s.btnPrimary,
                ...(!file || parsing ? s.btnDisabled : {}),
              }}
              onClick={handleAnalyze}
              disabled={!file || parsing}
            >
              {parsing ? "⏳ Analizando..." : "🔍 Analizar archivo"}
            </button>
          </div>

          {/* Format guide */}
          <details style={{ marginTop: 24 }}>
            <summary style={{ cursor: "pointer", fontSize: 13, color: "#6b7280", fontWeight: 600 }}>
              Ver formato esperado de columnas (Excel/CSV)
            </summary>
            <div style={{ marginTop: 12, overflow: "auto" }}>
              <table style={{ fontSize: 12, borderCollapse: "collapse", width: "100%" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    {["Columna", "Obligatorio", "Ejemplo"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["categoria", "✅ Sí", "Globos con helio"],
                    ["categoria_slug", "No (auto)", "globos-con-helio"],
                    ["categoria_color", "No", "#FF6B7A"],
                    ["subcategoria", "✅ Sí", "Números gigantes"],
                    ["subcategoria_slug", "No (auto)", "numeros-gigantes"],
                    ["producto", "No*", "Número metálico 40\""],
                    ["tipo", "No", "simple / pack / alquiler"],
                    ["descripcion", "No", "Globo inflado con helio..."],
                    ["detalles", "No", "Color: dorado; Duración: 5 días"],
                    ["precio", "No", "35"],
                    ["mostrar_desde", "No", "sí / no"],
                    ["unidad_venta", "No", "por unidad"],
                    ["tags", "No", "popular,nuevo"],
                    ["mensaje_whatsapp", "No", "Hola! Quiero el número metálico"],
                    ["stock", "No", "disponible / bajo / consultar"],
                    ["destacado", "No", "sí / no"],
                    ["activo", "No", "sí / no"],
                    ["orden", "No", "1"],
                  ].map(([col, req, ex]) => (
                    <tr key={col} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 12px", fontFamily: "monospace", color: "#7c3aed" }}>{col}</td>
                      <td style={{ padding: "6px 12px" }}>{req}</td>
                      <td style={{ padding: "6px 12px", color: "#6b7280" }}>{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                * Fila sin producto solo crea categoría/subcategoría.
              </p>
            </div>
          </details>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === "preview" && catalog && (
        <>
          {/* Stats */}
          <div style={s.statsGrid}>
            {[
              { num: catalog.categorias.length, label: "Categorías" },
              { num: catalog.subcategorias.length, label: "Subcategorías" },
              { num: catalog.productos.length, label: "Productos" },
            ].map(({ num, label }) => (
              <div key={label} style={s.statCard}>
                <span style={s.statNum}>{num}</span>
                <span style={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>

          {/* Errors */}
          {catalog.errors.length > 0 && (
            <div style={{ ...s.card, border: "1px solid #fca5a5" }}>
              <p style={{ ...s.cardTitle, color: "#dc2626" }}>
                ❌ Errores críticos ({catalog.errors.length})
              </p>
              <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 12px" }}>
                Estos errores impiden la importación. Corregí el archivo y volvé a intentar.
              </p>
              <ErrorTable rows={catalog.errors} type="error" />
            </div>
          )}

          {/* Warnings */}
          {catalog.warnings.length > 0 && (
            <div style={{ ...s.card, border: "1px solid #fcd34d" }}>
              <p style={{ ...s.cardTitle, color: "#d97706" }}>
                ⚠️ Advertencias ({catalog.warnings.length})
              </p>
              <p style={{ fontSize: 13, color: "#92400e", margin: "0 0 12px" }}>
                Podés continuar, pero revisá estos casos.
              </p>
              <ErrorTable rows={catalog.warnings} type="warning" />
            </div>
          )}

          {/* Preview tables */}
          {!hasCriticalErrors && (
            <>
              <PreviewTable title="📂 Categorías a importar" items={catalog.categorias.map(c => [c.nombre, c.slug.current, c.color, String(c.activo ? "activo" : "inactivo")])} headers={["Nombre", "Slug", "Color", "Estado"]} />
              <PreviewTable title="📁 Subcategorías a importar" items={catalog.subcategorias.map(s => [s.nombre, s.slug.current, s.categoriaSlug])} headers={["Nombre", "Slug", "Categoría padre"]} />
              <PreviewTable title="📦 Productos a importar" items={catalog.productos.map(p => [p.nombre, p.tipo, p.subcategoriaSlug, p.precio !== null && p.precio !== undefined ? `S/ ${p.precio}` : "—", String(p.activo ? "activo" : "inactivo")])} headers={["Nombre", "Tipo", "Subcategoría", "Precio", "Estado"]} />
            </>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleReset}>
              ← Volver
            </button>
            {!hasCriticalErrors && (
              <button
                style={{ ...s.btn, ...s.btnSuccess }}
                onClick={handleImport}
              >
                ✅ Confirmar importación
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Step 3: Importing ── */}
      {step === "importing" && progress && (
        <div style={s.card}>
          <p style={s.cardTitle}>⏳ Importando...</p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 8px" }}>
            {progress.message}
          </p>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {progress.current} / {progress.total} — {progressPct}%
          </p>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === "done" && summary && (
        <>
          <div style={{ ...s.card, border: "1px solid #6ee7b7", background: "#f0fdf4" }}>
            <p style={{ ...s.cardTitle, color: "#059669" }}>
              🎉 Importación completada
            </p>
            <p style={{ fontSize: 14, color: "#065f46", margin: 0 }}>
              Los cambios ya están en Sanity. Si tenés el webhook configurado, la web pública
              se actualizará automáticamente en segundos.
            </p>
          </div>

          <div style={s.summaryGrid}>
            {[
              { label: "📂 Categorías", data: summary.categorias },
              { label: "📁 Subcategorías", data: summary.subcategorias },
              { label: "📦 Productos", data: summary.productos },
            ].map(({ label, data }) => (
              <div key={label} style={s.summaryItem}>
                <span style={s.summaryTitle}>{label}</span>
                <div style={{ fontSize: 13 }}>
                  <Row label="✅ Creados" value={data.created} color="#059669" />
                  <Row label="🔄 Actualizados" value={data.updated} color="#2563eb" />
                  <Row label="❌ Errores" value={data.errors} color="#dc2626" />
                  {"imageWarnings" in data && data.imageWarnings > 0 && (
                    <Row label="⚠️ Imág. sin subir" value={data.imageWarnings} color="#d97706" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleReset}>
              Importar otro archivo
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function ErrorTable({ rows, type }: { rows: RowError[]; type: "error" | "warning" }) {
  return (
    <div style={{ border: "1px solid #f3f4f6", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ ...s.errorRow, background: "#f9fafb", fontWeight: 600, fontSize: 12, color: "#6b7280", textTransform: "uppercase" as const }}>
        <span>Fila</span><span>Campo</span><span>Mensaje</span>
      </div>
      {rows.map((err, i) => (
        <div key={i} style={s.errorRow}>
          <span style={{ ...s.badge, ...(type === "error" ? s.badgeError : s.badgeWarning) }}>
            #{err.row}
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#7c3aed" }}>{err.field}</span>
          <span style={{ color: "#374151" }}>{err.message}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ title, headers, items }: { title: string; headers: string[]; items: string[][] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);

  return (
    <div style={{ ...s.card, marginBottom: 12 }}>
      <p style={{ ...s.cardTitle, margin: "0 0 12px" }}>{title} <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 14 }}>({items.length})</span></p>
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {headers.map((h) => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "7px 12px", color: "#374151" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length > 5 && (
        <button
          style={{ ...s.btn, ...s.btnSecondary, marginTop: 12, fontSize: 12, padding: "6px 14px" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Ver menos" : `Ver ${items.length - 5} más...`}
        </button>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
