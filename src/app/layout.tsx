import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/queries";
import { urlFor } from "@/lib/sanity";

const siteIcon = "/favicon.svg";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSiteSettings();
    const title = s?.seoTitle || s?.nombre || "Comercial Victor";
    const description = s?.seoDescription || (s?.tagline ?? "Todo para que tu fiesta brille");
    const seoImage = s?.seoImage ? urlFor(s.seoImage).width(1200).height(630).fit("crop").url() : undefined;

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      icons: {
        icon: [{ url: siteIcon, type: "image/svg+xml" }],
        shortcut: [siteIcon],
        apple: [{ url: siteIcon, type: "image/svg+xml" }],
      },
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: s?.nombre || "Comercial Victor",
        type: "website",
        locale: "es_PE",
        images: seoImage ? [{ url: seoImage, width: 1200, height: 630, alt: title }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: seoImage ? [seoImage] : undefined,
      },
    };
  } catch {
    return {
      metadataBase: new URL(siteUrl),
      title: "Comercial Victor",
      description: "Todo para que tu fiesta brille",
      icons: {
        icon: [{ url: siteIcon, type: "image/svg+xml" }],
        shortcut: [siteIcon],
        apple: [{ url: siteIcon, type: "image/svg+xml" }],
      },
    };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
