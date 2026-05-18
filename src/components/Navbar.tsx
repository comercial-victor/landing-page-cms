"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ProductoFlat } from "@/types";
import { fmtSoles } from "@/lib/utils";
import { ProductImage } from "./ProductHelpers";
import ProductModal from "./ProductModal";
import { ContactIcon, getContactHref, type ContactLink } from "@/lib/social";

interface Brand { nombre: string; whatsapp: string; whatsappDisplay?: string; primaryContact?: ContactLink; }

export default function Navbar({ brand, productos }: { brand: Brand; productos: ProductoFlat[] }) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const primaryContact = brand.primaryContact || {
    platform: "whatsapp" as const,
    phone: brand.whatsapp,
    label: "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const normalize = (v: string) => {
    const b = v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
    return { s: b, c: b.replace(/\s+/g, "") };
  };

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const n = normalize(q);
    const toks = n.s ? n.s.split(" ") : [];
    return productos.filter((p) => {
      const h = normalize([p.nombre, p._categoria, p._subcategoria].join(" "));
      if (h.s.includes(n.s) || h.c.includes(n.c)) return true;
      return toks.length > 0 && toks.every((t) => h.s.includes(t));
    }).slice(0, 8);
  }, [q, productos]);

  const links = [
    { href: "/#novedades", label: "Novedades" },
    { href: "/catalog", label: "Catálogo" },
    { href: "/#horarios", label: "Horarios" },
  ];

  const go = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      if (pathname === "/") {
        document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.location.href = href;
      }
      return;
    }
    window.location.href = href;
  };

  return (
    <>
      <nav className={`nav-float ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-float-pill">
          {/* Logo */}
          <button className="nf-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="logo-dot" aria-hidden />
            <span className="nf-brand serif">{brand.nombre}</span>
          </button>

          {/* Desktop center links */}
          <div className="nf-links">
            {links.map((l) => (
              <button
                key={l.href}
                className={`nf-link ${pathname === l.href ? "active" : ""}`}
                onClick={() => go(l.href)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="nf-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input ref={inputRef} type="text" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)} autoComplete="off" />
          </div>

          {/* Desktop CTA */}
          <a className={`btn ${primaryContact.platform === "whatsapp" ? "btn-wa" : "btn-plum"} nf-cta-desktop`} href={getContactHref(primaryContact, "Hola! Quisiera cotizar.")} target="_blank" rel="noopener noreferrer">
            <ContactIcon platform={primaryContact.platform} size={16} />
            Cotizar
          </a>

          {/* Mobile toggle */}
          <button className="nf-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
            <div className={`nf-hamburger ${mobileOpen ? "open" : ""}`}><span/><span/><span/></div>
          </button>
        </div>

        {/* Search results */}
        {focused && results.length > 0 && (
          <div className="search-results nf-results">
            {results.map((p) => {
              const dp = p.presentaciones?.find((pr) => pr.esDefault && pr.visibleEnWeb && pr.precio);
              return (
                <div key={p._id} className="search-result" onMouseDown={() => { setOpenProduct(p); setQ(""); }}>
                  <div className="search-result-thumb"><ProductImage producto={p} size={44} /></div>
                  <div className="search-result-meta">
                    <div className="search-result-name">{p.nombre}</div>
                    <div className="search-result-cat">{p._subcategoria}</div>
                  </div>
                  {dp?.precio && <div className="search-result-price">{fmtSoles(dp.precio)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Mobile overlay */}
      <div className={`nf-mobile-overlay ${mobileOpen ? "open" : ""}`}>
        <div className="nf-mobile-inner">
          {links.map((l, i) => (
            <button key={l.href} className="nf-mobile-link" onClick={() => go(l.href)} style={{ transitionDelay: mobileOpen ? `${i * 70 + 120}ms` : "0ms" }}>
              {l.label}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          ))}
          <div style={{ height: 1, background: "var(--line-strong)", margin: "12px 0" }} />
          <a className={`btn ${primaryContact.platform === "whatsapp" ? "btn-wa" : "btn-plum"} btn-lg`} style={{ width: "100%", justifyContent: "center" }} href={getContactHref(primaryContact, "Hola!")} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
            <ContactIcon platform={primaryContact.platform} size={18} />
            Cotizar por {primaryContact.label}
          </a>
        </div>
      </div>

      <ProductModal producto={openProduct} onClose={() => setOpenProduct(null)} whatsapp={brand.whatsapp} contact={primaryContact} />
    </>
  );
}
