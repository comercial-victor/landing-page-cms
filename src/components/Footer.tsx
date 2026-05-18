"use client";

function waLink(n: string, m?: string) {
  const b = `https://wa.me/${n.replace(/\D/g, "")}`;
  return m ? `${b}?text=${encodeURIComponent(m)}` : b;
}

interface Brand {
  nombre: string; whatsapp: string; whatsappDisplay?: string;
  instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string;
}

const WaIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.92C21.95 6.45 17.5 2 12.04 2z"/></svg>;
const IgIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
const FbIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>;
const TikTokIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z"/></svg>;
const MailIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

export default function Footer({ brand }: { brand: Brand }) {
  const socials = [
    { id: "wa", label: "WhatsApp", href: waLink(brand.whatsapp, "Hola!"), icon: <WaIcon />, color: "#25D366" },
    ...(brand.instagramUrl ? [{ id: "ig", label: "Instagram", href: brand.instagramUrl, icon: <IgIcon />, color: "#E1306C" }] : []),
    ...(brand.facebookUrl ? [{ id: "fb", label: "Facebook", href: brand.facebookUrl, icon: <FbIcon />, color: "#1877F2" }] : []),
    ...(brand.tiktokUrl ? [{ id: "tk", label: "TikTok", href: brand.tiktokUrl, icon: <TikTokIcon />, color: "#00f2ea" }] : []),
  ];

  return (
    <footer className="footer-v2">
      <div className="footer-v2-bg">
        <div className="footer-ambient" aria-hidden="true" />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="footer-cta">
            <h3>¿Tu fiesta es este fin de semana?</h3>
            <p>Escríbenos ahora y te armamos una cotización en menos de una hora.</p>
            <a className="btn btn-lg footer-cta-btn" href={waLink(brand.whatsapp, "Hola! Mi fiesta es pronto.")} target="_blank" rel="noopener noreferrer">
              Conversemos por WhatsApp
            </a>
          </div>

          <div className="footer-v2-grid">
            <div className="footer-v2-brand-col">
              <div className="footer-brand serif">{brand.nombre}</div>
              <p className="footer-v2-desc">
                Artículos para fiesta, útiles escolares, descartables, manualidades y servicios en un solo lugar.
              </p>
              <a className="footer-contact" href={waLink(brand.whatsapp)} target="_blank" rel="noopener noreferrer">
                <WaIcon />
                <span>{brand.whatsappDisplay || "WhatsApp"}</span>
              </a>
            </div>

            <div className="footer-v2-links-col">
              <h4>Productos</h4>
              <a className="footer-link" href="/catalog">Catálogo completo</a>
              <a className="footer-link" href="/#novedades">Novedades</a>
            </div>
            <div className="footer-v2-links-col">
              <h4>Empresa</h4>
              <a className="footer-link" href="/#horarios">Horarios</a>
              <a className="footer-link" href={waLink(brand.whatsapp)} target="_blank" rel="noopener noreferrer">Contacto</a>
            </div>
          </div>

          <div className="footer-v2-socials">
            {socials.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-v2-social"
                aria-label={s.label}
                title={s.label}
                style={{ "--social-color": s.color } as React.CSSProperties}
              >
                {s.icon}
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
