import type { Metadata } from "next";
import Link from "next/link";
import CatalogShell from "@/components/catalogosPdf/CatalogShell";
import { getCatalogosPdf } from "@/lib/catalogosPdfQueries";
import { absoluteUrl, brandShareImage, sanityImageUrl } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catálogos PDF | Comercial Víctor", description: "Explora y comparte nuestros catálogos de temporada. Ideas y productos para cada celebración.",
  alternates: {canonical:absoluteUrl("/catalogos")},
  openGraph: {title:"Catálogos PDF | Comercial Víctor",description:"Descubre nuestros catálogos de temporada.",url:absoluteUrl("/catalogos"),images:[{url:brandShareImage(),width:1200,height:630}]},
  twitter: {card:"summary_large_image",images:[brandShareImage()]},
};
export default async function CatalogosPage() {
  const catalogs = await getCatalogosPdf();
  return <CatalogShell><header className="pdf-page-heading"><span className="pdf-eyebrow">COMERCIAL VÍCTOR · INSPÍRATE Y CELEBRA</span><h1 className="serif">Nuestros catálogos PDF</h1><p>Encuentra ideas para tu próxima celebración. Abre tu catálogo favorito y compártelo con quien quieras.</p></header>
    {catalogs.length ? <div className="pdf-grid">{catalogs.map(c => <article className="pdf-public-card" key={c._id}><Link href={`/catalogos/${c.slug.current}`} tabIndex={-1} aria-hidden="true"><img src={sanityImageUrl(c.portada,{width:800,height:500,fit:"crop"}) || "/catalogo-pdf-cover.svg"} alt="" /></Link><div>{c.etiqueta && <span className="pdf-badge">{c.etiqueta}</span>}<h2 className="serif">{c.titulo}</h2><p className="pdf-excerpt">{c.descripcion || "Descubre todo lo que preparamos para esta temporada."}</p><Link className="pdf-primary" href={`/catalogos/${c.slug.current}`}>Abrir catálogo <span aria-hidden="true">↗</span></Link></div></article>)}</div> : <div className="pdf-empty"><h2 className="serif">Estamos preparando nuevas ideas para ti</h2><p>Pronto compartiremos nuestros próximos catálogos. Mientras tanto, descubre todos nuestros productos.</p><Link className="pdf-primary" href="/catalog">Explorar productos</Link></div>}
  </CatalogShell>;
}
