import siteSettings from "./siteSettings";
import catalogoPdf from "./catalogoPdf";
import { defineType, defineField } from "sanity";
import { albumSchema, featuredGallerySchema, heroSchema, categoriaSchema, subcategoriaSchema, productoSchema } from "./schemas";

export const schemaTypes = [
  siteSettings,
  catalogoPdf,
  defineType({ name: "catalogoPdfSlug", title: "Reserva de enlace PDF", type: "document", fields: [defineField({name:"catalogId",title:"Catálogo",type:"string",readOnly:true})] }),
  albumSchema,
  featuredGallerySchema,
  heroSchema,
  categoriaSchema,
  subcategoriaSchema,
  productoSchema,
];
