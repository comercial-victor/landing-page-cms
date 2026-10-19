import React, { useCallback, useEffect, useRef, useState } from "react";
import type { useClient } from "sanity";
type SanityClient = ReturnType<typeof useClient>;
import { catalogStatus, catalogWhatsapp, type CatalogoPdf } from "../../../../src/lib/catalogosPdf";
import { editorCatalogQuery } from "../../../../src/lib/catalogosPdfQueries";
import { absoluteUrl, sanityImageUrl } from "../../../../src/lib/metadata";
import { CatalogForm } from "./CatalogForm";
import { deleteCatalog, hideCatalog, mergeCatalogs, saveCatalog, type EditorCatalog } from "./catalogService";

export function CatalogManager({client}: {client: SanityClient}) {
  const [catalogs, setCatalogs] = useState<EditorCatalog[]>([]);
  const [collections, setCollections] = useState<{_id:string;titulo:string}[]>([]);
  const [editing, setEditing] = useState<EditorCatalog | null>(null);
  const [deleting, setDeleting] = useState<EditorCatalog | null>(null);
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false); const operation = useRef(false);
  const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    const raw = client.withConfig({ perspective: "raw", useCdn: false });
    const [rows, albums] = await Promise.all([raw.fetch<CatalogoPdf[]>(editorCatalogQuery), raw.fetch<{_id:string;titulo:string}[]>(`*[_type == "album" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))] | order(titulo asc){_id,titulo}`)]);
    setCatalogs(mergeCatalogs(rows)); setCollections(albums);
  }, [client]);
  useEffect(() => { load().catch(() => setError("No pudimos cargar los catálogos. Revisa tu conexión y pulsa Actualizar.")).finally(() => setLoading(false)); }, [load]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  async function run(action: () => Promise<unknown>, success: string) {
    if (operation.current) return; operation.current = true; setBusy(true); setError(""); setMessage("");
    try { await action(); await load(); setMessage(success); } catch (e) { setError((e as Error).message || "No se pudo completar la operación. Inténtalo nuevamente."); }
    finally { operation.current = false; setBusy(false); }
  }
  return <section className="pdf-admin" aria-label="Gestión de catálogos PDF">
    <div className="pdf-toolbar"><div><h2>Catálogos PDF</h2><p>Prepara, publica y comparte tus campañas.</p></div><button disabled={busy} onClick={() => void run(load,"Lista actualizada.")}>Actualizar</button><button className="pdf-primary" disabled={busy} onClick={() => setEditing({ _id: `catalogoPdf.${crypto.randomUUID()}`, _type: "catalogoPdf", titulo: "", slug: {_type:"slug",current:""}, visible: false, orden: catalogs.length })}>+ Crear catálogo</button></div>
    <div className="pdf-toolbar"><input aria-label="Buscar catálogos por título" placeholder="Buscar por título…" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Filtrar por estado" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todos los estados</option>{["Publicado","Oculto","Caducado"].map(s => <option key={s}>{s}</option>)}</select></div>
    {error && <p role="alert" className="pdf-error">{error}</p>}{message && <p role="status">{message}</p>}{busy && <p role="status">Guardando cambios…</p>}
    {loading ? <p role="status">Cargando catálogos…</p> : <div className="pdf-grid">{catalogs.filter(c => c.titulo.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!filter || catalogStatus(c.published || {...c,visible:false}, now) === filter)).map(c => {
      const status = catalogStatus(c.published || {...c,visible:false}, now); const url = absoluteUrl(`/catalogos/${c.slug.current}`);
      return <article key={c._id} className="pdf-admin-card">
        <img src={sanityImageUrl(c.portada, {width:640,height:400,fit:"crop"}) || "/catalogo-pdf-cover.svg"} alt="" />
        <div><span className="pdf-badge">{status}{c.hasDraft ? " · Borrador pendiente" : ""}</span><h3>{c.titulo}</h3><p className="pdf-excerpt">{c.descripcion || "Sin descripción"}</p><small>Orden: {c.orden || 0} · Actualizado: {c._updatedAt ? new Date(c._updatedAt).toLocaleString("es-PE") : "—"}</small>
        <div className="pdf-actions"><button disabled={busy} onClick={() => setEditing(c)}>Editar / reemplazar PDF</button><button disabled={busy} onClick={() => void run(() => c.published?.visible ? hideCatalog(client,c) : saveCatalog(client,c,true), c.published?.visible ? "Catálogo oculto." : "Catálogo publicado.")}>{c.published?.visible ? "Ocultar" : "Publicar"}</button>
          {status === "Publicado" && <><a href={url} target="_blank" rel="noopener noreferrer">Ver página pública</a><button onClick={() => void navigator.clipboard.writeText(url).then(() => setMessage("Enlace copiado.")).catch(() => setError(`No pudimos copiar el enlace: ${url}`))}>Copiar enlace</button><a href={catalogWhatsapp(c.titulo,url)} target="_blank" rel="noopener noreferrer">WhatsApp</a></>}
          <button disabled={busy} className="pdf-danger" onClick={() => setDeleting(c)}>Eliminar</button></div></div>
      </article>;
    })}</div>}
    {!loading && !catalogs.length && <p className="pdf-empty">Todavía no tienes catálogos PDF. Crea el primero y guárdalo como borrador o publícalo cuando esté listo.</p>}
    {!!catalogs.length && !catalogs.some(c => c.titulo.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!filter || catalogStatus(c.published || {...c,visible:false}, now) === filter)) && <p>No encontramos catálogos con esos filtros.</p>}
    {editing && <CatalogForm catalog={editing} client={client} collections={collections} onClose={() => setEditing(null)} onSaved={async () => { await load(); setMessage("Catálogo guardado correctamente."); }} />}
    {deleting && <dialog ref={node => { if(node && !node.open) node.showModal(); }} className="pdf-dialog pdf-confirm" aria-labelledby="pdf-delete-title" onCancel={e => {e.preventDefault(); if(!busy) setDeleting(null);}}><h2 id="pdf-delete-title">Eliminar «{deleting.titulo}»</h2><p>Se eliminarán el catálogo y su borrador. Su página pública dejará de funcionar. Los archivos compartidos en Sanity se conservarán.</p><div className="pdf-actions"><button disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button><button disabled={busy} className="pdf-danger" onClick={() => void run(async () => { await deleteCatalog(client,deleting); setDeleting(null); },"Catálogo eliminado.")}>Sí, eliminar catálogo</button></div>{error && <p role="alert">{error}</p>}</dialog>}
  </section>;
}
