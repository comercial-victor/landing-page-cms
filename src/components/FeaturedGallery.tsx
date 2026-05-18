"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FeaturedGalleryItem } from "@/types";
import { urlFor } from "@/lib/sanity";
import { waLink } from "@/lib/utils";
import { getYouTubeEmbed } from "@/lib/youtube";

interface FeaturedGalleryProps {
  items: FeaturedGalleryItem[];
  whatsapp: string;
  title?: string;
  subtitle?: string;
}

function getItemMedia(item: FeaturedGalleryItem) {
  if (item.mediaType === "youtube") {
    const video = getYouTubeEmbed(item.youtubeUrl);
    return video ? { type: "youtube" as const, ...video } : null;
  }

  if (!item.imagen) return null;

  return {
    type: "image" as const,
    src: urlFor(item.imagen).width(1200).height(900).fit("crop").url(),
    alt: item.alt || item.titulo,
    position: item.focalPosition || "center",
  };
}

function getCtaLabel(item: FeaturedGalleryItem) {
  if (item.ctaText) return item.ctaText;
  return item.ctaAction === "scroll" ? "Ver sección" : "Cotizar por WhatsApp";
}

function FeaturedMedia({
  item,
  priority = false,
  mode,
  onLoaded,
}: {
  item: FeaturedGalleryItem;
  priority?: boolean;
  mode: "card" | "modal";
  onLoaded?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const media = getItemMedia(item);

  useEffect(() => {
    setFailed(false);
  }, [item._key, mode]);

  if (!media || failed) {
    return (
      <div className="featured-media-empty" role="img" aria-label={item.titulo}>
        <span>{item.mediaType === "youtube" ? "Video no disponible" : "Imagen no disponible"}</span>
      </div>
    );
  }

  if (media.type === "youtube") {
    if (mode === "modal") {
      return (
        <iframe
          className="featured-modal-video"
          src={`${media.embedUrl}?rel=0&modestbranding=1`}
          title={item.titulo}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      );
    }

    return (
      <>
        <img
          src={media.thumbnailUrl}
          alt={`Portada del video ${item.titulo}`}
          className="featured-card-img"
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
        <span className="featured-play" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </>
    );
  }

  return (
    <Image
      key={media.src}
      src={media.src}
      alt={media.alt}
      fill
      sizes={mode === "modal" ? "(max-width: 900px) 92vw, 980px" : "(max-width: 640px) 78vw, 360px"}
      className={mode === "modal" ? "featured-modal-img" : "featured-card-img"}
      style={{ objectPosition: media.position }}
      priority={priority}
      onLoad={onLoaded}
      onError={() => {
        setFailed(true);
        onLoaded?.();
      }}
    />
  );
}

export default function FeaturedGallery({ items, whatsapp, title, subtitle }: FeaturedGalleryProps) {
  const visibleItems = useMemo(() => items.filter((item) => item.active), [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeItem = visibleItems[activeIndex];
  const modalItem = modalIndex === null ? null : visibleItems[modalIndex];
  const modalMedia = modalItem ? getItemMedia(modalItem) : null;

  const goTo = useCallback((index: number) => {
    if (!visibleItems.length) return;
    const next = (index + visibleItems.length) % visibleItems.length;
    setActiveIndex(next);
  }, [visibleItems.length]);

  const goModal = useCallback((step: number) => {
    setModalIndex((current) => {
      if (current === null || !visibleItems.length) return current;
      return (current + step + visibleItems.length) % visibleItems.length;
    });
  }, [visibleItems.length]);

  const closeModal = useCallback(() => {
    setModalIndex(null);
    window.setTimeout(() => modalTriggerRef.current?.focus(), 0);
  }, []);

  const runCta = useCallback((item: FeaturedGalleryItem) => {
    if (item.ctaAction === "scroll") {
      const id = item.targetSection;
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      closeModal();
      return;
    }

    const message = item.whatsappMessage || `Hola! Quisiera información sobre ${item.titulo}.`;
    window.open(waLink(whatsapp, message), "_blank", "noopener,noreferrer");
  }, [closeModal, whatsapp]);

  useEffect(() => {
    if (modalIndex === null) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
      if (event.key === "ArrowLeft") goModal(-1);
      if (event.key === "ArrowRight") goModal(1);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, goModal, modalIndex]);

  useEffect(() => {
    if (!modalItem) return;
    setImageReady(modalMedia?.type !== "image");
  }, [modalItem, modalMedia?.type]);

  if (!visibleItems.length || !activeItem) return null;

  return (
    <>
      <section className="section featured-gallery" id="destacados">
        <div className="container">
          <div className="featured-gallery-head">
            <div>
              <div className="section-kicker">Galería destacada</div>
              <h2 className="section-title">{title || "Ideas listas para celebrar"}</h2>
            </div>
            <p className="section-lede">
              {subtitle || "Explora propuestas visuales, abre el detalle y coordina por WhatsApp o salta directo a la sección que necesitas."}
            </p>
          </div>

          <div className="featured-stage" aria-roledescription="carrusel">
            <button className="featured-nav featured-nav-prev" onClick={() => goTo(activeIndex - 1)} aria-label="Ver card anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="featured-track">
              {visibleItems.map((item, index) => {
                const offset = index - activeIndex;
                const wrappedOffset =
                  Math.abs(offset) > visibleItems.length / 2
                    ? offset - Math.sign(offset) * visibleItems.length
                    : offset;
                const isActive = index === activeIndex;

                return (
                  <article
                    key={item._key}
                    className={`featured-card ${isActive ? "active" : ""}`}
                    style={{
                      "--gallery-x": `${wrappedOffset * 230}px`,
                      "--gallery-rotate": `${wrappedOffset * -12}deg`,
                      "--gallery-scale": 1 - Math.min(Math.abs(wrappedOffset), 2) * 0.12,
                      "--gallery-opacity": 1 - Math.min(Math.abs(wrappedOffset), 3) * 0.22,
                      "--gallery-z": 10 - Math.abs(wrappedOffset),
                    } as CSSProperties}
                  >
                    <button
                      className="featured-card-button"
                      onClick={(event) => {
                        if (!isActive) {
                          goTo(index);
                          return;
                        }
                        modalTriggerRef.current = event.currentTarget;
                        setModalIndex(index);
                      }}
                      aria-label={isActive ? `Abrir detalle de ${item.titulo}` : `Ver ${item.titulo}`}
                    >
                      <span className="featured-card-media">
                        <FeaturedMedia item={item} mode="card" priority={index === 0} />
                      </span>
                      <span className="featured-card-copy">
                        <span className="featured-card-title">{item.titulo}</span>
                        {item.descripcion && <span className="featured-card-desc">{item.descripcion}</span>}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>

            <button className="featured-nav featured-nav-next" onClick={() => goTo(activeIndex + 1)} aria-label="Ver card siguiente">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="featured-dots" role="tablist" aria-label="Cards destacadas">
            {visibleItems.map((item, index) => (
              <button
                key={item._key}
                className={index === activeIndex ? "active" : ""}
                onClick={() => goTo(index)}
                aria-label={`Mostrar ${item.titulo}`}
                aria-selected={index === activeIndex}
                role="tab"
              />
            ))}
          </div>
        </div>
      </section>

      {modalItem && (
        <div className="featured-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="featured-modal-title" onMouseDown={closeModal}>
          <div className="featured-modal-shell" onMouseDown={(event) => event.stopPropagation()}>
            <button ref={closeButtonRef} className="featured-modal-close" onClick={closeModal} aria-label="Cerrar galería destacada">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {visibleItems.length > 1 && (
              <>
                <button className="featured-modal-arrow featured-modal-prev" onClick={() => goModal(-1)} aria-label="Ver card anterior">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button className="featured-modal-arrow featured-modal-next" onClick={() => goModal(1)} aria-label="Ver card siguiente">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}

            <div className="featured-modal-media">
              {!imageReady && (
                <div className="featured-loader" aria-label="Cargando imagen">
                  <span />
                </div>
              )}
              <FeaturedMedia item={modalItem} mode="modal" priority onLoaded={() => setImageReady(true)} />
            </div>

            <div className="featured-modal-copy">
              <div className="section-kicker">{modalItem.mediaType === "youtube" ? "Video destacado" : "Imagen destacada"}</div>
              <h3 id="featured-modal-title">{modalItem.titulo}</h3>
              {modalItem.descripcion && <p>{modalItem.descripcion}</p>}
              <button className={`btn ${modalItem.ctaAction === "scroll" ? "btn-plum" : "btn-wa"} btn-lg`} onClick={() => runCta(modalItem)}>
                {getCtaLabel(modalItem)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
