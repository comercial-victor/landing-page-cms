import React, { useState, useRef, useCallback } from "react";
import { useClient } from "sanity";
import { parseExcel } from "./parseExcel";
import { normalizeCatalog, type NormalizedCatalog } from "./normalizeCatalogRows";
import { importCatalogToSanity, type ImportProgress, type ImportSummary } from "./importToSanity";

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 960, margin: "0 auto", padding: "32px 24px", fontFamily: "inherit" },
  header: { marginBottom: 32, borderBottom: "1px solid #e5e7eb", paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "#111827" },
  subtitle: { fontSize: 15, color: "#6b7280", margin: 0 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 600, margin: "0 0 16px", color: "#111827" },
  dropzone: { border: "2px dashed #d1d5db", borderRadius: 10, padding: "40px 24px", textAlign: "center" as const, cursor: "pointer", background: "#f9fafb" },
  dropzoneActive: { borderColor: "#D2386C", background: "#fdf2f8" },
  fileInfo: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginTop: 16 },
  btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, border: "none", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnPrimary: { background: "#D2386C", color: "#fff" },
  btnSecondary: { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" },
  btnSuccess: { background: "#059669", color: "#fff" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, marginBottom: 20 },
  statCard: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px", textAlign: "center" as const },
  statNum: { fontSize: 32, fontWeight: 700, color: "#D2386C", lineHeight: 1, display: "block", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
  progressBar: { height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", margin: "12px 0" },
  progressFill: { height: "100%", background: "#D2386C", borderRadius: 999, transition: "width 0.3s ease" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  summaryItem: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 },
  summaryTitle: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10, display: "block" },
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

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParseError(null);
    setCatalog(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const parsed = await parseExcel(file);
      const result = normalizeCatalog(parsed);
      setCatalog(result);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error al analizar el archivo");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!catalog) return;
    setStep("importing");
    try {
      const result = await importCatalogToSanity(client, catalog, setProgress);
      setSummary(result);
      setStep("done");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error durante la importación");
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setCatalog(null);
    setParseError(null);
    setProgress(null);
    setSummary(null);
  };

  const totalVariantes = catalog?.productos.reduce((sum, p) => sum + p.variantes.length, 0) || 0;
  const totalPresentaciones = catalog?.productos.reduce((sum, p) => sum + p.presentaciones.length, 0) || 0;
  const progressPct = progress ? Math.round((progress.current / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>📦 Importar catálogo</h1>
        <p style={s.subtitle}>Importa el Excel de Comercial Victor con las hojas: Categorías, Productos, Variantes, Presentaciones y Tags.</p>
      </div>

      {step === "upload" && (
        <div style={s.card}>
          <p style={s.cardTitle}>1. Selecciona el archivo Excel</p>
          <div style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 40, marginBottom: 12 }}>📗</div>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Arrastra el archivo aquí o haz clic</p>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Formato: .xlsx con hojas Categorias, Productos, Variantes, Presentaciones, Tags</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          {file && (
            <div style={s.fileInfo}>
              <span style={{ fontSize: 24 }}>📗</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          )}
          {parseError && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, color: "#dc2626", fontSize: 14 }}>
              ⚠️ {parseError}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={{ ...s.btn, ...s.btnPrimary, ...(!file || parsing ? s.btnDisabled : {}) }}
              onClick={handleAnalyze} disabled={!file || parsing}>
              {parsing ? "⏳ Analizando..." : "🔍 Analizar archivo"}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && catalog && (
        <>
          <div style={s.statsGrid}>
            {[
              { num: catalog.categorias.length, label: "Categorías" },
              { num: catalog.subcategorias.length, label: "Subcategorías" },
              { num: catalog.productos.length, label: "Productos" },
              { num: totalVariantes, label: "Variantes" },
              { num: totalPresentaciones, label: "Presentaciones" },
            ].map(({ num, label }) => (
              <div key={label} style={s.statCard}>
                <span style={s.statNum}>{num}</span>
                <span style={s.statLabel}>{label}</span>
              </div>
            ))}
          </div>

          {catalog.errors.length > 0 && (
            <div style={{ ...s.card, border: "1px solid #fca5a5" }}>
              <p style={{ ...s.cardTitle, color: "#dc2626" }}>❌ Errores ({catalog.errors.length})</p>
              {catalog.errors.map((e, i) => <p key={i} style={{ fontSize: 13, color: "#dc2626", margin: "4px 0" }}>• {e}</p>)}
            </div>
          )}

          {catalog.warnings.length > 0 && (
            <div style={{ ...s.card, border: "1px solid #fcd34d" }}>
              <p style={{ ...s.cardTitle, color: "#d97706" }}>⚠️ Advertencias ({catalog.warnings.length})</p>
              {catalog.warnings.slice(0, 10).map((w, i) => <p key={i} style={{ fontSize: 13, color: "#92400e", margin: "4px 0" }}>• {w}</p>)}
              {catalog.warnings.length > 10 && <p style={{ fontSize: 12, color: "#9ca3af" }}>...y {catalog.warnings.length - 10} más</p>}
            </div>
          )}

          <div style={s.card}>
            <p style={s.cardTitle}>Vista previa de productos (primeros 10)</p>
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["ID", "Nombre", "Marca", "Variantes", "Presentaciones"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontSize: 11, textTransform: "uppercase", color: "#6b7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catalog.productos.slice(0, 10).map((p) => (
                    <tr key={p.idExcel} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "7px 12px", fontFamily: "monospace", color: "#7c3aed" }}>{p.idExcel}</td>
                      <td style={{ padding: "7px 12px" }}>{p.nombre}</td>
                      <td style={{ padding: "7px 12px", color: "#6b7280" }}>{p.marca}</td>
                      <td style={{ padding: "7px 12px" }}>{p.variantes.length}</td>
                      <td style={{ padding: "7px 12px" }}>{p.presentaciones.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ ...s.btn, ...s.btnSecondary }} onClick={handleReset}>← Volver</button>
            <button style={{ ...s.btn, ...s.btnSuccess }} onClick={handleImport}>✅ Importar {catalog.productos.length} productos</button>
          </div>
        </>
      )}

      {step === "importing" && progress && (
        <div style={s.card}>
          <p style={s.cardTitle}>⏳ Importando...</p>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 8px" }}>{progress.message}</p>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{progress.current} / {progress.total} — {progressPct}%</p>
        </div>
      )}

      {step === "done" && summary && (
        <>
          <div style={{ ...s.card, border: "1px solid #6ee7b7", background: "#f0fdf4" }}>
            <p style={{ ...s.cardTitle, color: "#059669" }}>🎉 ¡Importación completada!</p>
            <p style={{ fontSize: 14, color: "#065f46", margin: 0 }}>Los datos ya están en Sanity. Revisa el contenido en las secciones de Categorías y Productos.</p>
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
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ color: "#6b7280" }}>✅ Creados</span><span style={{ fontWeight: 700, color: "#059669" }}>{data.created}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ color: "#6b7280" }}>🔄 Actualizados</span><span style={{ fontWeight: 700, color: "#2563eb" }}>{data.updated}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ color: "#6b7280" }}>❌ Errores</span><span style={{ fontWeight: 700, color: "#dc2626" }}>{data.errors}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleReset}>Importar otro archivo</button>
          </div>
        </>
      )}
    </div>
  );
}
