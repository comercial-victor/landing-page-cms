import { getSiteSettings, getHero, getFeaturedGallery, getTodosLosProductos, getProductosDestacados, getColecciones } from "@/lib/queries";
import BackgroundDecor from "@/components/BackgroundDecor";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedGallery from "@/components/FeaturedGallery";
import Showcase from "@/components/Showcase";
import Colecciones from "@/components/Colecciones";
import HorariosUbicacion from "@/components/HorariosUbicacion";
import Footer from "@/components/Footer";
import FabWhatsApp from "@/components/FabWhatsApp";
import ScrollToTop from "@/components/ScrollToTop";
import { formatPhoneDisplay, getPrimaryContact, normalizeSocialLinks } from "@/lib/social";

export default async function HomePage() {
  const [settings, hero, featuredGallery, productos, preCatalogDestacados, colecciones] = await Promise.all([
    getSiteSettings(),
    getHero(),
    getFeaturedGallery(),
    getTodosLosProductos(),
    getProductosDestacados("preCatalog"),
    getColecciones(),
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
    horarios: settings?.horarios || [
      { dia: "Lunes a Viernes", hora: "9:00 a.m. – 8:00 p.m." },
      { dia: "Sábados", hora: "9:00 a.m. – 9:00 p.m." },
      { dia: "Domingos", hora: "10:00 a.m. – 6:00 p.m." },
    ],
    googleMapsUrl: settings?.googleMapsUrl,
    googleMapsEmbedUrl: settings?.googleMapsEmbedUrl,
    storeStatus: settings?.storeStatus,
    instagramUrl: settings?.instagramUrl,
    facebookUrl: settings?.facebookUrl,
    tiktokUrl: settings?.tiktokUrl,
  };

  return (
    <>
      <BackgroundDecor launchBalloons />
      <Navbar brand={brand} productos={productos} />
      <Hero hero={hero} brand={brand} />
      <FeaturedGallery
        items={featuredGallery?.items || []}
        title={featuredGallery?.titulo}
        subtitle={featuredGallery?.subtitulo}
        themeColor={featuredGallery?.themeColor}
        primaryContact={brand.primaryContact}
      />
      <Showcase
        productos={preCatalogDestacados.length ? preCatalogDestacados : productos.slice(0, 12)}
        whatsapp={brand.whatsapp}
        contact={brand.primaryContact}
      />
      <Colecciones colecciones={colecciones} variant="carousel" />
      <HorariosUbicacion brand={brand} />
      <Footer brand={brand} />
      <FabWhatsApp contacts={brand.floatingContacts} />
      <ScrollToTop />
    </>
  );
}
