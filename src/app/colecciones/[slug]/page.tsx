import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionPageClient from "@/components/CollectionPageClient";
import type { ProductoFlat } from "@/types";
import { getCategorias, getColeccionPorSlug, getColeccionSlugs, getColecciones, getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import { formatPhoneDisplay, getPrimaryContact, normalizeSocialLinks } from "@/lib/social";
import { brandShareImage, siteUrl } from "@/lib/metadata";
import { urlFor } from "@/lib/sanity";

export async function generateStaticParams() {
  const slugs = await getColeccionSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [settings, collection] = await Promise.all([
    getSiteSettings(),
    getColeccionPorSlug(slug),
  ]);

  if (!collection) return {};

  const siteName = settings?.nombre || "Comercial Victor";
  const title = `${collection.titulo} | ${siteName}`;
  const description = collection.subtitulo || settings?.seoDescription || settings?.tagline || "";
  const canonicalUrl = `${siteUrl}/colecciones/${slug}`;
  const image = collection.portada
    ? urlFor(collection.portada).width(1200).height(630).fit("crop").auto("format").url()
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
      images: [{ url: image, width: 1200, height: 630, alt: collection.titulo }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ColeccionRoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, allProducts, categorias, colecciones, sanityCollection] = await Promise.all([
    getSiteSettings(),
    getTodosLosProductos(),
    getCategorias(),
    getColecciones(),
    getColeccionPorSlug(slug),
  ]);

  const collection = sanityCollection;
  if (!collection) notFound();

  const productos = collection.items.map((item) => item.producto).filter((producto): producto is ProductoFlat => Boolean(producto));
  if (!productos.length) notFound();

  const socialLinks = normalizeSocialLinks(settings);
  const primaryContact = getPrimaryContact(socialLinks, settings?.whatsapp);
  const navbarContacts = socialLinks.filter((link) => link.showInNavbar === true);
  const floatingContacts = socialLinks;
  const brand = {
    nombre: settings?.nombre || "Comercial Victor",
    tagline: settings?.tagline || "Todo para que tu fiesta brille",
    logo: settings?.logo || null,
    whatsapp: primaryContact.platform === "whatsapp" ? (primaryContact.phone || settings?.whatsapp || "51987654321") : (settings?.whatsapp || "51987654321"),
    whatsappDisplay: formatPhoneDisplay(primaryContact.platform === "whatsapp" ? (primaryContact.phone || settings?.whatsapp) : settings?.whatsapp) || primaryContact.label || "+51 987 654 321",
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
    <CollectionPageClient
      brand={brand}
      collection={collection}
      allProductos={allProducts}
      productos={productos}
      collections={colecciones}
      categorias={categorias}
    />
  );
}
