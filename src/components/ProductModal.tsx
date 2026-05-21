"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductoFlat } from "@/types";
import { waLink } from "@/lib/utils";
import { originalImageUrl, urlFor } from "@/lib/sanity";
import Image from "next/image";
import { ProductImage, Badges, PriceDisplay, PresentacionesList } from "./ProductHelpers";
import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";
import ImageLightbox from "./ImageLightbox";

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
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!producto) return;
    setSelectedVariant(null);
    setActiveImgIdx(0);
    setZoomed(false);
    setImageLoading(true);
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      setIsVisible(false);
    };
  }, [producto]);

  useEffect(() => {
    if (!producto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) {
          setZoomed(false);
          e.stopPropagation();
        } else {
          requestClose();
        }
      }
      if (zoomed) return;
      if (e.key === "ArrowRight") setActiveImgIdx(i => Math.min(i + 1, (producto.imagenes?.length || 1) - 1));
      if (e.key === "ArrowLeft") setActiveImgIdx(i => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto, zoomed]);

  useEffect(() => {
    if (!producto) return;
    const visibleVariantes = producto.variantes?.filter(v => v.visible) || [];
    const activeVariant = selectedVariant ? visibleVariantes.find(v => v._key === selectedVariant) : null;
    const hasImage = Boolean(activeVariant?.imagen || producto.imagenes?.[activeImgIdx]);
    setImageLoading(hasImage);
  }, [activeImgIdx, producto, selectedVariant]);

  const requestClose = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(onClose, 260);
  }, [onClose]);

  if (!producto) return null;

  const waMsg = producto.whatsappMensaje || `Hola! Me interesa: ${producto.nombre}`;
  const fallbackContact: ContactLink = {
    platform: "whatsapp",
    phone: whatsapp,
    label: "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };
  const activeContact = contact || fallbackContact;
  const contactUrl = contact ? getContactHref(activeContact, waMsg) : waLink(whatsapp, waMsg);

  const visibleVariantes = producto.variantes?.filter(v => v.visible) || [];
  const hasVariantes = visibleVariantes.length > 0 && !(visibleVariantes.length === 1 && visibleVariantes[0].nombre === "Único");
  const activeVariant = selectedVariant ? visibleVariantes.find(v => v._key === selectedVariant) : null;

  const allImages = producto.imagenes || [];
  const hasMultipleImages = allImages.length > 1;
  const currentImgSrc = activeVariant?.imagen
    ? urlFor(activeVariant.imagen).width(800).height(600).url()
    : allImages[activeImgIdx]
      ? urlFor(allImages[activeImgIdx]).width(800).height(600).url()
      : null;
  const currentLightboxSrc = activeVariant?.imagen
    ? originalImageUrl(activeVariant.imagen)
    : allImages[activeImgIdx]
      ? originalImageUrl(allImages[activeImgIdx])
      : null;

  const selectImage = (index: number) => {
    if (index === activeImgIdx) return;
    setActiveImgIdx(index);
  };

  const moveImage = (step: number) => {
    setActiveImgIdx((index) => Math.min(Math.max(index + step, 0), (producto.imagenes?.length || 1) - 1));
  };

  return (
    <>
      <div
        className={`modal-backdrop ${isVisible ? "open" : ""}`}
        onClick={requestClose}
        role="dialog"
        aria-modal="true"
        aria-label={producto.nombre}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button ref={closeRef} className="modal-close" onClick={requestClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Gallery */}
          <div className="modal-gallery">
            <div
              className="gallery-main"
              onClick={() => currentImgSrc && setZoomed(true)}
            >
              <div className="gallery-main-img">
                {currentImgSrc ? (
                  <>
                    {imageLoading && (
                      <div className="modal-image-loader" aria-label="Cargando imagen">
                        <span />
                      </div>
                    )}
                    <Image
                      key={currentImgSrc}
                      src={currentImgSrc}
                      alt={activeVariant?.nombre || producto.nombre}
                      fill
                      className="modal-product-img"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onLoad={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                  </>
                ) : (
                  <ProductImage producto={producto} />
                )}
              </div>

              {/* Navigation arrows */}
              {hasMultipleImages && !activeVariant?.imagen && (
                <>
                  {activeImgIdx > 0 && (
                    <button
                      className="gallery-arrow gallery-arrow-prev"
                      onClick={(e) => { e.stopPropagation(); moveImage(-1); }}
                      aria-label="Imagen anterior"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                  )}
                  {activeImgIdx < allImages.length - 1 && (
                    <button
                      className="gallery-arrow gallery-arrow-next"
                      onClick={(e) => { e.stopPropagation(); moveImage(1); }}
                      aria-label="Imagen siguiente"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  )}
                </>
              )}

              {/* Zoom hint */}
              {currentImgSrc && (
                <div className="gallery-zoom-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg>
                  Zoom
                </div>
              )}

              {/* Image counter */}
              {hasMultipleImages && !activeVariant?.imagen && (
                <div className="gallery-counter">
                  {activeImgIdx + 1} / {allImages.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {hasMultipleImages && !activeVariant?.imagen && (
              <div className="gallery-thumbs">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    className={`gallery-thumb ${activeImgIdx === i ? "active" : ""}`}
                    onClick={() => selectImage(i)}
                  >
                    <Image
                      src={urlFor(img).width(120).height(120).url()}
                      alt={`Foto ${i + 1}`}
                      width={56}
                      height={56}
                      className="gallery-thumb-img"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="modal-cat">{producto._categoria} · {producto._subcategoria}</div>
            <h2 className="modal-title">{producto.nombre}</h2>

            {producto.marca && producto.marca !== "Genérico" && (
              <div className="modal-meta-line">Marca: <strong>{producto.marca}</strong></div>
            )}

            {producto.medidas && (
              <div className="modal-meta-line">Medida: <strong>{producto.medidas}</strong></div>
            )}

            <div className="modal-badges"><Badges producto={producto} /></div>

            {/* Variantes */}
            {hasVariantes && (
              <div className="modal-variantes">
                <div className="modal-variantes-label">
                  {visibleVariantes.some(v => v.color) ? "Colores" : "Variantes"} disponibles
                </div>
                <div className="modal-variantes-list">
                  {visibleVariantes.map((v) => (
                    <button
                      key={v._key}
                      className={`modal-variante-btn ${selectedVariant === v._key ? "active" : ""}`}
                      onClick={() => {
                        setImageLoading(true);
                        setSelectedVariant(selectedVariant === v._key ? null : v._key);
                      }}
                    >
                      {v.nombre || v.color || v.tamano || "Variante"}
                      {v.stock != null && v.stock <= 0 && <span className="modal-variante-agotado">Agotado</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Presentaciones */}
            <PresentacionesList presentaciones={producto.presentaciones} />

            {/* Price block */}
            <div className="price-block">
              <div className="price-block-label">Precio referencial</div>
              <PriceDisplay producto={producto} size="modal" />
            </div>

            {producto.descripcion && <p className="modal-desc">{producto.descripcion}</p>}
            {producto.observaciones && <p className="modal-obs">{producto.observaciones}</p>}

            <div className="modal-cta">
              <a
                className={`btn ${activeContact.platform === "whatsapp" ? "btn-wa" : "btn-plum"} btn-lg`}
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ContactIcon platform={activeContact.platform} size={18} />
                Pedir por {activeContact.label}
              </a>
              <button className="btn btn-ghost" onClick={requestClose}>Seguir viendo</button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom */}
      {zoomed && currentLightboxSrc && (
        <ImageLightbox
          src={currentLightboxSrc}
          alt={producto.nombre}
          onClose={() => setZoomed(false)}
          hasPrev={hasMultipleImages && !activeVariant?.imagen && activeImgIdx > 0}
          hasNext={hasMultipleImages && !activeVariant?.imagen && activeImgIdx < allImages.length - 1}
          onPrev={() => moveImage(-1)}
          onNext={() => moveImage(1)}
          counter={hasMultipleImages && !activeVariant?.imagen ? `${activeImgIdx + 1} / ${allImages.length}` : undefined}
        />
      )}
    </>
  );
}
