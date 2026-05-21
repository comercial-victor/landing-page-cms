import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";
import type { StoreStatus } from "@/types";

interface Brand {
  whatsapp: string;
  whatsappDisplay?: string;
  primaryContact?: ContactLink;
  direccion?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  horarios?: { dia: string; hora: string; cerrado?: boolean }[];
  storeStatus?: StoreStatus;
}

function parseOpeningMinutes(value?: string) {
  if (!value) return null;
  const match = value
    .toLowerCase()
    .replace(/\s+/g, "")
    .match(/^(\d{1,2})(?::?(\d{2}))?(a\.?m\.?|p\.?m\.?|am|pm)?$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const suffix = match[3] || "";
  if (suffix.includes("p") && hour < 12) hour += 12;
  if (suffix.includes("a") && hour === 12) hour = 0;
  if (Number.isNaN(hour) || Number.isNaN(minutes)) return null;
  return hour * 60 + minutes;
}

function getLimaMinutes() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function getLimaDay() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    weekday: "short",
  }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function getStatusNotice(status?: StoreStatus) {
  if (!status?.enabled || status.mode === "normal") return null;
  if (status.validUntil && new Date(status.validUntil).getTime() < Date.now()) return null;

  if (status.mode === "opens_later") {
    const openingMinutes = parseOpeningMinutes(status.openingTime);
    const nowMinutes = getLimaMinutes();
    if (openingMinutes !== null && nowMinutes >= openingMinutes) {
      return {
        tone: "open",
        title: "Ya estamos atendiendo",
        text: status.message || "Puedes escribirnos o visitarnos en tienda.",
      };
    }
    return {
      tone: "soon",
      title: status.message || "Abriremos pronto",
      text: status.openingTime ? `Hoy estaremos atendiendo desde las ${status.openingTime}.` : "Estamos preparando la tienda y actualizaremos el horario si cambia.",
    };
  }

  if (status.mode === "open_now") {
    return {
      tone: "open",
      title: status.message || "Estamos atendiendo",
      text: "Puedes escribirnos por redes o visitarnos en tienda.",
    };
  }

  if (status.mode === "closed_today") {
    return {
      tone: "soft",
      title: status.message || "Hoy haremos una pausa",
      text: "Puedes dejarnos tu consulta y te responderemos apenas volvamos a atender.",
    };
  }

  return {
    tone: "soft",
    title: status.message || "Aviso de atención",
    text: status.openingTime ? `Horario estimado: ${status.openingTime}.` : "Revisa este aviso antes de visitarnos.",
  };
}

export default function HorariosUbicacion({ brand }: { brand: Brand }) {
  const hoy = getLimaDay(); // 0=dom
  const horarioIdx = hoy === 0 ? 2 : hoy === 6 ? 1 : 0;
  const horarios = brand.horarios || [];
  const statusNotice = getStatusNotice(brand.storeStatus);
  const primaryContact = brand.primaryContact || {
    platform: "whatsapp" as const,
    phone: brand.whatsapp,
    label: brand.whatsappDisplay || "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };

  return (
    <section className="section info-section" id="horarios">
      <div className="container">
        <div className="info-section-head">
          <div>
            <div className="section-kicker">Visítanos</div>
            <h2 className="section-title">Horarios y ubicación</h2>
          </div>
          <p className="section-lede">
            Coordinamos pedidos por WhatsApp y te esperamos en tienda para resolver todo en un solo lugar.
          </p>
        </div>

        {statusNotice && (
          <div className={`store-status-card store-status-${statusNotice.tone}`}>
            <div className="store-status-icon" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 7v5l3 2" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div>
              <strong>{statusNotice.title}</strong>
              <span>{statusNotice.text}</span>
            </div>
          </div>
        )}

        <div className="info-grid">
          {/* Horarios */}
          <div className="info-card info-card-schedule">
            <div className="info-card-top">
              <div className="info-card-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <span className="info-card-pill">Atención de tienda</span>
            </div>
            <h3>Horarios</h3>
            <p className="info-card-lede">
              Atendemos presencial y pedidos por WhatsApp.
            </p>
            <div className="schedule-list">
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
          </div>

          {/* Ubicación */}
          <div className="info-card info-card-location" id="contacto">
            <div className="info-card-top">
              <div className="info-card-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <span className="info-card-pill">Recojo y consultas</span>
            </div>
            <h3>Ubícanos</h3>
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
              <div className="map-embed">
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
