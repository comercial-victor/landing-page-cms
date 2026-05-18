"use client";

import { useMemo, useState } from "react";
import type { Categoria, ProductoFlat } from "@/types";
import { ProductCard } from "./Showcase";
import ProductModal from "./ProductModal";
import type { ContactLink } from "@/lib/social";

interface CatalogPreviewProps {
  productos: ProductoFlat[];
  categorias: Categoria[];
  whatsapp: string;
  contact?: ContactLink;
}

export default function CatalogPreview({ productos, categorias, whatsapp, contact }: CatalogPreviewProps) {
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);

  const featured = useMemo(() => {
    const byCategory = new Map<string, ProductoFlat>();
    productos.forEach((producto) => {
      if (!byCategory.has(producto._categoriaId)) byCategory.set(producto._categoriaId, producto);
    });

    const ordered = categorias
      .map((categoria) => byCategory.get(categoria._id))
      .filter(Boolean) as ProductoFlat[];

    return (ordered.length ? ordered : productos).slice(0, 6);
  }, [categorias, productos]);

  if (!featured.length) return null;

  return (
    <>
      <section className="section catalog-preview" id="catalogo-preview">
        <div className="container">
          <div className="section-head catalog-preview-head">
            <div>
              <div className="section-kicker">Mira nuestro catálogo</div>
              <h2 className="section-title">
                Explora por categoria,<br />elige sin complicarte.
              </h2>
            </div>
            <div className="catalog-preview-copy">
              <p className="section-lede">
                Una vista rápida de nuestras líneas más buscadas. El catálogo completo tiene filtros, buscador y todos los productos disponibles.
              </p>
              <a className="btn btn-plum btn-lg" href="/catalog">
                Ver catálogo completo
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            </div>
          </div>

          <div className="catalog-preview-grid">
            {featured.map((producto) => (
              <ProductCard key={producto._id} producto={producto} onOpen={setOpenProduct} />
            ))}
          </div>
        </div>
      </section>

      <ProductModal producto={openProduct} onClose={() => setOpenProduct(null)} whatsapp={whatsapp} contact={contact} />
    </>
  );
}
