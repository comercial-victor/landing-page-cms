import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useClient } from "sanity";

// ── Types ─────────────────────────────────────────────────────────
interface SImg { _key?: string; _type?: string; asset: { _ref: string; url?: string } }
interface SVar { _key: string; nombre?: string; color?: string; tamano?: string; otrosAtributos?: string; stock?: number | null; visible?: boolean; imagen?: SImg }
interface SPres { _key: string; nombre?: string; factorConversion?: number; precio?: number | null; visibleEnWeb?: boolean; esDefault?: boolean }
interface SSubcat { _id: string; nombre: string; categoria?: { _id: string; nombre: string; color?: string } }
interface SProd {
  _id: string; idExcel?: string; nombre: string; descripcion?: string; marca?: string;
  visible?: boolean; destacado?: boolean; medidas?: string; observaciones?: string; tags?: string[];
  unidadBase?: string; manejaStock?: boolean; permiteVentaFraccionada?: boolean;
  subcategoria?: SSubcat; variantes?: SVar[]; presentaciones?: SPres[];
  imagenes?: SImg[]; slug?: { current: string };
}
interface SCat { _id: string; nombre: string; color?: string }

// ── Helpers ───────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
const COMMON_TAGS = ["popular","nuevo","para-eventos","barra","metalizado","color-blanco","tecnopor","escolar","fiesta-infantil","manualidades","descartable","tela"];

// ── Styles ────────────────────────────────────────────────────────
const C = {
  bg: "#FFFBF3", white: "#fff", plum: "#D2386C", ink: "#1F1B2E", inkSoft: "#5A5368",
  line: "rgba(31,27,46,0.08)", green: "#059669", red: "#dc2626", orange: "#d97706",
  yellowBg: "#fefce8", yellowBorder: "#fde68a", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
};

// ── Main Component ────────────────────────────────────────────────
export function InteractiveViewTool() {
  const client = useClient({ apiVersion: "2026-04-24" });
  const [prods, setProds] = useState<SProd[]>([]);
  const [cats, setCats] = useState<SCat[]>([]);
  const [subcats, setSubcats] = useState<SSubcat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("__all");
  const [editing, setEditing] = useState<SProd | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [p, c, sc] = await Promise.all([
      client.fetch<SProd[]>(`*[_type=="producto"]|order(nombre asc){
        _id,idExcel,nombre,descripcion,marca,visible,destacado,medidas,observaciones,tags,
        unidadBase,manejaStock,permiteVentaFraccionada,slug,
        subcategoria->{_id,nombre,categoria->{_id,nombre,color}},
        variantes[]{_key,nombre,color,tamano,otrosAtributos,stock,visible,imagen{asset}},
        presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault},
        imagenes[]{_key,asset}
      }`),
      client.fetch<SCat[]>(`*[_type=="categoria"&&activo==true]|order(orden asc){_id,nombre,color}`),
      client.fetch<SSubcat[]>(`*[_type=="subcategoria"&&activo==true]|order(nombre asc){_id,nombre,categoria->{_id,nombre,color}}`),
    ]);
    setProds(p); setCats(c); setSubcats(sc);
    // Collect all unique tags
    const tags = new Set<string>();
    COMMON_TAGS.forEach(t => tags.add(t));
    p.forEach(prod => prod.tags?.forEach(t => tags.add(t)));
    setAllTags(Array.from(tags).sort());
    setLoading(false);
  }, [client]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search with same logic as Navbar
  const filtered = useMemo(() => {
    let r = prods;
    if (catFilter !== "__all") r = r.filter(p => p.subcategoria?.categoria?._id === catFilter);
    if (search.trim()) {
      const tokens = normalize(search).split(" ").filter(Boolean);
      r = r.filter(p => {
        const hay = normalize([p.nombre, p.idExcel, p.marca, p.subcategoria?.nombre, p.subcategoria?.categoria?.nombre].filter(Boolean).join(" "));
        return tokens.every(t => hay.includes(t));
      });
    }
    return r;
  }, [prods, catFilter, search]);

  const handleSaved = (updated: SProd) => {
    setProds(ps => ps.map(p => p._id === updated._id ? updated : p));
    setEditing(null);
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: C.inkSoft }}>⏳ Cargando productos...</div>;

  const vis = prods.filter(p => p.visible).length;

  return (
    <div style={{ padding: "20px 28px", fontFamily: "'Outfit',sans-serif", background: C.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.plum, margin: 0 }}>👁️ Editor interactivo</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.inkSoft }}>{vis} visibles · {prods.length - vis} ocultos</span>
          <button onClick={fetchData} style={btnStyle("secondary")}>🔄 Refrescar</button>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, ID, marca..."
          style={{ flex: 1, minWidth: 220, height: 38, padding: "0 14px", border: `1px solid ${C.line}`, borderRadius: 999, fontSize: 13, outline: "none", fontFamily: "inherit", background: C.white }} />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ height: 38, padding: "0 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13, fontFamily: "inherit", background: C.white, cursor: "pointer" }}>
          <option value="__all">Todas las categorías ({prods.length})</option>
          {cats.map(c => <option key={c._id} value={c._id}>{c.nombre} ({prods.filter(p => p.subcategoria?.categoria?._id === c._id).length})</option>)}
        </select>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
        {filtered.map(p => <MiniCard key={p._id} prod={p} onEdit={() => setEditing(p)} client={client} onUpdate={updated => setProds(ps => ps.map(x => x._id === updated._id ? updated : x))} />)}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 48, color: C.inkSoft }}>🔍 Sin resultados</div>}

      {/* Edit drawer */}
      {editing && <EditDrawer prod={editing} client={client} subcats={subcats} allTags={allTags} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  );
}

// ── Mini Card ─────────────────────────────────────────────────────
function MiniCard({ prod: p, onEdit, client, onUpdate }: { prod: SProd; onEdit: () => void; client: ReturnType<typeof useClient>; onUpdate: (p: SProd) => void }) {
  const [saving, setSaving] = useState(false);
  const toggle = async (field: "visible" | "destacado") => {
    setSaving(true);
    const val = !p[field];
    await client.patch(p._id).set({ [field]: val }).commit();
    onUpdate({ ...p, [field]: val });
    setSaving(false);
  };

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${p.visible ? C.line : "#fca5a5"}`, opacity: p.visible ? 1 : 0.6, display: "flex", gap: 0 }}>
      {/* Left: info */}
      <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
        <div style={{ fontSize: 10, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {p.subcategoria?.categoria?.nombre} › {p.subcategoria?.nombre}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, lineHeight: 1.3, marginTop: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.nombre}</div>
        {p.idExcel && <span style={{ fontSize: 9, color: "#9ca3af", fontFamily: "monospace" }}>{p.idExcel}</span>}
        {p.marca && p.marca !== "Genérico" && <span style={{ fontSize: 10, color: C.plum, marginLeft: 6 }}>{p.marca}</span>}
        <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: C.inkSoft }}>{p.variantes?.length || 0} var · {p.presentaciones?.length || 0} pres</span>
          {p.imagenes && p.imagenes.length > 0 && <span style={{ fontSize: 11, color: C.green }}>📷 {p.imagenes.length}</span>}
        </div>
      </div>
      {/* Right: actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "10px 10px", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <MiniToggle on={!!p.visible} label={p.visible ? "👁️" : "🚫"} onClick={() => toggle("visible")} disabled={saving} title={p.visible ? "Ocultar" : "Mostrar"} />
          <MiniToggle on={!!p.destacado} label={p.destacado ? "⭐" : "☆"} onClick={() => toggle("destacado")} disabled={saving} title={p.destacado ? "Quitar destacado" : "Destacar"} />
        </div>
        <button onClick={onEdit} style={{ ...btnStyle("primary"), height: 28, fontSize: 11, padding: "0 12px" }}>✏️ Editar</button>
      </div>
    </div>
  );
}

function MiniToggle({ on, label, onClick, disabled, title }: { on: boolean; label: string; onClick: () => void; disabled: boolean; title: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${on ? C.green : "#d1d5db"}`, background: on ? "#f0fdf4" : "#f9fafb", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {label}
    </button>
  );
}

// ── Edit Drawer (the big one) ─────────────────────────────────────
function EditDrawer({ prod, client, subcats, allTags, onClose, onSaved }: {
  prod: SProd; client: ReturnType<typeof useClient>; subcats: SSubcat[]; allTags: string[];
  onClose: () => void; onSaved: (p: SProd) => void;
}) {
  const [draft, setDraft] = useState<SProd>(() => JSON.parse(JSON.stringify(prod)));
  const [original] = useState<string>(() => JSON.stringify(prod));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"general" | "variantes" | "presentaciones" | "imagenes">("general");
  const [newTag, setNewTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isModified = JSON.stringify(draft) !== original;
  const changed = (field: string) => {
    const o = JSON.parse(original);
    return JSON.stringify((draft as Record<string,unknown>)[field]) !== JSON.stringify((o as Record<string,unknown>)[field]);
  };

  const set = <K extends keyof SProd>(field: K, val: SProd[K]) => setDraft(d => ({ ...d, [field]: val }));

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      // Guard: subcategoria must have _id
      const subcatId = draft.subcategoria?._id;
      if (!subcatId || typeof subcatId !== "string") {
        alert("Error: El producto no tiene subcategoría asignada.");
        setSaving(false);
        return;
      }

      const doc: Record<string, unknown> = {
        nombre: draft.nombre,
        descripcion: draft.descripcion || "",
        marca: draft.marca || "Genérico",
        medidas: draft.medidas || "",
        observaciones: draft.observaciones || "",
        visible: draft.visible,
        destacado: draft.destacado,
        tags: draft.tags || [],
        unidadBase: draft.unidadBase || "unidad",
        manejaStock: draft.manejaStock,
        permiteVentaFraccionada: draft.permiteVentaFraccionada,
        subcategoria: { _type: "reference", _ref: subcatId },
        slug: { _type: "slug", current: normalize(draft.nombre).replace(/\s+/g, "-") },
      };

      if (draft.variantes) doc.variantes = draft.variantes.map(v => {
        const vDoc: Record<string, unknown> = { _key: v._key, _type: "variante", nombre: v.nombre || "", color: v.color || "", tamano: v.tamano || "", otrosAtributos: v.otrosAtributos || "", visible: v.visible !== false };
        if (v.stock != null) vDoc.stock = v.stock;
        const imgRef = v.imagen?.asset?._ref;
        if (imgRef && typeof imgRef === "string") {
          vDoc.imagen = { _type: "image", asset: { _type: "reference", _ref: imgRef } };
        }
        return vDoc;
      });

      if (draft.presentaciones) doc.presentaciones = draft.presentaciones.map(p => {
        const pDoc: Record<string, unknown> = { _key: p._key, _type: "presentacion", nombre: p.nombre || "", factorConversion: p.factorConversion || 1, visibleEnWeb: p.visibleEnWeb !== false, esDefault: !!p.esDefault };
        if (p.precio != null) pDoc.precio = p.precio;
        return pDoc;
      });

      // Guard: only include images with valid _ref strings
      if (draft.imagenes && draft.imagenes.length > 0) {
        const validImages = draft.imagenes.filter(img => {
          const ref = img.asset?._ref;
          if (!ref || typeof ref !== "string") {
            console.warn("Imagen sin _ref válido, se omitirá:", img);
            return false;
          }
          return true;
        });
        doc.imagenes = validImages.map(img => ({
          _key: img._key || uid(),
          _type: "image",
          asset: { _type: "reference", _ref: img.asset._ref },
        }));
      }

      // Debug: log what we're about to save
      console.log("Guardando doc:", JSON.stringify(doc, null, 2));

      await client.patch(draft._id).set(doc).commit();
      // Re-fetch to get resolved refs
      const updated = await client.fetch<SProd>(`*[_id==$id][0]{
        _id,idExcel,nombre,descripcion,marca,visible,destacado,medidas,observaciones,tags,
        unidadBase,manejaStock,permiteVentaFraccionada,slug,
        subcategoria->{_id,nombre,categoria->{_id,nombre,color}},
        variantes[]{_key,nombre,color,tamano,otrosAtributos,stock,visible,imagen{asset}},
        presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault},
        imagenes[]{_key,asset}
      }`, { id: draft._id });
      onSaved(updated);
    } catch (err) {
      console.error("Error guardando:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error al guardar: ${msg}\n\nRevisa la consola para ver el JSON que se intentó guardar.`);
    }
    setSaving(false);
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const asset = await client.assets.upload("image", file, { filename: file.name });
        setDraft(d => ({
          ...d,
          imagenes: [...(d.imagenes || []), { _key: uid(), _type: "image", asset: { _ref: asset._id, url: asset.url } }],
        }));
      } catch (err) {
        console.error("Error subiendo imagen:", err);
      }
    }
    e.target.value = "";
  };

  const removeImage = (idx: number) => setDraft(d => ({ ...d, imagenes: (d.imagenes || []).filter((_, i) => i !== idx) }));

  // Tags
  const addTag = (tag: string) => {
    const t = tag.toLowerCase().trim().replace(/\s+/g, "-");
    if (!t) return;
    if (draft.tags?.includes(t)) return;
    set("tags", [...(draft.tags || []), t]);
    setNewTag("");
  };
  const removeTag = (tag: string) => set("tags", (draft.tags || []).filter(t => t !== tag));

  // Variantes
  const addVariante = () => setDraft(d => ({ ...d, variantes: [...(d.variantes || []), { _key: uid(), nombre: "", color: "", tamano: "", stock: null, visible: true }] }));
  const updateVar = (key: string, field: string, val: unknown) => setDraft(d => ({ ...d, variantes: (d.variantes || []).map(v => v._key === key ? { ...v, [field]: val } : v) }));
  const removeVar = (key: string) => setDraft(d => ({ ...d, variantes: (d.variantes || []).filter(v => v._key !== key) }));

  // Presentaciones
  const addPres = () => setDraft(d => ({ ...d, presentaciones: [...(d.presentaciones || []), { _key: uid(), nombre: "", factorConversion: 1, precio: null, visibleEnWeb: true, esDefault: false }] }));
  const updatePres = (key: string, field: string, val: unknown) => setDraft(d => ({ ...d, presentaciones: (d.presentaciones || []).map(p => p._key === key ? { ...p, [field]: val } : p) }));
  const removePres = (key: string) => setDraft(d => ({ ...d, presentaciones: (d.presentaciones || []).filter(p => p._key !== key) }));

  const tabBtnStyle = (t: string) => ({
    padding: "8px 16px", border: "none", borderBottom: tab === t ? `2px solid ${C.plum}` : "2px solid transparent",
    background: "transparent", color: tab === t ? C.plum : C.inkSoft, fontWeight: tab === t ? 600 : 400,
    cursor: "pointer", fontSize: 13, fontFamily: "inherit",
  });

  const fieldBg = (field: string) => changed(field) ? C.yellowBg : C.white;
  const fieldBorder = (field: string) => changed(field) ? C.yellowBorder : "#d1d5db";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(31,27,46,0.4)", backdropFilter: "blur(4px)" }} />
      {/* Panel */}
      <div style={{ width: "min(680px, 90vw)", background: C.bg, overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.white, position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.inkSoft, fontFamily: "monospace" }}>{draft.idExcel || draft._id}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{draft.nombre || "Sin nombre"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isModified && <button onClick={() => setDraft(JSON.parse(original))} style={btnStyle("secondary")}>↩️ Deshacer</button>}
            <button onClick={handleSave} disabled={!isModified || saving}
              style={{ ...btnStyle("save"), opacity: isModified ? 1 : 0.4 }}>
              {saving ? "⏳ Guardando..." : "💾 Guardar"}
            </button>
            <button onClick={onClose} style={btnStyle("secondary")}>✕</button>
          </div>
        </div>

        {/* Modified banner */}
        {isModified && (
          <div style={{ padding: "8px 20px", background: C.yellowBg, borderBottom: `1px solid ${C.yellowBorder}`, fontSize: 12, color: C.orange, display: "flex", alignItems: "center", gap: 6 }}>
            ⚠️ Hay cambios sin guardar. Los campos modificados aparecen en <span style={{ background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 4, padding: "1px 6px" }}>amarillo</span>.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, padding: "0 20px", background: C.white }}>
          <button style={tabBtnStyle("general")} onClick={() => setTab("general")}>📋 General</button>
          <button style={tabBtnStyle("variantes")} onClick={() => setTab("variantes")}>🎨 Variantes ({draft.variantes?.length || 0})</button>
          <button style={tabBtnStyle("presentaciones")} onClick={() => setTab("presentaciones")}>📦 Presentaciones ({draft.presentaciones?.length || 0})</button>
          <button style={tabBtnStyle("imagenes")} onClick={() => setTab("imagenes")}>🖼️ Imágenes ({draft.imagenes?.length || 0})</button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, flex: 1 }}>

          {/* ── General ── */}
          {tab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nombre" modified={changed("nombre")}>
                <input value={draft.nombre} onChange={e => set("nombre", e.target.value)}
                  style={inputStyle(fieldBg("nombre"), fieldBorder("nombre"))} />
              </Field>

              <Field label="Descripción" modified={changed("descripcion")}>
                <textarea value={draft.descripcion || ""} onChange={e => set("descripcion", e.target.value)} rows={3}
                  style={{ ...inputStyle(fieldBg("descripcion"), fieldBorder("descripcion")), height: "auto", padding: "8px 12px" }} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Marca" modified={changed("marca")}>
                  <input value={draft.marca || ""} onChange={e => set("marca", e.target.value)}
                    style={inputStyle(fieldBg("marca"), fieldBorder("marca"))} placeholder="Genérico" />
                </Field>
                <Field label="Medidas" modified={changed("medidas")}>
                  <input value={draft.medidas || ""} onChange={e => set("medidas", e.target.value)}
                    style={inputStyle(fieldBg("medidas"), fieldBorder("medidas"))} placeholder="Ej: 3 oz, A4" />
                </Field>
              </div>

              <Field label="Subcategoría" modified={changed("subcategoria")}>
                <select value={draft.subcategoria?._id || ""} onChange={e => {
                  const sc = subcats.find(s => s._id === e.target.value);
                  if (sc) set("subcategoria", sc);
                }} style={{ ...inputStyle(fieldBg("subcategoria"), fieldBorder("subcategoria")), cursor: "pointer" }}>
                  <option value="">— Seleccionar —</option>
                  {subcats.map(sc => (
                    <option key={sc._id} value={sc._id}>{sc.categoria?.nombre} › {sc.nombre}</option>
                  ))}
                </select>
              </Field>

              <Field label="Observaciones" modified={changed("observaciones")}>
                <textarea value={draft.observaciones || ""} onChange={e => set("observaciones", e.target.value)} rows={2}
                  style={{ ...inputStyle(fieldBg("observaciones"), fieldBorder("observaciones")), height: "auto", padding: "8px 12px" }} />
              </Field>

              {/* Tags */}
              <Field label="Tags / Etiquetas" modified={changed("tags")}>
                <div style={{ background: fieldBg("tags"), border: `1px solid ${fieldBorder("tags")}`, borderRadius: 10, padding: 10 }}>
                  {/* Current tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {(draft.tags || []).map(t => (
                      <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "rgba(210,56,108,0.08)", color: C.plum, borderRadius: 999, fontSize: 12 }}>
                        {t} <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                    {(!draft.tags || draft.tags.length === 0) && <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin tags</span>}
                  </div>
                  {/* Add tag */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nuevo tag..."
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
                      style={{ ...inputStyle(C.white, "#d1d5db"), flex: 1, height: 30, fontSize: 12 }} />
                    <button onClick={() => addTag(newTag)} style={{ ...btnStyle("primary"), height: 30, fontSize: 11, padding: "0 10px" }}>+ Agregar</button>
                  </div>
                  {/* Suggestions */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {allTags.filter(t => !(draft.tags || []).includes(t)).slice(0, 12).map(t => (
                      <button key={t} onClick={() => addTag(t)}
                        style={{ padding: "2px 8px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 999, fontSize: 10, cursor: "pointer", color: C.inkSoft, fontFamily: "inherit" }}>
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>

              {/* Toggles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <ToggleField label="Visible" value={!!draft.visible} onChange={v => set("visible", v)} modified={changed("visible")} />
                <ToggleField label="Destacado" value={!!draft.destacado} onChange={v => set("destacado", v)} modified={changed("destacado")} />
                <ToggleField label="Venta fraccionada" value={!!draft.permiteVentaFraccionada} onChange={v => set("permiteVentaFraccionada", v)} modified={changed("permiteVentaFraccionada")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Unidad base" modified={changed("unidadBase")}>
                  <input value={draft.unidadBase || ""} onChange={e => set("unidadBase", e.target.value)}
                    style={inputStyle(fieldBg("unidadBase"), fieldBorder("unidadBase"))} placeholder="unidad, metro, vaso..." />
                </Field>
                <ToggleField label="Maneja stock" value={!!draft.manejaStock} onChange={v => set("manejaStock", v)} modified={changed("manejaStock")} />
              </div>
            </div>
          )}

          {/* ── Variantes ── */}
          {tab === "variantes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.inkSoft }}>{draft.variantes?.length || 0} variantes</span>
                <button onClick={addVariante} style={btnStyle("primary")}>+ Agregar variante</button>
              </div>
              {(draft.variantes || []).map((v, i) => {
                const origVar = JSON.parse(original).variantes?.find((ov: SVar) => ov._key === v._key);
                const varChanged = JSON.stringify(v) !== JSON.stringify(origVar);
                return (
                  <div key={v._key} style={{ background: varChanged ? C.yellowBg : C.white, border: `1px solid ${varChanged ? C.yellowBorder : "#e5e7eb"}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>Variante {i + 1} {varChanged && <span style={{ color: C.orange }}>●</span>}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <MiniToggle on={v.visible !== false} label={v.visible !== false ? "👁️" : "🚫"} onClick={() => updateVar(v._key, "visible", !v.visible)} disabled={false} title="Visibilidad" />
                        <button onClick={() => removeVar(v._key)} style={{ ...btnStyle("secondary"), height: 28, fontSize: 11, color: C.red }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <MiniInput label="Nombre" value={v.nombre || ""} onChange={val => updateVar(v._key, "nombre", val)} />
                      <MiniInput label="Color" value={v.color || ""} onChange={val => updateVar(v._key, "color", val)} />
                      <MiniInput label="Tamaño" value={v.tamano || ""} onChange={val => updateVar(v._key, "tamano", val)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <MiniInput label="Stock" value={v.stock != null ? String(v.stock) : ""} onChange={val => updateVar(v._key, "stock", val === "" ? null : Number(val))} type="number" />
                      <MiniInput label="Otros atributos" value={v.otrosAtributos || ""} onChange={val => updateVar(v._key, "otrosAtributos", val)} />
                    </div>
                  </div>
                );
              })}
              {(!draft.variantes || draft.variantes.length === 0) && (
                <div style={{ textAlign: "center", padding: 32, color: C.inkSoft, fontSize: 13, background: C.white, borderRadius: 12, border: `1px dashed ${C.line}` }}>
                  Sin variantes. Si el producto tiene colores o tamaños, agrégalos aquí.
                </div>
              )}
            </div>
          )}

          {/* ── Presentaciones ── */}
          {tab === "presentaciones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.inkSoft }}>{draft.presentaciones?.length || 0} presentaciones</span>
                <button onClick={addPres} style={btnStyle("primary")}>+ Agregar presentación</button>
              </div>
              {(draft.presentaciones || []).map((p, i) => {
                const origPres = JSON.parse(original).presentaciones?.find((op: SPres) => op._key === p._key);
                const presChanged = JSON.stringify(p) !== JSON.stringify(origPres);
                return (
                  <div key={p._key} style={{ background: presChanged ? C.yellowBg : C.white, border: `1px solid ${presChanged ? C.yellowBorder : "#e5e7eb"}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                        Presentación {i + 1} {p.esDefault && <span style={{ color: C.plum }}>★ Principal</span>} {presChanged && <span style={{ color: C.orange }}>●</span>}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => {
                          // Set this as default, unset others
                          setDraft(d => ({ ...d, presentaciones: (d.presentaciones || []).map(pp => ({ ...pp, esDefault: pp._key === p._key })) }));
                        }} style={{ ...btnStyle("secondary"), height: 28, fontSize: 10 }}>{p.esDefault ? "★" : "☆"}</button>
                        <MiniToggle on={p.visibleEnWeb !== false} label={p.visibleEnWeb !== false ? "👁️" : "🚫"} onClick={() => updatePres(p._key, "visibleEnWeb", !p.visibleEnWeb)} disabled={false} title="Visible" />
                        <button onClick={() => removePres(p._key)} style={{ ...btnStyle("secondary"), height: 28, fontSize: 11, color: C.red }}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                      <MiniInput label="Nombre" value={p.nombre || ""} onChange={val => updatePres(p._key, "nombre", val)} placeholder="Ej: Unidad, Pqt x100" />
                      <MiniInput label="Factor" value={p.factorConversion != null ? String(p.factorConversion) : ""} onChange={val => updatePres(p._key, "factorConversion", Number(val) || 1)} type="number" />
                      <MiniInput label="Precio S/" value={p.precio != null ? String(p.precio) : ""} onChange={val => updatePres(p._key, "precio", val === "" ? null : Number(val))} type="number" placeholder="Consultar" />
                    </div>
                  </div>
                );
              })}
              {(!draft.presentaciones || draft.presentaciones.length === 0) && (
                <div style={{ textAlign: "center", padding: 32, color: C.inkSoft, fontSize: 13, background: C.white, borderRadius: 12, border: `1px dashed ${C.line}` }}>
                  Sin presentaciones. Agrega las formas en que se vende este producto (unidad, paquete, metro...).
                </div>
              )}
            </div>
          )}

          {/* ── Imágenes ── */}
          {tab === "imagenes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: C.inkSoft }}>{draft.imagenes?.length || 0} imágenes</span>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} />
                  <button onClick={() => fileRef.current?.click()} style={btnStyle("primary")}>📷 Subir imágenes</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {(draft.imagenes || []).map((img, i) => {
                  const url = img.asset?.url || (img.asset?._ref ? `https://cdn.sanity.io/images/${client.config().projectId}/${client.config().dataset}/${img.asset._ref.replace("image-", "").replace(/-(\w+)$/, ".$1")}` : null);
                  return (
                    <div key={img._key || i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.line}`, aspectRatio: "4/3", background: "#f3f4f6" }}>
                      {url && <img src={`${url}?w=300&h=225&fit=crop`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      <button onClick={() => removeImage(i)}
                        style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(220,38,38,0.9)", color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ×
                      </button>
                      <div style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>
                        {i + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(!draft.imagenes || draft.imagenes.length === 0) && (
                <div onClick={() => fileRef.current?.click()}
                  style={{ textAlign: "center", padding: 48, color: C.inkSoft, fontSize: 13, background: C.white, borderRadius: 12, border: `2px dashed ${C.line}`, cursor: "pointer" }}>
                  📷 Haz clic para subir la primera imagen
                </div>
              )}

              {changed("imagenes") && (
                <div style={{ padding: "8px 12px", background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 8, fontSize: 12, color: C.orange }}>
                  ⚠️ Las imágenes se han modificado. Haz clic en "Guardar" para aplicar los cambios.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable small components ─────────────────────────────────────
function Field({ label, modified, children }: { label: string; modified?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.inkSoft, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label} {modified && <span style={{ color: C.orange }}>●</span>}
      </label>
      {children}
    </div>
  );
}

function ToggleField({ label, value, onChange, modified }: { label: string; value: boolean; onChange: (v: boolean) => void; modified?: boolean }) {
  return (
    <div style={{ background: modified ? C.yellowBg : C.white, border: `1px solid ${modified ? C.yellowBorder : "#e5e7eb"}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: C.ink }}>{label} {modified && <span style={{ color: C.orange }}>●</span>}</span>
      <button onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", position: "relative", background: value ? C.green : "#d1d5db", transition: "background 0.2s" }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: value ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

function MiniInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: C.inkSoft, marginBottom: 3 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ ...inputStyle(C.white, "#d1d5db"), height: 30, fontSize: 12 }} />
    </div>
  );
}

function inputStyle(bg: string, border: string): React.CSSProperties {
  return { width: "100%", height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", background: bg, transition: "border-color 0.2s, background 0.2s", boxSizing: "border-box" };
}

function btnStyle(type: "primary" | "secondary" | "save"): React.CSSProperties {
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, height: 32, padding: "0 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
  if (type === "primary") return { ...base, background: C.plum, color: "#fff" };
  if (type === "save") return { ...base, background: C.green, color: "#fff" };
  return { ...base, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" };
}
