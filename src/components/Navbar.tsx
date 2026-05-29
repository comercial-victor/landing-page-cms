"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ProductoFlat, SanityImage } from "@/types";
import { fmtSoles } from "@/lib/utils";
import { brandLogoImage } from "@/lib/metadata";
import { ProductImage } from "./ProductHelpers";
import { ContactIcon, getContactColor, getContactHref, type ContactLink } from "@/lib/social";
import { productPath } from "@/lib/products";
import { rankBySearch } from "@/lib/search";
import { ArrowRight, Clock, Home, Layers3, MapPin, ShoppingBag, Sparkles } from "lucide-react";

interface Brand {
  nombre: string;
  whatsapp: string;
  whatsappDisplay?: string;
  primaryContact?: ContactLink;
  navbarContacts?: ContactLink[];
  logo?: SanityImage | null;
}

interface NavbarProps {
  brand: Brand;
  productos: ProductoFlat[];
  searchMode?: "global" | "catalog";
  catalogSearchValue?: string;
  onCatalogSearchChange?: (value: string) => void;
}

export default function Navbar({
  brand,
  productos,
  searchMode = "global",
  catalogSearchValue = "",
  onCatalogSearchChange,
}: NavbarProps) {
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const isCatalogSearch = searchMode === "catalog";
  const searchValue = isCatalogSearch ? catalogSearchValue : q;
  const hasSearchText = searchValue.trim().length > 0;
  const mobileSearchActive = mobileSearchOpen || hasSearchText;
  const primaryContact = brand.primaryContact || {
    platform: "whatsapp" as const,
    phone: brand.whatsapp,
    label: "WhatsApp",
    active: true,
    showInFooter: true,
    isPrimaryCta: true,
  };
  const navbarContacts = (brand.navbarContacts || []).filter((link) => link.active !== false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (searchWrapRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
      if (!searchValue.trim()) setMobileSearchOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [searchOpen, searchValue]);

  const results = useMemo(() => {
    if (!searchValue.trim()) return [];

    return rankBySearch(productos, searchValue, (p) => [
      p.nombre,
      p.idExcel,
      p.descripcion,
      p.marca,
      p.medidas,
      p.observaciones,
      p._categoria,
      p._subcategoria,
      ...(p.tags || []),
      ...(p.presentaciones || []).map((presentacion) => presentacion.nombre),
    ]).slice(0, 8);
  }, [searchValue, productos]);

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/#novedades", label: "Novedades", icon: Sparkles },
    { href: "/colecciones", label: "Colecciones", icon: Layers3 },
    { href: "/catalog", label: "Catálogo", icon: ShoppingBag },
    { href: "/#horarios", label: "Horarios", icon: Clock },
    { href: "/#contacto", label: "Ubícanos", icon: MapPin },
  ];

  const scrollToHash = (hash: string) => {
    const target = document.getElementById(hash.replace("#", ""));
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const offset = window.innerWidth < 700 ? 78 : 96;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  };

  const announceRouteStart = () => {
    window.dispatchEvent(new Event("cv-route-start"));
  };

  const go = (href: string) => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
    if (href === "/" && pathname === "/") {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      return;
    }
    if (href.startsWith("/#")) {
      if (pathname === "/") {
        scrollToHash(href.slice(1));
      } else {
        announceRouteStart();
        router.push(href);
      }
      return;
    }
    announceRouteStart();
    router.push(href);
  };

  const focusSearchInput = () => {
    const scrollY = window.scrollY;
    inputRef.current?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - scrollY) > 8) {
        window.scrollTo({ top: scrollY, behavior: "auto" });
      }
    });
  };

  const submitSearch = () => {
    const isMobile = window.innerWidth <= 820;
    const term = searchValue.trim();

    if (isMobile && document.activeElement !== inputRef.current) {
      setMobileSearchOpen(true);
      setSearchOpen(true);
      window.setTimeout(focusSearchInput, 0);
      return;
    }

    if (!term) return;

    const params = new URLSearchParams({ query: term });
    setMobileSearchOpen(false);
    setSearchOpen(false);
    announceRouteStart();
    router.push(`/catalog?${params.toString()}`);
  };

  const clearSearch = () => {
    if (isCatalogSearch) {
      onCatalogSearchChange?.("");
    } else {
      setQ("");
    }
  };

  return (
    <>
      <nav className={`nav-float ${scrolled ? "scrolled" : ""} ${mobileSearchActive ? "mobile-search-open" : ""}`}>
        <div className={`nav-float-pill ${searchOpen || hasSearchText || mobileSearchActive ? "search-open" : ""}`}>
          {/* Logo */}
          <button className="nf-logo" onClick={() => go("/")}>
            <Image
              src={brandLogoImage({ logo: brand.logo || undefined })}
              alt={brand.nombre}
              width={96}
              height={96}
              className="nf-logo-img"
              style={{ borderRadius: "50%", objectFit: "cover" }}
              priority
            />
            <span className="nf-brand serif">{brand.nombre}</span>
          </button>

          {/* Desktop center links */}
          <div className="nf-links">
            {links.map((l) => {
              const Icon = l.icon;
              return (
              <button
                key={l.href}
                className={`nf-link ${pathname === l.href ? "active" : ""}`}
                onClick={() => go(l.href)}
              >
                <Icon className="nf-link-icon" size={15} strokeWidth={2.4} aria-hidden="true" />
                {l.label}
              </button>
              );
            })}
          </div>

          {/* Search */}
          <div ref={searchWrapRef} className="nf-search-wrap">
            <div
              className="nf-search"
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button")) return;
                setSearchOpen(true);

                if (window.innerWidth <= 820) {
                  event.preventDefault();
                  setMobileSearchOpen(true);
                  window.setTimeout(focusSearchInput, 0);
                }
              }}
            >
            <input
              ref={inputRef}
              type="text"
              placeholder={isCatalogSearch ? "Buscar" : "Buscar…"}
              value={searchValue}
              onChange={(e) => {
                setSearchOpen(true);
                if (isCatalogSearch) {
                  if (window.innerWidth <= 820) setMobileSearchOpen(true);
                  onCatalogSearchChange?.(e.target.value);
                  return;
                }
                setQ(e.target.value);
                if (window.innerWidth <= 820) setMobileSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearch();
                }
                if (e.key === "Escape") {
                  setSearchOpen(false);
                  inputRef.current?.blur();
                }
              }}
              onFocus={() => {
                setSearchOpen(true);
                if (window.innerWidth <= 820) {
                  setMobileSearchOpen(true);
                }
              }}
              autoComplete="off"
            />
            {searchValue && (
              <button
                className="nf-search-clear"
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  clearSearch();
                  window.setTimeout(focusSearchInput, 0);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
            <button
              className="nf-search-submit"
              type="button"
              aria-label="Buscar"
              onClick={submitSearch}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            </div>

            {/* Search results */}
            {searchOpen && results.length > 0 && (
              <div className="search-results nf-results">
                {results.map((p) => {
                  const dp = p.presentaciones?.find((pr) => pr.esDefault && pr.precio) || p.presentaciones?.find((pr) => pr.precio);
                  return (
                    <Link
                      key={p._id}
                      className="search-result"
                      href={productPath(p)}
                      onClick={() => {
                        if (isCatalogSearch) {
                          onCatalogSearchChange?.("");
                        } else {
                          setQ("");
                        }
                        setMobileSearchOpen(false);
                        setSearchOpen(false);
                      }}
                    >
                      <div className="search-result-thumb"><ProductImage producto={p} size={44} /></div>
                      <div className="search-result-meta">
                        <div className="search-result-name">{p.nombre}</div>
                        <div className="search-result-cat">{p._subcategoria}</div>
                      </div>
                      {dp?.precio && <div className="search-result-price">{fmtSoles(dp.precio)}</div>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop social CTAs */}
          {navbarContacts.length > 0 && (
            <div className={`nf-socials ${navbarContacts.length > 1 ? "compact" : ""}`} aria-label="Redes de contacto">
              {navbarContacts.map((item) => (
                <a
                  key={item._key || `${item.platform}-${item.label}`}
                  className="nf-social-link"
                  href={getContactHref(item, "Hola! Quisiera cotizar.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                  title={item.label}
                  style={{ "--nav-social-color": getContactColor(item) } as CSSProperties}
                >
                  <ContactIcon platform={item.platform} size={16} />
                  {navbarContacts.length === 1 && <span>Cotizar</span>}
                </a>
              ))}
            </div>
          )}

          {/* Mobile toggle */}
          <button className="nf-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menú">
            <div className={`nf-hamburger ${mobileOpen ? "open" : ""}`}><span/><span/><span/></div>
          </button>
        </div>

      </nav>

      {/* Mobile overlay */}
      <div className={`nf-mobile-overlay ${mobileOpen ? "open" : ""}`}>
        <div className="nf-mobile-inner">
          {links.map((l, i) => {
            const Icon = l.icon;
            return (
            <button key={l.href} className="nf-mobile-link" onClick={() => go(l.href)} style={{ transitionDelay: mobileOpen ? `${i * 70 + 120}ms` : "0ms" }}>
              <span>
                <Icon className="nf-link-icon" size={20} strokeWidth={2.35} aria-hidden="true" />
                {l.label}
              </span>
              <ArrowRight size={19} strokeWidth={2.3} aria-hidden="true" />
            </button>
            );
          })}
          <div style={{ height: 1, background: "var(--line-strong)", margin: "12px 0" }} />
          {navbarContacts.length > 0 && (
            <div className="nf-mobile-socials">
              {navbarContacts.map((item) => (
                <a
                  key={item._key || `${item.platform}-${item.label}`}
                  className="nf-mobile-social"
                  href={getContactHref(item, "Hola!")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  style={{ "--nav-social-color": getContactColor(item) } as CSSProperties}
                >
                  <ContactIcon platform={item.platform} size={18} />
                  {item.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
