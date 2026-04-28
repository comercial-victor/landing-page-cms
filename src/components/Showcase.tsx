"use client";

import { useState } from "react";
import type { ProductoFlat } from "@/types";
import { ProductImage, Badges, PriceDisplay } from "./ProductHelpers";
import ProductModal from "./ProductModal";

interface ShowcaseProps {
  productos: ProductoFlat[];
  whatsapp?: string;
}

function ProductCard({ producto, onOpen }: { producto: ProductoFlat; onOpen: (p: ProductoFlat) => void }) {
  return (
    <article
      className="pcard"
      onClick={() => onOpen(producto)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(producto); }}
      tabIndex={0}
      role="button"
      aria-label={`Ver detalle de ${producto.nombre}`}
    >
      <div className="pcard-img">
        <div className="pcard-img-inner">
          <ProductImage producto={producto} />
        </div>
        <div className="pcard-badges">
          <Badges producto={producto} />
        </div>
      </div>
      <div className="pcard-body">
        <div className="pcard-cat">{producto._subcategoria}</div>
        <h3 className="pcard-name">{producto.nombre}</h3>
        <div className="pcard-foot">
          <PriceDisplay producto={producto} />
          <div className="pcard-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </div>
        </div>
      </div>
    </article>
  );
}

export { ProductCard };

export default function Showcase({ productos, whatsapp = "51987654321" }: ShowcaseProps) {
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);

  if (!productos.length) return null;

  return (
    <>
      <section className="section" id="novedades">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">Novedades · más pedidos</div>
              <h2 className="section-title">
                Lo que está brillando<br />esta temporada
              </h2>
            </div>
            <p className="section-lede">
              Curaduría rápida de lo más movido del mes — pedí el tuyo antes de que se acabe.
            </p>
          </div>
          <div className="showcase-grid">
            {productos.map((p) => (
              <ProductCard key={p._id} producto={p} onOpen={setOpenProduct} />
            ))}
          </div>
        </div>
      </section>

      <ProductModal
        producto={openProduct}
        onClose={() => setOpenProduct(null)}
        whatsapp={whatsapp}
      />
    </>
  );
}
