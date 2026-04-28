interface Brand {
  whatsapp: string;
  whatsappDisplay?: string;
  direccion?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  horarios?: { dia: string; hora: string; cerrado?: boolean }[];
}

function waLink(numero: string, mensaje?: string) {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export default function HorariosUbicacion({ brand }: { brand: Brand }) {
  const hoy = new Date().getDay(); // 0=dom
  const horarioIdx = hoy === 0 ? 2 : hoy === 6 ? 1 : 0;
  const horarios = brand.horarios || [];

  return (
    <section className="section">
      <div className="container">
        <div className="info-grid">
          {/* Horarios */}
          <div className="info-card" id="horarios">
            <h3>Horarios</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 16px" }}>
              Atendemos presencial y pedidos por WhatsApp.
            </p>
            {horarios.map((h, i) => (
              <div key={i} className={`schedule-row ${i === horarioIdx ? "today" : ""}`}>
                <span>
                  {i === horarioIdx && <span className="dot-open" aria-hidden="true" />}
                  {h.dia}
                </span>
                <span className="mono" style={{ fontSize: 13 }}>
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
              <div className="map-placeholder">
                <div className="map-pin" aria-hidden="true" />
                <span style={{ position: "relative", zIndex: 1, background: "rgba(255,255,255,0.9)", padding: "4px 10px", borderRadius: 6, marginTop: 56 }}>
                  {brand.direccion || "Miraflores, Lima"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
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
                href={waLink(brand.whatsapp, "Hola! Quisiera visitar la tienda.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
