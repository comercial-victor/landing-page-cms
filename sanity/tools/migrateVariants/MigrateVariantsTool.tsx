import React, { useState, useCallback, useMemo } from "react";
import { useClient } from "sanity";

interface SImg { _key?: string; _type?: string; asset: { _ref: string } }
interface SVar { _key: string; nombre?: string; color?: string; tamano?: string; otrosAtributos?: string; stock?: number | null; visible?: boolean; imagen?: SImg }
interface SPres { _key: string; nombre?: string; factorConversion?: number; precio?: number | null; visibleEnWeb?: boolean; esDefault?: boolean }
interface SProd {
  _id: string; idExcel?: string; nombre: string; descripcion?: string; marca?: string;
  visible?: boolean; destacado?: boolean; medidas?: string; observaciones?: string; tags?: string[];
  unidadBase?: string; manejaStock?: boolean; permiteVentaFraccionada?: boolean;
  migratedFromVariant?: string;
  subcategoria?: { _id: string; nombre?: string }; variantes?: SVar[]; presentaciones?: SPres[];
  imagenes?: SImg[]; slug?: { current: string };
}

interface MigrationPlan {
  parentId: string;
  parentName: string;
  newProducts: { name: string; variantKey: string; stock: number | null; hasImage: boolean; visible: boolean; warning?: string; alreadyMigrated?: boolean }[];
}

interface MigrationProgress {
  totalParents: number;
  currentParent: number;
  totalProducts: number;
  created: number;
  skipped: number;
  hidden: number;
  currentName: string;
  phase: string;
}

const PRODUCT_SLUG_MAX_LENGTH = 96;
const uid = () => Math.random().toString(36).slice(2, 10);
const legacyDocIdPart = (s: string) => s.replace(/[^A-Za-z0-9_.-]/g, "-");
const docIdPart = (s: string) => s.replace(/^drafts\./, "").replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
const publicMigratedProductId = (parentId: string, variantKey: string) => `prod-migrated-${docIdPart(parentId)}-${docIdPart(variantKey)}`;
const migratedExcelId = (parentIdOrExcel: string, variantKey: string) => `M-${docIdPart(parentIdOrExcel).replace(/^prod-?/i, "")}-${docIdPart(variantKey)}`.toUpperCase();
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
const productIdSuffix = (value?: string) => {
  const compact = slugify(value || "")
    .replace(/^drafts-/, "")
    .replace(/^prod-?/, "")
    .replace(/^producto-?/, "")
    .replace(/-/g, "");
  if (!compact) return "";
  return /^[a-z]/.test(compact) ? compact : `p${compact}`;
};
const productSlugWithId = (nombre: string, id?: string) => {
  const base = slugify(nombre || "producto");
  const suffix = productIdSuffix(id);
  if (!suffix) return base.slice(0, PRODUCT_SLUG_MAX_LENGTH);
  const safeBase = base.slice(0, Math.max(1, PRODUCT_SLUG_MAX_LENGTH - suffix.length - 1)).replace(/-+$/g, "");
  return `${safeBase}-${suffix}`;
};
const compareText = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bx\s+(\d+)/g, "x$1")
    .replace(/\bn\s*[°º]?\s*(\d+)/g, "n$1")
    .replace(/[^a-z0-9#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const hasDraftText = (s: string) => /\b(pendiente|editar|agregar|por definir)\b|[a-z_áéíóúñ ]+:\s*($|\s|;|,)/i.test(s);
const isUniqueVariant = (vars: SVar[]) => vars.length === 1 && (vars[0].nombre === "Único" || !vars[0].nombre);
const migrationKey = (parentId: string, variantKey: string) => `${parentId}::${variantKey}`;
const waitForPaint = () => new Promise(resolve => window.setTimeout(resolve, 0));
const APPROVED_PENDING_PARENT_IDS = new Set([
  "prod-P-0149", // Rollo de stretch film
  "prod-P-0163", // UHU pegamento
  "prod-P-0167", // Cola sintética con aplicador
  "prod-P-0168", // Silicona líquida con aplicador
  "prod-P-0301", // Lámina escolar Huascarán A4
  "prod-P-0302", // Lámina grande plastificada
  "prod-P-0313", // Globo #9 cromado
  "prod-P-0314", // Globo #12 cromado
  "prod-P-0324", // Piñata genérica
  "prod-P-0328", // Cortina de fondo metalizada 2 m x 1 m
  "prod-P-0352", // Lija A4 para madera
  "prod-P-0353", // Lija A4 para metal
]);
const isApprovedPendingParent = (id: string) => APPROVED_PENDING_PARENT_IDS.has(id.replace(/^drafts\./, ""));

async function withTimeout<T>(promise: Promise<T>, label: string, ms = 25000): Promise<T> {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} tardó más de ${Math.round(ms / 1000)} segundos. Revisa la conexión o vuelve a intentar.`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: "0 auto", padding: "32px 24px", fontFamily: "inherit" },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "#111827" },
  subtitle: { fontSize: 15, color: "#6b7280", margin: "0 0 24px" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 },
  btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  planCard: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 16, marginBottom: 12 },
  newProd: { fontSize: 14, color: "#374151", padding: "4px 0", display: "flex", gap: 8, alignItems: "center" },
  progressTrack: { height: 10, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", margin: "12px 0 10px" },
  logBox: { maxHeight: 260, overflow: "auto", fontSize: 13, lineHeight: 1.7, background: "#111827", color: "#e5e7eb", borderRadius: 10, padding: 12, marginTop: 14 },
};

const restoreGlobo9CromadoDoc = {
  _id: "prod-P-0313",
  _type: "producto",
  idExcel: "P-0313",
  nombre: "Globo #9 cromado",
  slug: { _type: "slug", current: "globo-9-cromado-p0313" },
  descripcion: "",
  destacado: false,
  manejaStock: true,
  marca: "Genérico",
  medidas: "#9",
  observaciones: "Se llena con helio y se eleva. Se puede vender por unidad.",
  orden: 0,
  permiteVentaFraccionada: true,
  presentaciones: [
    { _key: "PR-0419", _type: "presentacion", esDefault: true, factorConversion: 1, nombre: "Unidad", visibleEnWeb: true },
    { _key: "PR-0420", _type: "presentacion", esDefault: false, factorConversion: 100, nombre: "Paquete x 100", visibleEnWeb: true },
  ],
  stock: null,
  subcategoria: { _ref: "subcat-C-05-02", _type: "reference" },
  tags: ["fiesta", "metalizado"],
  unidadBase: "globo",
  visible: true,
  variantes: [
    { _key: "V-00865", _type: "variante", color: "Dorado", nombre: "Dorado", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00866", _type: "variante", color: "Plateado", nombre: "Plateado", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00867", _type: "variante", color: "Oro Rosa", nombre: "Oro Rosa", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00868", _type: "variante", color: "Rojo", nombre: "Rojo", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00869", _type: "variante", color: "Azul", nombre: "Azul", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00870", _type: "variante", color: "Verde", nombre: "Verde", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00871", _type: "variante", color: "Surtido", nombre: "Surtido", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00872", _type: "variante", color: "Rojo", nombre: "Rojo", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00873", _type: "variante", color: "Azul", nombre: "Azul", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00874", _type: "variante", color: "Verde", nombre: "Verde", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00875", _type: "variante", color: "Amarillo", nombre: "Amarillo", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00876", _type: "variante", color: "Negro", nombre: "Negro", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00877", _type: "variante", color: "Blanco", nombre: "Blanco", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00878", _type: "variante", color: "Naranja", nombre: "Naranja", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00879", _type: "variante", color: "Rosado", nombre: "Rosado", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00880", _type: "variante", color: "Morado", nombre: "Morado", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00881", _type: "variante", color: "Celeste", nombre: "Celeste", otrosAtributos: "", tamano: "", visible: true },
    { _key: "V-00882", _type: "variante", color: "Surtido", nombre: "Surtido", otrosAtributos: "", tamano: "", visible: true },
  ],
};

function partsFromVariant(v: SVar): string[] {
  const parts = [v.nombre, v.color, v.tamano].filter(Boolean) as string[];
  const rawOther = (v.otrosAtributos || "").trim();

  if (rawOther) {
    rawOther.split(/[;|,]+/).forEach((chunk) => {
      const clean = chunk.trim();
      if (!clean) return;
      const labelled = clean.match(/^([^:]+):\s*(.+)$/);
      if (labelled?.[2]?.trim()) {
        parts.push(labelled[2].trim());
      } else if (!clean.includes(":")) {
        parts.push(clean);
      }
    });
  }

  return parts;
}

function buildNewName(parent: SProd, v: SVar): string {
  const base = parent.nombre.trim();
  const baseNorm = compareText(base);
  const parts: string[] = [];

  const addPart = (raw: string) => {
    const part = raw.replace(/\s+/g, " ").trim();
    const partNorm = compareText(part);
    if (!part || !partNorm || partNorm === "unico") return;
    if (baseNorm.includes(partNorm)) return;

    const existingIndex = parts.findIndex((existing) => {
      const existingNorm = compareText(existing);
      return existingNorm === partNorm || existingNorm.includes(partNorm) || partNorm.includes(existingNorm);
    });

    if (existingIndex >= 0) {
      if (part.length > parts[existingIndex].length) parts[existingIndex] = part;
      return;
    }

    parts.push(part);
  };

  partsFromVariant(v).forEach(addPart);
  const suffix = parts.join(" ").trim();
  if (!suffix) return base;
  return `${base} ${suffix}`;
}

export function MigrateVariantsTool() {
  const client = useClient({ apiVersion: "2024-01-01" });
  const writeClient = useMemo(() => client.withConfig({ apiVersion: "2025-02-19", useCdn: false }), [client]);
  const [status, setStatus] = useState<"idle" | "scanning" | "ready" | "migrating" | "done" | "error">("idle");
  const [plans, setPlans] = useState<MigrationPlan[]>([]);
  const [noVariants, setNoVariants] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [repairingGlobo9, setRepairingGlobo9] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    totalParents: 0,
    currentParent: 0,
    totalProducts: 0,
    created: 0,
    skipped: 0,
    hidden: 0,
    currentName: "",
    phase: "",
  });

  const scan = useCallback(async () => {
    setStatus("scanning");
    setLog([]);
    try {
      const prods = await withTimeout(writeClient.fetch<SProd[]>(`*[_type=="producto"]{
        _id,idExcel,nombre,descripcion,marca,visible,destacado,medidas,observaciones,tags,
        unidadBase,manejaStock,permiteVentaFraccionada,slug,migratedFromVariant,
        subcategoria->{_id,nombre},
        variantes[]{_key,nombre,color,tamano,otrosAtributos,stock,visible,imagen{asset}},
        presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault},
        imagenes[]{_key,asset}
      }`), "El escaneo de productos");

      const migratedKeys = new Set<string>();
      prods.forEach(p => {
        if (p.migratedFromVariant) migratedKeys.add(p.migratedFromVariant);
      });

      const withVars = prods.filter(p => {
        const vars = p.variantes || [];
        if (vars.length === 0) return false;
        if (isUniqueVariant(vars)) return false;
        const hasMissingMigration = vars.some(v => !migratedKeys.has(migrationKey(p._id, v._key)));
        if (p.visible === false && !hasMissingMigration) return false;
        return true;
      });

      setNoVariants(prods.length - withVars.length);

      const migrationPlans: MigrationPlan[] = withVars.map(p => ({
        parentId: p._id,
        parentName: p.nombre,
        newProducts: (p.variantes || []).map(v => ({
          name: buildNewName(p, v),
          variantKey: v._key,
          stock: v.stock ?? null,
          hasImage: !!v.imagen?.asset?._ref,
          visible: v.visible !== false,
        })),
      }));

      const proposedCounts = new Map<string, number>();
      migrationPlans.forEach(plan => {
        plan.newProducts.forEach(np => {
          const key = compareText(np.name);
          proposedCounts.set(key, (proposedCounts.get(key) || 0) + 1);
        });
      });

      const existingNames = new Map<string, string[]>();
      prods.forEach(p => {
        const key = compareText(p.nombre);
        existingNames.set(key, [...(existingNames.get(key) || []), p._id]);
      });
      const productsByName = new Map<string, SProd[]>();
      prods.forEach(p => {
        const key = compareText(p.nombre);
        productsByName.set(key, [...(productsByName.get(key) || []), p]);
      });

      migrationPlans.forEach(plan => {
        plan.newProducts.forEach(np => {
          const key = compareText(np.name);
          const warnings: string[] = [];
          const targetMigrationKey = migrationKey(plan.parentId, np.variantKey);
          const approvedPendingParent = isApprovedPendingParent(plan.parentId);
          const sameParentMigrationByName = !approvedPendingParent && (productsByName.get(key) || []).some(p => p.migratedFromVariant?.startsWith(`${plan.parentId}::`));
          np.alreadyMigrated = migratedKeys.has(targetMigrationKey) || sameParentMigrationByName;

          if ((proposedCounts.get(key) || 0) > 1) warnings.push("nombre repetido en esta migración");
          if (compareText(np.name) === compareText(plan.parentName)) warnings.push("nombre igual al producto padre");
          if (hasDraftText(np.name)) warnings.push("contiene texto pendiente o técnico");
          const existingOther = (existingNames.get(key) || []).filter(id => id !== plan.parentId);
          if (existingOther.length > 0) warnings.push("ya existe otro producto con este nombre");
          if (approvedPendingParent) {
            np.warning = undefined;
            return;
          }
          if (np.alreadyMigrated) {
            const filtered = warnings.filter(w => w !== "ya existe otro producto con este nombre");
            if (filtered.length > 0) np.warning = filtered.join("; ");
          } else if (warnings.length > 0) {
            np.warning = warnings.join("; ");
          }
        });
      });

      setPlans(migrationPlans);
      setStatus("ready");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al escanear.");
      setStatus("error");
    }
  }, [writeClient]);

  const restoreGlobo9Cromado = useCallback(async () => {
    const ok = window.confirm(
      "Restaurar el producto padre \"Globo #9 cromado\" (P-0313) con sus 18 variantes legacy desde el historial recuperado.\n\nNo crea productos nuevos ni toca otros documentos. ¿Continuar?"
    );
    if (!ok) return;

    setRepairingGlobo9(true);
    try {
      await withTimeout(writeClient.createOrReplace(restoreGlobo9CromadoDoc), "La restauración de Globo #9 cromado");
      setMessage("Globo #9 cromado restaurado con sus 18 variantes legacy. Vuelve a escanear para revisarlo.");
      setLog(prev => [`Restaurado: "Globo #9 cromado" (P-0313) con 18 variantes legacy.`, ...prev]);
      await scan();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "No se pudo restaurar Globo #9 cromado.");
      setStatus("error");
    } finally {
      setRepairingGlobo9(false);
    }
  }, [scan, writeClient]);

  const migrate = useCallback(async () => {
    const runnablePlans = plans.filter(plan => plan.newProducts.every(np => !np.warning));
    const skippedPlans = plans.length - runnablePlans.length;
    const runnableProducts = runnablePlans.reduce((sum, plan) => sum + plan.newProducts.length, 0);

    if (runnablePlans.length === 0) {
      setMessage("No hay productos limpios para migrar. Corrige los casos marcados como Por revisar y vuelve a escanear.");
      setStatus("ready");
      return;
    }

    setStatus("migrating");
    setLog([]);
    setMessage("");
    setProgress({
      totalParents: runnablePlans.length,
      currentParent: 0,
      totalProducts: runnableProducts,
      created: 0,
      skipped: 0,
      hidden: 0,
      currentName: "Preparando migración",
      phase: "Verificando conexión con Sanity",
    });
    await waitForPaint();

    let created = 0;
    let skippedExisting = 0;
    let hidden = 0;
    const newLog: string[] = [];
    const appendLog = (line: string) => {
      newLog.push(line);
      setLog(prev => [...prev.slice(-160), line]);
    };

    try {
      await withTimeout(writeClient.fetch<number>(`count(*[_type=="producto"])`), "La verificación inicial con Sanity", 15000);
      appendLog(`Conexión lista. Se migrarán ${runnableProducts} productos limpios desde ${runnablePlans.length} productos padre.`);
      const approvedPendingCount = runnablePlans.filter(plan => isApprovedPendingParent(plan.parentId)).length;
      if (approvedPendingCount > 0) {
        appendLog(`${approvedPendingCount} productos padre pendientes fueron autorizados manualmente; se migrarán aunque tengan nombres repetidos o texto pendiente.`);
      }

      for (let planIndex = 0; planIndex < runnablePlans.length; planIndex++) {
        const plan = runnablePlans[planIndex];
        setProgress(prev => ({
          ...prev,
          currentParent: planIndex + 1,
          currentName: plan.parentName,
          phase: "Leyendo producto padre",
        }));
        await waitForPaint();

        const parent = await withTimeout(writeClient.fetch<SProd>(`*[_id==$id][0]{
          _id,idExcel,nombre,descripcion,marca,visible,destacado,medidas,observaciones,tags,
          unidadBase,manejaStock,permiteVentaFraccionada,slug,
          subcategoria->{_id},
          variantes[]{_key,nombre,color,tamano,otrosAtributos,stock,visible,imagen{asset}},
          presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault},
          imagenes[]{_key,asset}
        }`, { id: plan.parentId }), `La lectura de "${plan.parentName}"`, 20000);

        if (!parent) {
          appendLog(`No se encontró "${plan.parentName}". Se omite.`);
          continue;
        }

        if (!parent.subcategoria?._id) {
          skippedExisting += parent.variantes?.length || 0;
          appendLog(`Se omitió "${parent.nombre}" porque no tiene subcategoría asignada.`);
          setProgress(prev => ({ ...prev, skipped: skippedExisting }));
          continue;
        }

        const variants = parent.variantes || [];
        const migrationKeys = variants.map(v => `${parent._id}::${v._key}`);
        const expectedIds = variants.flatMap(v => [
          publicMigratedProductId(parent._id, v._key),
          `producto.migrated.${legacyDocIdPart(parent._id)}.${legacyDocIdPart(v._key)}`,
        ]);
        const existingMigrated = await withTimeout(writeClient.fetch<{ _id: string; migratedFromVariant?: string }[]>(
          `*[_type=="producto" && (_id in $ids || migratedFromVariant in $keys)]{_id,migratedFromVariant}`,
          { ids: expectedIds, keys: migrationKeys },
        ), `La revisión de duplicados de "${parent.nombre}"`, 20000);
        const existingKeys = new Set(existingMigrated.map(doc => doc.migratedFromVariant).filter(Boolean));
        const existingIds = new Set(existingMigrated.map(doc => doc._id));

        const createdNames: string[] = [];

        for (const v of variants) {
          const newName = buildNewName(parent, v);
          const migratedFromVariant = `${parent._id}::${v._key}`;
          const newId = publicMigratedProductId(parent._id, v._key);
          const newIdExcel = migratedExcelId(parent.idExcel || parent._id, v._key);
          const newSlug = productSlugWithId(newName, newIdExcel);

          if (existingKeys.has(migratedFromVariant) || existingIds.has(newId)) {
            skippedExisting++;
            appendLog(`Ya existía: "${newName}". No se duplica.`);
            continue;
          }

          // Build images: variant image first, then parent images
          const images: Record<string, unknown>[] = [];
          if (v.imagen?.asset?._ref) {
            images.push({ _key: uid(), _type: "image", asset: { _type: "reference", _ref: v.imagen.asset._ref } });
          }
          for (const img of (parent.imagenes || [])) {
            if (img.asset?._ref) {
              images.push({ _key: img._key || uid(), _type: "image", asset: { _type: "reference", _ref: img.asset._ref } });
            }
          }

          // Build presentaciones (copy from parent)
          const pres = (parent.presentaciones || []).map(pr => ({
            _key: uid(),
            _type: "presentacion",
            nombre: pr.nombre || "Unidad",
            factorConversion: pr.factorConversion || 1,
            ...(pr.precio != null ? { precio: pr.precio } : {}),
            visibleEnWeb: pr.visibleEnWeb !== false,
            esDefault: !!pr.esDefault,
          }));
          const presentaciones = pres.length > 0 ? pres : [{
            _key: uid(),
            _type: "presentacion",
            nombre: "Unidad",
            factorConversion: 1,
            visibleEnWeb: true,
            esDefault: true,
          }];

          const doc: Record<string, unknown> = {
            _id: newId,
            _type: "producto",
            idExcel: newIdExcel,
            nombre: newName,
            slug: { _type: "slug", current: newSlug },
            subcategoria: { _type: "reference", _ref: parent.subcategoria._id },
            descripcion: parent.descripcion || "",
            marca: parent.marca || "Genérico",
            medidas: parent.medidas || "",
            observaciones: parent.observaciones || "",
            tags: parent.tags || [],
            visible: v.visible !== false && parent.visible !== false,
            destacado: parent.destacado || false,
            orden: 0,
            stock: v.stock ?? null,
            manejaStock: parent.manejaStock ?? true,
            permiteVentaFraccionada: parent.permiteVentaFraccionada ?? false,
            unidadBase: parent.unidadBase || "unidad",
            migratedFromVariant,
            presentaciones,
          };

          if (images.length > 0) doc.imagenes = images;

          setProgress(prev => ({
            ...prev,
            phase: `Creando producto`,
            currentName: newName,
          }));
          await waitForPaint();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const createdDoc = await withTimeout(writeClient.create(doc as any), `La creación de "${newName}"`, 30000);
          const createdName = typeof createdDoc === "object" && createdDoc && "nombre" in createdDoc ? String((createdDoc as Record<string, unknown>).nombre || newName) : newName;
          createdNames.push(createdName);
          created++;
          appendLog(`Creado: "${createdName}"`);
          setProgress(prev => ({ ...prev, created, skipped: skippedExisting }));
        }

        setProgress(prev => ({
          ...prev,
          currentName: parent.nombre,
          phase: "Ocultando padre",
        }));
        await waitForPaint();

        await withTimeout(writeClient.patch(parent._id).set({ visible: false }).commit({ visibility: "sync" }), `El ocultamiento de "${parent.nombre}"`, 30000);
        hidden++;
        appendLog(`Ocultado producto padre: "${parent.nombre}".`);
        setProgress(prev => ({
          ...prev,
          created,
          skipped: skippedExisting,
          hidden,
          phase: "Avanzando al siguiente producto padre",
        }));
        await waitForPaint();
      }

      setLog(newLog);
      setMessage(`Migración completa: ${created} productos creados, ${skippedExisting} ya existían y se omitieron, ${hidden} productos padre ocultados.${skippedPlans > 0 ? ` ${skippedPlans} productos padre quedaron pendientes por revisión.` : ""}`);
      setStatus("done");
    } catch (err) {
      setLog(newLog);
      setMessage(err instanceof Error ? err.message : "Error durante migración.");
      setStatus("error");
    }
  }, [plans, writeClient]);

  const totalNew = plans.reduce((sum, p) => sum + p.newProducts.length, 0);
  const issueCount = plans.reduce((sum, p) => sum + p.newProducts.filter(np => np.warning).length, 0);
  const cleanPlans = plans.filter(plan => plan.newProducts.every(np => !np.warning));
  const cleanNew = cleanPlans.reduce((sum, p) => sum + p.newProducts.filter(np => !np.alreadyMigrated).length, 0);
  const recognizedMigrated = cleanPlans.reduce((sum, p) => sum + p.newProducts.filter(np => np.alreadyMigrated).length, 0);
  const blockedPlans = plans.length - cleanPlans.length;
  const blockedNew = totalNew - cleanNew - recognizedMigrated;

  return (
    <div style={s.container}>
      <h1 style={s.title}>Migrar variantes a productos</h1>
      <p style={s.subtitle}>
        Convierte las variantes de productos existentes en productos individuales.
        Cada variante se convierte en un producto unitario con sus propias presentaciones, stock e imágenes.
        Los productos padre se ocultan (no se borran).
      </p>

      <div style={{ ...s.card, borderColor: "#bfdbfe", background: "#eff6ff" }}>
        <strong style={{ color: "#1e3a8a" }}>Recuperación puntual</strong>
        <p style={{ margin: "8px 0 12px", color: "#1e3a8a", fontSize: 14 }}>
          Si se eliminó por error el padre Globo #9 cromado, puedes restaurarlo con sus 18 variantes legacy antes de decidir cómo convertirlas.
        </p>
        <button
          onClick={restoreGlobo9Cromado}
          disabled={repairingGlobo9 || status === "migrating"}
          style={{ ...s.btn, background: repairingGlobo9 ? "#93c5fd" : "#2563eb", color: "#fff" }}
        >
          {repairingGlobo9 ? "Restaurando..." : "Restaurar Globo #9 cromado"}
        </button>
      </div>

      {status === "idle" && (
        <div style={s.card}>
          <p style={{ margin: "0 0 16px", fontSize: 15, color: "#374151" }}>
            Paso 1: Escanear el catálogo para generar un reporte de migración (dry-run). No se hacen cambios hasta que confirmes.
          </p>
          <button style={{ ...s.btn, background: "#D2386C", color: "#fff" }} onClick={scan}>Escanear catálogo</button>
        </div>
      )}

      {status === "scanning" && (
        <div style={s.card}>
          <p style={{ margin: 0, fontSize: 15 }}>⏳ Escaneando productos…</p>
        </div>
      )}

      {status === "ready" && (
        <>
          <div style={s.card}>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>Reporte de migración (dry-run)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#059669" }}>{noVariants}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Sin variantes (OK)</div>
              </div>
              <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#d97706" }}>{plans.length}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Con variantes</div>
              </div>
              <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb" }}>{totalNew}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Productos nuevos</div>
              </div>
              <div style={{ background: "#f0fdf4", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#059669" }}>{cleanNew}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Por crear</div>
              </div>
              <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb" }}>{recognizedMigrated}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Ya migrados</div>
              </div>
              <div style={{ background: issueCount > 0 ? "#fef2f2" : "#f0fdf4", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: issueCount > 0 ? "#dc2626" : "#059669" }}>{issueCount}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Por revisar</div>
              </div>
            </div>

            {plans.length === 0 ? (
              <p style={{ color: "#059669", fontSize: 15 }}>✅ No hay productos con variantes para migrar. Todo está limpio.</p>
            ) : (
              <>
                <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
                  El reporte propone {totalNew} productos nuevos a partir de {plans.length} productos con variantes.
                  {issueCount > 0
                    ? ` En esta ejecución se crearán ${cleanNew} productos, se reconocerán ${recognizedMigrated} ya migrados y ${blockedNew} quedarán pendientes.`
                    : ` Se crearán ${cleanNew} productos nuevos, se reconocerán ${recognizedMigrated} ya migrados y los productos padre se ocultarán después.`}
                </p>
                {issueCount > 0 && (
                  <p style={{ fontSize: 14, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    Hay {issueCount} nombres repetidos o sospechosos en {blockedPlans} productos padre. Esos productos quedarán pendientes y no se tocarán. Ahora se pueden completar {cleanPlans.length} productos padre limpios.
                  </p>
                )}
                {message && (
                  <p style={{ fontSize: 14, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 16 }}>{message}</p>
                )}
                <button disabled={cleanPlans.length === 0} style={{ ...s.btn, background: "#D2386C", color: "#fff", opacity: cleanPlans.length === 0 ? 0.45 : 1, cursor: cleanPlans.length === 0 ? "not-allowed" : "pointer" }} onClick={migrate}>
                  {issueCount > 0 ? `Completar limpios (${cleanPlans.length} padres)` : `Ejecutar migración (${cleanNew} por crear)`}
                </button>
                <button style={{ ...s.btn, background: "#f3f4f6", color: "#374151", marginLeft: 10, border: "1px solid #d1d5db" }} onClick={() => { setStatus("idle"); setPlans([]); }}>
                  Cancelar
                </button>
              </>
            )}
          </div>

          {plans.map((plan, i) => {
            const planHasIssues = plan.newProducts.some(np => np.warning);
            return (
            <div key={i} style={{ ...s.planCard, background: planHasIssues ? "#fff7ed" : s.planCard.background, borderColor: planHasIssues ? "#fed7aa" : "#fde68a" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: "#92400e" }}>
                📦 {plan.parentName} → {plan.newProducts.length} productos nuevos
                {planHasIssues && <span style={{ marginLeft: 8, color: "#991b1b", fontSize: 12, fontWeight: 700 }}>Se omitirá en esta migración</span>}
              </div>
              {plan.newProducts.map((np, j) => (
                <div key={j} style={s.newProd}>
                  <span style={{ color: "#2563eb" }}>→</span>
                  <span>{np.name}</span>
                  {np.stock != null && <span style={{ fontSize: 12, color: "#6b7280" }}>Stock: {np.stock}</span>}
                  {np.hasImage && <span style={{ fontSize: 12, color: "#059669" }}>📷</span>}
                  {np.alreadyMigrated && <span style={{ fontSize: 12, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "1px 6px" }}>Ya migrado</span>}
                  {!np.visible && <span style={{ fontSize: 12, color: "#dc2626" }}>Oculto</span>}
                  {np.warning && <span style={{ fontSize: 12, color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 999, padding: "1px 6px" }}>Revisar: {np.warning}</span>}
                </div>
              ))}
            </div>
          );})}
        </>
      )}

      {status === "migrating" && (
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#111827" }}>Migrando productos</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
                No cierres esta pestaña. Si algo falla, el error aparecerá aquí y los productos ya creados no se duplicarán al reintentar.
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: 13, color: "#374151", minWidth: 130 }}>
              Padre {progress.currentParent} de {progress.totalParents}
            </div>
          </div>
          <div style={s.progressTrack}>
            <div
              style={{
                width: `${Math.min(100, progress.totalProducts > 0 ? ((progress.created + progress.skipped) / progress.totalProducts) * 100 : 0)}%`,
                height: "100%",
                background: "#D2386C",
                transition: "width 180ms ease",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 12 }}>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Creados</div>
              <div style={{ fontSize: 22, color: "#059669", fontWeight: 800 }}>{progress.created}</div>
            </div>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Ya existían</div>
              <div style={{ fontSize: 22, color: "#2563eb", fontWeight: 800 }}>{progress.skipped}</div>
            </div>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Padres ocultos</div>
              <div style={{ fontSize: 22, color: "#7c3aed", fontWeight: 800 }}>{progress.hidden}</div>
            </div>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 14, color: "#374151" }}>
            <strong>{progress.phase}</strong>{progress.currentName ? `: ${progress.currentName}` : ""}
          </p>
          {log.length > 0 && (
            <div style={s.logBox}>
              {log.slice(-80).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      )}

      {(status === "done" || status === "error") && (
        <div style={{ ...s.card, background: status === "done" ? "#f0fdf4" : "#fef2f2", borderColor: status === "done" ? "#bbf7d0" : "#fecaca" }}>
          <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: status === "done" ? "#166534" : "#991b1b" }}>
            {status === "done" ? "✅" : "❌"} {message}
          </p>
          <div style={{ maxHeight: 400, overflow: "auto", fontSize: 13, lineHeight: 1.8 }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <button style={{ ...s.btn, background: "#D2386C", color: "#fff", marginTop: 16 }} onClick={() => { setStatus("idle"); setPlans([]); setLog([]); }}>
            Volver a escanear
          </button>
        </div>
      )}
    </div>
  );
}
