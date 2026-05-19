"use client";

import Image from "next/image";
import type { MouseEvent, PointerEvent, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  counter?: string;
}

const minZoom = 1;
const maxZoom = 5;

export default function ImageLightbox({
  src,
  alt,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  counter,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setLoading(true);
  }, [src]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (event.key === "ArrowRight" && hasNext) onNext?.();
      if (event.key === "0") {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasNext, hasPrev, onClose, onNext, onPrev]);

  const clampZoom = (value: number) => Math.min(maxZoom, Math.max(minZoom, value));

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.18 : 0.18;
    setZoom((current) => {
      const next = clampZoom(Number((current + delta).toFixed(2)));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const startDrag = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (zoom <= 1) return;
    event.preventDefault();
    dragRef.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent) => {
    if (!dragRef.current || zoom <= 1) return;
    event.preventDefault();
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
  };

  const endDrag = (event: PointerEvent) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const toggleZoom = (event: MouseEvent) => {
    event.stopPropagation();
    if (zoom > 1) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    setZoom(2.2);
  };

  return (
    <div className="image-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label={alt}>
      <button className="image-lightbox-close" onClick={onClose} aria-label="Cerrar imagen">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {hasPrev && (
        <button className="image-lightbox-arrow image-lightbox-prev" onClick={(event) => { event.stopPropagation(); onPrev?.(); }} aria-label="Imagen anterior">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      <div
        className={`image-lightbox-stage ${zoom > 1 ? "is-zoomed" : ""}`}
        onClick={(event) => event.stopPropagation()}
        onWheel={handleWheel}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={toggleZoom}
      >
        {loading && (
          <div className="image-lightbox-loader" aria-label="Cargando imagen">
            <span />
          </div>
        )}
        <Image
          key={src}
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          className="image-lightbox-img"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
            cursor: zoom > 1 ? "grab" : "zoom-in",
          }}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          priority
        />
      </div>

      {hasNext && (
        <button className="image-lightbox-arrow image-lightbox-next" onClick={(event) => { event.stopPropagation(); onNext?.(); }} aria-label="Imagen siguiente">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      <div className="image-lightbox-help" onClick={(event) => event.stopPropagation()}>
        <span>{counter || `${Math.round(zoom * 100)}%`}</span>
        <span>Rueda para zoom · doble click reinicia · arrastra al ampliar</span>
      </div>
    </div>
  );
}
