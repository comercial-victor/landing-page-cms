"use client";
import { ContactIcon, getContactHref, getPlatformColor, type ContactLink } from "@/lib/social";

interface Brand {
  nombre: string; whatsapp: string; whatsappDisplay?: string;
  instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string;
  socialLinks?: ContactLink[];
  primaryContact?: ContactLink;
}

export default function Footer({ brand }: { brand: Brand }) {
  const primary = brand.primaryContact;
  const socials = (brand.socialLinks || []).filter((link) => link.showInFooter !== false);

  return (
    <footer className="footer-v2">
      <div className="footer-v2-bg">
        <div className="footer-ambient" aria-hidden="true" />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="footer-cta">
            <h3>¿Tu fiesta es este fin de semana?</h3>
            <p>Escríbenos ahora y te armamos una cotización en menos de una hora.</p>
            <a className="btn btn-lg footer-cta-btn" href={primary ? getContactHref(primary, "Hola! Mi fiesta es pronto.") : "#"} target="_blank" rel="noopener noreferrer">
              {primary ? `Conversemos por ${primary.label}` : "Conversemos"}
            </a>
          </div>

          <div className="footer-v2-grid">
            <div className="footer-v2-brand-col">
              <div className="footer-brand serif">{brand.nombre}</div>
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
                style={{ "--social-color": getPlatformColor(s.platform) } as React.CSSProperties}
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
