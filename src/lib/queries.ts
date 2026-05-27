import { sanityClient } from "./sanity";
import type { Collection, Album, SiteSettings, Hero, FeaturedGallery, Categoria, Producto, ProductoFlat, DestacadoUbicacion } from "@/types";

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return sanityClient.fetch(
    `*[_type == "siteSettings"][0]{
      _id, nombre, tagline, logo, whatsapp, whatsappDisplay, telefono, email,
      direccion, googleMapsUrl, googleMapsEmbedUrl, instagramUrl, facebookUrl, tiktokUrl,
      socialLinks[]{ _key, platform, label, url, phone, active, showInFooter, showFloating, showInNavbar, color, isPrimaryCta },
      storeStatus{ enabled, mode, openingTime, message, validUntil },
      horarios[]{ dia, hora, cerrado }, seoTitle, seoDescription, seoImage
    }`, {}, { cache: "no-store" }
  );
}

export async function getHero(): Promise<Hero | null> {
  return sanityClient.fetch(
    `*[_type == "hero" && _id == "hero" && active != false][0]{
      _id, titulo, subtitulo, eyebrow, ctaPrincipalTexto, ctaPrincipalMensaje,
      ctaSecundarioTexto, trustItems, active,
      "floatingCards": floatingCards[visible != false] | order(order asc){
        _key, label, title, visualFormat, position, rotation, order, visible
      }
    }`, {}, { cache: "no-store" }
  );
}

export async function getFeaturedGallery(): Promise<FeaturedGallery | null> {
  return sanityClient.fetch(
    `*[_type == "featuredGallery" && _id == "featuredGallery" && active != false][0]{
      _id, titulo, subtitulo, active,
      "items": items[active != false]{
        _key, titulo, descripcion, mediaType, mediaOrientation, imagen, alt, focalPosition,
        youtubeUrl, youtubeThumbnail, meta, ctaText, ctaHref, ctaAction, whatsappMessage, targetSection, active, orden
      } | order(orden asc)
    }`,
    {},
    { cache: "no-store" }
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
  imagenes, visible, destacado, destacadoUbicaciones, orden, stock, manejaStock, permiteVentaFraccionada, unidadBase,
  whatsappMensaje, migratedFromVariant,
  subcategoria->{ _id, nombre, slug, categoria->{ _id, nombre, slug, color } },
  presentaciones[]{ _key, idExcel, nombre, factorConversion, precio, visibleEnWeb, esDefault }
}`;

export async function getTodosLosProductos(): Promise<ProductoFlat[]> {
  const productos: Producto[] = await sanityClient.fetch(
    `*[_type == "producto" && visible == true] | order(orden asc) ${productoProjection}`,
    {}, { next: { tags: ["producto"] } }
  );
  return productos.map(flattenProducto);
}

export async function getProductosDestacados(ubicacion: DestacadoUbicacion = "preCatalog"): Promise<ProductoFlat[]> {
  const productos: Producto[] = await sanityClient.fetch(
    `*[
      _type == "producto" &&
      visible == true &&
      (
        (defined(destacadoUbicaciones) && $ubicacion in destacadoUbicaciones) ||
        (!defined(destacadoUbicaciones) && destacado == true)
      )
    ] | order(orden asc)[0...10] ${productoProjection}`,
    { ubicacion }, { next: { tags: ["producto"] } }
  );
  return productos.map(flattenProducto);
}

export async function getColecciones(): Promise<Collection[]> {
  type CollectionRaw = Omit<Collection, "items"> & {
    items?: Array<{
      _key: string;
      titulo?: string;
      descripcion?: string;
      visible?: boolean;
      mostrarEnPortada?: boolean;
      producto?: Producto | null;
    }>;
  };

  const colecciones: CollectionRaw[] = await sanityClient.fetch(
    `*[_type == "album" && visible != false] | order(orden asc){
      _id, titulo, subtitulo, etiqueta, slug, portada, themeColor, visible, orden,
      "items": items[visible != false]{
        _key, titulo, descripcion, visible, mostrarEnPortada,
        producto-> ${productoProjection}
      }
    }`,
    {},
    { next: { tags: ["album", "producto"] } }
  );

  return colecciones.map((collection) => ({
    ...collection,
    items: (collection.items || []).reduce<Collection["items"]>((items, item) => {
      if (!item.producto) return items;
      items.push({
        ...item,
        producto: flattenProducto(item.producto),
      });
      return items;
    }, []),
  }));
}

export const getAlbumes = getColecciones;

export async function getColeccionPorSlug(slug: string): Promise<Collection | null> {
  type CollectionRaw = Omit<Collection, "items"> & {
    items?: Array<{
      _key: string;
      titulo?: string;
      descripcion?: string;
      visible?: boolean;
      mostrarEnPortada?: boolean;
      producto?: Producto | null;
    }>;
  };

  const collection: CollectionRaw | null = await sanityClient.fetch(
    `*[_type == "album" && visible != false && slug.current == $slug][0]{
      _id, titulo, subtitulo, etiqueta, slug, portada, themeColor, visible, orden,
      "items": items[visible != false]{
        _key, titulo, descripcion, visible, mostrarEnPortada,
        producto-> ${productoProjection}
      }
    }`,
    { slug },
    { next: { tags: ["album", "producto"] } }
  );

  if (!collection) return null;

  return {
    ...collection,
    items: (collection.items || []).reduce<Collection["items"]>((items, item) => {
      if (!item.producto) return items;
      items.push({
        ...item,
        producto: flattenProducto(item.producto),
      });
      return items;
    }, []),
  };
}

export async function getColeccionSlugs(): Promise<string[]> {
  return sanityClient.fetch(
    `*[_type == "album" && visible != false && defined(slug.current)].slug.current`,
    {},
    { next: { tags: ["album"] } }
  );
}

export async function getProductoPorSlug(slug: string): Promise<ProductoFlat | null> {
  const producto: Producto | null = await sanityClient.fetch(
    `*[_type == "producto" && slug.current == $slug && visible == true][0] ${productoProjection}`,
    { slug }, { next: { tags: ["producto"] } }
  );
  return producto ? flattenProducto(producto) : null;
}

export async function getProductoSlugs(): Promise<string[]> {
  return sanityClient.fetch(
    `*[_type == "producto" && visible == true && defined(slug.current)].slug.current`,
    {},
    { next: { tags: ["producto"] } }
  );
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
