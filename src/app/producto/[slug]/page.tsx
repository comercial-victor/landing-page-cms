import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BackgroundDecor from "@/components/BackgroundDecor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FabWhatsApp from "@/components/FabWhatsApp";
import ScrollToTop from "@/components/ScrollToTop";
import ProductDetailClient from "@/components/ProductDetailClient";
import { getProductoPorSlug, getProductoSlugs, getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import { getPrimaryContact, normalizeSocialLinks } from "@/lib/social";
import { brandShareImage, siteUrl } from "@/lib/metadata";
import { urlFor } from "@/lib/sanity";

export async function generateStaticParams() {
  const slugs = await getProductoSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [settings, producto] = await Promise.all([
    getSiteSettings(),
    getProductoPorSlug(slug),
  ]);

  if (!producto) return {};

  const siteName = settings?.nombre || "Comercial Victor";
  const title = `${producto.nombre} | ${siteName}`;
  const description = producto.descripcion || settings?.seoDescription || settings?.tagline || "";
  const canonicalUrl = `${siteUrl}/producto/${slug}`;
  const image = producto.imagenes?.[0]
    ? urlFor(producto.imagenes[0]).width(1200).height(630).fit("crop").auto("format").url()
    : brandShareImage(settings);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      type: "website",
      locale: "es_PE",
      images: [{ url: image, width: 1200, height: 630, alt: producto.nombre }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, producto, productos] = await Promise.all([
    getSiteSettings(),
    getProductoPorSlug(slug),
    getTodosLosProductos(),
  ]);

  if (!producto) notFound();

  const socialLinks = normalizeSocialLinks(settings);
  const primaryContact = getPrimaryContact(socialLinks, settings?.whatsapp);
  const navbarContacts = socialLinks.filter((link) => link.showInNavbar === true);
  const selectedFloatingContacts = socialLinks.filter((link) => link.showFloating === true);
  const floatingContacts = selectedFloatingContacts.length ? selectedFloatingContacts : socialLinks;
  const brand = {
    nombre: settings?.nombre || "Comercial Victor",
    tagline: settings?.tagline || "Todo para que tu fiesta brille",
    logo: settings?.logo || null,
    whatsapp: primaryContact.platform === "whatsapp" ? (primaryContact.phone || settings?.whatsapp || "51987654321") : (settings?.whatsapp || "51987654321"),
    whatsappDisplay: settings?.whatsappDisplay || primaryContact.label || "+51 987 654 321",
    socialLinks,
    navbarContacts,
    floatingContacts,
    primaryContact,
    direccion: settings?.direccion || "Miraflores, Lima",
    horarios: settings?.horarios || [],
    googleMapsUrl: settings?.googleMapsUrl,
    googleMapsEmbedUrl: settings?.googleMapsEmbedUrl,
    instagramUrl: settings?.instagramUrl,
    facebookUrl: settings?.facebookUrl,
    tiktokUrl: settings?.tiktokUrl,
  };

  return (
    <>
      <BackgroundDecor />
      <Navbar brand={brand} productos={productos} />
      <main className="product-page">
        <section className="section product-detail-section">
          <div className="container">
            <ProductDetailClient
              producto={producto}
              whatsapp={brand.whatsapp}
              contact={brand.primaryContact}
            />
          </div>
        </section>
      </main>
      <Footer brand={brand} />
      <FabWhatsApp contacts={floatingContacts} />
      <ScrollToTop />
    </>
  );
}
