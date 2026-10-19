import type { SanityImage } from "../types";

const configuredLimit = Number(process.env.NEXT_PUBLIC_CATALOGO_PDF_MAX_MB || 50);
export const PDF_MAX_MB = Number.isFinite(configuredLimit) && configuredLimit > 0 ? configuredLimit : 50;
export const PDF_MAX_BYTES = PDF_MAX_MB * 1024 * 1024;
export interface PdfAsset { _id: string; url: string; originalFilename: string; size: number; mimeType: string }
// Published documents must live at Sanity's root path to allow anonymous reads.
export function createCatalogId() { return `catalogoPdf-${crypto.randomUUID()}`; }
export function hasPrivateCatalogId(id: string) { return id.replace(/^drafts\./, "").includes("."); }
export interface CatalogoPdf {
  _id: string; _rev?: string; _type: "catalogoPdf"; _createdAt?: string; _updatedAt?: string;
  titulo: string; slug: { _type: "slug"; current: string }; descripcion?: string;
  archivo?: { _type: "file"; asset: { _type: "reference"; _ref: string } };
  pdf?: PdfAsset; portada?: SanityImage; visible: boolean; orden: number;
  etiqueta?: string; fechaCaducidad?: string; publicadoSlug?: string;
  coleccionRelacionada?: { _type: "reference"; _ref: string };
  coleccion?: { titulo: string; slug: string; visible?: boolean; items?: number } | null;
}
export function catalogSlug(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96).replace(/-$/, "");
}
export function validCatalogSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 96 && !["api", "studio", "catalogos", "sitemap", "robots"].includes(slug);
}
export function catalogStatus(catalog: Pick<CatalogoPdf, "visible" | "fechaCaducidad">, now = Date.now()) {
  if (catalog.fechaCaducidad && new Date(catalog.fechaCaducidad).getTime() <= now) return "Caducado";
  return catalog.visible ? "Publicado" : "Oculto";
}
export function catalogWhatsapp(title: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(`¡Ya está disponible nuestro catálogo ${title} en Comercial Víctor! Descubre nuestros productos aquí: ${url}`)}`;
}
export function validatePdfMetadata(asset?: Pick<PdfAsset, "mimeType" | "size" | "originalFilename">) {
  if (!asset || asset.mimeType !== "application/pdf" || !/\.pdf$/i.test(asset.originalFilename || "")) throw new Error("Selecciona un archivo PDF válido (.pdf y tipo application/pdf).");
  if (!asset.size || asset.size > PDF_MAX_BYTES) throw new Error(`El PDF debe pesar como máximo ${PDF_MAX_MB} MB y no estar vacío.`);
}
export async function validatePdfFile(file: File) {
  validatePdfMetadata({ mimeType: file.type, size: file.size, originalFilename: file.name });
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") throw new Error("El contenido del archivo no corresponde a un PDF. Exporta el documento nuevamente como PDF.");
}
