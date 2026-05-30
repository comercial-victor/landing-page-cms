"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Collection, ProductoFlat } from "@/types";
import { urlFor } from "@/lib/sanity";
import { collectionPath } from "@/lib/collections";
import { ProductImage } from "./ProductHelpers";

function AllGridIcon({ className = "all-grid-icon" }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <span /><span /><span />
      <span /><span /><span />
      <span /><span /><span />
    </span>
  );
}

interface ColeccionesProps {
  colecciones: Collection[];
  variant?: "carousel" | "grid";
}

const AUTO_ROTATE_MS = 5200;

export default function Colecciones({ colecciones, variant = "grid" }: ColeccionesProps) {
  const visibleCollections = useMemo(
    () =>
      colecciones
        .filter((collection) => collection.visible !== false)
        .filter((collection) => collection.items?.some((item) => item.producto)),
    [colecciones],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [rotationResetKey, setRotationResetKey] = useState(0);
  const isCarousel = variant === "carousel" && visibleCollections.length > 0;

  useEffect(() => {
    if (!isCarousel || visibleCollections.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleCollections.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isCarousel, visibleCollections.length, rotationResetKey]);

  useEffect(() => {
    if (activeIndex > visibleCollections.length - 1) setActiveIndex(0);
  }, [activeIndex, visibleCollections.length]);

  if (!visibleCollections.length) return null;

  return (
    <section className={`section colecciones-section ${isCarousel ? "colecciones-section-carousel" : ""}`} id="colecciones">
      <div className="container">
        <div className="colecciones-head">
          <div>
            <div className="section-kicker">Colecciones</div>
            <h2 className="section-title">Ideas listas para compartir</h2>
          </div>
          <p className="section-lede">
            Colecciones por temporada, ocasión o campaña, pensadas para abrirse como una página propia y enviarse directo por redes.
          </p>
        </div>

        {isCarousel ? (
          <CollectionCarousel
            collections={visibleCollections}
            activeIndex={activeIndex}
            onSelect={(index) => {
              setActiveIndex(index);
              setRotationResetKey((key) => key + 1);
            }}
          />
        ) : (
          <>
            <CollectionIndexBar collections={visibleCollections} />
            <div className="colecciones-grid">
              {visibleCollections.map((collection, index) => (
                <CollectionGridCard key={collection._id} collection={collection} featured={index === 0} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function CollectionIndexBar({ collections, activeCollectionId }: { collections: Collection[]; activeCollectionId?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const activeChipRef = useRef<HTMLAnchorElement>(null);
  const [scrollState, setScrollState] = useState({ left: false, right: false });
  const orderedCollections = useMemo(() => {
    if (!activeCollectionId) return collections;
    const active = collections.find((collection) => collection._id === activeCollectionId);
    if (!active) return collections;
    return [active, ...collections.filter((collection) => collection._id !== activeCollectionId)];
  }, [collections, activeCollectionId]);

  const barAccentColor = useMemo(() => {
    const active = collections.find((collection) => collection._id === activeCollectionId);
    return active?.themeColor || collections[0]?.themeColor || "var(--plum)";
  }, [collections, activeCollectionId]);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      setScrollState({ left: false, right: false });
      return;
    }
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const left = rail.scrollLeft > 6;
    const right = rail.scrollLeft < maxScroll - 6;
    setScrollState((current) =>
      current.left === left && current.right === right ? current : { left, right },
    );
  }, []);

  const scrollRail = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction === "right" ? Math.max(180, rail.clientWidth * 0.72) : -Math.max(180, rail.clientWidth * 0.72),
      behavior: "smooth",
    });
    window.setTimeout(updateScrollState, 260);
  };

  useEffect(() => {
    updateScrollState();
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => updateScrollState();
    const onResize = () => updateScrollState();
    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const id = window.setTimeout(updateScrollState, 120);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(id);
    };
  }, [collections.length, updateScrollState]);

  useEffect(() => {
    const chip = activeChipRef.current;
    const rail = railRef.current;
    if (!chip || !rail) return;
    const railRect = rail.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    const targetLeft = rail.scrollLeft + (chipRect.left + chipRect.width / 2) - (railRect.left + railRect.width / 2);
    rail.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [activeCollectionId, orderedCollections.length]);

  return (
    <nav className="collection-index-bar" aria-label="Colecciones activas" style={{ "--collection-color": barAccentColor } as CSSProperties}>
      <span className="collection-index-label">
        <span>Colecciones activas</span>
        <strong>{collections.length}</strong>
      </span>
      <div className="collection-index-rail-wrap">
        {scrollState.left && (
          <button className="collection-index-cue left" type="button" aria-label="Ver colecciones anteriores" onClick={() => scrollRail("left")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <div ref={railRef} className="collection-index-rail">
          <Link
            ref={!activeCollectionId ? activeChipRef : undefined}
            href="/colecciones"
            className={`collection-index-chip ${!activeCollectionId ? "is-active" : ""}`}
            style={{ "--collection-color": "var(--plum)" } as CSSProperties}
            aria-current={!activeCollectionId ? "page" : undefined}
          >
            <AllGridIcon className="collection-index-all-icon all-grid-icon" />
            <span>Todas</span>
            <small>{collections.length}</small>
          </Link>
          {orderedCollections.map((collection) => {
            const theme = collection.themeColor || "#D2386C";
            const count = collection.items.filter((item) => item.visible !== false && item.producto).length;
            const isActive = activeCollectionId === collection._id;
            return (
              <Link
                ref={isActive ? activeChipRef : undefined}
                key={collection._id}
                href={collectionPath(collection)}
                className={`collection-index-chip ${isActive ? "is-active" : ""}`}
                style={{ "--collection-color": theme } as CSSProperties}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="collection-index-dot" aria-hidden="true" />
                <span>{collection.titulo}</span>
                <small>{count}</small>
              </Link>
            );
          })}
        </div>
        {scrollState.right && (
          <button className="collection-index-cue right" type="button" aria-label="Ver más colecciones" onClick={() => scrollRail("right")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        )}
      </div>
    </nav>
  );
}

function CollectionCarousel({
  collections,
  activeIndex,
  onSelect,
}: {
  collections: Collection[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const dotsRailRef = useRef<HTMLDivElement>(null);
  const activeDotRef = useRef<HTMLButtonElement>(null);
  const [dotsScrollState, setDotsScrollState] = useState({ left: false, right: false });
  const previousIndexRef = useRef(activeIndex);
  const direction = activeIndex >= previousIndexRef.current ? "next" : "prev";
  useEffect(() => {
    previousIndexRef.current = activeIndex;
  }, [activeIndex]);

  const updateDotsScrollState = useCallback(() => {
    const rail = dotsRailRef.current;
    if (!rail) {
      setDotsScrollState({ left: false, right: false });
      return;
    }
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const left = rail.scrollLeft > 6;
    const right = rail.scrollLeft < maxScroll - 6;
    setDotsScrollState((current) =>
      current.left === left && current.right === right ? current : { left, right },
    );
  }, []);

  const scrollDotsRail = (direction: "left" | "right") => {
    const rail = dotsRailRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction === "right" ? Math.max(170, rail.clientWidth * 0.7) : -Math.max(170, rail.clientWidth * 0.7),
      behavior: "smooth",
    });
    window.setTimeout(updateDotsScrollState, 260);
  };

  useEffect(() => {
    const rail = dotsRailRef.current;
    updateDotsScrollState();
    if (!rail) return;
    const onScroll = () => updateDotsScrollState();
    const onResize = () => updateDotsScrollState();
    rail.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const id = window.setTimeout(updateDotsScrollState, 120);
    return () => {
      rail.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(id);
    };
  }, [collections.length, updateDotsScrollState]);

  useEffect(() => {
    const dot = activeDotRef.current;
    const rail = dotsRailRef.current;
    if (dot && rail) {
      const railRect = rail.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const targetLeft = rail.scrollLeft + (dotRect.left + dotRect.width / 2) - (railRect.left + railRect.width / 2);
      rail.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }
    window.setTimeout(updateDotsScrollState, 280);
  }, [activeIndex, updateDotsScrollState]);

  const active = collections[activeIndex] || collections[0];
  const cover = active.portada;
  const href = collectionPath(active);
  const theme = active.themeColor || "#8B3FD1";
  const productCount = active.items.filter((item) => item.visible !== false && item.producto).length;

  return (
    <div className="collections-carousel" style={{ "--collection-color": theme } as CSSProperties}>
      <Link key={active._id} href={href} className={`collections-carousel-card is-${direction}`} aria-label={`Ver colección ${active.titulo}`}>
        <span className="collections-carousel-bg" aria-hidden="true">
          {cover ? (
            <Image
              src={urlFor(cover).width(1100).height(760).fit("crop").auto("format").url()}
              alt=""
              fill
              sizes="(max-width: 900px) 94vw, 760px"
              className="collections-carousel-img"
              priority={false}
            />
          ) : null}
        </span>
        <span className="collections-carousel-shade" aria-hidden="true" />
        <span className="collections-carousel-copy">
          <span className="coleccion-tag">{active.etiqueta || "Colección"}</span>
          <strong>{active.titulo}</strong>
          {active.subtitulo && <span>{active.subtitulo}</span>}
          <span className="collections-carousel-actions">
            <em>Ver colección</em>
            <small>{productCount} productos</small>
          </span>
        </span>
      </Link>

      <div className="collections-carousel-side">
        <div className="collections-carousel-list-wrap">
          {dotsScrollState.left && (
            <button className="collections-carousel-cue left" type="button" aria-label="Ver colecciones anteriores" onClick={() => scrollDotsRail("left")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          <div ref={dotsRailRef} className="collections-carousel-list" aria-label="Colecciones destacadas">
            {collections.map((collection, index) => {
              const current = index === activeIndex;
              return (
                <button
                  ref={current ? activeDotRef : undefined}
                  key={collection._id}
                  type="button"
                  className={`collections-carousel-dot ${current ? "is-active" : ""}`}
                  style={{ "--collection-color": collection.themeColor || "#D2386C" } as CSSProperties}
                  onClick={() => onSelect(index)}
                  aria-label={`Mostrar ${collection.titulo}`}
                >
                  <span className="dot-color" style={{ background: collection.themeColor || "#D2386C" }} />
                  <span>{collection.titulo}</span>
                </button>
              );
            })}
          </div>
          {dotsScrollState.right && (
            <button className="collections-carousel-cue right" type="button" aria-label="Ver más colecciones" onClick={() => scrollDotsRail("right")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
        </div>
        <Link href="/colecciones" className="collections-all-btn" aria-label="Ver todas las colecciones">
          <span>Ver todas las colecciones</span>
          <strong aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </strong>
        </Link>
      </div>
    </div>
  );
}

function CollectionGridCard({ collection, featured }: { collection: Collection; featured?: boolean }) {
  const products = collection.items.map((item) => item.producto).filter(Boolean) as ProductoFlat[];
  const coverProducts = collection.items
    .filter((item) => item.visible !== false && item.mostrarEnPortada && item.producto)
    .map((item) => item.producto)
    .filter(Boolean) as ProductoFlat[];
  const previewProducts = (coverProducts.length ? coverProducts : products).slice(0, 3);
  const cover = collection.portada;
  const href = collectionPath(collection);
  const theme = collection.themeColor || "#D2386C";

  return (
    <Link
      href={href}
      className={`coleccion-card ${featured ? "is-featured" : ""} ${cover ? "has-cover" : ""}`}
      style={{ "--collection-color": theme } as CSSProperties}
    >
      <span className="coleccion-card-bg" aria-hidden="true">
        {cover ? (
          <Image
            src={urlFor(cover).width(920).height(920).fit("crop").auto("format").url()}
            alt=""
            fill
            sizes="(max-width: 900px) 90vw, 420px"
            className="coleccion-card-bg-img"
          />
        ) : null}
        <span className="coleccion-card-bg-overlay" />
      </span>
      {!cover && (
        <span className="coleccion-preview" aria-hidden="true">
          {previewProducts.map((producto, i) => (
            <span key={producto._id} className={`coleccion-mini coleccion-mini-${i}`}>
              <ProductImage producto={producto} />
            </span>
          ))}
        </span>
      )}
      <span className="coleccion-copy">
        <span className="coleccion-tag">{collection.etiqueta || "Colección"}</span>
        <strong>{collection.titulo}</strong>
        {collection.subtitulo && <span>{collection.subtitulo}</span>}
        <em>Ver colección</em>
      </span>
    </Link>
  );
}
