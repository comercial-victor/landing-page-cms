export interface SanityImage {
  _type: "image";
  asset: { _ref: string; _type: "reference" };
  alt?: string;
}

// ─── Site Settings ───────────────────────────────────────
export interface Horario {
  dia: string;
  hora: string;
  cerrado?: boolean;
}

export interface SiteSettings {
  _id: string;
  nombre: string;
  tagline?: string;
  logo?: SanityImage;
  whatsapp: string;
  whatsappDisplay?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  horarios?: Horario[];
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: SanityImage;
}

// ─── Hero ────────────────────────────────────────────────
export interface Hero {
  _id: string;
  titulo: string;
  subtitulo?: string;
  eyebrow?: string;
  ctaPrincipalTexto?: string;
  ctaPrincipalMensaje?: string;
  ctaSecundarioTexto?: string;
  trustItems?: string[];
  active: boolean;
}

// ─── Categoria ───────────────────────────────────────────
export interface Categoria {
  _id: string;
  nombre: string;
  slug: { current: string };
  color: string;
  descripcion?: string;
  orden?: number;
  activo: boolean;
}

// ─── Subcategoria ────────────────────────────────────────
export interface Subcategoria {
  _id: string;
  nombre: string;
  slug: { current: string };
  categoria: Categoria;
  orden?: number;
  activo: boolean;
}

// ─── Producto ────────────────────────────────────────────
export type TipoProducto = "simple" | "pack" | "alquiler";
export type StockProducto = "disponible" | "bajo" | "consultar";

export interface ComponentePack {
  producto: Producto;
  cantidad: number;
}

export interface Producto {
  _id: string;
  nombre: string;
  slug: { current: string };
  tipo: TipoProducto;
  subcategoria: Subcategoria & { categoria: Categoria };
  descripcion?: string;
  detalles?: string[];
  imagenes?: SanityImage[];
  precio?: number | null;
  precioDesde?: boolean;
  unidadVenta?: string;
  tags?: string[];
  whatsappMensaje?: string;
  mostrarAhorroPack?: boolean;
  componentesPack?: ComponentePack[];
  stock?: StockProducto;
  orden?: number;
  activo: boolean;
  destacado?: boolean;
}

// ─── Computed / View types ────────────────────────────────
export interface ProductoFlat extends Producto {
  _categoria: string;
  _categoriaId: string;
  _categoriaSlug: string;
  _categoriaColor: string;
  _subcategoria: string;
  _subcategoriaId: string;
}
