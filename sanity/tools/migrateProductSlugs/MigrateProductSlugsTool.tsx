import { useMemo, useState } from "react";
import { Card, Flex, Stack, Text, Button, Box, Badge, Code } from "@sanity/ui";
import { useClient } from "sanity";

type ProductSlugRow = {
  _id: string;
  nombre?: string;
  idExcel?: string;
  slug?: { current?: string };
};

type PreviewRow = ProductSlugRow & {
  currentSlug: string;
  nextSlug: string;
  changed: boolean;
};

const PRODUCT_SLUG_MAX_LENGTH = 96;

function slugifyForUrl(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function productIdSuffix(value?: unknown): string {
  const raw = String(value || "")
    .replace(/^drafts\./, "")
    .replace(/^prod[-_.]/i, "")
    .replace(/^producto[-_.]/i, "");

  const compact = slugifyForUrl(raw).replace(/-/g, "");
  if (!compact) return "";

  return /^[a-z]/.test(compact) ? compact : `p${compact}`;
}

function productSlugWithId(nombre?: unknown, id?: unknown): string {
  const base = slugifyForUrl(String(nombre || "producto")) || "producto";
  const suffix = productIdSuffix(id);

  if (!suffix) return base.slice(0, PRODUCT_SLUG_MAX_LENGTH);

  const safeBase = base
    .slice(0, Math.max(1, PRODUCT_SLUG_MAX_LENGTH - suffix.length - 1))
    .replace(/-+$/g, "");

  return `${safeBase}-${suffix}`;
}

export function MigrateProductSlugsTool() {
  const client = useClient({ apiVersion: "2026-04-24" });
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingRows = useMemo(() => rows.filter((row) => row.changed), [rows]);

  async function loadPreview() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const products = await client.fetch<ProductSlugRow[]>(
        `*[
          _type == "producto" &&
          defined(nombre) &&
          !(_id in path("drafts.**")) &&
          !(_id in path("versions.**")) &&
          !(_id in path("producto.migrated.**"))
        ] | order(nombre asc) {
          _id,
          nombre,
          idExcel,
          slug
        }`
      );

      const preview = products.map((product) => {
        const currentSlug = product.slug?.current || "";
        const nextSlug = productSlugWithId(product.nombre, product.idExcel || product._id);

        return {
          ...product,
          currentSlug,
          nextSlug,
          changed: currentSlug !== nextSlug,
        };
      });

      setRows(preview);
      setMessage(`Se revisaron ${preview.length} productos. ${preview.filter((row) => row.changed).length} necesitan actualizar slug.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo revisar los productos.");
    } finally {
      setLoading(false);
    }
  }

  async function migrateSlugs() {
    if (pendingRows.length === 0) return;

    const confirmed = window.confirm(
      `Se actualizarán los slugs de ${pendingRows.length} productos. Esto cambiará sus URLs públicas. ¿Deseas continuar?`
    );

    if (!confirmed) return;

    setMigrating(true);
    setMessage(null);
    setError(null);

    try {
      for (const row of pendingRows) {
        await client
          .patch(row._id)
          .set({ slug: { _type: "slug", current: row.nextSlug } })
          .commit();
      }

      setMessage(`Listo. Se actualizaron ${pendingRows.length} slugs de producto.`);
      await loadPreview();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo completar la migración.");
    } finally {
      setMigrating(false);
    }
  }

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Card padding={4} radius={3} shadow={1} tone="primary">
          <Stack space={3}>
            <Text size={3} weight="bold">Migrar slugs de productos</Text>
            <Text size={1} muted>
              Esta herramienta actualiza los productos existentes para que su URL use el formato nombre-del-producto-pID.
              No basta con cambiar el código: los documentos que ya existen en Sanity conservan su slug hasta que se reimportan o se migran.
            </Text>
          </Stack>
        </Card>

        <Flex gap={3} wrap="wrap">
          <Button
            text={loading ? "Revisando..." : "Revisar productos"}
            tone="primary"
            disabled={loading || migrating}
            onClick={loadPreview}
          />
          <Button
            text={migrating ? "Migrando..." : `Migrar ${pendingRows.length} slugs`}
            tone="positive"
            disabled={loading || migrating || pendingRows.length === 0}
            onClick={migrateSlugs}
          />
        </Flex>

        {message && (
          <Card padding={3} radius={2} tone="positive">
            <Text size={1}>{message}</Text>
          </Card>
        )}

        {error && (
          <Card padding={3} radius={2} tone="critical">
            <Text size={1}>{error}</Text>
          </Card>
        )}

        {rows.length > 0 && (
          <Stack space={3}>
            <Text size={2} weight="semibold">
              Cambios pendientes: {pendingRows.length} de {rows.length}
            </Text>

            <Stack space={2}>
              {rows.slice(0, 200).map((row) => (
                <Card key={row._id} padding={3} radius={2} shadow={1} tone={row.changed ? "caution" : "default"}>
                  <Stack space={2}>
                    <Flex align="center" justify="space-between" gap={3}>
                      <Text size={1} weight="semibold">{row.nombre || row._id}</Text>
                      <Badge tone={row.changed ? "caution" : "positive"}>{row.changed ? "Cambiar" : "OK"}</Badge>
                    </Flex>
                    <Text size={1} muted>ID: {row.idExcel || row._id}</Text>
                    <Text size={1}>Actual: <Code>{row.currentSlug || "sin-slug"}</Code></Text>
                    <Text size={1}>Nuevo: <Code>{row.nextSlug}</Code></Text>
                  </Stack>
                </Card>
              ))}
            </Stack>

            {rows.length > 200 && (
              <Text size={1} muted>Solo se muestran los primeros 200 productos en la vista previa.</Text>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
