import type { useClient } from "sanity";
type SanityClient = ReturnType<typeof useClient>;
import { type CatalogoPdf, type PdfAsset, validCatalogSlug, validatePdfMetadata } from "../../../../src/lib/catalogosPdf";

export type EditorCatalog = CatalogoPdf & { published?: CatalogoPdf; hasDraft?: boolean };
export function mergeCatalogs(rows: CatalogoPdf[]): EditorCatalog[] {
  const result = new Map<string, EditorCatalog>();
  for (const row of rows.filter(r => !r._id.startsWith("drafts."))) result.set(row._id, { ...row, published: row });
  for (const row of rows.filter(r => r._id.startsWith("drafts."))) {
    const id = row._id.replace(/^drafts\./, "");
    result.set(id, { ...row, published: result.get(id)?.published, hasDraft: true });
  }
  return [...result.values()].sort((a,b) => (a.orden || 0) - (b.orden || 0) || a._id.localeCompare(b._id));
}
export async function saveCatalog(client: SanityClient, catalog: CatalogoPdf & { published?: CatalogoPdf }, publish: boolean) {
  const raw = client.withConfig({ perspective: "raw" });
  const id = catalog._id.replace(/^drafts\./, "");
  const [live, draft] = await raw.getDocuments<CatalogoPdf>([id, `drafts.${id}`]);
  // Optimistic concurrency protects edits from another administrator.
  const current = catalog._id.startsWith("drafts.") ? draft : live;
  if ((catalog._rev && current?._rev !== catalog._rev) || (catalog.published && live?._rev !== catalog.published._rev)) throw new Error("Otra persona modificó este catálogo. Cierra el formulario, actualiza la lista y vuelve a intentarlo.");
  const slug = catalog.slug.current;
  if (!catalog.titulo.trim() || catalog.titulo.trim().length > 180) throw new Error("Escribe un título de hasta 180 caracteres.");
  if (!validCatalogSlug(slug)) throw new Error("El enlace debe usar minúsculas, números y guiones, con un máximo de 96 caracteres. No uses rutas reservadas.");
  const lockedSlug = live?.publicadoSlug || (live?.visible ? live.slug.current : undefined) || draft?.publicadoSlug;
  if (lockedSlug && lockedSlug !== slug) throw new Error("El enlace ya fue publicado y no puede cambiar.");
  if (!Number.isInteger(catalog.orden) || catalog.orden < 0) throw new Error("El orden debe ser un número entero igual o mayor a cero.");
  if (catalog.fechaCaducidad && !Number.isFinite(Date.parse(catalog.fechaCaducidad))) throw new Error("Revisa la fecha de caducidad.");
  const duplicate = await raw.fetch<number>(`count(*[_type == "catalogoPdf" && slug.current == $slug && !(_id in [$id,$draft]) && !(_id in path("versions.**"))])`, { slug, id, draft: `drafts.${id}` });
  if (duplicate) throw new Error("Ese enlace ya pertenece a otro catálogo. Elige uno diferente.");
  if (publish || catalog.archivo?.asset?._ref) {
    const asset = catalog.archivo?.asset?._ref ? await raw.getDocument<PdfAsset>(catalog.archivo.asset._ref) : undefined;
    validatePdfMetadata(asset);
  }
  if (publish && catalog.fechaCaducidad && Date.parse(catalog.fechaCaducidad) <= Date.now()) throw new Error("La fecha de caducidad ya pasó. Elige una fecha futura o quítala antes de publicar.");
  const data = {
    _type: "catalogoPdf", titulo: catalog.titulo.trim(), slug: { _type: "slug", current: slug },
    descripcion: catalog.descripcion || "", etiqueta: catalog.etiqueta || "", orden: catalog.orden,
    archivo: catalog.archivo || null, portada: catalog.portada || null,
    fechaCaducidad: catalog.fechaCaducidad || null, coleccionRelacionada: catalog.coleccionRelacionada || null,
    visible: publish, publicadoSlug: lockedSlug || (publish ? slug : null),
  };
  let trx = raw.transaction();
  // A permanent reservation makes slug uniqueness atomic, including simultaneous creates.
  const reservationId = `catalogoPdfSlug.${slug}`;
  const reservation = await raw.getDocument<{_id: string; catalogId: string}>(reservationId);
  if (reservation && reservation.catalogId !== id) throw new Error("Este enlace ya está reservado. Elige uno diferente.");
  if (!reservation) trx = trx.create({ _id: reservationId, _type: "catalogoPdfSlug", catalogId: id });
  const targetId = publish ? id : `drafts.${id}`;
  const target = publish ? live : draft;
  if (target) trx = trx.patch(targetId, p => p.ifRevisionId(target._rev!).set(data));
  else trx = trx.create({ _id: targetId, ...data });
  if (publish && draft) trx = trx.patch(draft._id, p => p.ifRevisionId(draft._rev!).set({ visible: false })).delete(draft._id);
  await trx.commit();
}
export async function hideCatalog(client: SanityClient, catalog: EditorCatalog) {
  if (!catalog.published) return;
  await client.patch(catalog.published._id).ifRevisionId(catalog.published._rev!).set({ visible: false, publicadoSlug: catalog.published.publicadoSlug || catalog.published.slug.current }).commit();
}
export async function deleteCatalog(client: SanityClient, catalog: EditorCatalog) {
  const id = catalog._id.replace(/^drafts\./, "");
  let trx = client.transaction();
  if (catalog.published) trx = trx.patch(id,p => p.ifRevisionId(catalog.published!._rev!).set({ visible: false })).delete(id);
  if (catalog.hasDraft) trx = trx.patch(`drafts.${id}`,p => p.ifRevisionId(catalog._rev!).set({ visible: false })).delete(`drafts.${id}`);
  await trx.commit();
  // Assets and slug reservations are intentionally retained: shared links are never reassigned.
}
