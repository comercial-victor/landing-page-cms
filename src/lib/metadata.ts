import type { Metadata } from "next";
import type { SiteSettings } from "@/types";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://comercial-victor.com").replace(/\/$/, "");

export const faviconIcons: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon.svg", type: "image/svg+xml" },
    { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
  ],
  shortcut: [{ url: "/favicon.ico" }],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
};

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function brandShareImage(_settings?: Pick<SiteSettings, "logo" | "seoImage"> | null) {
  return absoluteUrl("/og-comercial-victor.png");
}
