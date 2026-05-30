import { defineField, defineType } from "sanity";
import {
  BadgeCheck,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  MousePointerClick,
  Sparkles,
  Type,
} from "lucide-react";
import { CtaIconInput } from "../components/CtaIconInput";
import { CTA_ICON_OPTIONS } from "../../src/lib/ctaIconOptions";

const PRODUCT_SLUG_MAX_LENGTH = 96;

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function isValidHexColor(value?: string) {
  return !value || HEX_COLOR_REGEX.test(value);
}

function isValidCtaHref(value?: string) {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}


function slugifyForUrl(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function productIdSuffix(value?: unknown): string {
  const raw = String(value || "")
    .replace(/^drafts\./, "")
    .replace(/^prod[-_.]/i, "")
    .replace(/^producto[-_.]/i, "");
  const compact = slugifyForUrl(raw).replace(/-/g, "");
  if (!compact) return "";
  return /^[a-z]/.test(compact) ? compact : `p${compact}`;
}

function productSlugWithId(nombre?: unknown, id?: unknown): string {
  const base = slugifyForUrl(String(nombre || "producto"));
  const suffix = productIdSuffix(id);
  if (!suffix) return base.slice(0, PRODUCT_SLUG_MAX_LENGTH);

  const safeBase = base
    .slice(0, Math.max(1, PRODUCT_SLUG_MAX_LENGTH - suffix.length - 1))
    .replace(/-+$/g, "");

  return `${safeBase}-${suffix}`;
}

// ─── Novedades ─────────────────────────────────────────────
export const featuredGallerySchema = defineType({
  name: "featuredGallery",
  title: "Novedades",
  type: "document",
  groups: [
    { name: "contenido", title: "Contenido", icon: Type, default: true },
    { name: "cards", title: "Cards", icon: GalleryHorizontalEnd },
    { name: "estado", title: "Estado", icon: BadgeCheck },
  ],
  initialValue: {
    titulo: "Ideas nuevas para celebrar",
    active: true,
    items: [],
  },
  fields: [
    defineField({ name: "titulo", title: "Título de la sección", type: "string", group: "contenido", initialValue: "Ideas nuevas para celebrar" }),
    defineField({ name: "subtitulo", title: "Descripción breve de la sección", type: "text", group: "contenido", rows: 2 }),
    defineField({
      name: "themeColor",
      title: "Color temático de la sección",
      type: "string",
      group: "contenido",
      initialValue: "#D2386C",
      description: "Usa un color HEX. Ej: #F97316 para naranja. El fondo y las cards tomarán una tonalidad de este color.",
      validation: (Rule) => Rule.custom((value) => isValidHexColor(value) || "Ingresa un color HEX válido. Ej: #F97316"),
    }),
    defineField({ name: "active", title: "Sección activa", type: "boolean", group: "estado", initialValue: true }),
    defineField({
      name: "items",
      title: "Cards destacadas",
      group: "cards",
      description: "Puedes reordenarlas arrastrando cada card dentro de este listado.",
      type: "array",
      of: [{
        type: "object",
        name: "featuredGalleryItem",
        fields: [
          defineField({ name: "titulo", title: "Título", type: "string", validation: (R) => R.required() }),
          defineField({ name: "descripcion", title: "Descripción breve", type: "text", rows: 3 }),
          defineField({
            name: "mediaType",
            title: "Tipo de media",
            type: "string",
            options: {
              layout: "radio",
              list: [
                { title: "Imagen", value: "image" },
                { title: "Video de YouTube", value: "youtube" },
              ],
            },
            initialValue: "image",
            validation: (R) => R.required(),
          }),
          defineField({
            name: "mediaOrientation",
            title: "Formato de visualización",
            type: "string",
            description: "Elige cómo se verá la card. Para videos normales de YouTube suele convenir Horizontal. Para historias, reels o fotos altas usa Vertical.",
            options: {
              layout: "radio",
              list: [
                { title: "Vertical / historia o reel", value: "vertical" },
                { title: "Horizontal / video amplio", value: "horizontal" },
              ],
            },
            initialValue: "horizontal",
          }),
          defineField({
            name: "imagen",
            title: "Imagen",
            type: "image",
            options: { hotspot: true },
            hidden: ({ parent }) => parent?.mediaType === "youtube",
            validation: (Rule) =>
              Rule.custom((value, context) => {
                const parent = context.parent as { mediaType?: string };
                if (parent?.mediaType === "image" && !value) return "Sube una imagen o cambia el tipo de media.";
                return true;
              }),
          }),
          defineField({
            name: "alt",
            title: "Texto alternativo",
            type: "string",
            description: "Describe la imagen para accesibilidad.",
            hidden: ({ parent }) => parent?.mediaType === "youtube",
          }),
          defineField({
            name: "focalPosition",
            title: "Posición focal opcional",
            type: "string",
            description: "Ej: 50% 35%, center, 70% 50%. Se usa para ajustar el encuadre visual.",
            hidden: ({ parent }) => parent?.mediaType === "youtube",
          }),
          defineField({
            name: "youtubeUrl",
            title: "Link de YouTube",
            type: "url",
            hidden: ({ parent }) => parent?.mediaType !== "youtube",
            validation: (Rule) =>
              Rule.custom((value, context) => {
                const parent = context.parent as { mediaType?: string };
                if (parent?.mediaType !== "youtube") return true;
                if (!value) return "Agrega un link de YouTube.";
                try {
                  const parsed = new URL(value);
                  const host = parsed.hostname.replace(/^www\./, "");
                  const isYouTube = ["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host);
                  return isYouTube || "Solo se aceptan links de YouTube.";
                } catch {
                  return "Ingresa un link válido de YouTube.";
                }
              }),
          }),
          defineField({
            name: "youtubeThumbnail",
            title: "Thumbnail opcional para YouTube",
            type: "image",
            options: { hotspot: true },
            hidden: ({ parent }) => parent?.mediaType !== "youtube",
          }),
          defineField({ name: "meta", title: "Etiqueta / meta opcional", type: "string", description: "Ej: Nuevo, Video, Campaña escolar" }),
          defineField({ name: "ctaText", title: "Texto del botón CTA", type: "string", initialValue: "Cotizar ahora" }),
          defineField({
            name: "ctaAction",
            title: "Acción del CTA",
            type: "string",
            options: {
              layout: "radio",
              list: [
                { title: "WhatsApp", value: "whatsapp" },
                { title: "URL personalizada", value: "customUrl" },
              ],
            },
            initialValue: "whatsapp",
          }),
          defineField({
            name: "ctaHref",
            title: "URL personalizada del CTA",
            type: "string",
            description: "Acepta rutas internas como /colecciones/dia-del-padre, enlaces con #seccion o URLs completas https://...",
            hidden: ({ parent }) => parent?.ctaAction !== "customUrl",
            validation: (Rule) =>
              Rule.custom((value, context) => {
                const parent = context.parent as { ctaAction?: string };
                if (parent?.ctaAction === "customUrl" && !value) return "Agrega la URL del CTA.";
                return isValidCtaHref(value) || "Ingresa una URL válida. Ej: /colecciones/dia-del-padre o https://comercial-victor.com/colecciones/dia-del-padre";
              }),
          }),
          defineField({
            name: "whatsappMessage",
            title: "Mensaje personalizado de WhatsApp",
            type: "text",
            rows: 2,
            hidden: ({ parent }) => parent?.ctaAction !== "whatsapp",
          }),
          defineField({
            name: "ctaIcon",
            title: "Icono del CTA",
            type: "string",
            description: "Elige un icono para mostrar al lado del texto del botón.",
            options: { list: CTA_ICON_OPTIONS.map(({ title, value }) => ({ title, value })) },
            components: { input: CtaIconInput },
          }),
          defineField({
            name: "ctaColor",
            title: "Color del CTA",
            type: "string",
            description: "Color HEX opcional. Ej: #38BDF8 para celeste. Si lo dejas vacío se usa un color automático según la acción.",
            validation: (Rule) => Rule.custom((value) => isValidHexColor(value) || "Ingresa un color HEX válido. Ej: #38BDF8"),
          }),
          defineField({
            name: "targetSection",
            title: "Sección destino legacy",
            type: "string",
            description: "Campo antiguo. Ya no se muestra en Studio, pero se conserva para no romper novedades existentes.",
            options: {
              list: [
                { title: "Novedades", value: "novedades" },
                { title: "Catálogo", value: "catalogo" },
                { title: "Horarios", value: "horarios" },
                { title: "Contacto / Ubicación", value: "contacto" },
              ],
            },
            hidden: true,
          }),
          defineField({ name: "active", title: "Card activa", type: "boolean", initialValue: true }),
          defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0 }),
        ],
        preview: {
          select: { title: "titulo", mediaType: "mediaType", active: "active", media: "imagen" },
          prepare: ({ title, mediaType, active, media }) => ({
            title: title || "Card destacada",
            subtitle: `${mediaType === "youtube" ? "Video" : "Imagen"} · ${active ? "Activo" : "Inactivo"}`,
            media,
          }),
        },
      }],
    }),
  ],
  preview: {
    select: { title: "titulo", active: "active" },
    prepare: ({ title, active }) => ({ title: title || "Novedades", subtitle: active ? "Activa" : "Inactiva" }),
  },
});

// ─── Colecciones ───────────────────────────────────────────────────
export const albumSchema = defineType({
  name: "album",
  title: "Colecciones",
  type: "document",
  groups: [
    { name: "contenido", title: "Contenido", icon: Type, default: true },
    { name: "productos", title: "Productos", icon: GalleryHorizontalEnd },
    { name: "estado", title: "Estado", icon: BadgeCheck },
  ],
  initialValue: {
    visible: true,
    orden: 0,
    items: [],
  },
  fields: [
    defineField({ name: "titulo", title: "Título de la colección", type: "string", group: "contenido", validation: (R) => R.required() }),
    defineField({ name: "subtitulo", title: "Descripción breve", type: "text", group: "contenido", rows: 2 }),
    defineField({ name: "etiqueta", title: "Etiqueta opcional", type: "string", group: "contenido", description: "Ej: Halloween, Navidad, Cumpleaños, Escolar" }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "contenido",
      description: "Se genera desde el título. Si editas desde la Vista interactiva y lo dejas vacío, se completará automáticamente al guardar.",
      options: {
        source: "titulo",
        maxLength: 96,
        slugify: (input) => slugifyForUrl(input).slice(0, 96),
      },
      validation: (Rule) =>
        Rule.custom((value) => {
          const current = value?.current;
          if (!current) return true;
          if (current.includes(".")) return "El slug no debe contener puntos.";
          if (!/^[a-z0-9-]+$/.test(current)) return "Usa solo minúsculas, números y guiones.";
          return true;
        }),
    }),
    defineField({ name: "portada", title: "Portada opcional", type: "image", group: "contenido", options: { hotspot: true } }),
    defineField({ name: "themeColor", title: "Color principal del degradado", type: "string", group: "contenido", initialValue: "#D2386C", description: "Usa un color HEX. Ej: #D2386C" }),
    defineField({ name: "visible", title: "Mostrar colección en el sitio", type: "boolean", group: "estado", initialValue: true }),
    defineField({ name: "orden", title: "Orden", type: "number", group: "estado", initialValue: 0 }),
    defineField({
      name: "items",
      title: "Productos de la colección",
      type: "array",
      group: "productos",
      description: "Cada producto puede ocultarse dentro de esta colección sin ocultarlo del catálogo general.",
      of: [{
        type: "object",
        name: "albumItem",
        fields: [
          defineField({ name: "producto", title: "Producto", type: "reference", to: [{ type: "producto" }], validation: (R) => R.required() }),
          defineField({ name: "titulo", title: "Título alternativo opcional", type: "string" }),
          defineField({ name: "descripcion", title: "Descripción corta opcional", type: "text", rows: 2 }),
          defineField({ name: "mostrarEnPortada", title: "Usar como portada", type: "boolean", description: "Marca hasta 3 productos para que aparezcan como mini portadas de esta colección.", initialValue: false }),
          defineField({ name: "visible", title: "Visible en este álbum", type: "boolean", initialValue: true }),
        ],
        preview: {
          select: { title: "titulo", productTitle: "producto.nombre", visible: "visible", media: "producto.imagenes.0" },
          prepare: ({ title, productTitle, visible, media }) => ({
            title: title || productTitle || "Producto de la colección",
            subtitle: visible === false ? "Oculto en esta colección" : "Visible en esta colección",
            media,
          }),
        },
      }],
    }),
  ],
  preview: {
    select: { title: "titulo", visible: "visible", media: "portada" },
    prepare: ({ title, visible, media }) => ({
      title: title || "Colección",
      subtitle: visible === false ? "Oculto" : "Visible",
      media,
    }),
  },
});

// ─── Hero ──────────────────────────────────────────────────────────
export const heroSchema = defineType({
  name: "hero",
  title: "Hero / Sección principal",
  type: "document",
  groups: [
    { name: "texto", title: "Texto", icon: Type, default: true },
    { name: "acciones", title: "Botones", icon: MousePointerClick },
    { name: "confianza", title: "Confianza", icon: Sparkles },
    { name: "visuales", title: "Visuales", icon: ImageIcon },
    { name: "estado", title: "Estado", icon: BadgeCheck },
  ],
  initialValue: {
    titulo: "Fiestas que se recuerdan, no que se improvisan.",
    subtitulo: "Globos con helio, piñatas artesanales, menaje temático y packs todo incluido. Coordinamos tu fiesta contigo por WhatsApp.",
    eyebrow: "Pedidos abiertos en Lima",
    ctaPrincipalTexto: "Cotizar por WhatsApp",
    ctaPrincipalMensaje: "Hola! Quisiera organizar una fiesta y necesito una cotización.",
    ctaSecundarioTexto: "Ver catálogo",
    trustItems: ["12+ años celebrando", "3.4k fiestas en Lima", "24h entrega exprés"],
    active: true,
    floatingCards: [
      { _type: "heroFloatingCard", _key: "hero-card-globos", label: "globos · helio", title: "Decoración lista", position: "leftTop", rotation: -6, order: 1, visible: true },
      { _type: "heroFloatingCard", _key: "hero-card-decoraciones", label: "decoraciones", title: "Temáticas", position: "rightTop", rotation: 5, order: 2, visible: true },
      { _type: "heroFloatingCard", _key: "hero-card-packs", label: "packs cumple", title: "Todo coordinado", position: "leftBottom", rotation: 3, order: 3, visible: true },
      { _type: "heroFloatingCard", _key: "hero-card-mesa", label: "descartables", title: "Mesa y menaje", position: "rightBottom", rotation: -4, order: 4, visible: true },
    ],
  },
  fields: [
    defineField({ name: "titulo", title: "Título principal", type: "string", group: "texto", validation: (R) => R.required() }),
    defineField({ name: "subtitulo", title: "Subtítulo", type: "text", group: "texto", rows: 3 }),
    defineField({ name: "eyebrow", title: "Eyebrow (texto pequeño arriba)", type: "string", group: "texto" }),
    defineField({ name: "ctaPrincipalTexto", title: "Botón principal: texto", type: "string", group: "acciones" }),
    defineField({ name: "ctaPrincipalMensaje", title: "Botón principal: mensaje WhatsApp", type: "text", group: "acciones", rows: 2 }),
    defineField({ name: "ctaSecundarioTexto", title: "Botón secundario: texto", type: "string", group: "acciones" }),
    defineField({
      name: "trustItems",
      title: "Indicadores de confianza (badges)",
      group: "confianza",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "floatingCards",
      title: "Cards del Hero",
      group: "visuales",
      description: "Se muestran como cards decorativas sin imagen en el Hero. Úsalas para resumir lo que ofrece la tienda.",
      type: "array",
      of: [{
        type: "object",
        name: "heroFloatingCard",
        fields: [
          defineField({ name: "label", title: "Mini título arriba", type: "string", description: "Texto pequeño superior de la card. Ej: globos, packs, escolar." }),
          defineField({ name: "title", title: "Título principal de la card", type: "string", description: "Texto fuerte de la card. Ej: Helio, Cumpleaños, Útiles." }),
          defineField({
            name: "visualFormat",
            title: "Tamaño de card",
            type: "string",
            options: {
              layout: "radio",
              list: [
                { title: "Vertical", value: "vertical" },
                { title: "Horizontal", value: "horizontal" },
              ],
            },
            initialValue: "vertical",
          }),
          defineField({
            name: "position",
            title: "Posición aproximada",
            type: "string",
            options: {
              list: [
                { title: "Izquierda arriba", value: "leftTop" },
                { title: "Derecha arriba", value: "rightTop" },
                { title: "Izquierda medio", value: "leftMid" },
                { title: "Derecha medio", value: "rightMid" },
                { title: "Izquierda abajo", value: "leftBottom" },
                { title: "Derecha abajo", value: "rightBottom" },
              ],
            },
            initialValue: "leftTop",
          }),
          defineField({ name: "rotation", title: "Rotación en grados", type: "number", initialValue: 0 }),
          defineField({ name: "order", title: "Orden", type: "number", initialValue: 0 }),
          defineField({ name: "visible", title: "Visible", type: "boolean", initialValue: true }),
        ],
        preview: {
          select: { title: "title", subtitle: "label", visible: "visible" },
          prepare: ({ title, subtitle, visible }) => ({
            title: title || subtitle || "Card flotante",
            subtitle: visible ? subtitle : "Oculta",
          }),
        },
      }],
    }),
    defineField({ name: "active", title: "Activo", type: "boolean", group: "estado", initialValue: true }),
  ],
  preview: {
    select: { title: "titulo", active: "active" },
    prepare: ({ title, active }) => ({ title, subtitle: active ? "Activo" : "Inactivo" }),
  },
});

// ─── Categoría ─────────────────────────────────────────────────────
export const categoriaSchema = defineType({
  name: "categoria",
  title: "Categorías",
  type: "document",
  fields: [
    defineField({ name: "idExcel", title: "ID Excel", type: "string", description: "Ej: C-01. No modificar." }),
    defineField({ name: "nombre", title: "Nombre", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "nombre", maxLength: 96 }, validation: (R) => R.required() }),
    defineField({ name: "color", title: "Color (hex)", type: "string", initialValue: "#D2386C" }),
    defineField({ name: "descripcion", title: "Descripción corta", type: "text", rows: 2 }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0 }),
    defineField({ name: "activo", title: "Activo", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "nombre", id: "idExcel" },
    prepare: ({ title, id }) => ({ title, subtitle: id || "" }),
  },
});

// ─── Subcategoría ──────────────────────────────────────────────────
export const subcategoriaSchema = defineType({
  name: "subcategoria",
  title: "Subcategorías",
  type: "document",
  fields: [
    defineField({ name: "idExcel", title: "ID Excel", type: "string" }),
    defineField({ name: "nombre", title: "Nombre", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "nombre", maxLength: 96 }, validation: (R) => R.required() }),
    defineField({ name: "categoria", title: "Categoría padre", type: "reference", to: [{ type: "categoria" }], validation: (R) => R.required() }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0 }),
    defineField({ name: "activo", title: "Activo", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "nombre", subtitle: "categoria.nombre", id: "idExcel" },
    prepare: ({ title, subtitle, id }) => ({ title, subtitle: `${id || ""} ↳ ${subtitle || ""}` }),
  },
});

// ─── Producto ──────────────────────────────────────────────────────
export const productoSchema = defineType({
  name: "producto",
  title: "Productos",
  type: "document",
  groups: [
    { name: "general", title: "General", default: true },
    { name: "presentaciones", title: "Presentaciones" },
    { name: "media", title: "Imágenes" },
    { name: "avanzado", title: "Avanzado" },
  ],
  fields: [
    // General
    defineField({ name: "idExcel", title: "ID Excel", type: "string", group: "general", readOnly: true }),
    defineField({ name: "nombre", title: "Nombre del producto", type: "string", group: "general", validation: (R) => R.required(), description: "Nombre específico y completo. Ej: Block Navarrete A4 cuadriculado x50" }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      group: "general",
      description: "Se genera como nombre-del-producto-pID. Ejemplo: globo-9-blanco-p0012.",
      options: {
        source: (doc: { nombre?: unknown; idExcel?: unknown; _id?: unknown }) => productSlugWithId(doc.nombre, doc.idExcel || doc._id),
        maxLength: PRODUCT_SLUG_MAX_LENGTH,
        slugify: (input) => slugifyForUrl(input).slice(0, PRODUCT_SLUG_MAX_LENGTH),
      },
      validation: (R) => R.required(),
    }),
    defineField({ name: "descripcion", title: "Descripción", type: "text", rows: 3, group: "general" }),
    defineField({ name: "subcategoria", title: "Subcategoría principal", type: "reference", to: [{ type: "subcategoria" }], group: "general", validation: (R) => R.required() }),
    defineField({ name: "categoriasExtra", title: "Subcategorías adicionales", type: "array", of: [{ type: "reference", to: [{ type: "subcategoria" }] }], group: "general" }),
    defineField({ name: "marca", title: "Marca", type: "string", group: "general", initialValue: "Genérico" }),
    defineField({
      name: "tags", title: "Tags", type: "array", of: [{ type: "string" }], group: "general",
      description: "Etiquetas libres. Escribe cualquier tag o usa los frecuentes: popular, nuevo, para-eventos, barra, metalizado, tecnopor, escolar, manualidades, descartable, tela, fiesta-infantil, color-blanco",
    }),
    defineField({ name: "medidas", title: "Medidas", type: "string", group: "general" }),
    defineField({ name: "observaciones", title: "Observaciones", type: "text", rows: 2, group: "general" }),
    defineField({ name: "visible", title: "¿Visible?", type: "boolean", initialValue: true, group: "general" }),
    defineField({
      name: "destacadoUbicaciones",
      title: "Mostrar en precatálogo",
      type: "array",
      group: "general",
      description: "Marca este producto para que aparezca en las dos filas móviles del bloque previo al catálogo.",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
        list: [
          { title: "Precatálogo", value: "preCatalog" },
        ],
      },
      validation: (R) => R.unique(),
    }),
    defineField({ name: "destacado", title: "Destacado antiguo", type: "boolean", group: "general", hidden: true, readOnly: true }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0, group: "general" }),

    // Stock at product level
    defineField({ name: "stock", title: "Stock actual", type: "number", group: "general", description: "Cantidad disponible del producto." }),
    defineField({ name: "manejaStock", title: "¿Maneja stock?", type: "boolean", initialValue: true, group: "avanzado" }),
    defineField({ name: "permiteVentaFraccionada", title: "¿Venta fraccionada?", type: "boolean", initialValue: false, group: "avanzado" }),
    defineField({ name: "unidadBase", title: "Unidad base", type: "string", group: "avanzado", initialValue: "unidad" }),
    defineField({ name: "whatsappMensaje", title: "Mensaje WhatsApp", type: "text", rows: 2, group: "avanzado" }),

    // Migration tracking
    defineField({ name: "migratedFromVariant", title: "Migrado desde variante", type: "string", group: "avanzado", readOnly: true, description: "ID interno si este producto fue creado por migración de variantes." }),

    // Media
    defineField({ name: "imagenes", title: "Imágenes", type: "array", of: [{ type: "image", options: { hotspot: true } }], group: "media" }),

    // Presentaciones
    defineField({
      name: "presentaciones", title: "Presentaciones", type: "array", group: "presentaciones",
      of: [{
        type: "object", name: "presentacion",
        fields: [
          defineField({ name: "idExcel", title: "ID", type: "string", readOnly: true }),
          defineField({ name: "nombre", title: "Nombre", type: "string", validation: (R) => R.required() }),
          defineField({ name: "factorConversion", title: "Factor conversión", type: "number", validation: (R) => R.required().min(0.01) }),
          defineField({ name: "precio", title: "Precio (S/)", type: "number" }),
          defineField({ name: "visibleEnWeb", title: "Visible en web (heredado)", type: "boolean", initialValue: true, hidden: true, description: "Campo heredado. La visibilidad web se controla desde el producto completo." }),
          defineField({ name: "esDefault", title: "Principal", type: "boolean", initialValue: false }),
        ],
        preview: {
          select: { nombre: "nombre", factor: "factorConversion", precio: "precio", def: "esDefault" },
          prepare: ({ nombre, factor, precio, def }) => ({
            title: `${nombre || ""}${def ? " - Principal" : ""}`,
            subtitle: `×${factor || "?"} · ${precio != null ? `S/ ${precio}` : "Consultar"}`,
          }),
        },
      }],
    }),
  ],
  preview: {
    select: { title: "nombre", marca: "marca", visible: "visible", id: "idExcel" },
    prepare: ({ title, marca, visible, id }) => ({
      title,
      subtitle: `${id || ""} · ${marca !== "Genérico" ? marca + " · " : ""}${visible ? "Visible" : "Oculto"}`,
    }),
  },
  orderings: [
    { title: "Nombre A-Z", name: "nombreAsc", by: [{ field: "nombre", direction: "asc" }] },
    { title: "ID Excel", name: "idExcel", by: [{ field: "idExcel", direction: "asc" }] },
  ],
});
