import { getCategorias, getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import BackgroundDecor from "@/components/BackgroundDecor";
import Navbar from "@/components/Navbar";
import Catalogo from "@/components/Catalogo";
import Footer from "@/components/Footer";
import FabWhatsApp from "@/components/FabWhatsApp";
import ScrollToTop from "@/components/ScrollToTop";
import { getPrimaryContact, normalizeSocialLinks } from "@/lib/social";

export default async function CatalogPage() {
  const [settings, productos, categorias] = await Promise.all([
    getSiteSettings(),
    getTodosLosProductos(),
    getCategorias(),
  ]);

  const socialLinks = normalizeSocialLinks(settings);
  const primaryContact = getPrimaryContact(socialLinks, settings?.whatsapp);
  const brand = {
    nombre: settings?.nombre || "Comercial Victor",
    tagline: settings?.tagline || "Todo para que tu fiesta brille",
    whatsapp: primaryContact.platform === "whatsapp" ? (primaryContact.phone || settings?.whatsapp || "51987654321") : (settings?.whatsapp || "51987654321"),
    whatsappDisplay: settings?.whatsappDisplay || primaryContact.label || "+51 987 654 321",
    socialLinks,
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
      <main className="catalog-page">
        <Catalogo productos={productos} categorias={categorias} brand={brand} />
      </main>
      <Footer brand={brand} />
      <FabWhatsApp contact={brand.primaryContact} />
      <ScrollToTop />
    </>
  );
}
