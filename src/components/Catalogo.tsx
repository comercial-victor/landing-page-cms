"use client";

import { useEffect, useState, useMemo } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { ProductoFlat, Categoria, Collection } from "@/types";
import { ProductImage, Badges, PriceDisplay } from "./ProductHelpers";
import ProductModal from "./ProductModal";
import type { ContactLink } from "@/lib/social";
import { collectionPath } from "@/lib/collections";

interface CatalogoProps {
  productos: ProductoFlat[];
  categorias: Categoria[];
  collections?: Collection[];
  activeCollectionId?: string;
  brand: { whatsapp: string; primaryContact?: ContactLink };
  externalQuery?: string;
  onExternalQueryChange?: (value: string) => void;
  hideLocalSearch?: boolean;
  kicker?: string;
  title?: ReactNode;
  lede?: string;
}

function ProductCard({ producto, onOpen }: { producto: ProductoFlat; onOpen: (p: ProductoFlat) => void }) {
  return (
    <article
      className="pcard"
      onClick={() => onOpen(producto)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(producto); }}
      tabIndex={0}
      role="button"
      aria-label={`Ver detalle de ${producto.nombre}`}
    >
      <div className="pcard-img">
        <div className="pcard-img-inner">
          <ProductImage producto={producto} />
        </div>
        <div className="pcard-badges"><Badges producto={producto} /></div>
      </div>
      <div className="pcard-body">
        <div className="pcard-cat">{producto._subcategoria}</div>
        <h3 className="pcard-name">{producto.nombre}</h3>
        <div className="pcard-foot">
          <PriceDisplay producto={producto} />
          <div className="pcard-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Catalogo({
  productos,
  categorias,
  collections,
  activeCollectionId,
  brand,
  externalQuery,
  onExternalQueryChange,
  hideLocalSearch = false,
  kicker = "Catálogo completo",
  title,
  lede = "Filtra por categoría o subcategoría. Cualquier producto se cotiza por WhatsApp con un toque.",
}: CatalogoProps) {
  const [catId, setCatId] = useState<string>("__all");
  const [subId, setSubId] = useState<string>("__all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cols, setCols] = useState<1 | 2 | 3>(3);
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);
  const [query, setQuery] = useState("");
  const activeQuery = externalQuery ?? query;
  const setActiveQuery = onExternalQueryChange ?? setQuery;

  const visibleCollections = useMemo(() => {
    if (!collections) return [];
    return collections
      .filter((collection) => collection.visible !== false)
      .filter((collection) => collection.items?.some((item) => item.producto));
  }, [collections]);

  const showCollections = Boolean(visibleCollections.length);

  // Build subcategories map from products
  const subcatMap = useMemo(() => {
    const map: Record<string, { id: string; nombre: string; catId: string }[]> = {};
    productos.forEach((p) => {
      const catId = p._categoriaId;
      const subId = p._subcategoriaId;
      if (!map[catId]) map[catId] = [];
      if (!map[catId].find((s) => s.id === subId)) {
        map[catId].push({ id: subId, nombre: p._subcategoria, catId });
      }
    });
    return map;
  }, [productos]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    productos.forEach((p) => {
      counts[p._categoriaId] = (counts[p._categoriaId] || 0) + 1;
    });
    return counts;
  }, [productos]);

  const subCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    productos.forEach((p) => {
      counts[p._subcategoriaId] = (counts[p._subcategoriaId] || 0) + 1;
    });
    return counts;
  }, [productos]);

  const filtrados = useMemo(() => {
    const normalize = (value: string) =>
      value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const term = normalize(activeQuery.trim());
    const byTaxonomy = productos.filter((p) => {
      if (catId !== "__all" && p._categoriaId !== catId) return false;
      if (subId !== "__all" && p._subcategoriaId !== subId) return false;
      return true;
    });

    if (!term) return byTaxonomy;
    return byTaxonomy.filter((p) =>
      normalize([p.nombre, p.descripcion, p.marca, p._categoria, p._subcategoria].filter(Boolean).join(" ")).includes(term)
    );
  }, [productos, catId, subId, activeQuery]);

  const handleCatClick = (id: string) => {
    if (id === "__all") {
      setCatId("__all");
      setSubId("__all");
      setExpanded(null);
      return;
    }
    setCatId(id);
    setSubId("__all");
    setExpanded(expanded === id ? null : id);
  };

  const columnToggle = (
    <div className="col-toggle" role="group" aria-label="Columnas">
      <button className={`col-toggle-one ${cols === 1 ? "active" : ""}`} onClick={() => setCols(1)} aria-label="Una columna">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="4" width="10" height="16" rx="1.5" /></svg>
      </button>
      <button className={cols === 2 ? "active" : ""} onClick={() => setCols(2)} aria-label="Dos columnas">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="7" height="16" rx="1.5" /><rect x="14" y="4" width="7" height="16" rx="1.5" /></svg>
      </button>
      <button className={`col-toggle-three ${cols === 3 ? "active" : ""}`} onClick={() => setCols(3)} aria-label="Tres columnas">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="5" height="16" rx="1.2" /><rect x="9.5" y="4" width="5" height="16" rx="1.2" /><rect x="17" y="4" width="5" height="16" rx="1.2" /></svg>
      </button>
    </div>
  );

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 640px)");
    const tablet = window.matchMedia("(max-width: 900px)");
    const syncResponsiveColumns = () => {
      setCols((current) => {
        if (phone.matches && current === 3) return 1;
        if (!phone.matches && tablet.matches && current === 1) return 2;
        if (!tablet.matches && current === 1) return 3;
        return current;
      });
    };

    syncResponsiveColumns();
    phone.addEventListener("change", syncResponsiveColumns);
    tablet.addEventListener("change", syncResponsiveColumns);
    return () => {
      phone.removeEventListener("change", syncResponsiveColumns);
      tablet.removeEventListener("change", syncResponsiveColumns);
    };
  }, []);

  return (
    <>
      <section className="section" id="catalogo">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">{kicker}</div>
              <h2 className="section-title">{title || <>Todo bajo<br />un mismo techo.</>}</h2>
            </div>
            <p className="section-lede">
              {lede}
            </p>
          </div>

          <div className="catalogo-layout">
            {/* Sidebar */}
            <aside className="cat-sidebar">
              <div className="cat-sidebar-title">{showCollections ? "Colecciones activas" : "Categorías"}</div>
              <div className="cat-list">
                {showCollections ? (
                  visibleCollections.map((collection) => {
                    const count = collection.items?.filter((item) => item.producto).length ?? 0;
                    const isActive = activeCollectionId === collection._id;
                    const theme = collection.themeColor || "#D2386C";

                    return (
                      <Link
                        key={collection._id}
                        href={collectionPath(collection)}
                        className={`cat-item ${isActive ? "active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="cat-item-dot" style={{ background: theme }} />
                        <span className="cat-item-name">{collection.titulo}</span>
                        <span className="cat-item-count">{count}</span>
                      </Link>
                    );
                  })
                ) : (
                  <>
                    <button
                      className={`cat-item ${catId === "__all" ? "active" : ""}`}
                      onClick={() => handleCatClick("__all")}
                    >
                      <span className="cat-item-dot" style={{ background: "var(--plum)" }} />
                      <span className="cat-item-name">Todos</span>
                      <span className="cat-item-count">{productos.length}</span>
                    </button>

                    {categorias.map((cat) => {
                      const n = catCounts[cat._id] || 0;
                      const isExp = expanded === cat._id;
                      const isActive = catId === cat._id;
                      const subcats = subcatMap[cat._id] || [];

                      return (
                        <div key={cat._id}>
                          <button
                            className={`cat-item ${isActive ? "active" : ""} ${isExp ? "expanded" : ""}`}
                            onClick={() => handleCatClick(cat._id)}
                          >
                            <span className="cat-item-dot" style={{ background: cat.color }} />
                            <span className="cat-item-name">{cat.nombre}</span>
                            <span className="cat-item-count">{n}</span>
                            <svg className="cat-item-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          {isExp && subcats.length > 1 && (
                            <div className="subcat-panel">
                              <button
                                className={`subcat-btn ${subId === "__all" ? "active" : ""}`}
                                onClick={() => setSubId("__all")}
                              >
                                Todas
                                <span style={{ marginLeft: "auto", opacity: 0.6 }}>{n}</span>
                              </button>
                              {subcats.map((s) => (
                                <button
                                  key={s.id}
                                  className={`subcat-btn ${subId === s.id ? "active" : ""}`}
                                  onClick={() => setSubId(s.id)}
                                >
                                  {s.nombre}
                                  <span style={{ marginLeft: "auto", opacity: 0.6 }}>{subCounts[s.id] || 0}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="cat-sidebar-columns">
                <span>Vista</span>
                {columnToggle}
              </div>
            </aside>

            {/* Products */}
            <div className="catalogo-content">
              <div className={`catalog-toolbar ${hideLocalSearch ? "catalog-toolbar-compact" : ""}`}>
                {!hideLocalSearch && (
                  <label className="catalog-search">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                      type="search"
                      value={activeQuery}
                      onChange={(e) => setActiveQuery(e.target.value)}
                      placeholder="Buscar productos, marcas o categorías"
                    />
                  </label>
                )}
                <div className="catalog-result-count" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                  <strong style={{ color: "var(--ink)" }}>{filtrados.length}</strong> productos
                  {activeQuery.trim() && (
                    <span> para <strong style={{ color: "var(--plum)" }}>{activeQuery.trim()}</strong></span>
                  )}
                  {catId !== "__all" && (
                    <span> en <strong style={{ color: "var(--plum)" }}>{categorias.find(c => c._id === catId)?.nombre}</strong></span>
                  )}
                </div>
                <div className="catalog-toolbar-columns">{columnToggle}</div>
              </div>

              {filtrados.length === 0 ? (
                <div className="empty-state">No hay productos en esta selección.</div>
              ) : (
                <div className={`prod-grid cols-${cols}`}>
                  {filtrados.map((p) => (
                    <ProductCard key={p._id} producto={p} onOpen={setOpenProduct} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <ProductModal
        producto={openProduct}
        onClose={() => setOpenProduct(null)}
        whatsapp={brand.whatsapp}
        contact={brand.primaryContact}
      />
    </>
  );
}
