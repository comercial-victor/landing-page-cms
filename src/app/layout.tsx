import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/queries";
import logoIcon from "./logo.png";

const siteIcon = typeof logoIcon === "string" ? logoIcon : logoIcon.src;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const s = await getSiteSettings();
    return {
      title: s?.seoTitle || s?.nombre || "Comercial Victor",
      description: s?.seoDescription || (s?.tagline ?? "Todo para que tu fiesta brille"),
      icons: {
        icon: [{ url: siteIcon, type: "image/png" }],
        shortcut: [siteIcon],
        apple: [{ url: siteIcon, type: "image/png" }],
      },
      openGraph: {
        title: s?.seoTitle || s?.nombre || "Comercial Victor",
        description: s?.seoDescription || (s?.tagline ?? ""),
        type: "website",
      },
    };
  } catch {
    return {
      title: "Comercial Victor",
      description: "Todo para que tu fiesta brille",
      icons: {
        icon: [{ url: siteIcon, type: "image/png" }],
        shortcut: [siteIcon],
        apple: [{ url: siteIcon, type: "image/png" }],
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
