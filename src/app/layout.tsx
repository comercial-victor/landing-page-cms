import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/queries";
import { absoluteUrl, brandLogoImage, brandShareImage, faviconIcons, siteUrl } from "@/lib/metadata";
import RouteLoadingOverlay from "@/components/RouteLoadingOverlay";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSiteSettings();
    const title = s?.seoTitle || s?.nombre || "Comercial Victor";
    const description = s?.seoDescription || (s?.tagline ?? "Todo para que tu fiesta brille");
    const image = brandShareImage(s);

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      alternates: {
        canonical: absoluteUrl("/"),
      },
      icons: faviconIcons,
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: s?.nombre || "Comercial Victor",
        type: "website",
        locale: "es_PE",
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  } catch {
    const title = "Comercial Victor";
    const description = "Todo para que tu fiesta brille";
    const image = absoluteUrl("/og-comercial-victor.png");

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      icons: faviconIcons,
      openGraph: {
        title,
        description,
        url: siteUrl,
        siteName: title,
        type: "website",
        locale: "es_PE",
        images: [{ url: image, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let loaderLogo = "/logo-comercial-victor.png";

  try {
    const settings = await getSiteSettings();
    loaderLogo = brandLogoImage(settings);
  } catch {
    loaderLogo = "/logo-comercial-victor.png";
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <RouteLoadingOverlay logoSrc={loaderLogo} />
      </body>
    </html>
  );
}
