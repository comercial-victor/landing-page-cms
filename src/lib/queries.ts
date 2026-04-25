import { sanityClient } from "./sanity";
import type {
  SiteSettings,
  Hero,
  Categoria,
  Subcategoria,
  Producto,
  ProductoFlat,
} from "@/types";

// ─── Site Settings ────────────────────────────────────────────────
export async function getSiteSettings(): Promise<SiteSettings | null> {
  return sanityClient.fetch(
    `*[_type == "siteSettings"][0]{
      _id, nombre, tagline, logo,
      whatsapp, whatsappDisplay, telefono, email,
      direccion, googleMapsUrl, googleMapsEmbedUrl,
      instagramUrl, facebookUrl, tiktokUrl,
      horarios[]{ dia, hora, cerrado },
      seoTitle, seoDescription, seoImage
    }`,
    {},
    { next: { tags: ["siteSettings"] } }
  );
}

// ─── Hero ─────────────────────────────────────────────────────────
export async function getHero(): Promise<Hero | null> {
  return sanityClient.fetch(
    `*[_type == "hero" && active == true][0]{
      _id, titulo, subtitulo, eyebrow,
      ctaPrincipalTexto, ctaPrincipalMensaje,
      ctaSecundarioTexto, trustItems, active
    }`,
    {},
    { next: { tags: ["hero"] } }
  );
}

// ─── Categorías ───────────────────────────────────────────────────
export async function getCategorias(): Promise<Categoria[]> {
  return sanityClient.fetch(
    `*[_type == "categoria" && activo == true] | order(orden asc){
      _id, nombre, slug, color, descripcion, orden, activo
    }`,
    {},
    { next: { tags: ["categoria"] } }
  );
}

// ─── Todos los productos (para catálogo completo) ─────────────────
export async function getTodosLosProductos(): Promise<ProductoFlat[]> {
  const productos: Producto[] = await sanityClient.fetch(
    `*[_type == "producto" && activo == true] | order(orden asc){
      _id, nombre, slug, tipo,
      subcategoria->{ _id, nombre, slug, categoria->{ _id, nombre, slug, color } },
      descripcion, detalles, imagenes, precio, precioDesde, unidadVenta,
      tags, whatsappMensaje, mostrarAhorroPack, stock, orden, activo, destacado,
      componentesPack[]{ cantidad, producto->{ _id, nombre, precio, precioDesde } }
    }`,
    {},
    { next: { tags: ["producto"] } }
  );

  return productos.map(flattenProducto);
}

// ─── Productos destacados (para Showcase / Novedades) ─────────────
export async function getProductosDestacados(): Promise<ProductoFlat[]> {
  const productos: Producto[] = await sanityClient.fetch(
    `*[_type == "producto" && activo == true && destacado == true] | order(orden asc)[0...8]{
      _id, nombre, slug, tipo,
      subcategoria->{ _id, nombre, slug, categoria->{ _id, nombre, slug, color } },
      descripcion, detalles, imagenes, precio, precioDesde, unidadVenta,
      tags, whatsappMensaje, stock, orden, activo, destacado
    }`,
    {},
    { next: { tags: ["producto"] } }
  );

  return productos.map(flattenProducto);
}

// ─── Producto por slug (página de detalle, si se quiere agregar) ──
export async function getProductoPorSlug(slug: string): Promise<ProductoFlat | null> {
  const producto: Producto | null = await sanityClient.fetch(
    `*[_type == "producto" && slug.current == $slug && activo == true][0]{
      _id, nombre, slug, tipo,
      subcategoria->{ _id, nombre, slug, categoria->{ _id, nombre, slug, color } },
      descripcion, detalles, imagenes, precio, precioDesde, unidadVenta,
      tags, whatsappMensaje, mostrarAhorroPack, stock, orden, activo, destacado,
      componentesPack[]{ cantidad, producto->{ _id, nombre, precio, precioDesde } }
    }`,
    { slug },
    { next: { tags: ["producto"] } }
  );

  return producto ? flattenProducto(producto) : null;
}

// ─── Helper: aplanar producto con datos de categoría ─────────────
function flattenProducto(p: Producto): ProductoFlat {
  const sub = p.subcategoria;
  const cat = sub?.categoria;
  return {
    ...p,
    _categoria: cat?.nombre || "",
    _categoriaId: cat?._id || "",
    _categoriaSlug: cat?.slug?.current || "",
    _categoriaColor: cat?.color || "#8B5CF6",
    _subcategoria: sub?.nombre || "",
    _subcategoriaId: sub?._id || "",
  };
}
