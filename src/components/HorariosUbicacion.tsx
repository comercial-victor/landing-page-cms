import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";

interface Brand {
  whatsapp: string;
  whatsappDisplay?: string;
  primaryContact?: ContactLink;
  direccion?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  horarios?: { dia: string; hora: string; cerrado?: boolean }[];
}

export default function HorariosUbicacion({ brand }: { brand: Brand }) {
  const hoy = new Date().getDay(); // 0=dom
  const horarioIdx = hoy === 0 ? 2 : hoy === 6 ? 1 : 0;
  const horarios = brand.horarios || [];
  const primaryContact = brand.primaryContact || {
    platform: "whatsapp" as const,
    phone: brand.whatsapp,
    label: brand.whatsappDisplay || "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };

  return (
    <section className="section">
      <div className="container">
        <div className="info-grid">
          {/* Horarios */}
          <div className="info-card" id="horarios">
            <h3>Horarios</h3>
            <p className="info-card-lede">
              Atendemos presencial y pedidos por WhatsApp.
            </p>
            {horarios.map((h, i) => (
              <div key={i} className={`schedule-row ${i === horarioIdx ? "today" : ""}`}>
                <span>
                  {i === horarioIdx && <span className="dot-open" aria-hidden="true" />}
                  {h.dia}
                </span>
                <span className="mono schedule-time">
                  {h.cerrado ? "Cerrado" : h.hora}
                </span>
              </div>
            ))}
          </div>

          {/* Ubicación */}
          <div className="info-card" id="contacto">
            <h3>Ubicación</h3>
            {brand.direccion && (
              <div className="addr-block">
                <div className="addr-label">Dirección</div>
                <div className="addr-value">{brand.direccion}</div>
              </div>
            )}
            {brand.whatsappDisplay && (
              <div className="addr-block">
                <div className="addr-label">WhatsApp</div>
                <div className="addr-value mono">{brand.whatsappDisplay}</div>
              </div>
            )}

            {/* Map embed or placeholder */}
            {brand.googleMapsEmbedUrl ? (
              <div style={{ marginTop: 16, borderRadius: 14, overflow: "hidden", aspectRatio: "16/9" }}>
                <iframe
                  src={brand.googleMapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación en Google Maps"
                />
              </div>
            ) : (
              <div className="map-fallback">
                <div className="map-fallback-icon" aria-hidden="true">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
                    <path d="M9 3v15M15 6v15" />
                  </svg>
                </div>
                <div>
                  <strong>Mapa no disponible</strong>
                  <span>{brand.direccion || "Comercial Victor, Lima"}</span>
                </div>
              </div>
            )}

            <div className="info-actions">
              <a
                className="btn btn-plum"
                href={brand.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(brand.direccion || "Miraflores Lima")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cómo llegar
              </a>
              <a
                className="btn btn-ghost"
                href={getContactHref(primaryContact, "Hola! Quisiera visitar la tienda.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ContactIcon platform={primaryContact.platform} size={17} />
                {primaryContact.label}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
