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
import { urlFor } from "@/lib/sanity";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

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
  const ogImage = producto.imagenes?.[0]
    ? urlFor(producto.imagenes[0]).width(1200).height(630).fit("crop").url()
    : settings?.seoImage
      ? urlFor(settings.seoImage).width(1200).height(630).fit("crop").url()
      : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/producto/${slug}`,
      siteName,
      type: "website",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: producto.nombre }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
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
