import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: s?.seoTitle || s?.nombre || "Comercial Victor",
    description: s?.seoDescription || (s?.tagline ?? "Todo para que tu fiesta brille"),
    openGraph: {
      title: s?.seoTitle || s?.nombre || "Comercial Victor",
      description: s?.seoDescription || (s?.tagline ?? ""),
      type: "website",
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
