import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";

export default function FabWhatsApp({ contact }: { contact: ContactLink }) {
  return (
    <a
      className="fab-wa"
      href={getContactHref(contact, "Hola! Quisiera cotizar.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={contact.label}
      style={{ "--fab-color": contact.platform === "whatsapp" ? "#25D366" : undefined } as React.CSSProperties}
    >
      <ContactIcon platform={contact.platform} size={30} />
    </a>
  );
}
