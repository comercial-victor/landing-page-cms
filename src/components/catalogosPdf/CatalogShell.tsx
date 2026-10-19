import type { ReactNode } from "react";
import Navbar from "../Navbar";
import Footer from "../Footer";
import BackgroundDecor from "../BackgroundDecor";
import FabWhatsApp from "../FabWhatsApp";
import ScrollToTop from "../ScrollToTop";
import { getSiteSettings, getTodosLosProductos } from "@/lib/queries";
import { getPrimaryContact, normalizeSocialLinks } from "@/lib/social";

export default async function CatalogShell({children}: {children: ReactNode}) {
  const [settings, productos] = await Promise.all([getSiteSettings(),getTodosLosProductos()]);
  const socialLinks = normalizeSocialLinks(settings);
  const brand = { nombre: settings?.nombre || "Comercial Víctor", logo: settings?.logo, whatsapp: settings?.whatsapp || "", socialLinks, navbarContacts: socialLinks.filter(l => l.showInNavbar), primaryContact: getPrimaryContact(socialLinks,settings?.whatsapp) };
  return <><BackgroundDecor /><Navbar brand={brand} productos={productos} /><main className="pdf-page container">{children}</main><Footer brand={brand} /><FabWhatsApp contacts={socialLinks} /><ScrollToTop /></>;
}
