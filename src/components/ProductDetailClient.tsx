"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Collection, ProductoFlat } from "@/types";
import { originalImageUrl, urlFor } from "@/lib/sanity";
import { waLink } from "@/lib/utils";
import { ProductImage, Badges, PriceDisplay, PresentacionesList } from "@/components/ProductHelpers";
import { getContactHref, type ContactLink } from "@/lib/social";
import ImageLightbox from "@/components/ImageLightbox";
import { collectionPath } from "@/lib/collections";

interface ProductDetailClientProps {
  producto: ProductoFlat;
  whatsapp: string;
  contact?: ContactLink;
  backHref?: string;
  backLabel?: string;
  collectionContexts?: Collection[];
}

function productBelongsToCollection(producto: ProductoFlat, collection: Collection) {
  return collection.items?.some((item) => {
    const itemProduct = item.producto;
    if (!itemProduct) return false;
    return (
      itemProduct._id === producto._id ||
      itemProduct.slug?.current === producto.slug?.current ||
      Boolean(itemProduct.idExcel && producto.idExcel && itemProduct.idExcel === producto.idExcel)
    );
  });
}

export default function ProductDetailClient({
  producto,
  whatsapp,
  contact,
  backHref = "/catalog",
  backLabel = "Seguir viendo",
  collectionContexts = [],
}: ProductDetailClientProps) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [resolvedBack, setResolvedBack] = useState({ href: backHref, label: backLabel });

  useEffect(() => {
    setActiveImgIdx(0);
    setZoomed(false);
  }, [producto._id]);

  useEffect(() => {
    setImageLoading(Boolean(producto.imagenes?.[activeImgIdx]));
  }, [activeImgIdx, producto]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const collectionSlug = params.get("coleccion");
    if (!collectionSlug) {
      setResolvedBack({ href: backHref, label: backLabel });
      return;
    }

    const collection = collectionContexts.find(
      (item) => item.slug?.current === collectionSlug && productBelongsToCollection(producto, item),
    );

    if (!collection) {
      setResolvedBack({ href: backHref, label: backLabel });
      return;
    }

    setResolvedBack({
      href: collectionPath(collection),
      label: `Seguir viendo ${collection.titulo}`,
    });
  }, [backHref, backLabel, collectionContexts, producto]);

  const allImages = producto.imagenes || [];
  const hasMultipleImages = allImages.length > 1;
  const currentImgSrc = allImages[activeImgIdx]
    ? urlFor(allImages[activeImgIdx]).width(1200).auto("format").url()
    : null;
  const currentLightboxSrc = allImages[activeImgIdx]
    ? originalImageUrl(allImages[activeImgIdx])
    : null;

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

  const moveImage = (step: number) => {
    setActiveImgIdx((i) => Math.min(Math.max(i + step, 0), allImages.length - 1));
  };

  return (
    <div className="product-detail">
      <div className="modal">
        <div className="modal-gallery">
          <div className="gallery-main" onClick={() => currentImgSrc && setZoomed(true)}>
            <div className="gallery-main-img">
              {currentImgSrc ? (
                <>
                  {imageLoading && <div className="modal-image-loader" aria-label="Cargando imagen"><span /></div>}
                  <Image
                    key={currentImgSrc}
                    src={currentImgSrc}
                    alt={producto.nombre}
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

            {hasMultipleImages && (
              <>
                {activeImgIdx > 0 && (
                  <button
                    className="gallery-arrow gallery-arrow-prev"
                    onClick={(e) => { e.stopPropagation(); moveImage(-1); }}
                    aria-label="Imagen anterior"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  </button>
                )}
                {activeImgIdx < allImages.length - 1 && (
                  <button
                    className="gallery-arrow gallery-arrow-next"
                    onClick={(e) => { e.stopPropagation(); moveImage(1); }}
                    aria-label="Imagen siguiente"
                  >
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
                  <Image src={urlFor(img).width(120).height(120).auto("format").url()} alt={`Foto ${i + 1}`} width={56} height={56} className="gallery-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-body">
          <div className="modal-cat">{producto._categoria} · {producto._subcategoria}</div>
          <h1 className="modal-title">{producto.nombre}</h1>

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
              Pedir por {activeContact.label}
            </a>
            <a className="btn btn-ghost" href={resolvedBack.href}>{resolvedBack.label}</a>
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
    </div>
  );
}
