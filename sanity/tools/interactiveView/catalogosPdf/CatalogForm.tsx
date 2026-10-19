import React, { useEffect, useRef, useState } from "react";
import type { useClient } from "sanity";
type SanityClient = ReturnType<typeof useClient>;
import { catalogSlug, PDF_MAX_MB, validatePdfFile, type CatalogoPdf } from "../../../../src/lib/catalogosPdf";
import { sanityImageUrl } from "../../../../src/lib/metadata";
import { saveCatalog, type EditorCatalog } from "./catalogService";

export function CatalogForm({ catalog, client, collections, onClose, onSaved }: {
  catalog: EditorCatalog; client: SanityClient; collections: { _id: string; titulo: string }[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<CatalogoPdf>(catalog);
  const initialForm = useRef(JSON.stringify(catalog));
  const hasChanges = JSON.stringify(form) !== initialForm.current;
  const [customSlug, setCustomSlug] = useState(Boolean(catalog.slug.current));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const operation = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const locked = Boolean(catalog.publicadoSlug || catalog.published);
  useEffect(() => {
    if (!hasChanges && !busy) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasChanges, busy]);
  function requestClose() {
    if (operation.current) return;
    if (hasChanges && !window.confirm("Tienes cambios sin guardar. Si sales, se perderán. ¿Deseas salir de todos modos?\n\nPara conservarlos, pulsa Cancelar y luego Guardar borrador.")) return;
    onClose();
  }
  function set<K extends keyof CatalogoPdf>(key: K, value: CatalogoPdf[K]) { setForm(f => ({ ...f, [key]: value })); }
  async function upload(file?: File, image = false) {
    if (!file || operation.current) return;
    operation.current = true; setBusy(image ? "Subiendo portada…" : "Validando y subiendo PDF…"); setError("");
    try {
      if (image) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error("Usa una portada JPG, PNG o WebP de hasta 10 MB.");
      } else await validatePdfFile(file);
      const asset = await client.assets.upload(image ? "image" : "file", file, { filename: file.name, contentType: file.type });
      if (image) set("portada", { _type: "image", asset: { _type: "reference", _ref: asset._id } });
      else setForm(f => ({ ...f, archivo: { _type: "file", asset: { _type: "reference", _ref: asset._id } }, pdf: { _id: asset._id, url: asset.url, size: asset.size, mimeType: asset.mimeType, originalFilename: asset.originalFilename || file.name } }));
    } catch (e) { setError((e as Error).message || "No pudimos subir el archivo. Revisa tu conexión e inténtalo nuevamente."); }
    finally { operation.current = false; setBusy(""); }
  }
  async function save(publish: boolean) {
    if (operation.current) return;
    operation.current = true; setBusy("Guardando…"); setError("");
    try { await saveCatalog(client, form, publish); await onSaved(); onClose(); }
    catch(e) { setError((e as Error).message || "No pudimos guardar. Tus datos siguen aquí; inténtalo nuevamente."); }
    finally { operation.current = false; setBusy(""); }
  }
  const image = sanityImageUrl(form.portada, { width: 480, height: 320, fit: "crop" });
  return <dialog ref={node => { dialog.current = node; if (node && !node.open) node.showModal(); }} className="pdf-dialog" onCancel={e => { e.preventDefault(); requestClose(); }} aria-labelledby="pdf-form-title">
    <form onSubmit={e => { e.preventDefault(); void save(true); }}>
      <header><h2 id="pdf-form-title">{catalog._rev ? "Editar catálogo PDF" : "Crear catálogo PDF"}</h2><button type="button" disabled={!!busy} onClick={requestClose} aria-label="Cerrar">×</button></header>
      <fieldset disabled={!!busy}>
        <legend>Información del catálogo</legend>
        <label>Título *<input required maxLength={180} value={form.titulo} onChange={e => { const titulo = e.target.value; setForm(f => ({ ...f, titulo, slug: !locked && !customSlug ? { _type: "slug", current: catalogSlug(titulo) } : f.slug })); }} /></label>
        <label>Enlace personalizado *<input required readOnly={locked} value={form.slug.current} onChange={e => { setCustomSlug(true); set("slug", { _type: "slug", current: e.target.value }); }} /></label>
        <small>/catalogos/{form.slug.current || "nombre-del-catalogo"}. {locked ? "El enlace está bloqueado para conservar las URLs compartidas." : "Usa letras minúsculas, números y guiones."}</small>
        <label>Descripción<textarea rows={3} value={form.descripcion || ""} onChange={e => set("descripcion", e.target.value)} /></label>
        <label>Temporada o etiqueta<input value={form.etiqueta || ""} placeholder="Halloween, Navidad, campaña escolar…" onChange={e => set("etiqueta", e.target.value)} /></label>
      </fieldset>
      <fieldset disabled={!!busy}>
        <legend>PDF y portada</legend>
        <div className="pdf-drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void upload(e.dataTransfer.files[0]); }}>
          <label>{form.pdf ? "Reemplazar PDF" : "Subir PDF"} · máximo {PDF_MAX_MB} MB<input type="file" accept="application/pdf,.pdf" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label>
          <small>También puedes arrastrar el PDF aquí. Reemplazarlo conserva el enlace del catálogo.</small>
          {form.pdf && <p>{form.pdf.originalFilename} · {(form.pdf.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <label>Portada opcional<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0], true); e.target.value = ""; }} /></label>
        {image && <><img src={image} alt="Vista previa de la portada" className="pdf-form-cover" /><button type="button" onClick={() => set("portada", undefined)}>Quitar portada</button></>}
        <small>Sin portada se mostrará el diseño de Comercial Víctor.</small>
      </fieldset>
      <fieldset disabled={!!busy}>
        <legend>Publicación</legend>
        <p>Estado actual en la web: {catalog.published?.visible ? "publicado" : "oculto / borrador"}. Guardar borrador conserva la versión pública actual.</p>
        <label>Orden de aparición<input type="number" min={0} step={1} required value={form.orden} onChange={e => set("orden", Number(e.target.value))} /></label>
        <label>Caduca el (hora local de este dispositivo)<input type="datetime-local" value={form.fechaCaducidad ? localDate(form.fechaCaducidad) : ""} onChange={e => set("fechaCaducidad", e.target.value ? new Date(e.target.value).toISOString() : undefined)} /></label>
        <label>Colección relacionada<select value={form.coleccionRelacionada?._ref || ""} onChange={e => set("coleccionRelacionada", e.target.value ? { _type: "reference", _ref: e.target.value } : undefined)}><option value="">Ninguna</option>{collections.map(c => <option key={c._id} value={c._id}>{c.titulo}</option>)}</select></label>
        <small>Ocultar elimina la página pública. El PDF puede seguir accesible mediante su enlace directo en el CDN de Sanity.</small>
      </fieldset>
      {error && <p role="alert" className="pdf-error">{error}</p>}
      {busy && <p role="status">{busy}</p>}
      <footer><button type="button" disabled={!!busy} onClick={requestClose}>Cancelar</button><button type="button" disabled={!!busy} onClick={() => void save(false)}>Guardar borrador</button><button type="submit" disabled={!!busy} className="pdf-primary">Publicar</button></footer>
    </form>
  </dialog>;
}
function localDate(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
