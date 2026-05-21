import type { ReactNode } from "react";
import type { SiteSettings, SocialLink, SocialPlatform } from "@/types";

export interface ContactLink extends SocialLink {
  platform: SocialPlatform;
  label: string;
}

const platformLabels: Record<SocialPlatform, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  messenger: "Messenger",
  tiktok: "TikTok",
  other: "Contacto",
};

const platformColors: Record<SocialPlatform, string> = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
  facebook: "#1877F2",
  messenger: "#0084FF",
  tiktok: "#111111",
  other: "#C92F67",
};

export function getPlatformColor(platform: SocialPlatform) {
  return platformColors[platform] || platformColors.other;
}

export function getContactColor(contact: Pick<ContactLink, "platform" | "color">) {
  return contact.color || getPlatformColor(contact.platform);
}

export function normalizeSocialLinks(settings?: Partial<SiteSettings> | null): ContactLink[] {
  const configured = (settings?.socialLinks || [])
    .filter((link) => link?.active !== false)
    .map((link) => ({
      ...link,
      platform: link.platform || "other",
      label: link.label || platformLabels[link.platform || "other"],
    })) as ContactLink[];

  if (configured.length) return configured;

  const fallback: ContactLink[] = [];
  if (settings?.whatsapp) {
    fallback.push({
      platform: "whatsapp",
      phone: settings.whatsapp,
      label: settings.whatsappDisplay || "WhatsApp",
      active: true,
      showInFooter: true,
      showFloating: true,
      showInNavbar: true,
      isPrimaryCta: true,
    });
  }
  if (settings?.instagramUrl) fallback.push({ platform: "instagram", url: settings.instagramUrl, label: "Instagram", active: true, showInFooter: true });
  if (settings?.facebookUrl) fallback.push({ platform: "facebook", url: settings.facebookUrl, label: "Facebook", active: true, showInFooter: true });
  if (settings?.tiktokUrl) fallback.push({ platform: "tiktok", url: settings.tiktokUrl, label: "TikTok", active: true, showInFooter: true });

  return fallback;
}

export function getPrimaryContact(links: ContactLink[], fallbackPhone?: string): ContactLink {
  const primary = links.find((link) => link.isPrimaryCta) || links[0];
  if (primary) return primary;
  return {
    platform: "whatsapp",
    phone: fallbackPhone || "51987654321",
    label: "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };
}

export function getContactHref(contact: Pick<ContactLink, "platform" | "url" | "phone">, message?: string) {
  if (contact.platform === "whatsapp") {
    const phone = (contact.phone || contact.url || "").replace(/\D/g, "");
    const base = `https://wa.me/${phone}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
  }
  return contact.url || "#";
}

export function ContactIcon({ platform, size = 20 }: { platform: SocialPlatform; size?: number }): ReactNode {
  if (platform === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .15 5.33.15 11.88c0 2.1.55 4.15 1.6 5.95L.05 24l6.32-1.66a11.94 11.94 0 0 0 5.7 1.45h.01c6.57 0 11.92-5.33 11.92-11.89 0-3.17-1.24-6.16-3.48-8.42Zm-8.44 18.3h-.01c-1.7 0-3.37-.46-4.82-1.32l-.35-.21-3.75.98 1-3.65-.24-.38a9.86 9.86 0 0 1-1.5-5.32c0-5.45 4.45-9.88 9.92-9.88 2.65 0 5.14 1.03 7.01 2.9a9.82 9.82 0 0 1 2.9 7c0 5.45-4.45 9.88-9.91 9.88Zm5.43-7.4c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47a8.95 8.95 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.48.71.3 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.35Z" />
      </svg>
    );
  }
  if (platform === "messenger") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.24 0 0 4.95 0 11.63c0 3.49 1.43 6.5 3.77 8.58V24l3.45-1.9c1.46.4 3.07.61 4.78.61 6.76 0 12-4.95 12-11.63S18.76 0 12 0Zm1.2 15.65-3.05-3.24-5.95 3.24 6.52-6.92 3.13 3.24 5.87-3.24-6.52 6.92Z" />
      </svg>
    );
  }
  if (platform === "facebook") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07Z" />
      </svg>
    );
  }
  if (platform === "instagram") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.3 0 .6.05.88.14V9.4a6.34 6.34 0 1 0 5.46 6.27v-7a8.16 8.16 0 0 0 4.77 1.52v-3.5Z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.9 5.03" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07l1.22-1.22" />
    </svg>
  );
}
