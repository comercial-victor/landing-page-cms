"use client";

import type { Hero as HeroType } from "@/types";
import Image from "next/image";
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
  const floatingCards = (hero?.floatingCards?.length ? hero.floatingCards : fallbackFloatingCards).slice(0, 6);

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

  return (
    <section className="hero" id="top">
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
            <a
              className="btn btn-ghost btn-lg"
              href="/catalog"
            >
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

        <div className="hero-visual fade-up" style={{ animationDelay: "0.15s" }} aria-hidden="true">
          {floatingCards.map((card, index) => (
            <div
              key={card._key}
              className={`hero-float-card hero-float-${card.position || "leftTop"}`}
              style={{
                "--hero-rotate": `${card.rotation ?? 0}deg`,
                "--hero-delay": `${index * 120}ms`,
              } as React.CSSProperties}
            >
              {card.image ? (
                <Image
                  src={urlFor(card.image).width(520).height(640).fit("crop").url()}
                  alt={card.title || card.label || "Destacado Comercial Victor"}
                  fill
                  sizes="(max-width: 700px) 38vw, 220px"
                  className="hero-float-img"
                />
              ) : (
                <div className="hero-float-art" aria-hidden="true">
                  {index % 3 === 0 && <div className="balloon" />}
                  {index % 3 === 1 && (
                    <svg width="120" height="110" viewBox="0 0 120 110">
                      <polygon points="60,8 74,38 106,38 82,58 92,90 60,72 28,90 38,58 14,38 46,38" fill="rgba(255,255,255,0.86)" />
                    </svg>
                  )}
                  {index % 3 === 2 && (
                    <svg width="130" height="110" viewBox="0 0 130 110">
                      <rect x="15" y="40" width="100" height="60" rx="8" fill="rgba(255,255,255,0.82)" />
                      <rect x="10" y="32" width="110" height="14" rx="4" fill="rgba(255,255,255,0.96)" />
                      <rect x="60" y="32" width="10" height="68" fill="rgba(31,26,36,0.24)" />
                    </svg>
                  )}
                </div>
              )}
              {(card.label || card.title) && (
                <div className="hero-float-label">
                  {card.label && <span>{card.label}</span>}
                  {card.title && <strong>{card.title}</strong>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
