"use client";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { SanityImage } from "@/types";
import { urlFor } from "@/lib/sanity";
import { ContactIcon, getContactColor, getContactHref, type ContactLink } from "@/lib/social";

interface Brand {
  nombre: string; whatsapp: string; whatsappDisplay?: string;
  instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string;
  socialLinks?: ContactLink[];
  primaryContact?: ContactLink;
  logo?: SanityImage | null;
}

export default function Footer({ brand }: { brand: Brand }) {
  const primary = brand.primaryContact;
  const socials = (brand.socialLinks || []).filter((link) => link.active !== false);

  return (
    <footer className="footer-v2">
      <div className="footer-v2-bg">
        <div className="footer-ambient" aria-hidden="true" />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="footer-v2-grid">
            <div className="footer-v2-brand-col">
              <div className="footer-brand-row">
                {brand.logo && (
                  <Image
                    src={urlFor(brand.logo).width(80).height(80).fit("crop").url()}
                    alt={brand.nombre}
                    width={40}
                    height={40}
                    style={{ borderRadius: "50%", objectFit: "cover" }}
                  />
                )}
                <div className="footer-brand serif footer-brand-gradient">{brand.nombre}</div>
              </div>
              <p className="footer-v2-desc">
                Artículos para fiesta, útiles escolares, descartables, manualidades y servicios en un solo lugar.
              </p>
              {primary && (
                <a className="footer-contact" href={getContactHref(primary)} target="_blank" rel="noopener noreferrer">
                  <ContactIcon platform={primary.platform} />
                  <span>{primary.label}</span>
                </a>
              )}
            </div>

            <div className="footer-v2-links-col">
              <h4>Productos</h4>
              <a className="footer-link" href="/catalog">Catálogo completo</a>
              <a className="footer-link" href="/#novedades">Novedades</a>
            </div>
            <div className="footer-v2-links-col">
              <h4>Empresa</h4>
              <a className="footer-link" href="/#horarios">Horarios</a>
              {primary && <a className="footer-link" href={getContactHref(primary)} target="_blank" rel="noopener noreferrer">Contacto</a>}
            </div>
          </div>

          <div className="footer-v2-socials">
            {socials.map((s) => (
              <a
                key={s._key || `${s.platform}-${s.label}`}
                href={getContactHref(s)}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-v2-social"
                aria-label={s.label}
                title={s.label}
                style={{ "--social-color": getContactColor(s) } as CSSProperties}
              >
                <ContactIcon platform={s.platform} />
              </a>
            ))}
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {brand.nombre}. Hecho en Lima.</span>
            <span className="mono" style={{ fontSize: 11 }}>Powered by Next.js + Sanity</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
