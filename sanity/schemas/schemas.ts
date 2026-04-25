import { defineField, defineType } from "sanity";

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
      description: 'Ej: "12+ años celebrando", "3.4k fiestas en Lima"',
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
    defineField({ name: "nombre", title: "Nombre", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "nombre", maxLength: 96 }, validation: (R) => R.required() }),
    defineField({
      name: "color",
      title: "Color de la categoría",
      type: "string",
      description: "Color hex, ej: #FF6B7A",
      validation: (R) => R.required(),
      initialValue: "#D2386C",
    }),
    defineField({ name: "descripcion", title: "Descripción corta", type: "text", rows: 2 }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0 }),
    defineField({ name: "activo", title: "Activo", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "nombre", color: "color" },
    prepare: ({ title, color }) => ({ title, subtitle: color }),
  },
});

// ─── Subcategoría ──────────────────────────────────────────────────
export const subcategoriaSchema = defineType({
  name: "subcategoria",
  title: "Subcategorías",
  type: "document",
  fields: [
    defineField({ name: "nombre", title: "Nombre", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "nombre", maxLength: 96 }, validation: (R) => R.required() }),
    defineField({
      name: "categoria",
      title: "Categoría padre",
      type: "reference",
      to: [{ type: "categoria" }],
      validation: (R) => R.required(),
    }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0 }),
    defineField({ name: "activo", title: "Activo", type: "boolean", initialValue: true }),
  ],
  preview: {
    select: { title: "nombre", subtitle: "categoria.nombre" },
    prepare: ({ title, subtitle }) => ({ title, subtitle: `↳ ${subtitle || "Sin categoría"}` }),
  },
});

// ─── Producto ──────────────────────────────────────────────────────
export const productoSchema = defineType({
  name: "producto",
  title: "Productos",
  type: "document",
  fields: [
    defineField({ name: "nombre", title: "Nombre del producto", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug (URL)", type: "slug", options: { source: "nombre", maxLength: 96 }, validation: (R) => R.required() }),
    defineField({
      name: "tipo",
      title: "Tipo",
      type: "string",
      options: { list: [
        { title: "Simple", value: "simple" },
        { title: "Pack", value: "pack" },
        { title: "Alquiler", value: "alquiler" },
      ], layout: "radio" },
      initialValue: "simple",
      validation: (R) => R.required(),
    }),
    defineField({
      name: "subcategoria",
      title: "Subcategoría",
      type: "reference",
      to: [{ type: "subcategoria" }],
      validation: (R) => R.required(),
    }),
    defineField({ name: "descripcion", title: "Descripción", type: "text", rows: 4 }),
    defineField({
      name: "detalles",
      title: "Detalles del producto",
      type: "array",
      of: [{ type: "string" }],
      description: 'Ej: "Diámetro: 50 cm", "Incluye cordón reforzado"',
    }),
    defineField({
      name: "imagenes",
      title: "Imágenes",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "precio",
      title: "Precio (S/)",
      type: "number",
      description: "Dejar vacío si el precio es a consultar",
    }),
    defineField({ name: "precioDesde", title: "Mostrar 'Desde' antes del precio", type: "boolean", initialValue: false }),
    defineField({ name: "unidadVenta", title: "Unidad de venta", type: "string", description: 'Ej: "por unidad", "pack x 10", "alquiler 24h"' }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      options: { list: [
        { title: "⭐ Popular", value: "popular" },
        { title: "🆕 Nuevo", value: "nuevo" },
      ]},
    }),
    defineField({ name: "whatsappMensaje", title: "Mensaje de WhatsApp específico", type: "text", rows: 2 }),
    defineField({
      name: "stock",
      title: "Stock",
      type: "string",
      options: { list: [
        { title: "✅ Disponible", value: "disponible" },
        { title: "⚠️ Stock bajo", value: "bajo" },
        { title: "💬 Consultar", value: "consultar" },
      ]},
      initialValue: "disponible",
    }),
    defineField({ name: "destacado", title: "Destacado en Novedades", type: "boolean", initialValue: false }),
    defineField({ name: "activo", title: "Activo", type: "boolean", initialValue: true }),
    defineField({ name: "orden", title: "Orden", type: "number", initialValue: 0 }),
    // Pack fields
    defineField({
      name: "componentesPack",
      title: "Componentes del pack",
      type: "array",
      hidden: ({ document }) => document?.tipo !== "pack",
      of: [{
        type: "object",
        fields: [
          { name: "producto", title: "Producto", type: "reference", to: [{ type: "producto" }] },
          { name: "cantidad", title: "Cantidad", type: "number", initialValue: 1 },
        ],
        preview: {
          select: { title: "producto.nombre", cantidad: "cantidad" },
          prepare: ({ title, cantidad }) => ({ title, subtitle: `× ${cantidad}` }),
        },
      }],
    }),
    defineField({ name: "mostrarAhorroPack", title: "Mostrar ahorro del pack", type: "boolean", initialValue: false }),
  ],
  preview: {
    select: { title: "nombre", tipo: "tipo", activo: "activo", destacado: "destacado" },
    prepare: ({ title, tipo, activo, destacado }) => ({
      title,
      subtitle: `${tipo} ${destacado ? "⭐" : ""} ${activo ? "✅" : "❌"}`,
    }),
  },
});
