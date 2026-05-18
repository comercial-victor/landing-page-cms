import { defineField, defineType } from "sanity";

// ─── Galería destacada ─────────────────────────────────────────────
export const featuredGallerySchema = defineType({
  name: "featuredGallery",
  title: "Galería destacada",
  type: "document",
  fields: [
    defineField({ name: "titulo", title: "Título de la sección", type: "string", initialValue: "Ideas listas para celebrar" }),
    defineField({ name: "subtitulo", title: "Descripción breve de la sección", type: "text", rows: 2 }),
    defineField({ name: "active", title: "Sección activa", type: "boolean", initialValue: true }),
    defineField({
      name: "items",
      title: "Cards destacadas",
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
          defineField({ name: "ctaHref", title: "URL opcional del CTA", type: "url", description: "Si se completa, el botón abre este enlace." }),
          defineField({
            name: "ctaAction",
            title: "Acción del CTA",
            type: "string",
            options: {
              layout: "radio",
              list: [
                { title: "WhatsApp", value: "whatsapp" },
                { title: "Scroll interno", value: "scroll" },
              ],
            },
            initialValue: "whatsapp",
          }),
          defineField({
            name: "whatsappMessage",
            title: "Mensaje personalizado de WhatsApp",
            type: "text",
            rows: 2,
            hidden: ({ parent }) => parent?.ctaAction === "scroll",
          }),
          defineField({
            name: "targetSection",
            title: "Sección destino",
            type: "string",
            options: {
              list: [
                { title: "Novedades", value: "novedades" },
                { title: "Catálogo", value: "catalogo" },
                { title: "Horarios", value: "horarios" },
                { title: "Contacto / Ubicación", value: "contacto" },
              ],
            },
            hidden: ({ parent }) => parent?.ctaAction !== "scroll",
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
    prepare: ({ title, active }) => ({ title: title || "Galería destacada", subtitle: active ? "Activa" : "Inactiva" }),
  },
});

// ─── Hero ──────────────────────────────────────────────────────────
export const heroSchema = defineType({
  name: "hero",
  title: "Hero / Sección principal",
  type: "document",
  fields: [
    defineField({ name: "titulo", title: "Título principal", type: "string", validation: (R) => R.required() }),
    defineField({ name: "subtitulo", title: "Subtítulo", type: "text", rows: 3 }),
    defineField({ name: "eyebrow", title: "Eyebrow (texto pequeño arriba)", type: "string" }),
    defineField({ name: "ctaPrincipalTexto", title: "Botón principal: texto", type: "string" }),
    defineField({ name: "ctaPrincipalMensaje", title: "Botón principal: mensaje WhatsApp", type: "text", rows: 2 }),
    defineField({ name: "ctaSecundarioTexto", title: "Botón secundario: texto", type: "string" }),
    defineField({
      name: "trustItems",
      title: "Indicadores de confianza (badges)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "floatingCards",
      title: "Cards / imágenes flotantes",
      description: "Aparecen desde el centro y se acomodan alrededor del Hero. En mobile se muestran menos para mantener rendimiento.",
      type: "array",
      of: [{
        type: "object",
        name: "heroFloatingCard",
        fields: [
          defineField({ name: "label", title: "Etiqueta opcional", type: "string" }),
          defineField({ name: "title", title: "Título corto opcional", type: "string" }),
          defineField({ name: "image", title: "Imagen", type: "image", options: { hotspot: true } }),
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
          select: { title: "title", subtitle: "label", media: "image", visible: "visible" },
          prepare: ({ title, subtitle, media, visible }) => ({
            title: title || subtitle || "Card flotante",
            subtitle: visible ? subtitle : "Oculta",
            media,
          }),
        },
      }],
    }),
    defineField({ name: "active", title: "Activo", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "titulo", active: "active" },
    prepare: ({ title, active }) => ({ title, subtitle: active ? "✅ Activo" : "❌ Inactivo" }),
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
    { name: "general", title: "📋 General", default: true },
    { name: "variantes", title: "🎨 Variantes" },
    { name: "presentaciones", title: "📦 Presentaciones" },
    { name: "media", title: "🖼️ Imágenes" },
    { name: "avanzado", title: "⚙️ Avanzado" },
  ],
  fields: [
    // General
    defineField({ name: "idExcel", title: "ID Excel", type: "string", group: "general", readOnly: true }),
    defineField({ name: "nombre", title: "Nombre del producto", type: "string", group: "general", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug (URL)", type: "slug", group: "general", options: { source: "nombre", maxLength: 96 }, validation: (R) => R.required() }),
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
    defineField({ name: "destacado", title: "⭐ Destacado", type: "boolean", initialValue: false, group: "general" }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0, group: "general" }),

    // Stock
    defineField({ name: "manejaStock", title: "¿Maneja stock?", type: "boolean", initialValue: true, group: "avanzado" }),
    defineField({ name: "permiteVentaFraccionada", title: "¿Venta fraccionada?", type: "boolean", initialValue: false, group: "avanzado" }),
    defineField({ name: "unidadBase", title: "Unidad base", type: "string", group: "avanzado", initialValue: "unidad" }),
    defineField({ name: "whatsappMensaje", title: "Mensaje WhatsApp", type: "text", rows: 2, group: "avanzado" }),

    // Media
    defineField({ name: "imagenes", title: "Imágenes", type: "array", of: [{ type: "image", options: { hotspot: true } }], group: "media" }),

    // Variantes
    defineField({
      name: "variantes", title: "Variantes", type: "array", group: "variantes",
      of: [{
        type: "object", name: "variante",
        fields: [
          defineField({ name: "idExcel", title: "ID", type: "string", readOnly: true }),
          defineField({ name: "nombre", title: "Nombre", type: "string" }),
          defineField({ name: "color", title: "Color", type: "string" }),
          defineField({ name: "tamano", title: "Tamaño/Medida", type: "string" }),
          defineField({ name: "otrosAtributos", title: "Otros", type: "string" }),
          defineField({ name: "stock", title: "Stock", type: "number" }),
          defineField({ name: "imagen", title: "Imagen", type: "image", options: { hotspot: true } }),
          defineField({ name: "visible", title: "Visible", type: "boolean", initialValue: true }),
        ],
        preview: {
          select: { nombre: "nombre", color: "color", tamano: "tamano", stock: "stock", visible: "visible" },
          prepare: ({ nombre, color, tamano, stock, visible }) => ({
            title: nombre || color || tamano || "Variante",
            subtitle: `${stock != null ? `Stock: ${stock}` : ""} ${visible ? "✅" : "❌"}`,
          }),
        },
      }],
    }),

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
          defineField({ name: "visibleEnWeb", title: "Visible", type: "boolean", initialValue: true }),
          defineField({ name: "esDefault", title: "Principal", type: "boolean", initialValue: false }),
        ],
        preview: {
          select: { nombre: "nombre", factor: "factorConversion", precio: "precio", def: "esDefault" },
          prepare: ({ nombre, factor, precio, def }) => ({
            title: `${nombre || ""}${def ? " ★" : ""}`,
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
      subtitle: `${id || ""} · ${marca !== "Genérico" ? marca + " · " : ""}${visible ? "✅" : "❌"}`,
    }),
  },
  orderings: [
    { title: "Nombre A-Z", name: "nombreAsc", by: [{ field: "nombre", direction: "asc" }] },
    { title: "ID Excel", name: "idExcel", by: [{ field: "idExcel", direction: "asc" }] },
  ],
});
