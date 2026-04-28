function waLink(numero: string, mensaje?: string) {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

interface Brand {
  nombre: string;
  whatsapp: string;
  whatsappDisplay?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
}

const WaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.92C21.95 6.45 17.5 2 12.04 2zm5.81 14.02c-.25.7-1.44 1.34-2 1.42-.51.07-1.16.1-1.87-.12-.43-.13-.98-.32-1.69-.62-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.5.25.59.84 2.05.91 2.2.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.4-.44.54-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.02 1.12.99 2.06 1.3 2.36 1.45.3.15.47.12.64-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.07.12.07.7-.18 1.4z" />
  </svg>
);

const IgIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const FbIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
  </svg>
);

const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.84-.1z" />
  </svg>
);

export default function Footer({ brand }: { brand: Brand }) {
  const socials = [
    { id: "wa", label: "WhatsApp", href: waLink(brand.whatsapp, "Hola!"), icon: <WaIcon /> },
    ...(brand.instagramUrl ? [{ id: "ig", label: "Instagram", href: brand.instagramUrl, icon: <IgIcon /> }] : []),
    ...(brand.facebookUrl ? [{ id: "fb", label: "Facebook", href: brand.facebookUrl, icon: <FbIcon /> }] : []),
    ...(brand.tiktokUrl ? [{ id: "tk", label: "TikTok", href: brand.tiktokUrl, icon: <TikTokIcon /> }] : []),
  ];

  // fallback socials if none configured
  const displaySocials = socials.length > 1 ? socials : [
    { id: "wa", label: "WhatsApp", href: waLink(brand.whatsapp, "Hola!"), icon: <WaIcon /> },
    { id: "ig", label: "Instagram", href: "https://instagram.com/comercialvictor", icon: <IgIcon /> },
    { id: "fb", label: "Facebook", href: "https://facebook.com/comercialvictor", icon: <FbIcon /> },
    { id: "tk", label: "TikTok", href: "https://tiktok.com/@comercialvictor", icon: <TikTokIcon /> },
  ];

  return (
    <footer className="footer">
      <div className="footer-gradient" aria-hidden="true" />
      <div className="container" style={{ position: "relative", zIndex: 1 }}>

        {/* CTA Banner */}
        <div className="footer-cta">
          <h3>¿Tu fiesta es este fin de semana?</h3>
          <p>Escríbenos ahora y te armamos una cotización en menos de una hora.</p>
          <a
            className="btn btn-lg footer-cta-btn"
            href={waLink(brand.whatsapp, "Hola! Mi fiesta es pronto, necesito ayuda.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Conversemos por WhatsApp
          </a>
        </div>

        {/* Main footer content */}
        <div className="footer-inner">
          <div>
            <h4>La tienda</h4>
            <div className="footer-brand">{brand.nombre}</div>
            <p style={{ opacity: 0.75, fontSize: 14, maxWidth: 320, marginBottom: 20 }}>
              Fiestas con alma, sin complicaciones. Pidan lo imposible, lo hacemos posible.
            </p>
            <div className="footer-socials">
              {displaySocials.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social"
                  aria-label={s.label}
                  title={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Productos</h4>
            {["#catalogo", "#novedades"].map((href, i) => (
              <a key={i} className="footer-link" href={href}>
                {i === 0 ? "Catálogo completo" : "Novedades"}
              </a>
            ))}
          </div>

          <div>
            <h4>Contacto</h4>
            <a className="footer-link" href={waLink(brand.whatsapp)} target="_blank" rel="noopener noreferrer">
              WhatsApp {brand.whatsappDisplay || brand.whatsapp}
            </a>
            <a className="footer-link" href="#horarios">Horarios</a>
            <a className="footer-link" href="#contacto">Dirección</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {brand.nombre}. Hecho con helio en Lima.</span>
          <span className="mono">Powered by Next.js + Sanity</span>
        </div>
      </div>
    </footer>
  );
}
