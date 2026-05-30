import BackgroundDecor from "@/components/BackgroundDecor";
import Navbar from "@/components/Navbar";
import Colecciones from "@/components/Colecciones";
import Footer from "@/components/Footer";
import FabWhatsApp from "@/components/FabWhatsApp";
import ScrollToTop from "@/components/ScrollToTop";
import { getColecciones, getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import { formatPhoneDisplay, getPrimaryContact, normalizeSocialLinks } from "@/lib/social";

export default async function ColeccionesPage() {
  const [settings, colecciones, productos] = await Promise.all([
    getSiteSettings(),
    getColecciones(),
    getTodosLosProductos(),
  ]);

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
    <>
      <BackgroundDecor />
      <Navbar brand={brand} productos={productos} />
      <main className="collections-page">
        <Colecciones colecciones={colecciones} />
      </main>
      <Footer brand={brand} />
      <FabWhatsApp contacts={floatingContacts} />
      <ScrollToTop />
    </>
  );
}
