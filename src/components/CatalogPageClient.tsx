"use client";

import { useMemo, useState } from "react";
import type { Categoria, ProductoFlat, SanityImage } from "@/types";
import type { ContactLink } from "@/lib/social";
import BackgroundDecor from "./BackgroundDecor";
import Navbar from "./Navbar";
import Catalogo from "./Catalogo";
import Footer from "./Footer";
import FabWhatsApp from "./FabWhatsApp";
import ScrollToTop from "./ScrollToTop";

interface CatalogBrand {
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

export default function CatalogPageClient({
  brand,
  productos,
  categorias,
  initialQuery = "",
  initialCategorySlug,
}: {
  brand: CatalogBrand;
  productos: ProductoFlat[];
  categorias: Categoria[];
  initialQuery?: string;
  initialCategorySlug?: string;
}) {
  const [catalogQuery, setCatalogQuery] = useState(initialQuery);
  const floatingContacts = useMemo(
    () => (brand.floatingContacts.length ? brand.floatingContacts : brand.socialLinks),
    [brand.floatingContacts, brand.socialLinks],
  );

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
      <main className="catalog-page">
        <Catalogo
          productos={productos}
          categorias={categorias}
          brand={brand}
          externalQuery={initialQuery}
          searchAllCategories={Boolean(initialQuery)}
          initialCategorySlug={initialQuery ? undefined : initialCategorySlug}
          hideLocalSearch
        />
      </main>
      <Footer brand={brand} />
      <FabWhatsApp contacts={floatingContacts} />
      <ScrollToTop />
    </>
  );
}
