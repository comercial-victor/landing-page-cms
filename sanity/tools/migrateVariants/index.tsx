import { definePlugin } from "sanity";
import { MigrateVariantsTool } from "./MigrateVariantsTool";

export const migrateVariantsPlugin = definePlugin({
  name: "migrate-variants",
  tools: [
    {
      name: "migrate-variants",
      title: "Migrar variantes",
      icon: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" />
        </svg>
      ),
      component: MigrateVariantsTool,
    },
  ],
});
