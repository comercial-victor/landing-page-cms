import { defineField, defineType } from "sanity";

export default defineType({
  name: "siteSettings",
  title: "Configuración del Sitio",
  type: "document",
  fields: [
    defineField({ name: "nombre", title: "Nombre del negocio", type: "string", validation: (R) => R.required() }),
    defineField({ name: "tagline", title: "Tagline / eslogan", type: "string" }),
    defineField({ name: "logo", title: "Logo", type: "image", options: { hotspot: true } }),
    defineField({ name: "whatsapp", title: "WhatsApp (con código de país)", type: "string", description: "Ej: 51987654321", validation: (R) => R.required() }),
    defineField({ name: "whatsappDisplay", title: "WhatsApp visible al público", type: "string", description: "Ej: +51 987 654 321" }),
    defineField({ name: "telefono", title: "Teléfono (opcional)", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "direccion", title: "Dirección", type: "string" }),
    defineField({ name: "googleMapsUrl", title: "Google Maps URL", type: "url" }),
    defineField({ name: "googleMapsEmbedUrl", title: "Google Maps Embed URL (iframe)", type: "url" }),
    defineField({ name: "instagramUrl", title: "Instagram URL", type: "url" }),
    defineField({ name: "facebookUrl", title: "Facebook URL", type: "url" }),
    defineField({ name: "tiktokUrl", title: "TikTok URL", type: "url" }),
    defineField({
      name: "horarios",
      title: "Horarios de atención",
      type: "array",
      of: [{
        type: "object",
        fields: [
          { name: "dia", title: "Día", type: "string" },
          { name: "hora", title: "Hora", type: "string", description: 'Ej: "9:00 a.m. – 8:00 p.m."' },
          { name: "cerrado", title: "Cerrado este día", type: "boolean", initialValue: false },
        ],
        preview: { select: { title: "dia", subtitle: "hora" } },
      }],
    }),
    defineField({ name: "seoTitle", title: "SEO: Título", type: "string" }),
    defineField({ name: "seoDescription", title: "SEO: Descripción", type: "text", rows: 3 }),
    defineField({ name: "seoImage", title: "SEO: Imagen social", type: "image" }),
  ],
  preview: {
    select: { title: "nombre" },
    prepare: ({ title }) => ({ title: title || "Configuración" }),
  },
});
