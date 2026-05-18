import { waLink } from "@/lib/utils";

export default function FabWhatsApp({ whatsapp }: { whatsapp: string }) {
  return (
    <a
      className="fab-wa"
      href={waLink(whatsapp, "Hola! Quisiera cotizar.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.92C21.95 6.45 17.5 2 12.04 2z" />
      </svg>
    </a>
  );
}
