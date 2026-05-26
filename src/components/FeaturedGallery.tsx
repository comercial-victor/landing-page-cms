"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { FeaturedGalleryItem } from "@/types";
import { originalImageUrl, urlFor } from "@/lib/sanity";
import { getYouTubeEmbed } from "@/lib/youtube";
import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";
import ImageLightbox from "./ImageLightbox";

interface FeaturedGalleryProps {
  items: FeaturedGalleryItem[];
  primaryContact: ContactLink;
  title?: string;
  subtitle?: string;
}

const fallbackItems: FeaturedGalleryItem[] = [
  {
    _key: "fallback-featured-1",
    titulo: "Globos con helio",
    descripcion: "Composiciones listas para cumpleaños, aniversarios y sorpresas especiales.",
    mediaType: "image",
    mediaOrientation: "vertical",
    meta: "Favorito",
    ctaText: "Cotizar globos",
    ctaAction: "whatsapp",
    active: true,
  },
  {
    _key: "fallback-featured-2",
    titulo: "Piñatas artesanales",
    descripcion: "Diseños coloridos para fiestas infantiles y celebraciones temáticas.",
    mediaType: "image",
    mediaOrientation: "vertical",
    meta: "Artesanal",
    ctaText: "Ver catálogo",
    ctaAction: "scroll",
    targetSection: "catalogo",
    active: true,
  },
  {
    _key: "fallback-featured-3",
    titulo: "Packs de fiesta",
    descripcion: "Menaje, decoración y detalles coordinados para resolver todo en un solo pedido.",
    mediaType: "image",
    mediaOrientation: "vertical",
    meta: "Pack completo",
    ctaText: "Armar pack",
    ctaAction: "whatsapp",
    active: true,
  },
];

function getItemMedia(item: FeaturedGalleryItem) {
  if (item.mediaType === "youtube") {
    const video = getYouTubeEmbed(item.youtubeUrl);
    if (!video) return null;
    const thumbnailUrl = item.youtubeThumbnail
      ? urlFor(item.youtubeThumbnail).width(1200).height(900).fit("crop").auto("format").url()
      : video.thumbnailUrl;
    return { type: "youtube" as const, ...video, thumbnailUrl };
  }

  if (!item.imagen) return null;

  return {
    type: "image" as const,
    src: originalImageUrl(item.imagen),
    alt: item.alt || item.titulo,
    position: item.focalPosition || "center",
  };
}

function getItemPreviewSrc(item: FeaturedGalleryItem) {
  const media = getItemMedia(item);
  if (!media) return null;
  return media.type === "youtube" ? media.thumbnailUrl : media.src;
}

function getItemOrientation(item: FeaturedGalleryItem) {
  return item.mediaOrientation || (item.mediaType === "youtube" ? "horizontal" : "vertical");
}

function getCtaLabel(item: FeaturedGalleryItem, contactLabel: string) {
  if (item.ctaText) return item.ctaText;
  return item.ctaAction === "scroll" ? "Ver sección" : `Cotizar por ${contactLabel}`;
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
  const [thumbnailFallback, setThumbnailFallback] = useState(false);
  const media = getItemMedia(item);

  useEffect(() => {
    setFailed(false);
    setThumbnailFallback(false);
  }, [item._key, mode]);

  if (!media || failed) {
    return (
      <div className="featured-media-empty" role="img" aria-label={item.titulo}>
        <span>{item.meta || item.titulo}</span>
      </div>
    );
  }

  const orientation = getItemOrientation(item);

  if (media.type === "youtube") {
    const thumbnailSrc = thumbnailFallback ? media.fallbackThumbnailUrl : media.thumbnailUrl;

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
        <Image
          src={thumbnailSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 82vw, 520px"
          className="featured-media-fill"
          aria-hidden="true"
          priority={priority}
        />
        <Image
          src={thumbnailSrc}
          alt={`Portada del video ${item.titulo}`}
          fill
          sizes="(max-width: 640px) 82vw, 520px"
          className="featured-card-img featured-img-contain"
          priority={priority}
          onError={() => {
            if (!thumbnailFallback && media.fallbackThumbnailUrl) {
              setThumbnailFallback(true);
              return;
            }
            setFailed(true);
          }}
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
    <>
      <Image
        key={`${media.src}-fill`}
        src={media.src}
        alt=""
        fill
        sizes={mode === "modal" ? "(max-width: 900px) 92vw, 980px" : "(max-width: 640px) 78vw, 520px"}
        className="featured-media-fill"
        aria-hidden="true"
        priority={priority}
      />
      <Image
        key={media.src}
        src={media.src}
        alt={media.alt}
        fill
        sizes={mode === "modal" ? "(max-width: 900px) 92vw, 980px" : "(max-width: 640px) 78vw, 520px"}
        className={`${mode === "modal" ? "featured-modal-img" : "featured-card-img"} featured-img-contain featured-img-${orientation}`}
        style={{ objectPosition: media.position }}
        priority={priority}
        onLoad={onLoaded}
        onError={() => {
          setFailed(true);
          onLoaded?.();
        }}
      />
    </>
  );
}

export default function FeaturedGallery({ items, primaryContact, title, subtitle }: FeaturedGalleryProps) {
  const visibleItems = useMemo(() => {
    const activeItems = items.filter((item) => item.active !== false);
    return activeItems.length ? activeItems : fallbackItems;
  }, [items]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [isFeaturedModalVisible, setIsFeaturedModalVisible] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const dragStartX = useRef<number | null>(null);

  const activeItem = visibleItems[activeIndex];
  const activePreviewSrc = activeItem ? getItemPreviewSrc(activeItem) : null;
  const modalItem = modalIndex === null ? null : visibleItems[modalIndex];
  const modalMedia = modalItem ? getItemMedia(modalItem) : null;
  const modalOrientation = modalItem ? getItemOrientation(modalItem) : "vertical";
  const contactLabel = primaryContact.label || "WhatsApp";

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

  const openModal = useCallback((index: number, trigger: HTMLButtonElement) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    modalTriggerRef.current = trigger;
    setModalIndex(index);
  }, []);

  const closeModal = useCallback(() => {
    setLightboxOpen(false);
    setIsFeaturedModalVisible(false);

    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setModalIndex(null);
      closeTimerRef.current = null;
      window.setTimeout(() => modalTriggerRef.current?.focus(), 0);
    }, 360);
  }, []);

  const runCta = useCallback((item: FeaturedGalleryItem) => {
    if (item.ctaHref) {
      window.open(item.ctaHref, "_blank", "noopener,noreferrer");
      return;
    }

    if (item.ctaAction === "scroll") {
      const id = item.targetSection;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const target = id ? document.getElementById(id) : null;
      if (target) {
        const offset = window.innerWidth < 700 ? 78 : 96;
        window.scrollTo({
          top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
      closeModal();
      return;
    }

    const message = item.whatsappMessage || `Hola! Quisiera información sobre ${item.titulo}.`;
    window.open(getContactHref(primaryContact, message), "_blank", "noopener,noreferrer");
  }, [closeModal, primaryContact]);

  useEffect(() => {
    if (activeIndex > visibleItems.length - 1) setActiveIndex(0);
  }, [activeIndex, visibleItems.length]);

  useEffect(() => {
    if (modalIndex === null) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (lightboxOpen) return;
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
  }, [closeModal, goModal, lightboxOpen, modalIndex]);

  useEffect(() => {
    if (modalIndex === null) {
      setIsFeaturedModalVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => setIsFeaturedModalVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [modalIndex]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!modalItem) return;
    setImageReady(modalMedia?.type !== "image");
  }, [modalItem, modalMedia?.type]);

  useEffect(() => {
    if (isPaused || modalIndex !== null || visibleItems.length < 2) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = window.setInterval(() => goTo(activeIndex + 1), 5200);
    return () => window.clearInterval(id);
  }, [activeIndex, goTo, isPaused, modalIndex, visibleItems.length]);

  if (!visibleItems.length || !activeItem) return null;

  return (
    <>
      <section className="section featured-gallery" id="novedades">
        {activePreviewSrc && (
          <div className="featured-ambient" aria-hidden="true">
            <Image
              key={activePreviewSrc}
              src={activePreviewSrc}
              alt=""
              fill
              sizes="100vw"
              className="featured-ambient-img"
            />
          </div>
        )}
        <div className="container">
          <div className="featured-gallery-head">
            <div>
              <div className="section-kicker">Novedades</div>
              <h2 className="section-title">{title || "Ideas nuevas para celebrar"}</h2>
            </div>
            <p className="section-lede">
              {subtitle || "Ideas reales de tienda: fotos, videos y propuestas listas para coordinar sin dar vueltas."}
            </p>
          </div>

          <div
            className="featured-stage focus-rail"
            aria-roledescription="carrusel"
            tabIndex={0}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") goTo(activeIndex - 1);
              if (event.key === "ArrowRight") goTo(activeIndex + 1);
            }}
            onPointerDown={(event) => {
              dragStartX.current = event.clientX;
            }}
            onPointerUp={(event) => {
              if (dragStartX.current === null) return;
              const delta = event.clientX - dragStartX.current;
              dragStartX.current = null;
              if (Math.abs(delta) < 40) return;
              goTo(activeIndex + (delta < 0 ? 1 : -1));
            }}
          >
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
                const distance = Math.min(Math.abs(wrappedOffset), 3);
                const orientation = getItemOrientation(item);
                const isHorizontal = orientation === "horizontal";
                const spacing = isHorizontal ? 276 : 232;

                return (
                  <article
                    key={item._key}
                    className={`featured-card featured-card-${orientation} ${item.mediaType === "youtube" ? "featured-card-youtube" : ""} ${isActive ? "active" : ""}`}
                    style={{
                      "--gallery-x": `${wrappedOffset * spacing}px`,
                      "--gallery-y": `${distance * 18}px`,
                      "--gallery-rotate": `${wrappedOffset * -17}deg`,
                      "--gallery-rotate-z": `${wrappedOffset * 7}deg`,
                      "--gallery-scale": 1 - Math.min(distance, 2) * 0.12,
                      "--gallery-opacity": distance > 2 ? 0 : 1 - distance * 0.22,
                      "--gallery-z": 10 - distance,
                      "--gallery-depth": `${Math.min(distance, 2) * -90}px`,
                      "--gallery-blur": "0px",
                      "--gallery-brightness": isActive ? 1 : 0.82,
                      "--gallery-saturate": isActive ? 1.08 : 0.92,
                    } as CSSProperties}
                    aria-hidden={distance > 2}
                  >
                    <button
                      className="featured-card-button"
                      onClick={(event) => {
                        if (!isActive) {
                          goTo(index);
                          return;
                        }
                        openModal(index, event.currentTarget);
                      }}
                      aria-label={isActive ? `Abrir detalle de ${item.titulo}` : `Ver ${item.titulo}`}
                    >
                      <span className="featured-card-media">
                        <FeaturedMedia item={item} mode="card" priority={index === 0} />
                      </span>
                      <span className="featured-card-copy">
                        {item.meta && <span className="featured-card-meta">{item.meta}</span>}
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

          <div className="featured-progress" aria-live="polite">
            <span className="featured-progress-count">{activeIndex + 1} / {visibleItems.length}</span>
            <div className="featured-dots" role="tablist" aria-label="Cards de novedades">
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

          <div className="focus-rail-info" aria-live="polite">
            <div>
              <div className="focus-rail-meta">
                <span>{activeItem.meta || (activeItem.mediaType === "youtube" ? "Video destacado" : "Destacado")}</span>
              </div>
              <h3>{activeItem.titulo}</h3>
              {activeItem.descripcion && <p>{activeItem.descripcion}</p>}
            </div>
            {(activeItem.ctaText || activeItem.ctaHref || activeItem.ctaAction) && (
              <button className={`btn ${activeItem.ctaAction === "scroll" || primaryContact.platform !== "whatsapp" ? "btn-plum" : "btn-wa"} btn-lg`} onClick={() => runCta(activeItem)}>
                {activeItem.ctaAction !== "scroll" && <ContactIcon platform={primaryContact.platform} size={18} />}
                {getCtaLabel(activeItem, contactLabel)}
              </button>
            )}
          </div>
        </div>
      </section>

      {modalItem && (
        <div className={`featured-modal-backdrop ${isFeaturedModalVisible ? "open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="featured-modal-title" onMouseDown={closeModal}>
          <div className={`featured-modal-shell featured-modal-${modalOrientation}`} onMouseDown={(event) => event.stopPropagation()}>
            <button ref={closeButtonRef} className="featured-modal-close" onClick={closeModal} aria-label="Cerrar galería destacada">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div
              className={`featured-modal-media ${modalMedia?.type === "image" ? "is-clickable" : ""}`}
              onClick={() => {
                if (modalMedia?.type === "image") setLightboxOpen(true);
              }}
            >
              {visibleItems.length > 1 && (
                <>
                  <button className="featured-modal-arrow featured-modal-prev" onClick={(event) => { event.stopPropagation(); goModal(-1); }} aria-label="Ver card anterior">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <button className="featured-modal-arrow featured-modal-next" onClick={(event) => { event.stopPropagation(); goModal(1); }} aria-label="Ver card siguiente">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </>
              )}
              {!imageReady && (
                <div className="featured-loader" aria-label="Cargando imagen">
                  <span />
                </div>
              )}
              <FeaturedMedia item={modalItem} mode="modal" priority onLoaded={() => setImageReady(true)} />
            </div>

            <div className="featured-modal-copy">
              <div className="section-kicker">{modalItem.meta || (modalItem.mediaType === "youtube" ? "Video destacado" : "Imagen destacada")}</div>
              <h3 id="featured-modal-title">{modalItem.titulo}</h3>
              {modalItem.descripcion && <p>{modalItem.descripcion}</p>}
              <button className={`btn ${modalItem.ctaAction === "scroll" || primaryContact.platform !== "whatsapp" ? "btn-plum" : "btn-wa"} btn-lg`} onClick={() => runCta(modalItem)}>
                {modalItem.ctaAction !== "scroll" && <ContactIcon platform={primaryContact.platform} size={18} />}
                {getCtaLabel(modalItem, contactLabel)}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && modalItem && modalMedia?.type === "image" && (
        <ImageLightbox
          src={originalImageUrl(modalItem.imagen!)}
          alt={modalMedia.alt}
          onClose={() => setLightboxOpen(false)}
          hasPrev={visibleItems.length > 1}
          hasNext={visibleItems.length > 1}
          onPrev={() => goModal(-1)}
          onNext={() => goModal(1)}
          counter={`${(modalIndex ?? 0) + 1} / ${visibleItems.length}`}
        />
      )}
    </>
  );
}
