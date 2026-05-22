import { defineField, defineType } from "sanity";
import { Building2, Clock3, MapPin, Search, Share2 } from "lucide-react";

export default defineType({
  name: "siteSettings",
  title: "Configuración del Sitio",
  type: "document",
  groups: [
    { name: "identidad", title: "Identidad", icon: Building2, default: true },
    { name: "contacto", title: "Contacto y ubicación", icon: MapPin },
    { name: "redes", title: "Redes", icon: Share2 },
    { name: "horarios", title: "Horarios", icon: Clock3 },
    { name: "seo", title: "SEO", icon: Search },
  ],
  fields: [
    defineField({ name: "nombre", title: "Nombre del negocio", type: "string", group: "identidad", validation: (R) => R.required() }),
    defineField({ name: "tagline", title: "Tagline / eslogan", type: "string", group: "identidad" }),
    defineField({ name: "logo", title: "Logo", type: "image", group: "identidad", options: { hotspot: true } }),
    defineField({ name: "whatsapp", title: "WhatsApp (con código de país)", type: "string", group: "contacto", description: "Ej: 51987654321", validation: (R) => R.required() }),
    defineField({ name: "whatsappDisplay", title: "WhatsApp visible al público", type: "string", group: "contacto", description: "Ej: +51 987 654 321" }),
    defineField({ name: "telefono", title: "Teléfono (opcional)", type: "string", group: "contacto" }),
    defineField({ name: "email", title: "Email", type: "string", group: "contacto" }),
    defineField({ name: "direccion", title: "Dirección", type: "string", group: "contacto" }),
    defineField({ name: "googleMapsUrl", title: "Google Maps URL", type: "url", group: "contacto" }),
    defineField({ name: "googleMapsEmbedUrl", title: "Google Maps Embed URL (iframe)", type: "url", group: "contacto" }),
    defineField({ name: "instagramUrl", title: "Instagram URL", type: "url", group: "redes" }),
    defineField({ name: "facebookUrl", title: "Facebook URL", type: "url", group: "redes" }),
    defineField({ name: "tiktokUrl", title: "TikTok URL", type: "url", group: "redes" }),
    defineField({
      name: "socialLinks",
      title: "Redes sociales y contacto",
      group: "redes",
      description: "Fuente central de redes. Todas las redes activas salen en el footer. Aquí decides cuáles aparecen en la navbar y en el botón flotante.",
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
          defineField({ name: "showFloating", title: "Mostrar en botón flotante", type: "boolean", initialValue: false, description: "Aparece en la esquina inferior derecha. Si marcas varias, se abrirá un selector." }),
          defineField({ name: "showInNavbar", title: "Mostrar en navbar", type: "boolean", initialValue: false, description: "Aparece arriba junto al buscador. Si hay varias, se muestran compactas." }),
          defineField({ name: "color", title: "Color personalizado opcional", type: "string", description: "Ej: #25D366. Si lo dejas vacío se usa el color oficial aproximado de la red." }),
          defineField({ name: "isPrimaryCta", title: "Usar como contacto principal / CTA", type: "boolean", initialValue: false, description: "Se usa para botones principales cuando no hay una red específica configurada. Solo una red puede ser CTA principal." }),
        ],
        preview: {
          select: { platform: "platform", label: "label", active: "active", primary: "isPrimaryCta", floating: "showFloating", navbar: "showInNavbar" },
          prepare: ({ platform, label, active, primary, floating, navbar }) => ({
            title: label || platform || "Red social",
            subtitle: `${primary ? "⭐ CTA principal · " : ""}${floating ? "Flotante · " : ""}${navbar ? "Navbar · " : ""}${active ? "Activa" : "Inactiva"}`,
          }),
        },
      }],
      validation: (Rule) =>
        Rule.custom((links) => {
          if (!Array.isArray(links)) return true;
          const primaryCount = links.filter(
            (link) => (link as { isPrimaryCta?: boolean })?.isPrimaryCta === true
          ).length;
          if (primaryCount > 1) {
            return `Solo una red social puede ser CTA principal. Actualmente hay ${primaryCount} marcadas.`;
          }
          return true;
        }),
    }),
    defineField({
      name: "horarios",
      title: "Horarios de atención",
      group: "horarios",
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
    defineField({
      name: "storeStatus",
      title: "Aviso especial de atención",
      group: "horarios",
      description: "Úsalo cuando hoy abrirán más tarde, están atendiendo diferente o quieres mostrar un aviso temporal.",
      type: "object",
      fields: [
        defineField({ name: "enabled", title: "Activar aviso especial", type: "boolean", initialValue: false }),
        defineField({
          name: "mode",
          title: "Estado para mostrar",
          type: "string",
          hidden: ({ parent }) => !parent?.enabled,
          options: {
            layout: "radio",
            list: [
              { title: "Abriremos más tarde", value: "opens_later" },
              { title: "Estamos atendiendo", value: "open_now" },
              { title: "Hoy atendemos diferente", value: "custom" },
              { title: "No atenderemos hoy", value: "closed_today" },
            ],
          },
          initialValue: "opens_later",
        }),
        defineField({
          name: "openingTime",
          title: "Hora estimada de apertura",
          type: "string",
          description: "Ej: 10:30 a.m. o 14:00. Puedes cambiarla si se atrasan.",
          hidden: ({ parent }) => !parent?.enabled || parent?.mode !== "opens_later",
        }),
        defineField({
          name: "message",
          title: "Mensaje visible opcional",
          type: "string",
          description: "Ej: Abriremos pronto, estamos preparando la tienda.",
          hidden: ({ parent }) => !parent?.enabled,
        }),
        defineField({
          name: "validUntil",
          title: "Mostrar hasta",
          type: "datetime",
          description: "Opcional. Si lo dejas vacío, el aviso seguirá visible hasta que lo desactives.",
          hidden: ({ parent }) => !parent?.enabled,
        }),
      ],
      preview: {
        select: { enabled: "enabled", mode: "mode", openingTime: "openingTime" },
        prepare: ({ enabled, mode, openingTime }) => ({
          title: enabled ? "Aviso especial activo" : "Sin aviso especial",
          subtitle: enabled ? `${mode || "custom"}${openingTime ? ` · ${openingTime}` : ""}` : "Se usa el horario normal",
        }),
      },
    }),
    defineField({ name: "seoTitle", title: "SEO: Título", type: "string", group: "seo" }),
    defineField({ name: "seoDescription", title: "SEO: Descripción", type: "text", rows: 3, group: "seo" }),
    defineField({ name: "seoImage", title: "SEO: Imagen social", type: "image", group: "seo" }),
  ],
  preview: {
    select: { title: "nombre" },
    prepare: ({ title }) => ({ title: title || "Configuración" }),
  },
});
