import type { Metadata } from "next";
import type { SanityImage, SiteSettings } from "@/types";
import { urlFor } from "@/lib/sanity";

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

export function sanityImageUrl(
  image?: SanityImage | null,
  options: { width?: number; height?: number; fit?: "crop" | "max" } = {}
) {
  if (!image?.asset) return null;

  try {
    if (image.asset.url) {
      const url = new URL(image.asset.url);
      if (options.width) url.searchParams.set("w", String(options.width));
      if (options.height) url.searchParams.set("h", String(options.height));
      url.searchParams.set("auto", "format");
      if (options.fit) url.searchParams.set("fit", options.fit);
      return url.toString();
    }

    let builder = urlFor(image).auto("format");
    if (options.width) builder = builder.width(options.width);
    if (options.height) builder = builder.height(options.height);
    if (options.fit) builder = builder.fit(options.fit);
    return builder.url();
  } catch {
    return null;
  }
}

export function brandLogoImage(settings?: Pick<SiteSettings, "logo"> | null) {
  return sanityImageUrl(settings?.logo, { width: 160, height: 160, fit: "crop" }) || "/logo-comercial-victor.png";
}

export function brandShareImage(settings?: Pick<SiteSettings, "logo"> | null) {
  return sanityImageUrl(settings?.logo, { width: 1200, height: 630, fit: "crop" }) || absoluteUrl("/og-comercial-victor.png");
}
