"use client";

import { useEffect, useState, useMemo } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { ProductoFlat, Categoria, Collection } from "@/types";
import { ProductImage, Badges, PriceDisplay } from "./ProductHelpers";
import type { ContactLink } from "@/lib/social";
import { collectionPath } from "@/lib/collections";
import { productPath } from "@/lib/products";
import { rankBySearch } from "@/lib/search";

interface CatalogoProps {
  productos: ProductoFlat[];
  categorias: Categoria[];
  collections?: Collection[];
  activeCollectionId?: string;
  brand: { whatsapp: string; primaryContact?: ContactLink };
  externalQuery?: string;
  onExternalQueryChange?: (value: string) => void;
  hideLocalSearch?: boolean;
  searchAllCategories?: boolean;
  initialCategorySlug?: string;
  initialSubcategorySlug?: string;
  kicker?: string;
  title?: ReactNode;
  lede?: string;
}

interface SubcategoryFilter {
  _id: string;
  nombre: string;
  slug: string;
  count: number;
}

interface CategoryFilter {
  _id: string;
  nombre: string;
  slug: string;
  color: string;
  count: number;
  subcategories: SubcategoryFilter[];
}

function ProductCard({ producto }: { producto: ProductoFlat }) {
  return (
    <Link
      className="pcard"
      href={productPath(producto)}
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
    </Link>
  );
}

function catalogUrl(categorySlug?: string, subcategorySlug?: string) {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  if (subcategorySlug) params.set("subcategory", subcategorySlug);
  const query = params.toString();
  return query ? `/catalog?${query}` : "/catalog";
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
  searchAllCategories = false,
  initialCategorySlug,
  initialSubcategorySlug,
  kicker = "Catálogo completo",
  title,
  lede = "Filtra por categoría o subcategoría. Cualquier producto se cotiza por WhatsApp con un toque.",
}: CatalogoProps) {
  void brand;

  const [catId, setCatId] = useState<string>("__all");
  const [subcatId, setSubcatId] = useState<string>("__all");
  const [expandedCatId, setExpandedCatId] = useState<string>("__none");
  const [cols, setCols] = useState<1 | 2 | 3>(3);
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

  const categoryGroups = useMemo<CategoryFilter[]>(() => {
    const byCategory = new Map<string, CategoryFilter & { subMap: Map<string, SubcategoryFilter> }>();

    categorias.forEach((cat) => {
      byCategory.set(cat._id, {
        _id: cat._id,
        nombre: cat.nombre,
        slug: cat.slug?.current || "",
        color: cat.color || "var(--plum)",
        count: 0,
        subcategories: [],
        subMap: new Map(),
      });
    });

    productos.forEach((producto) => {
      if (!producto._categoriaId) return;

      let group = byCategory.get(producto._categoriaId);
      if (!group) {
        group = {
          _id: producto._categoriaId,
          nombre: producto._categoria || "Sin categoría",
          slug: producto._categoriaSlug || "",
          color: producto._categoriaColor || "var(--plum)",
          count: 0,
          subcategories: [],
          subMap: new Map(),
        };
        byCategory.set(producto._categoriaId, group);
      }

      group.count += 1;

      if (!producto._subcategoriaId) return;
      const existing = group.subMap.get(producto._subcategoriaId);
      if (existing) {
        existing.count += 1;
        return;
      }

      group.subMap.set(producto._subcategoriaId, {
        _id: producto._subcategoriaId,
        nombre: producto._subcategoria || "Sin subcategoría",
        slug: producto._subcategoriaSlug || producto._subcategoriaId,
        count: 1,
      });
    });

    return Array.from(byCategory.values())
      .filter((group) => group.count > 0)
      .map((group) => ({
        _id: group._id,
        nombre: group.nombre,
        slug: group.slug,
        color: group.color,
        count: group.count,
        subcategories: Array.from(group.subMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      }));
  }, [categorias, productos]);

  const activeCategory = useMemo(
    () => categoryGroups.find((group) => group._id === catId),
    [categoryGroups, catId],
  );

  const expandedCategory = useMemo(
    () => categoryGroups.find((group) => group._id === expandedCatId),
    [categoryGroups, expandedCatId],
  );

  const activeSubcategory = useMemo(
    () => activeCategory?.subcategories.find((subcat) => subcat._id === subcatId),
    [activeCategory, subcatId],
  );

  const filtrados = useMemo(() => {
    const byTaxonomy = searchAllCategories
      ? productos
      : productos.filter((producto) => {
          if (catId !== "__all" && producto._categoriaId !== catId) return false;
          if (subcatId !== "__all" && producto._subcategoriaId !== subcatId) return false;
          return true;
        });

    return rankBySearch(byTaxonomy, activeQuery, (producto) => [
      producto.nombre,
      producto.idExcel,
      producto.descripcion,
      producto.marca,
      producto.medidas,
      producto.observaciones,
      producto._categoria,
      producto._subcategoria,
      ...(producto.tags || []),
      ...(producto.presentaciones || []).map((presentacion) => presentacion.nombre),
    ]);
  }, [productos, catId, subcatId, activeQuery, searchAllCategories]);

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
        if (phone.matches && current === 3) return 2;
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

  useEffect(() => {
    if (searchAllCategories) {
      setCatId("__all");
      setSubcatId("__all");
      return;
    }

    let nextCatId = "__all";
    let nextSubcatId = "__all";

    if (initialCategorySlug) {
      const categoryMatch = categoryGroups.find((cat) => cat.slug === initialCategorySlug);
      if (categoryMatch) nextCatId = categoryMatch._id;
    }

    if (initialSubcategorySlug) {
      const ownerCategory = categoryGroups.find((cat) =>
        cat.subcategories.some((subcat) => subcat.slug === initialSubcategorySlug),
      );
      const subcategoryMatch = ownerCategory?.subcategories.find((subcat) => subcat.slug === initialSubcategorySlug);

      if (ownerCategory && subcategoryMatch) {
        nextCatId = ownerCategory._id;
        nextSubcatId = subcategoryMatch._id;
      }
    }

    setCatId(nextCatId);
    setSubcatId(nextSubcatId);
    setExpandedCatId(nextCatId === "__all" ? "__none" : nextCatId);
  }, [categoryGroups, initialCategorySlug, initialSubcategorySlug, searchAllCategories]);

  useEffect(() => {
    if (subcatId === "__all") return;
    if (activeCategory?.subcategories.some((subcat) => subcat._id === subcatId)) return;
    setSubcatId("__all");
  }, [activeCategory, subcatId]);

  useEffect(() => {
    if (expandedCatId === "__none") return;
    if (categoryGroups.some((cat) => cat._id === expandedCatId)) return;
    setExpandedCatId("__none");
  }, [categoryGroups, expandedCatId]);

  const taxonomyLabel = activeSubcategory?.nombre || activeCategory?.nombre;

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
                    <Link
                      className={`cat-item ${catId === "__all" && subcatId === "__all" ? "active" : ""}`}
                      href="/catalog"
                    >
                      <span className="cat-item-dot" style={{ background: "var(--plum)" }} />
                      <span className="cat-item-name">Todos</span>
                      <span className="cat-item-count">{productos.length}</span>
                    </Link>

                    {categoryGroups.map((cat) => {
                      const isActive = catId === cat._id;
                      const isExpanded = expandedCatId === cat._id;
                      const target = catalogUrl(cat.slug);

                      return (
                        <div key={cat._id} className={`cat-group ${isActive ? "active" : ""} ${isExpanded ? "expanded" : ""}`}>
                          <button
                            className={`cat-item cat-item-category ${isActive ? "active" : ""} ${isExpanded ? "expanded" : ""}`}
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`subcat-panel-${cat._id}`}
                            onClick={() => setExpandedCatId(isExpanded ? "__none" : cat._id)}
                          >
                            <span className="cat-item-dot" style={{ background: cat.color }} />
                            <span className="cat-item-name">{cat.nombre}</span>
                            <span className="cat-item-count">{cat.count}</span>
                            {cat.subcategories.length > 0 && (
                              <span className="cat-item-chev" aria-hidden="true">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </span>
                            )}
                          </button>

                          {isExpanded && cat.subcategories.length > 0 && (
                            <div id={`subcat-panel-${cat._id}`} className="subcat-panel subcat-panel-desktop" aria-label={`Subcategorías de ${cat.nombre}`}>
                              <Link
                                className={`subcat-btn subcat-btn-all ${isActive && subcatId === "__all" ? "active" : ""}`}
                                href={target}
                                aria-current={isActive && subcatId === "__all" ? "page" : undefined}
                              >
                                <span className="subcat-btn-name">Ver todo en {cat.nombre}</span>
                                <span className="subcat-btn-count">{cat.count}</span>
                              </Link>
                              {cat.subcategories.map((subcat) => (
                                <Link
                                  key={subcat._id}
                                  className={`subcat-btn ${subcatId === subcat._id ? "active" : ""}`}
                                  href={catalogUrl(cat.slug, subcat.slug)}
                                  aria-current={subcatId === subcat._id ? "page" : undefined}
                                >
                                  <span className="subcat-btn-name">{subcat.nombre}</span>
                                  <span className="subcat-btn-count">{subcat.count}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {!showCollections && expandedCategory?.subcategories.length ? (
                <div className="mobile-subcat-rail" aria-label={`Subcategorías de ${expandedCategory.nombre}`}>
                  <Link
                    className={`mobile-subcat-chip ${catId === expandedCategory._id && subcatId === "__all" ? "active" : ""}`}
                    href={catalogUrl(expandedCategory.slug)}
                    aria-current={catId === expandedCategory._id && subcatId === "__all" ? "page" : undefined}
                  >
                    Todo en {expandedCategory.nombre}
                    <span>{expandedCategory.count}</span>
                  </Link>
                  {expandedCategory.subcategories.map((subcat) => (
                    <Link
                      key={subcat._id}
                      className={`mobile-subcat-chip ${subcatId === subcat._id ? "active" : ""}`}
                      href={catalogUrl(expandedCategory.slug, subcat.slug)}
                      aria-current={subcatId === subcat._id ? "page" : undefined}
                    >
                      {subcat.nombre}
                      <span>{subcat.count}</span>
                    </Link>
                  ))}
                </div>
              ) : null}

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
                  {searchAllCategories && activeQuery.trim() && (
                    <span> en <strong style={{ color: "var(--plum)" }}>todas las categorías</strong></span>
                  )}
                  {!searchAllCategories && taxonomyLabel && (
                    <span> en <strong style={{ color: "var(--plum)" }}>{taxonomyLabel}</strong></span>
                  )}
                </div>
                <div className="catalog-toolbar-columns">{columnToggle}</div>
              </div>

              {filtrados.length === 0 ? (
                <div className="empty-state">No hay productos en esta selección.</div>
              ) : (
                <div className={`prod-grid cols-${cols}`}>
                  {filtrados.map((p) => (
                    <ProductCard key={p._id} producto={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
