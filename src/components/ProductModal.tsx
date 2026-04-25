"use client";

import { useEffect, useState, useMemo } from "react";
import type { ProductoFlat } from "@/types";
import { waLink, fmtSoles } from "@/lib/utils";
import { ProductImage, Badges, PriceDisplay } from "./ProductHelpers";

interface ProductModalProps {
  producto: ProductoFlat | null;
  onClose: () => void;
  whatsapp: string;
}

export default function ProductModal({ producto, onClose, whatsapp }: ProductModalProps) {
  useEffect(() => {
    if (!producto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [producto, onClose]);

  const packInfo = useMemo(() => {
    if (!producto || producto.tipo !== "pack" || !producto.componentesPack) return null;
    let total = 0;
    const items = producto.componentesPack.map((c) => {
      const ref = c.producto;
      if (!ref || ref.precio == null) return { ref, cantidad: c.cantidad, subtotal: null };
      const subtotal = (ref.precio ?? 0) * c.cantidad;
      total += subtotal;
      return { ref, cantidad: c.cantidad, subtotal };
    });
    const ahorro = producto.mostrarAhorroPack && producto.precio && total > producto.precio ? total - producto.precio : 0;
    return { items, total, ahorro };
  }, [producto]);

  if (!producto) return null;

  const waMsg = producto.whatsappMensaje || `Hola! Me interesa: ${producto.nombre}`;
  const waUrl = waLink(whatsapp, waMsg);

  return (
    <div
      className="modal-backdrop open"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={producto.nombre}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Gallery */}
        <div className="modal-gallery">
          <div className="gallery-main">
            <div className="gallery-main-img">
              <ProductImage producto={producto} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="modal-cat">{producto._categoria} · {producto._subcategoria}</div>
          <h2 className="modal-title">{producto.nombre}</h2>
          {producto.unidadVenta && (
            <div className="modal-unit">{producto.unidadVenta}</div>
          )}

          <div className="modal-badges">
            <Badges producto={producto} />
          </div>

          {/* Pack components */}
          {packInfo && (
            <div className="pack-components">
              <div className="pack-components-title">Incluye</div>
              {packInfo.items.map((item, i) => (
                <div key={i} className="pack-item">
                  <div className="pack-item-name">
                    <span className="qty">×{item.cantidad}</span>
                    {item.ref?.nombre || "Producto"}
                  </div>
                  <div className="pack-item-price">
                    {item.subtotal != null ? fmtSoles(item.subtotal) : "—"}
                  </div>
                </div>
              ))}
              {packInfo.total > 0 && (
                <div className="pack-total">
                  <span>Precio por separado</span>
                  <span>{fmtSoles(packInfo.total)}</span>
                </div>
              )}
            </div>
          )}

          {/* Price */}
          <div className="price-block">
            <div className="price-block-label">Precio referencial</div>
            <PriceDisplay producto={producto} size="modal" />
            {packInfo && packInfo.ahorro > 0 && (
              <div className="ahorro">
                <span className="ahorro-badge">Ahorrás {fmtSoles(packInfo.ahorro)}</span>
                <span>comprando el pack</span>
              </div>
            )}
          </div>

          {producto.descripcion && (
            <p className="modal-desc">{producto.descripcion}</p>
          )}

          {producto.detalles && producto.detalles.length > 0 && (
            <ul className="modal-details">
              {producto.detalles.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}

          <div className="modal-cta">
            <a className="btn btn-wa btn-lg" href={waUrl} target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.92C21.95 6.45 17.5 2 12.04 2z" />
              </svg>
              Pedir por WhatsApp
            </a>
            <button className="btn btn-ghost" onClick={onClose}>Seguir viendo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
