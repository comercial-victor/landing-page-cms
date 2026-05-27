import type { ProductoFlat, Presentacion } from "@/types";
import { urlFor } from "@/lib/sanity";
import Image from "next/image";

export function ProductImage({
  producto,
  className = "",
  size,
}: {
  producto: ProductoFlat;
  className?: string;
  size?: number;
}) {
  const color = producto._categoriaColor || "#D2386C";
  const colorA = color + "33";
  const colorB = color + "1a";

  if (producto.imagenes && producto.imagenes.length > 0) {
    return (
      <div className={`placeholder-stripes ${className}`} style={{ "--stripe-a": colorA, "--stripe-b": colorB } as React.CSSProperties}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <Image
            src={urlFor(producto.imagenes[0]).width(size ? size * 2 : 720).height(size ? size * 2 : 900).auto("format").url()}
            alt={producto.nombre}
            fill
            sizes={size ? `${size}px` : "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"}
            className="object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`placeholder-stripes ${className}`} style={{ "--stripe-a": colorA, "--stripe-b": colorB } as React.CSSProperties} role="img" aria-label={producto.nombre}>
      <svg width="90" height="90" viewBox="0 0 90 90" fill="none" aria-hidden="true">
        <ellipse cx="45" cy="48" rx="36" ry="10" fill={color} opacity="0.3" />
        <circle cx="45" cy="42" r="30" fill={color} opacity="0.85" />
        <circle cx="45" cy="42" r="20" fill="rgba(255,255,255,0.4)" />
        <circle cx="45" cy="42" r="6" fill={color} />
      </svg>
    </div>
  );
}

export function Badges({ producto }: { producto: ProductoFlat }) {
  return (
    <>
      {producto.tags?.includes("nuevo") && <span className="badge badge-nuevo">Nuevo</span>}
      {producto.tags?.includes("popular") && <span className="badge badge-popular">Popular</span>}
      {producto.marca && producto.marca !== "Genérico" && (
        <span className="badge" style={{ background: "rgba(255,255,255,0.9)", color: "#374151", border: "1px solid rgba(0,0,0,0.08)" }}>{producto.marca}</span>
      )}
    </>
  );
}

export function PriceDisplay({ producto, size = "card" }: { producto: ProductoFlat; size?: "card" | "modal" }) {
  // Product visibility is controlled at product level. If this product is visible, show all its presentations.
  const pres = producto.presentaciones || [];
  const defaultPres = pres.find(p => p.esDefault) || pres.find(p => p.precio != null);

  if (!defaultPres || defaultPres.precio == null) {
    return size === "card"
      ? <span className="pcard-price-consult">Consultar precio</span>
      : <div className="price-block-consult">Consultar precio</div>;
  }

  const txt = "S/ " + new Intl.NumberFormat("es-PE").format(defaultPres.precio);
  if (size === "card") {
    return (
      <div>
        {pres.length > 1 && <span className="pcard-price-from">Desde</span>}
        <span className="pcard-price">{txt}</span>
        <span className="pcard-price-unit">{defaultPres.nombre}</span>
      </div>
    );
  }
  return <div className="price-block-value">{pres.length > 1 ? "Desde " : ""}{txt}</div>;
}

export function PresentacionesList({ presentaciones }: { presentaciones?: Presentacion[] }) {
  const items = presentaciones || [];
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#7c6f8a", marginBottom: 8, fontWeight: 600 }}>Presentaciones</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((p) => (
          <div key={p._key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: p.esDefault ? "rgba(210,56,108,0.06)" : "#f9f7f5", borderRadius: 10, border: p.esDefault ? "1.5px solid rgba(210,56,108,0.25)" : "1px solid #e5e0da" }}>
            <span style={{ fontSize: 14, fontWeight: p.esDefault ? 600 : 500, color: "#1F1B2E" }}>
              {p.nombre}
              {p.esDefault && <span style={{ fontSize: 11, color: "#D2386C", marginLeft: 6 }}>★</span>}
            </span>
            <span style={{ fontSize: 15, fontWeight: 700, color: p.precio != null ? "#D2386C" : "#9a8fa8" }}>
              {p.precio != null ? `S/ ${new Intl.NumberFormat("es-PE").format(p.precio)}` : "Consultar"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
