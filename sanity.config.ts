import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import {
  Download,
  Eye,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Link2,
  Megaphone,
  Wrench,
  Settings,
  Upload,
} from "lucide-react";
import { schemaTypes } from "./sanity/schemas";
import { ImportCatalogTool } from "./sanity/tools/importCatalog/ImportCatalogTool";
import { ExportCatalogTool } from "./sanity/tools/exportCatalog/ExportCatalogTool";
import { InteractiveViewTool } from "./sanity/tools/interactiveView/InteractiveViewTool";
import { MigrateProductSlugsTool } from "./sanity/tools/migrateProductSlugs";
import { VisionShortcutTool } from "./sanity/tools/visionShortcut";
import { RepairPrivateProductIdsTool } from "./sanity/tools/repairPrivateProductIds";

export default defineConfig({
  name: "comercial-victor",
  title: "Comercial Victor — CMS",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  basePath: "/studio",
  plugins: [
    visionTool({
      defaultApiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-04-24",
    }),
    structureTool({
      title: "Panel",
      icon: LayoutDashboard,
      structure: (S) =>
        S.list()
          .title("Panel de gestión")
          .items([
            S.listItem()
              .title("Vista interactiva")
              .id("interactive-view")
              .icon(Eye)
              .child(S.component(InteractiveViewTool).id("interactive-view").title("Vista interactiva")),
            S.listItem()
              .title("Importar catálogo")
              .id("import-catalog")
              .icon(Upload)
              .child(S.component(ImportCatalogTool).id("import-catalog").title("Importar catálogo")),
            S.listItem()
              .title("Exportar catálogo")
              .id("export-catalog")
              .icon(Download)
              .child(S.component(ExportCatalogTool).id("export-catalog").title("Exportar catálogo")),
            S.listItem()
              .title("Migrar slugs de productos")
              .id("migrate-product-slugs")
              .icon(Link2)
              .child(S.component(MigrateProductSlugsTool).id("migrate-product-slugs").title("Migrar slugs de productos")),
            S.listItem()
              .title("Reparar IDs privados")
              .id("repair-private-product-ids")
              .icon(Wrench)
              .child(S.component(RepairPrivateProductIdsTool).id("repair-private-product-ids").title("Reparar IDs privados de productos")),
            S.listItem()
              .title("Vision / GROQ")
              .id("vision-shortcut")
              .icon(Link2)
              .child(S.component(VisionShortcutTool).id("vision-shortcut").title("Vision / GROQ")),
            S.divider(),
            S.listItem()
              .title("Configuración del Sitio")
              .id("siteSettings")
              .icon(Settings)
              .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
            S.listItem()
              .title("Hero / Sección Principal")
              .id("hero")
              .icon(Megaphone)
              .child(S.document().schemaType("hero").documentId("hero")),
            S.listItem()
              .title("Galería destacada")
              .id("featuredGallery")
              .icon(GalleryHorizontalEnd)
              .child(S.document().schemaType("featuredGallery").documentId("featuredGallery")),
            S.listItem()
              .title("Colecciones")
              .id("colecciones")
              .icon(GalleryHorizontalEnd)
              .child(S.documentTypeList("album").title("Colecciones")),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
