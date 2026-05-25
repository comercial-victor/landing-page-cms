"use client";

import Image from "next/image";
import Link from "next/link";
import type { Collection, ProductoFlat } from "@/types";
import { urlFor } from "@/lib/sanity";
import { buildDemoCollections, collectionPath } from "@/lib/collections";
import { ProductImage } from "./ProductHelpers";

interface ColeccionesProps {
  colecciones: Collection[];
  fallbackProductos: ProductoFlat[];
}

export default function Colecciones({ colecciones, fallbackProductos }: ColeccionesProps) {
  const visibleCollections = colecciones
    .filter((collection) => collection.visible !== false)
    .filter((collection) => collection.items?.some((item) => item.producto));

  const prepared = visibleCollections.length ? visibleCollections : buildDemoCollections(fallbackProductos);

  if (!prepared.length) return null;

  return (
    <section className="section colecciones-section" id="colecciones">
      <div className="container">
        <div className="colecciones-head">
          <div>
            <div className="section-kicker">Colecciones</div>
            <h2 className="section-title">Ideas listas para compartir</h2>
          </div>
          <p className="section-lede">
            Colecciones por temporada, ocasión o campaña, pensadas para abrirse como una página propia y enviarse directo por redes.
          </p>
        </div>

        <div className="colecciones-grid">
          {prepared.map((collection, index) => {
            const products = collection.items.map((item) => item.producto).filter(Boolean) as ProductoFlat[];
            const cover = collection.portada;
            const href = collectionPath(collection);
            const theme = collection.themeColor || "#D2386C";

            return (
              <Link
                key={collection._id}
                href={href}
                className={`coleccion-card ${index === 0 ? "is-featured" : ""}`}
                style={{ "--collection-color": theme } as React.CSSProperties}
              >
                <span className="coleccion-card-bg" aria-hidden="true" />
                <span className="coleccion-preview" aria-hidden="true">
                  {cover ? (
                    <span className="coleccion-cover">
                      <Image
                        src={urlFor(cover).width(720).height(820).fit("crop").url()}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 88vw, 420px"
                        className="coleccion-cover-img"
                      />
                    </span>
                  ) : (
                    products.slice(0, 3).map((producto, i) => (
                      <span key={producto._id} className={`coleccion-mini coleccion-mini-${i}`}>
                        <ProductImage producto={producto} />
                      </span>
                    ))
                  )}
                </span>
                <span className="coleccion-copy">
                  <span className="coleccion-tag">{collection.etiqueta || "Colección"}</span>
                  <strong>{collection.titulo}</strong>
                  {collection.subtitulo && <span>{collection.subtitulo}</span>}
                  <em>Ver colección</em>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
