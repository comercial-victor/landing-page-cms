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
      name: "socialLinks",
      title: "Redes sociales y contacto",
      description: "Fuente central para footer, CTA principal y botón flotante. Los campos antiguos de WhatsApp/redes quedan como respaldo.",
      type: "array",
      of: [{
        type: "object",
        name: "socialLink",
        fields: [
          defineField({
            name: "platform",
            title: "Plataforma",
            type: "string",
            options: {
              list: [
                { title: "WhatsApp", value: "whatsapp" },
                { title: "Instagram", value: "instagram" },
                { title: "Facebook", value: "facebook" },
                { title: "Messenger", value: "messenger" },
                { title: "TikTok", value: "tiktok" },
                { title: "Otra", value: "other" },
              ],
            },
            initialValue: "whatsapp",
            validation: (R) => R.required(),
          }),
          defineField({ name: "label", title: "Etiqueta visible opcional", type: "string", description: "Ej: WhatsApp Ventas, Instagram, Messenger" }),
          defineField({ name: "phone", title: "Teléfono", type: "string", description: "Para WhatsApp. Ej: 51987654321", hidden: ({ parent }) => parent?.platform !== "whatsapp" }),
          defineField({ name: "url", title: "URL", type: "url", description: "Para Instagram, Facebook, Messenger, TikTok u otras redes." }),
          defineField({ name: "active", title: "Activa", type: "boolean", initialValue: true }),
          defineField({ name: "showInFooter", title: "Mostrar en footer", type: "boolean", initialValue: true }),
          defineField({ name: "isPrimaryCta", title: "Usar como contacto principal / CTA", type: "boolean", initialValue: false }),
        ],
        preview: {
          select: { platform: "platform", label: "label", active: "active", primary: "isPrimaryCta" },
          prepare: ({ platform, label, active, primary }) => ({
            title: label || platform || "Red social",
            subtitle: `${primary ? "CTA principal · " : ""}${active ? "Activa" : "Inactiva"}`,
          }),
        },
      }],
    }),
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
