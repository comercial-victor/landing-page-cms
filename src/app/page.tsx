import { getSiteSettings, getHero, getFeaturedGallery, getTodosLosProductos, getProductosDestacados, getCategorias } from "@/lib/queries";
import BackgroundDecor from "@/components/BackgroundDecor";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturedGallery from "@/components/FeaturedGallery";
import Showcase from "@/components/Showcase";
import CatalogPreview from "@/components/CatalogPreview";
import HorariosUbicacion from "@/components/HorariosUbicacion";
import Footer from "@/components/Footer";
import FabWhatsApp from "@/components/FabWhatsApp";
import ScrollToTop from "@/components/ScrollToTop";

export default async function HomePage() {
  const [settings, hero, featuredGallery, productos, destacados, categorias] = await Promise.all([
    getSiteSettings(),
    getHero(),
    getFeaturedGallery(),
    getTodosLosProductos(),
    getProductosDestacados(),
    getCategorias(),
  ]);

  const brand = {
    nombre: settings?.nombre || "Comercial Victor",
    tagline: settings?.tagline || "Todo para que tu fiesta brille",
    whatsapp: settings?.whatsapp || "51987654321",
    whatsappDisplay: settings?.whatsappDisplay || "+51 987 654 321",
    direccion: settings?.direccion || "Miraflores, Lima",
    horarios: settings?.horarios || [
      { dia: "Lunes a Viernes", hora: "9:00 a.m. – 8:00 p.m." },
      { dia: "Sábados", hora: "9:00 a.m. – 9:00 p.m." },
      { dia: "Domingos", hora: "10:00 a.m. – 6:00 p.m." },
    ],
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
      <Hero hero={hero} brand={brand} />
      <FeaturedGallery
        items={featuredGallery?.items || []}
        title={featuredGallery?.titulo}
        subtitle={featuredGallery?.subtitulo}
        whatsapp={brand.whatsapp}
      />
      <Showcase productos={destacados} whatsapp={brand.whatsapp} />
      <CatalogPreview productos={productos} categorias={categorias} whatsapp={brand.whatsapp} />
      <HorariosUbicacion brand={brand} />
      <Footer brand={brand} />
      <FabWhatsApp whatsapp={brand.whatsapp} />
      <ScrollToTop />
    </>
  );
}
