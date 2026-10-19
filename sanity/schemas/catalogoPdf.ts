import { defineField, defineType } from "sanity";
import { catalogSlug, validCatalogSlug, validatePdfMetadata, type PdfAsset } from "../../src/lib/catalogosPdf";

export default defineType({
  name: "catalogoPdf", title: "Catálogos PDF", type: "document",
  initialValue: { visible: false, orden: 0 },
  fields: [
    defineField({ name: "titulo", title: "Título", type: "string", validation: R => R.required().max(180) }),
    defineField({ name: "slug", title: "Enlace del catálogo", type: "slug",
      description: "Se puede personalizar antes de publicar. Después se bloquea para conservar el enlace compartido.",
      readOnly: ({ document }) => Boolean(document?.publicadoSlug),
      options: { source: "titulo", maxLength: 96, slugify: catalogSlug,
        isUnique: async (slug, context) => {
          const id = context.document?._id.replace(/^drafts\./, "");
          return context.getClient({ apiVersion: "2026-04-24" }).withConfig({ perspective: "raw" }).fetch<boolean>(`count(*[_type == "catalogoPdf" && slug.current == $slug && !(_id in [$id,$draft]) && !(_id in path("versions.**"))]) == 0`, { slug, id, draft: `drafts.${id}` });
        } },
      validation: R => R.required().custom((value, context) => {
        if (!validCatalogSlug(value?.current || "")) return "Usa minúsculas, números y guiones, sin espacios ni rutas reservadas (máximo 96 caracteres).";
        return !context.document?.publicadoSlug || context.document.publicadoSlug === value?.current || "El enlace publicado no puede cambiar.";
      }) }),
    defineField({ name: "descripcion", title: "Descripción", type: "text", rows: 3 }),
    defineField({ name: "archivo", title: "Archivo PDF", type: "file", options: { accept: "application/pdf" }, validation: R => R.custom(async (value, context) => {
      if (!value?.asset?._ref) return context.document?.visible ? "Sube un PDF antes de publicar." : true;
      const asset = await context.getClient({ apiVersion: "2026-04-24" }).getDocument<PdfAsset>(value.asset._ref);
      try { validatePdfMetadata(asset); return true; } catch (error) { return (error as Error).message; }
    }) }),
    defineField({ name: "portada", title: "Portada opcional", type: "image", options: { hotspot: true } }),
    defineField({ name: "visible", title: "Publicado en la web", type: "boolean", initialValue: false, description: "Ocultar quita la página pública; el enlace directo del archivo en el CDN puede seguir accesible." }),
    defineField({ name: "orden", title: "Orden de aparición", type: "number", initialValue: 0, validation: R => R.required().integer().min(0) }),
    defineField({ name: "etiqueta", title: "Temporada / etiqueta", type: "string" }),
    defineField({ name: "fechaCaducidad", title: "Fecha y hora de caducidad", type: "datetime" }),
    defineField({ name: "coleccionRelacionada", title: "Colección relacionada", type: "reference", to: [{ type: "album" }] }),
    defineField({ name: "publicadoSlug", title: "Enlace de primera publicación", type: "string", hidden: true, readOnly: true }),
  ],
  preview: { select: { title: "titulo", media: "portada", visible: "visible" }, prepare: ({title,media,visible}) => ({title,media,subtitle:visible ? "Publicado" : "Oculto / borrador"}) },
});
