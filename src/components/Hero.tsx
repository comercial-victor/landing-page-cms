"use client";

import type { Hero as HeroType } from "@/types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { urlFor } from "@/lib/sanity";
import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";

interface HeroProps {
  hero: HeroType | null;
  brand: {
    nombre: string;
    whatsapp: string;
    tagline?: string;
    primaryContact?: ContactLink;
  };
}

const fallbackFloatingCards: NonNullable<HeroType["floatingCards"]> = [
  { _key: "fallback-1", label: "globos", title: "Helio", position: "leftTop" as const, rotation: -5, order: 1, visible: true },
  { _key: "fallback-2", label: "piñatas", title: "Artesanales", position: "rightTop" as const, rotation: 4, order: 2, visible: true },
  { _key: "fallback-3", label: "packs", title: "Cumpleaños", position: "leftBottom" as const, rotation: 3, order: 3, visible: true },
  { _key: "fallback-4", label: "escolar", title: "Útiles", position: "rightBottom" as const, rotation: -3, order: 4, visible: true },
];

export default function Hero({ hero, brand }: HeroProps) {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const currentRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startOffset: 0 });
  const [isSafari, setIsSafari] = useState(false);
  const [railDrag, setRailDrag] = useState(0);
  const [isRailDragging, setIsRailDragging] = useState(false);
  const [isRailSettling, setIsRailSettling] = useState(false);

  const titulo = hero?.titulo || "Fiestas que se recuerdan, no que se improvisan.";
  const subtitulo =
    hero?.subtitulo ||
    "Globos con helio, piñatas artesanales, menaje temático y packs todo incluido. Coordinamos tu fiesta contigo por WhatsApp.";
  const eyebrow = hero?.eyebrow || "Pedidos abiertos en Lima";
  const ctaMensaje =
    hero?.ctaPrincipalMensaje ||
    "Hola! Quisiera organizar una fiesta y necesito una cotización.";
  const ctaSecundario = hero?.ctaSecundarioTexto || "Ver catálogo";
  const trustItems = hero?.trustItems || ["12+ años celebrando", "3.4k fiestas en Lima", "24h entrega exprés"];

  const primaryContact = brand.primaryContact || {
    platform: "whatsapp" as const,
    phone: brand.whatsapp,
    label: "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };
  const primaryUrl = getContactHref(primaryContact, ctaMensaje);
  const ctaTexto = hero?.ctaPrincipalTexto || `Cotizar por ${primaryContact.label}`;
  const floatingCards = (hero?.floatingCards?.length ? hero.floatingCards : fallbackFloatingCards).slice(0, 10);
  const railRows = [0, 1].map((row) => {
    const rowCards = floatingCards.filter((_, index) => index % 2 === row);
    return rowCards.length ? rowCards : floatingCards;
  });

  // Parse trust items as "num · label" pairs
  const trustParsed = trustItems.map((item) => {
    const parts = item.split(" ");
    const num = parts[0];
    const label = parts.slice(1).join(" ");
    return { num, label };
  });

  // Split title for italic em tag on first word group ending in comma
  const titleParts = titulo.split(",");
  const hasComma = titleParts.length > 1;

  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent));

    const animatePointer = () => {
      if (interactiveRef.current) {
        currentRef.current.x += (targetRef.current.x - currentRef.current.x) / 18;
        currentRef.current.y += (targetRef.current.y - currentRef.current.y) / 18;
        interactiveRef.current.style.transform = `translate3d(${Math.round(currentRef.current.x)}px, ${Math.round(currentRef.current.y)}px, 0)`;
      }
      rafRef.current = window.requestAnimationFrame(animatePointer);
    };

    rafRef.current = window.requestAnimationFrame(animatePointer);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleHeroMouseMove = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    targetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handleRailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { active: true, startX: event.clientX, startOffset: railDrag };
    setIsRailDragging(true);
    setIsRailSettling(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleRailPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    event.preventDefault();
    const nextOffset = dragRef.current.startOffset + event.clientX - dragRef.current.startX;
    setRailDrag(Math.max(-720, Math.min(720, nextOffset)));
  };

  const endRailDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsRailDragging(false);
    setIsRailSettling(true);
    window.setTimeout(() => setIsRailSettling(false), 360);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="hero" id="top" onMouseMove={handleHeroMouseMove}>
      <svg className="hero-gradient-svg" aria-hidden="true" focusable="false">
        <defs>
          <filter id="heroBlurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div className={`hero-gradient-animation ${isSafari ? "is-safari" : ""}`} aria-hidden="true">
        <span className="hero-gradient-orb hero-gradient-orb-1" />
        <span className="hero-gradient-orb hero-gradient-orb-2" />
        <span className="hero-gradient-orb hero-gradient-orb-3" />
        <span className="hero-gradient-orb hero-gradient-orb-4" />
        <span className="hero-gradient-orb hero-gradient-orb-5" />
        <span ref={interactiveRef} className="hero-gradient-orb hero-gradient-pointer" />
      </div>
      <div className="hero-glow hero-glow-a" aria-hidden="true" />
      <div className="hero-glow hero-glow-b" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy fade-up">
          <div className="eyebrow">
            <span className="eyebrow-pulse" aria-hidden="true" />
            {eyebrow}
          </div>

          <div className="hero-brand-mark" aria-label={brand.nombre}>
            {brand.nombre}
          </div>

          <h1 className="display">
            {hasComma ? (
              <>
                {titleParts[0]},<br />
                <em>{titleParts[1].trim().replace(/,.*/, "")}</em>
                {titleParts.slice(2).length > 0 && (
                  <>,<br />{titleParts.slice(2).join(",")}</>
                )}
              </>
            ) : (
              titulo
            )}
          </h1>

          <p className="hero-sub">{subtitulo}</p>

          <div className="hero-cta">
            <a className={`btn ${primaryContact.platform === "whatsapp" ? "btn-wa" : "btn-plum"} btn-lg`} href={primaryUrl} target="_blank" rel="noopener noreferrer">
              <ContactIcon platform={primaryContact.platform} size={19} />
              {ctaTexto}
            </a>
            <a className="btn btn-plum btn-lg btn-catalog" href="/catalog">
              {ctaSecundario}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </a>
          </div>

          {trustParsed.length > 0 && (
            <div className="hero-trust">
              {trustParsed.map((t, i) => (
                <div key={i} className="trust-item">
                  <span className="trust-num">{t.num}</span>
                  <span className="trust-label">{t.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`hero-visual hero-rail-wrap fade-up ${isRailDragging ? "is-dragging" : ""} ${isRailSettling ? "is-settling" : ""}`}
          style={{ animationDelay: "0.15s", "--hero-drag": `${railDrag}px` } as CSSProperties}
          onPointerDown={handleRailPointerDown}
          onPointerMove={handleRailPointerMove}
          onPointerUp={endRailDrag}
          onPointerCancel={endRailDrag}
          onDragStart={(event) => event.preventDefault()}
          aria-hidden="true"
        >
          {railRows.map((rowCards, row) => {
            const loopCards = [...rowCards, ...rowCards, ...rowCards];
            return (
              <div key={row} className={`hero-rail hero-rail-${row === 0 ? "top" : "bottom"}`}>
                {loopCards.map((card, index) => {
                  const format = card.visualFormat || (index % 3 === 1 ? "horizontal" : "vertical");
                  const isHorizontal = format === "horizontal";
                  return (
                    <div
                      key={`${card._key}-${row}-${index}`}
                      className={`hero-rail-card hero-rail-card-${format}`}
                      style={{
                        "--hero-rotate": `${card.rotation ?? 0}deg`,
                      } as CSSProperties}
                    >
                      <span className="hero-rail-media">
                        {card.image ? (
                          <Image
                            src={
                              isHorizontal
                                ? urlFor(card.image).width(760).height(480).fit("crop").url()
                                : urlFor(card.image).width(520).height(680).fit("crop").url()
                            }
                            alt={card.title || card.label || "Destacado Comercial Victor"}
                            fill
                            sizes={isHorizontal ? "(max-width: 700px) 58vw, 320px" : "(max-width: 700px) 38vw, 210px"}
                            className="hero-rail-img"
                          />
                        ) : (
                          <span className="hero-rail-fallback" />
                        )}
                      </span>
                      {(card.label || card.title) && (
                        <span className="hero-rail-copy">
                          {card.label && <span>{card.label}</span>}
                          {card.title && <strong>{card.title}</strong>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
