"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { ContactIcon, getContactColor, getContactHref, type ContactLink } from "@/lib/social";

interface FabSocialsProps {
  contact?: ContactLink;
  contacts?: ContactLink[];
}

export default function FabWhatsApp({ contact, contacts }: FabSocialsProps) {
  const [open, setOpen] = useState(false);
  const items = (contacts?.length ? contacts : contact ? [contact] : [])
    .filter((item) => item.active !== false)
    .sort((a, b) =>
      Number(Boolean(b.isPrimaryCta)) - Number(Boolean(a.isPrimaryCta)) ||
      Number(b.platform === "whatsapp") - Number(a.platform === "whatsapp")
    );

  if (!items.length) return null;

  const primary = items[0];
  const primaryStyle = { "--fab-color": getContactColor(primary) } as CSSProperties;

  if (items.length === 1) {
    return (
      <a
        className="fab-wa"
        href={getContactHref(primary, "Hola! Quisiera cotizar.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={primary.label}
        style={primaryStyle}
      >
        <ContactIcon platform={primary.platform} size={30} />
      </a>
    );
  }

  return (
    <div className={`fab-socials ${open ? "open" : ""}`}>
      <div className="fab-social-list" aria-hidden={!open}>
        {items.map((item) => (
          <a
            key={item._key || `${item.platform}-${item.label}`}
            className="fab-social-option"
            href={getContactHref(item, "Hola! Quisiera cotizar.")}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            title={item.label}
            style={{ "--fab-color": getContactColor(item) } as CSSProperties}
          >
            <ContactIcon platform={item.platform} size={22} />
            <span className="fab-social-label">{item.label}</span>
          </a>
        ))}
      </div>
      <button
        className="fab-wa fab-wa-toggle"
        type="button"
        aria-label={open ? "Cerrar redes de contacto" : "Abrir redes de contacto"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={primaryStyle}
      >
        {open ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <ContactIcon platform={primary.platform} size={30} />
        )}
      </button>
    </div>
  );
}
