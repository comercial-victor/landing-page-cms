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
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!producto) return;
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
        if (zoomed) { setZoomed(false); e.stopPropagation(); }
        else requestClose();
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
    setImageLoading(Boolean(producto.imagenes?.[activeImgIdx]));
  }, [activeImgIdx, producto]);

  const requestClose = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(onClose, 260);
  }, [onClose]);

  if (!producto) return null;

  const waMsg = producto.whatsappMensaje || `Hola! Me interesa: ${producto.nombre}`;
  const fallbackContact: ContactLink = {
    platform: "whatsapp", phone: whatsapp, label: "WhatsApp",
    active: true, showInFooter: true, isPrimaryCta: true,
  };
  const activeContact = contact || fallbackContact;
  const contactUrl = contact ? getContactHref(activeContact, waMsg) : waLink(whatsapp, waMsg);

  const allImages = producto.imagenes || [];
  const hasMultipleImages = allImages.length > 1;
  const currentImgSrc = allImages[activeImgIdx]
    ? urlFor(allImages[activeImgIdx]).width(800).height(600).url()
    : null;
  const currentLightboxSrc = allImages[activeImgIdx]
    ? originalImageUrl(allImages[activeImgIdx])
    : null;

  const moveImage = (step: number) => {
    setActiveImgIdx((i) => Math.min(Math.max(i + step, 0), allImages.length - 1));
  };

  return (
    <>
      <div className={`modal-backdrop ${isVisible ? "open" : ""}`} onClick={requestClose} role="dialog" aria-modal="true" aria-label={producto.nombre}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button ref={closeRef} className="modal-close" onClick={requestClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>

          <div className="modal-gallery">
            <div className="gallery-main" onClick={() => currentImgSrc && setZoomed(true)}>
              <div className="gallery-main-img">
                {currentImgSrc ? (
                  <>
                    {imageLoading && <div className="modal-image-loader" aria-label="Cargando imagen"><span /></div>}
                    <Image key={currentImgSrc} src={currentImgSrc} alt={producto.nombre} fill className="modal-product-img" sizes="(max-width: 768px) 100vw, 50vw" onLoad={() => setImageLoading(false)} onError={() => setImageLoading(false)} />
                  </>
                ) : (
                  <ProductImage producto={producto} />
                )}
              </div>

              {hasMultipleImages && (
                <>
                  {activeImgIdx > 0 && (
                    <button className="gallery-arrow gallery-arrow-prev" onClick={(e) => { e.stopPropagation(); moveImage(-1); }} aria-label="Imagen anterior">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                  )}
                  {activeImgIdx < allImages.length - 1 && (
                    <button className="gallery-arrow gallery-arrow-next" onClick={(e) => { e.stopPropagation(); moveImage(1); }} aria-label="Imagen siguiente">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  )}
                </>
              )}

              {currentImgSrc && (
                <div className="gallery-zoom-hint">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg>
                  Zoom
                </div>
              )}

              {hasMultipleImages && <div className="gallery-counter">{activeImgIdx + 1} / {allImages.length}</div>}
            </div>

            {hasMultipleImages && (
              <div className="gallery-thumbs">
                {allImages.map((img, i) => (
                  <button key={i} className={`gallery-thumb ${activeImgIdx === i ? "active" : ""}`} onClick={() => setActiveImgIdx(i)}>
                    <Image src={urlFor(img).width(120).height(120).url()} alt={`Foto ${i + 1}`} width={56} height={56} className="gallery-thumb-img" />
                  </button>
                ))}
              </div>
            )}
          </div>

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

            <PresentacionesList presentaciones={producto.presentaciones} />

            <div className="price-block">
              <div className="price-block-label">Precio referencial</div>
              <PriceDisplay producto={producto} size="modal" />
            </div>

            {producto.stock != null && producto.manejaStock && (
              <div className="modal-meta-line">
                Stock: <strong>{producto.stock > 0 ? `${producto.stock} disponibles` : "Agotado"}</strong>
              </div>
            )}

            {producto.descripcion && <p className="modal-desc">{producto.descripcion}</p>}
            {producto.observaciones && <p className="modal-obs">{producto.observaciones}</p>}

            <div className="modal-cta">
              <a className={`btn ${activeContact.platform === "whatsapp" ? "btn-wa" : "btn-plum"} btn-lg`} href={contactUrl} target="_blank" rel="noopener noreferrer">
                <ContactIcon platform={activeContact.platform} size={18} />
                Pedir por {activeContact.label}
              </a>
              <button className="btn btn-ghost" onClick={requestClose}>Seguir viendo</button>
            </div>
          </div>
        </div>
      </div>

      {zoomed && currentLightboxSrc && (
        <ImageLightbox
          src={currentLightboxSrc}
          alt={producto.nombre}
          onClose={() => setZoomed(false)}
          hasPrev={hasMultipleImages && activeImgIdx > 0}
          hasNext={hasMultipleImages && activeImgIdx < allImages.length - 1}
          onPrev={() => moveImage(-1)}
          onNext={() => moveImage(1)}
          counter={hasMultipleImages ? `${activeImgIdx + 1} / ${allImages.length}` : undefined}
        />
      )}
    </>
  );
}
