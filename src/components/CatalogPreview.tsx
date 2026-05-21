"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Categoria, ProductoFlat } from "@/types";
import { ProductImage } from "./ProductHelpers";
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
  const [paused, setPaused] = useState(false);

  const featured = useMemo(() => {
    const byCategory = new Map<string, ProductoFlat>();
    productos.forEach((producto) => {
      if (!byCategory.has(producto._categoriaId)) byCategory.set(producto._categoriaId, producto);
    });

    const ordered = categorias
      .map((categoria) => byCategory.get(categoria._id))
      .filter(Boolean) as ProductoFlat[];

    return (ordered.length ? ordered : productos).slice(0, 14);
  }, [categorias, productos]);

  if (!featured.length) return null;

  return (
    <>
      <section className="section catalog-preview" id="catalogo-preview">
        <div className="container">
          <div className="catalog-preview-showcase">
            <div className="catalog-preview-intro">
              <div className="section-kicker">Mira nuestro catálogo</div>
              <h2 className="section-title">
                Explora por categoría,<br />elige sin complicarte.
              </h2>
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

            <div
              className={`catalog-preview-rails ${paused || openProduct ? "paused" : ""}`}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              {[0, 1].map((row) => {
                const rowItems = featured.filter((_, index) => index % 2 === row);
                const loopItems = [...rowItems, ...rowItems, ...rowItems];
                return (
                  <div key={row} className={`catalog-rail catalog-rail-${row === 0 ? "right" : "left"}`}>
                    {loopItems.map((producto, index) => (
                      <button
                        key={`${producto._id}-${row}-${index}`}
                        className="catalog-rail-card"
                        type="button"
                        onClick={() => setOpenProduct(producto)}
                        aria-label={`Ver ${producto.nombre}`}
                        style={{ "--cat-color": producto._categoriaColor } as CSSProperties}
                      >
                        <span className="catalog-rail-img">
                          <ProductImage producto={producto} />
                        </span>
                        <span className="catalog-rail-overlay" />
                        <span className="catalog-rail-color-edge" aria-hidden="true" />
                        <span className="catalog-rail-copy">
                          <span>{producto._categoria || producto._subcategoria}</span>
                          <strong>{producto.nombre}</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <ProductModal producto={openProduct} onClose={() => setOpenProduct(null)} whatsapp={whatsapp} contact={contact} />
    </>
  );
}
