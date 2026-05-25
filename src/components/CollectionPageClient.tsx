"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Categoria, Collection, ProductoFlat, SanityImage } from "@/types";
import type { ContactLink } from "@/lib/social";
import BackgroundDecor from "./BackgroundDecor";
import Navbar from "./Navbar";
import Catalogo from "./Catalogo";
import Footer from "./Footer";
import FabWhatsApp from "./FabWhatsApp";
import ScrollToTop from "./ScrollToTop";

interface CollectionBrand {
  nombre: string;
  tagline?: string;
  logo?: SanityImage | null;
  whatsapp: string;
  whatsappDisplay?: string;
  socialLinks: ContactLink[];
  navbarContacts: ContactLink[];
  floatingContacts: ContactLink[];
  primaryContact: ContactLink;
  direccion?: string;
  horarios?: { dia: string; hora: string; cerrado?: boolean }[];
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
}

export default function CollectionPageClient({
  brand,
  collection,
  productos,
  categorias,
}: {
  brand: CollectionBrand;
  collection: Collection;
  productos: ProductoFlat[];
  categorias: Categoria[];
}) {
  const [catalogQuery, setCatalogQuery] = useState("");
  const floatingContacts = useMemo(
    () => (brand.floatingContacts.length ? brand.floatingContacts : brand.socialLinks),
    [brand.floatingContacts, brand.socialLinks],
  );
  const themeColor = collection.themeColor || "#D2386C";

  return (
    <>
      <BackgroundDecor />
      <Navbar
        brand={brand}
        productos={productos}
        searchMode="catalog"
        catalogSearchValue={catalogQuery}
        onCatalogSearchChange={setCatalogQuery}
      />
      <main className="collection-page" style={{ "--collection-theme": themeColor } as CSSProperties}>
        <section className="collection-hero">
          <div className="collection-gradient" aria-hidden="true">
            <span className="collection-gradient-orb collection-gradient-orb-1" />
            <span className="collection-gradient-orb collection-gradient-orb-2" />
            <span className="collection-gradient-orb collection-gradient-orb-3" />
          </div>
          <div className="container collection-hero-inner">
            <div className="section-kicker">{collection.etiqueta || "Colección"}</div>
            <h1>{collection.titulo}</h1>
            {collection.subtitulo && <p>{collection.subtitulo}</p>}
            <div className="collection-hero-meta">
              <span>{productos.length} productos</span>
              <span>Lista para compartir</span>
            </div>
          </div>
        </section>

        <Catalogo
          productos={productos}
          categorias={categorias}
          brand={brand}
          externalQuery={catalogQuery}
          onExternalQueryChange={setCatalogQuery}
          hideLocalSearch
          kicker="Productos de la colección"
          title={<>Elige, cotiza<br />y comparte.</>}
          lede="Filtra dentro de esta colección y abre cualquier producto para cotizarlo por WhatsApp."
        />
      </main>
      <Footer brand={brand} />
      <FabWhatsApp contacts={floatingContacts} />
      <ScrollToTop />
    </>
  );
}
