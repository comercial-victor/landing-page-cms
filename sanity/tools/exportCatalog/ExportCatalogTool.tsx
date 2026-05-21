import React, { useState, useCallback } from "react";
import { useClient } from "sanity";

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 720, margin: "0 auto", padding: "32px 24px", fontFamily: "inherit" },
  header: { marginBottom: 32, borderBottom: "1px solid #e5e7eb", paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "#111827" },
  subtitle: { fontSize: 15, color: "#6b7280", margin: 0 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 },
  infoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 14, color: "#374151" },
  btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  btnPrimary: { background: "#D2386C", color: "#fff" },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  progressWrap: { marginTop: 16 },
  progressBar: { height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", margin: "8px 0" },
  progressFill: { height: "100%", background: "#D2386C", borderRadius: 999, transition: "width 0.3s ease" },
  result: { borderRadius: 10, padding: 16, marginTop: 16, fontSize: 14 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 16 },
  statCard: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px", textAlign: "center" as const },
  statNum: { fontSize: 28, fontWeight: 700, color: "#D2386C", lineHeight: 1, display: "block", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
};

interface SVar { _key: string; nombre?: string; color?: string; tamano?: string; otrosAtributos?: string; stock?: number | null; visible?: boolean }
interface SPres { _key: string; nombre?: string; factorConversion?: number; precio?: number | null; visibleEnWeb?: boolean; esDefault?: boolean }
interface SProd {
  _id: string; idExcel?: string; nombre: string; descripcion?: string; marca?: string;
  visible?: boolean; manejaStock?: boolean; permiteVentaFraccionada?: boolean; unidadBase?: string;
  medidas?: string; observaciones?: string; tags?: string[];
  subcategoria?: { _id: string; nombre: string; idExcel?: string; categoria?: { _id: string; nombre: string; idExcel?: string; color?: string } };
  variantes?: SVar[]; presentaciones?: SPres[];
}
interface SCat { _id: string; idExcel?: string; nombre: string; color?: string; orden?: number; descripcion?: string }
interface SSubcat { _id: string; idExcel?: string; nombre: string; orden?: number; categoria?: { _id: string; idExcel?: string } }

export function ExportCatalogTool() {
  const client = useClient({ apiVersion: "2024-01-01" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<{ cats: number; prods: number; vars: number; pres: number } | null>(null);

  const handleExport = useCallback(async () => {
    setStatus("loading");
    setProgress(10);
    setMessage("Consultando datos en Sanity…");

    try {
      const [cats, subcats, prods] = await Promise.all([
        client.fetch<SCat[]>(`*[_type=="categoria"]|order(orden asc){_id,idExcel,nombre,color,orden,descripcion}`),
        client.fetch<SSubcat[]>(`*[_type=="subcategoria"]|order(nombre asc){_id,idExcel,nombre,orden,categoria->{_id,idExcel}}`),
        client.fetch<SProd[]>(`*[_type=="producto"]|order(nombre asc){
          _id,idExcel,nombre,descripcion,marca,visible,manejaStock,permiteVentaFraccionada,unidadBase,medidas,observaciones,tags,
          subcategoria->{_id,idExcel,nombre,categoria->{_id,idExcel,nombre,color}},
          variantes[]{_key,nombre,color,tamano,otrosAtributos,stock,visible},
          presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault}
        }`),
      ]);

      setProgress(40);
      setMessage("Generando hojas del Excel…");

      // Sheet 1: Categorias (top-level + subcategorias combined)
      const catRows: Record<string, string | number | null>[] = [];
      for (const c of cats) {
        catRows.push({
          id_categoria: c.idExcel || c._id,
          nombre: c.nombre,
          id_padre: null,
          orden: c.orden ?? 0,
          descripcion: c.descripcion || null,
        });
      }
      for (const sc of subcats) {
        catRows.push({
          id_categoria: sc.idExcel || sc._id,
          nombre: sc.nombre,
          id_padre: sc.categoria?.idExcel || sc.categoria?._id || null,
          orden: sc.orden ?? 0,
          descripcion: null,
        });
      }

      // Sheet 2: Productos
      const prodRows = prods.map((p) => ({
        id_producto: p.idExcel || p._id,
        nombre: p.nombre,
        descripcion: p.descripcion || "",
        categorias: p.subcategoria?.idExcel || p.subcategoria?._id || "",
        marca: p.marca || "Genérico",
        tags: (p.tags || []).join(", "),
        visible: p.visible !== false ? "TRUE" : "FALSE",
        maneja_stock: p.manejaStock ? "TRUE" : "FALSE",
        permite_venta_fraccionada: p.permiteVentaFraccionada ? "TRUE" : "FALSE",
        unidad_base: p.unidadBase || "unidad",
        medidas: p.medidas || "",
        observaciones: p.observaciones || "",
      }));

      // Sheet 3: Variantes
      let varCount = 0;
      const varRows: Record<string, string | number | null>[] = [];
      for (const p of prods) {
        for (const v of (p.variantes || [])) {
          varCount++;
          varRows.push({
            id_variante: v._key,
            id_producto: p.idExcel || p._id,
            nombre_producto: p.nombre,
            nombre_variante: v.nombre || "",
            color: v.color || "",
            "tamaño_medida": v.tamano || "",
            otros_atributos: v.otrosAtributos || "",
            stock_actual: v.stock ?? null,
            imagen_archivo: "",
            visible: v.visible !== false ? "TRUE" : "FALSE",
          });
        }
      }

      // Sheet 4: Presentaciones
      let presCount = 0;
      const presRows: Record<string, string | number | null>[] = [];
      for (const p of prods) {
        for (const pr of (p.presentaciones || [])) {
          presCount++;
          presRows.push({
            id_presentacion: pr._key,
            id_producto: p.idExcel || p._id,
            nombre_producto: p.nombre,
            nombre_presentacion: pr.nombre || "",
            factor_conversion: pr.factorConversion ?? 1,
            precio: pr.precio ?? null,
            variantes_aplicables: "",
            visible_en_web: pr.visibleEnWeb !== false ? "TRUE" : "FALSE",
            es_default: pr.esDefault ? "TRUE" : "FALSE",
          });
        }
      }

      // Sheet 5: Tags
      const allTags = new Set<string>();
      prods.forEach(p => p.tags?.forEach(t => allTags.add(t)));
      const tagRows = Array.from(allTags).sort().map(t => ({
        nombre_tag: t,
        descripcion: "",
      }));

      setProgress(70);
      setMessage("Creando archivo Excel…");

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const addSheet = (name: string, data: Record<string, unknown>[]) => {
        if (data.length === 0) {
          const ws = XLSX.utils.aoa_to_sheet([Object.keys(data[0] || {})]);
          XLSX.utils.book_append_sheet(wb, ws, name);
          return;
        }
        const ws = XLSX.utils.json_to_sheet(data);
        const cols = Object.keys(data[0]).map((key) => {
          const maxLen = Math.max(key.length, ...data.map((r) => String((r as Record<string, unknown>)[key] ?? "").length));
          return { wch: Math.min(maxLen + 2, 50) };
        });
        ws["!cols"] = cols;
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet("Categorias", catRows);
      addSheet("Productos", prodRows);
      addSheet("Variantes", varRows);
      addSheet("Presentaciones", presRows);
      addSheet("Tags", tagRows);

      setProgress(90);
      setMessage("Descargando archivo…");

      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `catalogo-comercial-victor-${today}.xlsx`);

      setProgress(100);
      setStats({ cats: catRows.length, prods: prods.length, vars: varCount, pres: presCount });
      setStatus("done");
      setMessage(`Exportación completada.`);
    } catch (err) {
      console.error("Export error:", err);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error desconocido al exportar.");
    }
  }, [client]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Exportar catálogo a Excel</h1>
        <p style={s.subtitle}>
          Descarga todos los productos del catálogo actual como archivo .xlsx editable, con el mismo formato multi-hoja de la importación (Categorias, Productos, Variantes, Presentaciones, Tags).
        </p>
      </div>

      <div style={s.card}>
        <div style={s.infoRow}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          Formato idéntico al Excel de importación: 5 hojas (Categorias, Productos, Variantes, Presentaciones, Tags).
        </div>

        <button
          style={{ ...s.btn, ...s.btnPrimary, ...(status === "loading" ? s.btnDisabled : {}) }}
          disabled={status === "loading"}
          onClick={handleExport}
        >
          {status === "loading" ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              Exportando…
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar catálogo a Excel
            </>
          )}
        </button>

        {status === "loading" && (
          <div style={s.progressWrap}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{message}</div>
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${progress}%` }} />
            </div>
          </div>
        )}

        {status === "done" && stats && (
          <div style={{ ...s.result, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
            <div style={s.statsGrid}>
              <div style={s.statCard}><span style={s.statNum}>{stats.cats}</span><span style={s.statLabel}>Categorías</span></div>
              <div style={s.statCard}><span style={s.statNum}>{stats.prods}</span><span style={s.statLabel}>Productos</span></div>
              <div style={s.statCard}><span style={s.statNum}>{stats.vars}</span><span style={s.statLabel}>Variantes</span></div>
              <div style={s.statCard}><span style={s.statNum}>{stats.pres}</span><span style={s.statLabel}>Presentaciones</span></div>
            </div>
            <p style={{ margin: 0 }}>✅ {message} El archivo tiene el mismo formato que el de importación.</p>
          </div>
        )}

        {status === "error" && (
          <div style={{ ...s.result, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
            <p style={{ margin: 0 }}>❌ {message}</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
