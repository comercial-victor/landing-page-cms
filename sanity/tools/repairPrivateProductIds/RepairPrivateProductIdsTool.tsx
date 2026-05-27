import { useCallback, useMemo, useState } from "react";
import { useClient } from "sanity";

type SanityRef = { _type?: string; _ref?: string };
type AlbumItem = Record<string, unknown> & { producto?: SanityRef };
type AlbumDoc = { _id: string; items?: AlbumItem[] };

type PrivateProduct = Record<string, unknown> & {
  _id: string;
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  _type: "producto";
  idExcel?: string | null;
  nombre?: string;
  visible?: boolean;
  slug?: { current?: string };
  migratedFromVariant?: string;
  subcategoria?: { nombre?: string; categoria?: { nombre?: string } };
};

type ExistingPublicProduct = {
  _id: string;
  idExcel?: string | null;
  nombre?: string;
  migratedFromVariant?: string;
};

type RepairRow = {
  oldId: string;
  newId: string;
  idExcel: string;
  nombre: string;
  currentSlug: string;
  newSlug: string;
  migratedFromVariant: string;
  category?: string;
  subcategory?: string;
  alreadyHasPublicCopy: boolean;
};

type RepairLog = {
  type: "info" | "ok" | "warn" | "error";
  message: string;
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

function productIdSuffix(value?: string): string {
  const compact = slugifyForUrl(value || "")
    .replace(/^drafts-/, "")
    .replace(/^prod-?/, "")
    .replace(/^producto-?/, "")
    .replace(/-/g, "");
  if (!compact) return "";
  return /^[a-z]/.test(compact) ? compact : `p${compact}`;
}

function productSlugWithId(nombre: string, id?: string): string {
  const base = slugifyForUrl(nombre || "producto") || "producto";
  const suffix = productIdSuffix(id);
  if (!suffix) return base.slice(0, PRODUCT_SLUG_MAX_LENGTH);
  const safeBase = base
    .slice(0, Math.max(1, PRODUCT_SLUG_MAX_LENGTH - suffix.length - 1))
    .replace(/-+$/g, "");
  return `${safeBase}-${suffix}`;
}

function cleanIdPart(value?: string): string {
  return String(value || "")
    .replace(/^drafts\./, "")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveFromPrivateId(oldId: string) {
  const body = oldId.replace(/^drafts\./, "").replace(/^producto\.migrated\./, "");
  const [parentRaw = "producto", variantRaw = "variante"] = body.split(".");
  const parentId = cleanIdPart(parentRaw);
  const variantKey = cleanIdPart(variantRaw);
  const parentCode = parentId.replace(/^prod-?/i, "").replace(/-/g, "");
  const variantCode = variantKey.replace(/-/g, "");
  const idExcel = `M-${parentCode}-${variantCode}`.toUpperCase();
  const newId = `prod-${idExcel}`;
  const migratedFromVariant = `${parentRaw}::${variantRaw}`;
  return { idExcel, newId, migratedFromVariant };
}

function buildRepairRow(product: PrivateProduct, publicByMigrationKey: Map<string, ExistingPublicProduct>): RepairRow {
  const derived = deriveFromPrivateId(product._id);
  const migrationKey = product.migratedFromVariant || derived.migratedFromVariant;
  const existingPublic = publicByMigrationKey.get(migrationKey);
  const idExcel = String(existingPublic?.idExcel || product.idExcel || derived.idExcel);
  const newId = existingPublic?._id || `prod-${cleanIdPart(idExcel)}`;
  const nombre = product.nombre || "Producto migrado";

  return {
    oldId: product._id,
    newId,
    idExcel,
    nombre,
    currentSlug: product.slug?.current || "",
    newSlug: productSlugWithId(nombre, idExcel),
    migratedFromVariant: migrationKey,
    category: product.subcategoria?.categoria?.nombre,
    subcategory: product.subcategoria?.nombre,
    alreadyHasPublicCopy: !!existingPublic,
  };
}

async function withTimeout<T>(promise: Promise<T>, label: string, ms = 30000): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} tardó más de ${Math.round(ms / 1000)} segundos.`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

const C = {
  bg: "#0f1020",
  panel: "#17182a",
  panel2: "#202236",
  border: "#33364f",
  text: "#f7f7fb",
  muted: "#b9bad1",
  pink: "#D2386C",
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  blue: "#60a5fa",
};

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1050, margin: "0 auto", padding: 24, color: C.text, fontFamily: "inherit" },
  hero: { background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 18 },
  title: { fontSize: 25, fontWeight: 800, margin: "0 0 8px" },
  p: { color: C.muted, lineHeight: 1.55, margin: "0 0 12px" },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 },
  btn: { border: "none", borderRadius: 8, padding: "10px 14px", fontWeight: 800, cursor: "pointer", color: "white" },
  card: { background: C.panel2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 },
  log: { background: "#111827", borderRadius: 10, padding: 12, maxHeight: 260, overflow: "auto", marginTop: 12 },
};

export function RepairPrivateProductIdsTool() {
  const client = useClient({ apiVersion: "2025-02-19" });
  const writeClient = useMemo(() => client.withConfig({ useCdn: false, perspective: "published" }), [client]);
  const [rows, setRows] = useState<RepairRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [logs, setLogs] = useState<RepairLog[]>([]);

  const addLog = useCallback((log: RepairLog) => {
    setLogs((prev) => [...prev.slice(-180), log]);
  }, []);

  const scan = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setLogs([]);
    try {
      const privateProducts = await withTimeout(
        writeClient.fetch<PrivateProduct[]>(`*[
          _type == "producto" &&
          _id in path("producto.migrated.**")
        ] | order(_createdAt asc) {
          ...,
          subcategoria->{nombre, categoria->{nombre}}
        }`),
        "El escaneo de IDs privados",
      );

      const publicMigrated = await withTimeout(
        writeClient.fetch<ExistingPublicProduct[]>(`*[
          _type == "producto" &&
          !(_id in path("drafts.**")) &&
          !(_id in path("versions.**")) &&
          !(_id in path("producto.migrated.**")) &&
          defined(migratedFromVariant)
        ]{_id,idExcel,nombre,migratedFromVariant}`),
        "La revisión de copias públicas existentes",
      );

      const publicByMigrationKey = new Map<string, ExistingPublicProduct>();
      publicMigrated.forEach((product) => {
        if (product.migratedFromVariant) publicByMigrationKey.set(product.migratedFromVariant, product);
      });

      const nextRows = privateProducts.map((product) => buildRepairRow(product, publicByMigrationKey));
      setRows(nextRows);
      setMessage(`Se encontraron ${nextRows.length} producto(s) con _id privado tipo producto.migrated.*.`);
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "No se pudo escanear.");
    } finally {
      setLoading(false);
    }
  }, [writeClient]);

  const updateAlbumReferences = useCallback(async (oldId: string, newId: string) => {
    const albums = await writeClient.fetch<AlbumDoc[]>(`*[_type == "album" && references($oldId)]{_id, items}`, { oldId });
    let updated = 0;

    for (const album of albums) {
      const items = (album.items || []).map((item) => {
        if (item.producto?._ref !== oldId) return item;
        return {
          ...item,
          producto: { ...item.producto, _type: "reference", _ref: newId },
        };
      });
      await writeClient.patch(album._id).set({ items }).commit({ visibility: "sync" });
      updated += 1;
    }

    return updated;
  }, [writeClient]);

  const repair = useCallback(async () => {
    if (!rows.length) return;
    const confirmed = window.confirm(
      `Se repararán ${rows.length} productos con _id privado.\n\n` +
      `La herramienta creará/copiará documentos públicos, actualizará referencias en colecciones y eliminará los documentos privados antiguos.\n\n` +
      `Recomendado: tener un export/backup reciente de Sanity. ¿Continuar?`,
    );
    if (!confirmed) return;

    setRepairing(true);
    setMessage("");
    setLogs([]);

    let created = 0;
    let reused = 0;
    let deleted = 0;
    let albumRefs = 0;

    try {
      for (const row of rows) {
        addLog({ type: "info", message: `Reparando ${row.nombre}` });

        const privateProduct = await withTimeout(
          writeClient.fetch<PrivateProduct | null>(`*[_id == $id][0]{...}`, { id: row.oldId }),
          `La lectura de ${row.nombre}`,
        );

        if (!privateProduct) {
          addLog({ type: "warn", message: `No se encontró ${row.oldId}; se omite.` });
          continue;
        }

        const existingTarget = await writeClient.fetch<{ _id: string } | null>(`*[_id == $id][0]{_id}`, { id: row.newId });

        if (!existingTarget) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, _rev, _createdAt, _updatedAt, ...rest } = privateProduct;
          const publicDoc = {
            ...rest,
            _id: row.newId,
            _type: "producto",
            idExcel: row.idExcel,
            slug: { _type: "slug", current: row.newSlug },
            migratedFromVariant: row.migratedFromVariant,
            legacyPrivateId: row.oldId,
          };
          await withTimeout(writeClient.createOrReplace(publicDoc), `La creación pública de ${row.nombre}`);
          created += 1;
          addLog({ type: "ok", message: `Creado ${row.newId}` });
        } else {
          reused += 1;
          addLog({ type: "warn", message: `Ya existía ${row.newId}; se reutiliza.` });
        }

        albumRefs += await updateAlbumReferences(row.oldId, row.newId);
        await withTimeout(writeClient.delete(row.oldId), `La eliminación de ${row.oldId}`);
        deleted += 1;
        addLog({ type: "ok", message: `Eliminado privado ${row.oldId}` });
      }

      setMessage(`Listo: ${created} creados, ${reused} reutilizados, ${deleted} privados eliminados, ${albumRefs} colecciones actualizadas.`);
      await scan();
    } catch (err) {
      console.error(err);
      setMessage(err instanceof Error ? err.message : "Falló la reparación.");
      addLog({ type: "error", message: err instanceof Error ? err.message : "Falló la reparación." });
    } finally {
      setRepairing(false);
    }
  }, [addLog, rows, scan, updateAlbumReferences, writeClient]);

  return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <h1 style={s.title}>Reparar IDs privados de productos</h1>
        <p style={s.p}>
          Sanity trata los documentos cuyo <code>_id</code> contiene puntos como privados. Esta herramienta convierte productos
          <code> producto.migrated.* </code> en productos públicos con IDs sin puntos, conserva imágenes/presentaciones y actualiza colecciones.
        </p>
        <div style={s.row}>
          <button onClick={scan} disabled={loading || repairing} style={{ ...s.btn, background: C.blue }}>
            {loading ? "Escaneando..." : "Revisar productos privados"}
          </button>
          <button onClick={repair} disabled={repairing || loading || rows.length === 0} style={{ ...s.btn, background: rows.length ? C.green : "#6b7280", cursor: rows.length ? "pointer" : "not-allowed" }}>
            {repairing ? "Reparando..." : `Reparar ${rows.length} productos`}
          </button>
        </div>
        {message && <p style={{ ...s.p, color: C.text, marginBottom: 0 }}>{message}</p>}
      </div>

      {rows.slice(0, 120).map((row) => (
        <div key={row.oldId} style={s.card}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{row.nombre}</div>
          <div style={s.mono}>Privado: {row.oldId}</div>
          <div style={s.mono}>Público: {row.newId}</div>
          <div style={s.mono}>ID Excel nuevo: {row.idExcel}</div>
          <div style={s.mono}>Slug nuevo: {row.newSlug}</div>
          <div style={{ color: C.muted, marginTop: 6 }}>{row.category || "Sin categoría"} › {row.subcategory || "Sin subcategoría"}</div>
          {row.alreadyHasPublicCopy && <div style={{ color: C.yellow, marginTop: 6 }}>Ya existe una copia pública con la misma migración. Solo se actualizarán referencias y se eliminará el privado.</div>}
        </div>
      ))}

      {logs.length > 0 && (
        <div style={s.log}>
          {logs.map((log, index) => (
            <div key={index} style={{ color: log.type === "error" ? C.red : log.type === "ok" ? C.green : log.type === "warn" ? C.yellow : C.muted, ...s.mono }}>
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
