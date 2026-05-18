"use client";

import { useEffect, useState } from "react";
import type { ProductoFlat } from "@/types";
import { waLink } from "@/lib/utils";
import { urlFor } from "@/lib/sanity";
import Image from "next/image";
import { ProductImage, Badges, PriceDisplay, PresentacionesList } from "./ProductHelpers";
import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";

interface ProductModalProps {
  producto: ProductoFlat | null;
  onClose: () => void;
  whatsapp: string;
  contact?: ContactLink;
}

export default function ProductModal({ producto, onClose, whatsapp, contact }: ProductModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  // Reset state when product changes
  useEffect(() => {
    if (!producto) return;
    setSelectedVariant(null);
    setActiveImgIdx(0);
    setZoomed(false);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [producto]);

  // Keyboard handler (separate to avoid resetting zoom)
  useEffect(() => {
    if (!producto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (zoomed) { setZoomed(false); e.stopPropagation(); } else onClose(); }
      if (e.key === "ArrowRight") setActiveImgIdx(i => Math.min(i + 1, (producto.imagenes?.length || 1) - 1));
      if (e.key === "ArrowLeft") setActiveImgIdx(i => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [producto, onClose, zoomed]);

  if (!producto) return null;

  const waMsg = producto.whatsappMensaje || `Hola! Me interesa: ${producto.nombre}`;
  const fallbackContact = {
    platform: "whatsapp" as const,
    phone: whatsapp,
    label: "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };
  const activeContact = contact || fallbackContact;
  const contactUrl = contact ? getContactHref(activeContact, waMsg) : waLink(whatsapp, waMsg);

  // Variantes
  const visibleVariantes = producto.variantes?.filter(v => v.visible) || [];
  const hasVariantes = visibleVariantes.length > 0 && !(visibleVariantes.length === 1 && visibleVariantes[0].nombre === "Único");
  const activeVariant = selectedVariant ? visibleVariantes.find(v => v._key === selectedVariant) : null;

  // Images: variant image takes priority, then product images
  const allImages = producto.imagenes || [];
  const hasMultipleImages = allImages.length > 1;
  const currentImgSrc = activeVariant?.imagen
    ? urlFor(activeVariant.imagen).width(800).height(600).url()
    : allImages[activeImgIdx]
      ? urlFor(allImages[activeImgIdx]).width(800).height(600).url()
      : null;

  return (
    <>
      <div className="modal-backdrop open" onClick={onClose} role="dialog" aria-modal="true" aria-label={producto.nombre}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          {/* Gallery */}
          <div className="modal-gallery">
            <div className="gallery-main" style={{ cursor: currentImgSrc ? "zoom-in" : "default" }} onClick={() => currentImgSrc && setZoomed(true)}>
              <div className="gallery-main-img">
                {currentImgSrc ? (
                  <div style={{ position: "relative", width: "100%", height: "100%", background: "#f5f0ea" }}>
                    <Image
                      src={currentImgSrc}
                      alt={activeVariant?.nombre || producto.nombre}
                      fill
                      className="modal-product-img"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <ProductImage producto={producto} />
                )}
              </div>
              {/* Zoom hint */}
              {currentImgSrc && (
                <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4, pointerEvents: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg>
                  Zoom
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {hasMultipleImages && !activeVariant?.imagen && (
              <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", background: "rgba(31,27,46,0.03)" }}>
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setActiveImgIdx(i)}
                    style={{
                      flex: "0 0 56px", width: 56, height: 56, borderRadius: 8, overflow: "hidden",
                      border: activeImgIdx === i ? "2px solid #D2386C" : "2px solid transparent",
                      opacity: activeImgIdx === i ? 1 : 0.6, cursor: "pointer", padding: 0, background: "#f5f0ea",
                      transition: "border-color 0.2s, opacity 0.2s",
                    }}
                  >
                    <Image src={urlFor(img).width(120).height(120).url()} alt={`Foto ${i + 1}`} width={56} height={56} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                  </button>
                ))}
              </div>
            )}

            {/* Image counter */}
            {hasMultipleImages && !activeVariant?.imagen && (
              <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 11, padding: "3px 10px", borderRadius: 999, fontWeight: 500 }}>
                {activeImgIdx + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="modal-cat" style={{ color: "#7c6f8a", fontWeight: 500 }}>{producto._categoria} · {producto._subcategoria}</div>
            <h2 className="modal-title">{producto.nombre}</h2>

            {producto.marca && producto.marca !== "Genérico" && (
              <div style={{ fontSize: 14, color: "#4a4258", marginBottom: 6 }}>Marca: <strong style={{ color: "#1F1B2E" }}>{producto.marca}</strong></div>
            )}

            {producto.medidas && (
              <div style={{ fontSize: 14, color: "#4a4258", marginBottom: 8 }}>Medida: <strong style={{ color: "#1F1B2E" }}>{producto.medidas}</strong></div>
            )}

            <div className="modal-badges"><Badges producto={producto} /></div>

            {/* Variantes */}
            {hasVariantes && (
              <div style={{ margin: "16px 0" }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7c6f8a", marginBottom: 8, fontWeight: 600 }}>
                  {visibleVariantes.some(v => v.color) ? "Colores" : "Variantes"} disponibles
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {visibleVariantes.map((v) => (
                    <button key={v._key}
                      onClick={() => setSelectedVariant(selectedVariant === v._key ? null : v._key)}
                      style={{
                        padding: "7px 16px", borderRadius: 999, fontSize: 13, cursor: "pointer",
                        border: selectedVariant === v._key ? "2px solid #D2386C" : "1.5px solid #c4bdd0",
                        background: selectedVariant === v._key ? "rgba(210,56,108,0.08)" : "#fff",
                        color: selectedVariant === v._key ? "#D2386C" : "#1F1B2E",
                        fontWeight: selectedVariant === v._key ? 600 : 500,
                        fontFamily: "inherit", transition: "all 0.15s",
                      }}
                    >
                      {v.nombre || v.color || v.tamano || "Variante"}
                      {v.stock != null && v.stock <= 0 && <span style={{ fontSize: 10, color: "#dc2626", marginLeft: 4 }}>Agotado</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Presentaciones */}
            <PresentacionesList presentaciones={producto.presentaciones} />

            {/* Price block */}
            <div className="price-block" style={{ marginTop: 18 }}>
              <div className="price-block-label" style={{ color: "#7c6f8a", fontWeight: 600 }}>Precio referencial</div>
              <PriceDisplay producto={producto} size="modal" />
            </div>

            {producto.descripcion && <p className="modal-desc" style={{ color: "#4a4258", fontSize: 14, lineHeight: 1.6 }}>{producto.descripcion}</p>}
            {producto.observaciones && <p style={{ fontSize: 13, color: "#7c6f8a", fontStyle: "italic", margin: "0 0 16px" }}>{producto.observaciones}</p>}

            <div className="modal-cta">
              <a className={`btn ${activeContact.platform === "whatsapp" ? "btn-wa" : "btn-plum"} btn-lg`} href={contactUrl} target="_blank" rel="noopener noreferrer">
                <ContactIcon platform={activeContact.platform} size={18} />
                Pedir por {activeContact.label}
              </a>
              <button className="btn btn-ghost" onClick={onClose}>Seguir viendo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom */}
      {zoomed && currentImgSrc && (
        <div onClick={() => setZoomed(false)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", backdropFilter: "blur(8px)" }}>
          <div style={{ position: "relative", width: "90vw", height: "85vh", maxWidth: 1200 }}>
            <Image
              src={currentImgSrc.replace("w=800", "w=1600").replace("h=600", "h=1200")}
              alt={producto.nombre}
              fill
              style={{ objectFit: "contain" }}
              sizes="90vw"
              onClick={() => setZoomed(false)}
            />
          </div>
          {/* Controls ON TOP of image */}
          <button onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 44, height: 44, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
            ✕
          </button>
          {hasMultipleImages && !activeVariant?.imagen && (
            <>
              {activeImgIdx > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setActiveImgIdx(i => i - 1); }}
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                  ‹
                </button>
              )}
              {activeImgIdx < allImages.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); setActiveImgIdx(i => i + 1); }}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
                  ›
                </button>
              )}
              <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10, color: "#fff", fontSize: 13, background: "rgba(0,0,0,0.6)", padding: "5px 16px", borderRadius: 999, fontWeight: 500 }}>
                {activeImgIdx + 1} / {allImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
