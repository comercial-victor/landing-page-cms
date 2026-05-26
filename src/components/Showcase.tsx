"use client";

import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { ProductoFlat } from "@/types";
import { ProductImage } from "./ProductHelpers";
import ProductModal from "./ProductModal";
import type { ContactLink } from "@/lib/social";

interface ShowcaseProps {
  productos: ProductoFlat[];
  whatsapp?: string;
  contact?: ContactLink;
}

function ProductRailCard({
  producto,
  index,
  row,
  onOpen,
}: {
  producto: ProductoFlat;
  index: number;
  row: number;
  onOpen: (producto: ProductoFlat) => void;
}) {
  const format = index % 3 === 1 ? "horizontal" : "vertical";
  const rotation = [-4, 3, -2, 4, -3][(index + row) % 5];

  return (
    <button
      className={`hero-rail-card hero-rail-card-${format} product-rail-card`}
      type="button"
      onClick={() => onOpen(producto)}
      aria-label={`Ver ${producto.nombre}`}
      style={{ "--hero-rotate": `${rotation}deg` } as CSSProperties}
    >
      <span className="hero-rail-media">
        <ProductImage producto={producto} className="hero-rail-product-img" />
      </span>
      <span className="hero-rail-copy">
        <span>{producto._categoria || producto._subcategoria || "Producto"}</span>
        <strong>{producto.nombre}</strong>
      </span>
    </button>
  );
}

export default function Showcase({ productos, whatsapp = "51987654321", contact }: ShowcaseProps) {
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);
  const [railDrag, setRailDrag] = useState(0);
  const [isRailDragging, setIsRailDragging] = useState(false);
  const [isRailSettling, setIsRailSettling] = useState(false);
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0, didDrag: false });
  const clickGuardRef = useRef(false);
  const featured = productos.slice(0, 12);

  if (!featured.length) return null;

  const handleRailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragRef.current = { active: true, startX: event.clientX, startOffset: railDrag, didDrag: false };
    setIsRailDragging(true);
    setIsRailSettling(false);

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers can drop the pointer before capture; dragging still works without it.
    }
  };

  const handleRailPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const delta = event.clientX - dragRef.current.startX;
    if (Math.abs(delta) > 5) {
      dragRef.current.didDrag = true;
      event.preventDefault();
    }

    setRailDrag(Math.max(-960, Math.min(960, dragRef.current.startOffset + delta)));
  };

  const endRailDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const didDrag = dragRef.current.didDrag;
    dragRef.current.active = false;
    setIsRailDragging(false);
    setIsRailSettling(true);
    window.setTimeout(() => setIsRailSettling(false), 360);

    if (didDrag) {
      clickGuardRef.current = true;
      window.setTimeout(() => {
        clickGuardRef.current = false;
      }, 160);
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Pointer capture is best-effort only.
    }
  };

  const openRailProduct = (producto: ProductoFlat) => {
    if (clickGuardRef.current) return;
    setOpenProduct(producto);
  };

  return (
    <>
      <section className="section precatalog-section" id="pre-catalogo">
        <div className="container">
          <div className="precatalog-showcase">
            <div className="precatalog-copy">
              <div className="section-kicker">Precatálogo</div>
              <h2 className="section-title">
                Artículos destacados<br />para empezar tu pedido.
              </h2>
              <a className="btn btn-plum btn-lg" href="/catalog">
                Ir al catálogo completo
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M7 7h10v10" />
                </svg>
              </a>
            </div>

            <div
              className={`hero-rail-wrap precatalog-rail ${openProduct ? "is-modal-open" : ""} ${isRailDragging ? "is-dragging" : ""} ${isRailSettling ? "is-settling" : ""}`}
              style={{ "--hero-drag": `${railDrag}px` } as CSSProperties}
              onPointerDown={handleRailPointerDown}
              onPointerMove={handleRailPointerMove}
              onPointerUp={endRailDrag}
              onPointerCancel={endRailDrag}
              onDragStart={(event) => event.preventDefault()}
              aria-label="Productos destacados del precatálogo"
            >
              {[0, 1].map((row) => {
                const splitItems = featured.filter((_, index) => index % 2 === row);
                const rowItems = splitItems.length ? splitItems : featured;
                const loopItems = [...rowItems, ...rowItems, ...rowItems];

                return (
                  <div key={row} className={`hero-rail hero-rail-${row === 0 ? "top" : "bottom"}`}>
                    {loopItems.map((producto, index) => (
                      <ProductRailCard
                        key={`${producto._id}-${row}-${index}`}
                        producto={producto}
                        index={index}
                        row={row}
                        onOpen={openRailProduct}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <ProductModal
        producto={openProduct}
        onClose={() => setOpenProduct(null)}
        whatsapp={whatsapp}
        contact={contact}
      />
    </>
  );
}
