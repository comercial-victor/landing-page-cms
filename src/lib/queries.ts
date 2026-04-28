import { sanityClient } from "./sanity";
import type { SiteSettings, Hero, Categoria, Producto, ProductoFlat } from "@/types";

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return sanityClient.fetch(
    `*[_type == "siteSettings"][0]{
      _id, nombre, tagline, logo, whatsapp, whatsappDisplay, telefono, email,
      direccion, googleMapsUrl, googleMapsEmbedUrl, instagramUrl, facebookUrl, tiktokUrl,
      horarios[]{ dia, hora, cerrado }, seoTitle, seoDescription, seoImage
    }`, {}, { next: { tags: ["siteSettings"] } }
  );
}

export async function getHero(): Promise<Hero | null> {
  return sanityClient.fetch(
    `*[_type == "hero" && active == true][0]{
      _id, titulo, subtitulo, eyebrow, ctaPrincipalTexto, ctaPrincipalMensaje,
      ctaSecundarioTexto, trustItems, active
    }`, {}, { next: { tags: ["hero"] } }
  );
}

export async function getCategorias(): Promise<Categoria[]> {
  return sanityClient.fetch(
    `*[_type == "categoria" && activo == true] | order(orden asc){
      _id, nombre, slug, color, descripcion, orden, activo
    }`, {}, { next: { tags: ["categoria"] } }
  );
}

const productoProjection = `{
  _id, idExcel, nombre, slug, descripcion, marca, tags, medidas, observaciones,
  imagenes, visible, destacado, orden, manejaStock, permiteVentaFraccionada, unidadBase,
  whatsappMensaje,
  subcategoria->{ _id, nombre, slug, categoria->{ _id, nombre, slug, color } },
  variantes[]{ _key, idExcel, nombre, color, tamano, otrosAtributos, stock, imagen, visible },
  presentaciones[]{ _key, idExcel, nombre, factorConversion, precio, visibleEnWeb, esDefault }
}`;

export async function getTodosLosProductos(): Promise<ProductoFlat[]> {
  const productos: Producto[] = await sanityClient.fetch(
    `*[_type == "producto" && visible == true] | order(orden asc) ${productoProjection}`,
    {}, { next: { tags: ["producto"] } }
  );
  return productos.map(flattenProducto);
}

export async function getProductosDestacados(): Promise<ProductoFlat[]> {
  const productos: Producto[] = await sanityClient.fetch(
    `*[_type == "producto" && visible == true && destacado == true] | order(orden asc)[0...8] ${productoProjection}`,
    {}, { next: { tags: ["producto"] } }
  );
  return productos.map(flattenProducto);
}

export async function getProductoPorSlug(slug: string): Promise<ProductoFlat | null> {
  const producto: Producto | null = await sanityClient.fetch(
    `*[_type == "producto" && slug.current == $slug && visible == true][0] ${productoProjection}`,
    { slug }, { next: { tags: ["producto"] } }
  );
  return producto ? flattenProducto(producto) : null;
}

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
