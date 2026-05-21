import { getCategorias, getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import CatalogPageClient from "@/components/CatalogPageClient";
import { getPrimaryContact, normalizeSocialLinks } from "@/lib/social";

export default async function CatalogPage() {
  const [settings, productos, categorias] = await Promise.all([
    getSiteSettings(),
    getTodosLosProductos(),
    getCategorias(),
  ]);

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
    <CatalogPageClient brand={brand} productos={productos} categorias={categorias} />
  );
}
