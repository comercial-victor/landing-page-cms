import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogShell from "@/components/catalogosPdf/CatalogShell";
import CatalogShare from "@/components/catalogosPdf/CatalogShare";
import { getCatalogoPdfPorSlug } from "@/lib/catalogosPdfQueries";
import { getSiteSettings } from "@/lib/queries";
import { absoluteUrl, brandShareImage, sanityImageUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";
type Props = {params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {slug} = await params;
  const [c,settings] = await Promise.all([getCatalogoPdfPorSlug(slug),getSiteSettings()]);
  if(!c) notFound();
  const title = `${c.titulo} | ${settings?.nombre || "Comercial Víctor"}`;
  const description = c.descripcion || `Descubre el catálogo ${c.titulo} de Comercial Víctor.`;
  const url = absoluteUrl(`/catalogos/${c.slug.current}`);
  const image = sanityImageUrl(c.portada,{width:1200,height:630,fit:"crop"}) || brandShareImage(settings);
  return {title,description,alternates:{canonical:url},openGraph:{title,description,url,siteName:settings?.nombre || "Comercial Víctor",type:"website",locale:"es_PE",images:[{url:image,width:1200,height:630,alt:c.titulo}]},twitter:{card:"summary_large_image",title,description,images:[image]}};
}
export default async function CatalogoPage({params}:Props) {
  const {slug} = await params; const c = await getCatalogoPdfPorSlug(slug);
  if(!c?.pdf) notFound();
  const pdfUrl = c.pdf.url;
  const download = new URL(pdfUrl); download.searchParams.set("dl", c.pdf.originalFilename || `${slug}.pdf`);
  const collection = c.coleccion;
  return <CatalogShell><Link className="pdf-back" href="/catalogos">← Todos los catálogos</Link><section className="pdf-detail-heading"><img className="pdf-detail-cover" src={sanityImageUrl(c.portada,{width:900,height:700,fit:"crop"}) || "/catalogo-pdf-cover.svg"} alt={`Portada de ${c.titulo}`} /><div><span className="pdf-eyebrow">COMERCIAL VÍCTOR</span>{c.etiqueta && <p><span className="pdf-badge">{c.etiqueta}</span></p>}<h1 className="serif">{c.titulo}</h1>{c.descripcion && <p className="pdf-description">{c.descripcion}</p>}<p className="pdf-file-info">PDF · {(c.pdf.size / 1024 / 1024).toFixed(1)} MB</p><div className="pdf-actions"><a className="pdf-primary" href={pdfUrl} target="_blank" rel="noopener noreferrer">Ver catálogo ↗</a><a href={download.toString()} download>Descargar PDF ↓</a></div><CatalogShare title={c.titulo} url={absoluteUrl(`/catalogos/${c.slug.current}`)} />{collection?.slug && collection.visible !== false && (collection.items || 0) > 0 && <Link href={`/colecciones/${collection.slug}`}>Explorar colección: {collection.titulo} →</Link>}</div></section>
    <section className="pdf-viewer-section" aria-label="Visor del catálogo"><h2 className="serif">Explora el catálogo</h2><p>Si tu navegador móvil no muestra el documento, <a href={pdfUrl} target="_blank" rel="noopener noreferrer">abre el PDF directamente</a> o descárgalo para verlo.</p><object data={`${pdfUrl}#view=FitH`} type="application/pdf" className="pdf-viewer" aria-label={`Visor PDF: ${c.titulo}`}><p>Este navegador no permite mostrar el PDF aquí. <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Abrir catálogo PDF</a></p></object></section>
  </CatalogShell>;
}
