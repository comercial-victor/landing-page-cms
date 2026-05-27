import { notFound } from "next/navigation";
import CollectionPageClient from "@/components/CollectionPageClient";
import type { ProductoFlat } from "@/types";
import { buildDemoCollectionBySlug, demoCollectionDefinitions } from "@/lib/collections";
import { getCategorias, getColeccionPorSlug, getColeccionSlugs, getColecciones, getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import { getPrimaryContact, normalizeSocialLinks } from "@/lib/social";

export async function generateStaticParams() {
  const slugs = await getColeccionSlugs();
  const demoSlugs = demoCollectionDefinitions.map((collection) => collection.slug);
  return Array.from(new Set([...slugs, ...demoSlugs])).map((slug) => ({ slug }));
}

export default async function CollectionRoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, allProducts, categorias, colecciones, sanityCollection] = await Promise.all([
    getSiteSettings(),
    getTodosLosProductos(),
    getCategorias(),
    getColecciones(),
    getColeccionPorSlug(slug),
  ]);

  const collection = sanityCollection || buildDemoCollectionBySlug(slug, allProducts);
  if (!collection) notFound();

  const productos = collection.items.map((item) => item.producto).filter((producto): producto is ProductoFlat => Boolean(producto));
  if (!productos.length) notFound();

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
    <CollectionPageClient
      brand={brand}
      collection={collection}
      productos={productos}
      collections={colecciones}
      categorias={categorias}
    />
  );
}
