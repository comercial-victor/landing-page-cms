"use client";

import { useState, useMemo } from "react";
import type { ProductoFlat, Categoria } from "@/types";
import { ProductImage, Badges, PriceDisplay } from "./ProductHelpers";
import ProductModal from "./ProductModal";

interface CatalogoProps {
  productos: ProductoFlat[];
  categorias: Categoria[];
  brand: { whatsapp: string };
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

export default function Catalogo({ productos, categorias, brand }: CatalogoProps) {
  const [catId, setCatId] = useState<string>("__all");
  const [subId, setSubId] = useState<string>("__all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cols, setCols] = useState<2 | 3>(3);
  const [openProduct, setOpenProduct] = useState<ProductoFlat | null>(null);

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
    if (catId === "__all") return productos;
    const byCat = productos.filter((p) => p._categoriaId === catId);
    if (subId === "__all") return byCat;
    return byCat.filter((p) => p._subcategoriaId === subId);
  }, [productos, catId, subId]);

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

  return (
    <>
      <section className="section" id="catalogo">
        <div className="container">
          <div className="section-head">
            <div>
              <div className="section-kicker">Catálogo completo</div>
              <h2 className="section-title">
                Todo bajo<br />un mismo techo.
              </h2>
            </div>
            <p className="section-lede">
              Filtra por categoría o subcategoría. Cualquier producto se cotiza por WhatsApp con un toque.
            </p>
          </div>

          <div className="catalogo-layout">
            {/* Sidebar */}
            <aside className="cat-sidebar">
              <div className="cat-sidebar-title">Categorías</div>
              <div className="cat-list">
                {/* All */}
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
              </div>
            </aside>

            {/* Products */}
            <div className="catalogo-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                  <strong style={{ color: "var(--ink)" }}>{filtrados.length}</strong> productos
                  {catId !== "__all" && (
                    <span> en <strong style={{ color: "var(--plum)" }}>{categorias.find(c => c._id === catId)?.nombre}</strong></span>
                  )}
                </div>
                <div className="col-toggle" role="group" aria-label="Columnas">
                  <button className={cols === 2 ? "active" : ""} onClick={() => setCols(2)} aria-label="Dos columnas">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="7" height="16" rx="1.5" /><rect x="14" y="4" width="7" height="16" rx="1.5" /></svg>
                  </button>
                  <button className={cols === 3 ? "active" : ""} onClick={() => setCols(3)} aria-label="Tres columnas">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="5" height="16" rx="1.2" /><rect x="9.5" y="4" width="5" height="16" rx="1.2" /><rect x="17" y="4" width="5" height="16" rx="1.2" /></svg>
                  </button>
                </div>
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
      />
    </>
  );
}
