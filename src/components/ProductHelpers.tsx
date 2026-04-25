import type { ProductoFlat } from "@/types";
import { urlFor } from "@/lib/sanity";
import Image from "next/image";

interface ProductImageProps {
  producto: ProductoFlat;
  className?: string;
  fill?: boolean;
}

export function ProductImage({ producto, className = "" }: ProductImageProps) {
  const color = producto._categoriaColor || "#D2386C";
  const colorA = color + "33";
  const colorB = color + "1a";

  // If product has Sanity images, use the first one
  if (producto.imagenes && producto.imagenes.length > 0) {
    return (
      <div className={`placeholder-stripes ${className}`} style={{ "--stripe-a": colorA, "--stripe-b": colorB } as React.CSSProperties}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <Image
            src={urlFor(producto.imagenes[0]).width(400).height(300).url()}
            alt={producto.nombre}
            fill
            className="object-cover"
          />
        </div>
      </div>
    );
  }

  // SVG placeholder based on category
  return (
    <div
      className={`placeholder-stripes ${className}`}
      style={{ "--stripe-a": colorA, "--stripe-b": colorB } as React.CSSProperties}
      role="img"
      aria-label={producto.nombre}
    >
      <PlaceholderShape producto={producto} color={color} />
    </div>
  );
}

function PlaceholderShape({ producto, color }: { producto: ProductoFlat; color: string }) {
  const slug = producto._categoriaSlug || "";

  if (producto.tipo === "pack") {
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <rect x="12" y="24" width="56" height="44" rx="4" fill={color} opacity="0.85" />
        <rect x="8" y="20" width="64" height="10" rx="2" fill={color} />
        <rect x="36" y="20" width="8" height="48" fill="rgba(255,255,255,0.5)" />
        <path d="M32 20 C 32 8, 48 8, 48 20" stroke={color} strokeWidth="3" fill="none" />
      </svg>
    );
  }

  if (slug.includes("globo")) {
    return (
      <svg width="90" height="110" viewBox="0 0 90 110" fill="none" aria-hidden="true">
        <ellipse cx="45" cy="42" rx="32" ry="38" fill={color} />
        <ellipse cx="35" cy="32" rx="8" ry="10" fill="rgba(255,255,255,0.45)" />
        <path d="M45 80 L 42 88 L 48 88 Z" fill={color} />
        <path d="M45 88 Q 40 96, 45 104 Q 50 100, 45 88" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="none" />
      </svg>
    );
  }

  if (slug.includes("pinata") || slug.includes("piñata")) {
    return (
      <svg width="100" height="90" viewBox="0 0 100 90" fill="none" aria-hidden="true">
        <polygon points="50,8 60,30 84,30 66,46 72,70 50,56 28,70 34,46 16,30 40,30" fill={color} />
        <line x1="50" y1="8" x2="50" y2="0" stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
        <g stroke={color} strokeWidth="2" opacity="0.7">
          <line x1="28" y1="70" x2="22" y2="84" /><line x1="50" y1="56" x2="50" y2="84" /><line x1="72" y1="70" x2="78" y2="84" />
        </g>
      </svg>
    );
  }

  if (slug.includes("alquiler")) {
    return (
      <svg width="100" height="90" viewBox="0 0 100 90" fill="none" aria-hidden="true">
        <rect x="14" y="20" width="72" height="6" fill={color} />
        <rect x="18" y="26" width="4" height="50" fill={color} opacity="0.8" />
        <rect x="78" y="26" width="4" height="50" fill={color} opacity="0.8" />
        <path d="M14 20 L 50 4 L 86 20" stroke={color} strokeWidth="3" fill="none" />
        <circle cx="50" cy="50" r="12" fill={color} opacity="0.5" />
      </svg>
    );
  }

  // Default (menaje, escolar, etc.)
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none" aria-hidden="true">
      <ellipse cx="45" cy="48" rx="36" ry="10" fill={color} opacity="0.3" />
      <circle cx="45" cy="42" r="30" fill={color} opacity="0.85" />
      <circle cx="45" cy="42" r="20" fill="rgba(255,255,255,0.4)" />
      <circle cx="45" cy="42" r="6" fill={color} />
    </svg>
  );
}

export function Badges({ producto }: { producto: ProductoFlat }) {
  return (
    <>
      {producto.tags?.includes("nuevo") && <span className="badge badge-nuevo">Nuevo</span>}
      {producto.tags?.includes("popular") && <span className="badge badge-popular">Popular</span>}
      {producto.tipo === "pack" && <span className="badge badge-pack">Pack</span>}
      {producto.tipo === "alquiler" && <span className="badge badge-alquiler">Alquiler</span>}
    </>
  );
}

export function PriceDisplay({ producto, size = "card" }: { producto: ProductoFlat; size?: "card" | "modal" }) {
  const price = producto.precio;
  if (price === null || price === undefined) {
    return size === "card"
      ? <span className="pcard-price-consult">Consultar precio</span>
      : <div className="price-block-consult">Consultar precio</div>;
  }
  const txt = "S/ " + new Intl.NumberFormat("es-PE").format(price);
  if (size === "card") {
    return (
      <div>
        {producto.precioDesde && <span className="pcard-price-from">Desde</span>}
        <span className="pcard-price">{txt}</span>
      </div>
    );
  }
  return <div className="price-block-value">{producto.precioDesde ? "Desde " : ""}{txt}</div>;
}
