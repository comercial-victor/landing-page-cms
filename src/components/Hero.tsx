"use client";

import type { Hero as HeroType } from "@/types";
import { waLink } from "@/lib/utils";

interface HeroProps {
  hero: HeroType | null;
  brand: {
    nombre: string;
    whatsapp: string;
    tagline?: string;
  };
}

export default function Hero({ hero, brand }: HeroProps) {
  const titulo = hero?.titulo || "Fiestas que se recuerdan, no que se improvisan.";
  const subtitulo =
    hero?.subtitulo ||
    "Globos con helio, piñatas artesanales, menaje temático y packs todo incluido. Coordinamos tu fiesta contigo por WhatsApp.";
  const eyebrow = hero?.eyebrow || "Pedidos abiertos en Lima";
  const ctaTexto = hero?.ctaPrincipalTexto || "Cotizar por WhatsApp";
  const ctaMensaje =
    hero?.ctaPrincipalMensaje ||
    "Hola! Quisiera organizar una fiesta y necesito una cotización.";
  const ctaSecundario = hero?.ctaSecundarioTexto || "Ver catálogo";
  const trustItems = hero?.trustItems || ["12+ años celebrando", "3.4k fiestas en Lima", "24h entrega exprés"];

  const waUrl = waLink(brand.whatsapp, ctaMensaje);

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
            <a className="btn btn-wa btn-lg" href={waUrl} target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.92C21.95 6.45 17.5 2 12.04 2z" />
              </svg>
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
          <div className="hero-orbit-card hero-orbit-top">
            <span>Escolar</span>
            <strong>Utiles y detalles</strong>
          </div>
          <div className="hero-orbit-card hero-orbit-bottom">
            <span>Fiesta lista</span>
            <strong>Packs por WhatsApp</strong>
          </div>
          <div className="hero-visual-card hv-1">
            <div className="hv-label mono">globos · helio</div>
            <div className="hv-shape">
              <div className="balloon" style={{ color: "rgba(255,255,255,0.85)" }} />
            </div>
          </div>
          <div className="hero-visual-card hv-2">
            <div className="hv-label mono">piñatas</div>
            <div className="hv-shape">
              <svg width="120" height="110" viewBox="0 0 120 110">
                <polygon points="60,8 74,38 106,38 82,58 92,90 60,72 28,90 38,58 14,38 46,38" fill="rgba(255,255,255,0.85)" />
              </svg>
            </div>
          </div>
          <div className="hero-visual-card hv-3">
            <div className="hv-label mono">packs cumple</div>
            <div className="hv-shape">
              <svg width="130" height="110" viewBox="0 0 130 110">
                <rect x="15" y="40" width="100" height="60" rx="6" fill="rgba(255,255,255,0.8)" />
                <rect x="10" y="32" width="110" height="14" rx="3" fill="rgba(255,255,255,0.95)" />
                <rect x="60" y="32" width="10" height="68" fill="rgba(31,26,36,0.25)" />
                <path d="M52 32 C 52 14, 78 14, 78 32" stroke="rgba(31,26,36,0.3)" strokeWidth="4" fill="none" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
