export interface SanityImage {
  _type: "image";
  asset: { _ref: string; _type: "reference" };
  alt?: string;
}

// ─── Site Settings ───────────────────────────────────────
export interface Horario { dia: string; hora: string; cerrado?: boolean; }

export type SocialPlatform = "whatsapp" | "instagram" | "facebook" | "messenger" | "tiktok" | "other";

export interface SocialLink {
  _key?: string;
  platform: SocialPlatform;
  label?: string;
  url?: string;
  phone?: string;
  active?: boolean;
  showInFooter?: boolean;
  isPrimaryCta?: boolean;
}

export interface SiteSettings {
  _id: string; nombre: string; tagline?: string; logo?: SanityImage;
  whatsapp: string; whatsappDisplay?: string; telefono?: string; email?: string;
  direccion?: string; googleMapsUrl?: string; googleMapsEmbedUrl?: string;
  instagramUrl?: string; facebookUrl?: string; tiktokUrl?: string;
  socialLinks?: SocialLink[];
  horarios?: Horario[]; seoTitle?: string; seoDescription?: string; seoImage?: SanityImage;
}

// ─── Hero ────────────────────────────────────────────────
export interface Hero {
  _id: string; titulo: string; subtitulo?: string; eyebrow?: string;
  ctaPrincipalTexto?: string; ctaPrincipalMensaje?: string;
  ctaSecundarioTexto?: string; trustItems?: string[]; active: boolean;
  floatingCards?: HeroFloatingCard[];
}

export interface HeroFloatingCard {
  _key: string;
  label?: string;
  title?: string;
  image?: SanityImage;
  position?: "leftTop" | "rightTop" | "leftBottom" | "rightBottom" | "leftMid" | "rightMid";
  rotation?: number;
  order?: number;
  visible?: boolean;
}

// ─── Galería destacada ─────────────────────────────────────────────
export type FeaturedGalleryMediaType = "image" | "youtube";
export type FeaturedGalleryCtaAction = "whatsapp" | "scroll";

export interface FeaturedGalleryItem {
  _key: string;
  titulo: string;
  descripcion?: string;
  mediaType: FeaturedGalleryMediaType;
  imagen?: SanityImage;
  alt?: string;
  focalPosition?: string;
  youtubeUrl?: string;
  youtubeThumbnail?: SanityImage;
  meta?: string;
  ctaText?: string;
  ctaHref?: string;
  ctaAction?: FeaturedGalleryCtaAction;
  whatsappMessage?: string;
  targetSection?: string;
  active: boolean;
}

export interface FeaturedGallery {
  _id: string;
  titulo?: string;
  subtitulo?: string;
  active: boolean;
  items: FeaturedGalleryItem[];
}

// ─── Categoria ───────────────────────────────────────────
export interface Categoria {
  _id: string; nombre: string; slug: { current: string };
  color: string; descripcion?: string; orden?: number; activo: boolean;
}

// ─── Subcategoria ────────────────────────────────────────
export interface Subcategoria {
  _id: string; nombre: string; slug: { current: string };
  categoria: Categoria; orden?: number; activo: boolean;
}

// ─── Variante (embebida en producto) ─────────────────────
export interface Variante {
  _key: string;
  idExcel?: string;
  nombre?: string;
  color?: string;
  tamano?: string;
  otrosAtributos?: string;
  stock?: number | null;
  imagen?: SanityImage;
  visible: boolean;
}

// ─── Presentacion (embebida en producto) ─────────────────
export interface Presentacion {
  _key: string;
  idExcel?: string;
  nombre: string;
  factorConversion: number;
  precio?: number | null;
  visibleEnWeb: boolean;
  esDefault: boolean;
}

// ─── Producto ────────────────────────────────────────────
export interface Producto {
  _id: string;
  idExcel?: string;
  nombre: string;
  slug: { current: string };
  subcategoria: Subcategoria & { categoria: Categoria };
  descripcion?: string;
  marca?: string;
  tags?: string[];
  medidas?: string;
  observaciones?: string;
  imagenes?: SanityImage[];
  visible: boolean;
  destacado?: boolean;
  orden?: number;
  manejaStock?: boolean;
  permiteVentaFraccionada?: boolean;
  unidadBase?: string;
  variantes?: Variante[];
  presentaciones?: Presentacion[];
  whatsappMensaje?: string;
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
