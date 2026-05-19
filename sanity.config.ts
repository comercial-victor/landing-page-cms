import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemas";
import { importCatalogPlugin } from "./sanity/tools/importCatalog";
import { interactiveViewPlugin } from "./sanity/tools/interactiveView";

export default defineConfig({
  name: "comercial-victor",
  title: "Comercial Victor — CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  basePath: "/studio",
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title("Contenido")
          .items([
            S.listItem()
              .title("⚙️ Configuración del Sitio")
              .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
            S.listItem()
              .title("🎉 Hero / Sección Principal")
              .id("hero")
              .child(S.document().schemaType("hero").documentId("hero")),
            S.listItem()
              .title("✨ Galería destacada")
              .id("featuredGallery")
              .child(S.document().schemaType("featuredGallery").documentId("featuredGallery")),
            S.divider(),
            S.listItem()
              .title("📂 Categorías")
              .child(S.documentTypeList("categoria")),
            S.listItem()
              .title("📁 Subcategorías")
              .child(S.documentTypeList("subcategoria")),
            S.listItem()
              .title("📦 Productos")
              .child(S.documentTypeList("producto")),
          ]),
    }),
    visionTool(),
    importCatalogPlugin(),
    interactiveViewPlugin(),
  ],
  schema: { types: schemaTypes },
});
