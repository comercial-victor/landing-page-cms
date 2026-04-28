"use client";

import { useState, useRef, useMemo } from "react";
import type { ProductoFlat } from "@/types";
import { waLink, fmtSoles } from "@/lib/utils";
import { ProductImage } from "./ProductHelpers";
import ProductModal from "./ProductModal";

interface Brand {
  nombre: string;
  whatsapp: string;
  whatsappDisplay?: string;
}

interface NavbarProps {
  brand: Brand;
  productos: ProductoFlat[];
}

export default function Navbar({ brand, productos }: NavbarProps) {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizeSearch = (value: string) => {
    const base = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/([a-z])(\d)/g, "$1 $2")
      .replace(/(\d)([a-z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
    return {
      spaced: base,
      compact: base.replace(/\s+/g, ""),
    };
  };

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const needle = normalizeSearch(q);
    const tokens = needle.spaced ? needle.spaced.split(" ") : [];
    return productos
      .filter((p) => {
        const hayRaw = [p.nombre, p._categoria, p._subcategoria].join(" ");
        const hay = normalizeSearch(hayRaw);
        const phraseMatch = hay.spaced.includes(needle.spaced) || hay.compact.includes(needle.compact);
        if (phraseMatch) return true;
        if (tokens.length === 0) return false;
        return tokens.every((t) => hay.spaced.includes(t) || hay.compact.includes(t));
      })
      .slice(0, 8);
  }, [q, productos]);

  const navLinks = [
    { href: "#novedades", label: "Novedades" },
    { href: "#catalogo", label: "Catálogo" },
    { href: "#horarios", label: "Horarios" },
    { href: "#contacto", label: "Ubicación" },
  ];

  const waUrl = waLink(brand.whatsapp, "Hola! Quisiera información.");

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          {/* Logo */}
          <a
            href="#top"
            className="logo"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          >
            <span className="logo-dot" aria-hidden="true" />
            <span>{brand.nombre}</span>
          </a>

          {/* Desktop nav links */}
          <div className="nav-links">
            {navLinks.map((l) => (
              <a key={l.href} className="nav-link" href={l.href}>{l.label}</a>
            ))}
          </div>

          {/* Search */}
          <div className="search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Busca globos, piñatas, packs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              aria-label="Buscar productos"
            />
            {focused && results.length > 0 && (
              <div className="search-results" role="listbox">
                {results.map((r) => (
                  <div
                    key={r._id}
                    className="search-result"
                    role="option"
                    tabIndex={0}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setOpenProduct(r);
                      setQ("");
                      inputRef.current?.blur();
                    }}
                  >
                    <div className="search-result-thumb">
                      <ProductImage producto={r} />
                    </div>
                    <div className="search-result-meta">
                      <div className="search-result-name">{r.nombre}</div>
                      <div className="search-result-cat">{r._categoria} · {r._subcategoria}</div>
                    </div>
                    <div className="search-result-price">
                      {(() => {
                        const pres = r.presentaciones?.filter(p => p.visibleEnWeb) || [];
                        const def = pres.find(p => p.esDefault) || pres.find(p => p.precio != null);
                        if (!def || def.precio == null) return "Consultar";
                        return (pres.length > 1 ? "Desde " : "") + (fmtSoles(def.precio) ?? "");
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {focused && q.trim() && results.length === 0 && (
              <div className="search-results">
                <div style={{ padding: 16, fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
                  Sin resultados para &ldquo;{q}&rdquo;. Escríbenos por WhatsApp.
                </div>
              </div>
            )}
          </div>

          <a
            className="btn btn-wa nav-cta-desktop"
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escribir por WhatsApp"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.92C21.95 6.45 17.5 2 12.04 2z" />
            </svg>
            WhatsApp
          </a>

          <button
            className="menu-btn"
            aria-label="Abrir menú"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M3 6h18M3 12h18M3 18h18"} />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>{l.label}</a>
        ))}
        <a className="btn btn-wa" style={{ marginTop: 16 }} href={waUrl} target="_blank" rel="noopener noreferrer">
          Escribir por WhatsApp
        </a>
      </div>

      {/* Modal from search results */}
      <ProductModal
        producto={openProduct}
        onClose={() => setOpenProduct(null)}
        whatsapp={brand.whatsapp}
      />
    </>
  );
}
