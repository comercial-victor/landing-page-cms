import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useClient } from "sanity";
import { rankBySearch, searchScore } from "../../../src/lib/search";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  FolderTree,
  GalleryHorizontalEnd,
  ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Package,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Star,
  Tag,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
interface SImg { _key?: string; _type?: string; asset: { _ref: string; url?: string } }
interface SPres { _key: string; nombre?: string; factorConversion?: number; precio?: number | null; visibleEnWeb?: boolean; esDefault?: boolean }
interface SSubcat { _id: string; idExcel?: string; nombre: string; activo?: boolean; categoria?: { _id: string; nombre: string; color?: string } }
interface SProd {
  _id: string; idExcel?: string; nombre: string; descripcion?: string; marca?: string;
  visible?: boolean; destacado?: boolean; destacadoUbicaciones?: DestacadoUbicacion[]; medidas?: string; observaciones?: string; tags?: string[];
  unidadBase?: string; manejaStock?: boolean; permiteVentaFraccionada?: boolean;
  stock?: number | null; migratedFromVariant?: string;
  subcategoria?: SSubcat; presentaciones?: SPres[];
  imagenes?: SImg[]; slug?: { current: string };
}
interface SCat { _id: string; idExcel?: string; nombre: string; color?: string; activo?: boolean }
interface SCollectionItem {
  _key: string;
  titulo?: string;
  descripcion?: string;
  visible?: boolean;
  mostrarEnPortada?: boolean;
  producto?: SProd;
}
interface SCollection {
  _id: string;
  titulo: string;
  subtitulo?: string;
  etiqueta?: string;
  slug?: { current: string };
  portada?: SImg;
  themeColor?: string;
  visible?: boolean;
  orden?: number;
  items?: SCollectionItem[];
}
type FeaturedMediaType = "image" | "youtube";
type FeaturedOrientation = "vertical" | "horizontal";
type FeaturedCtaAction = "whatsapp" | "scroll";
type DestacadoUbicacion = "preCatalog";
interface SFeaturedGalleryItem {
  _key: string;
  titulo: string;
  descripcion?: string;
  mediaType?: FeaturedMediaType;
  mediaOrientation?: FeaturedOrientation;
  imagen?: SImg;
  alt?: string;
  focalPosition?: string;
  youtubeUrl?: string;
  youtubeThumbnail?: SImg;
  meta?: string;
  ctaText?: string;
  ctaHref?: string;
  ctaAction?: FeaturedCtaAction;
  whatsappMessage?: string;
  targetSection?: string;
  active?: boolean;
  orden?: number;
}
interface SFeaturedGallery {
  _id: string;
  titulo?: string;
  subtitulo?: string;
  active?: boolean;
  items?: SFeaturedGalleryItem[];
}
interface DeleteRequest { products: SProd[]; mode: "single" | "bulk" }
interface FilterOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
  tone?: "all" | "visible" | "hidden" | "duplicates";
}

type ImageUploadPhase = "optimizing" | "uploading" | "done" | "error";
interface ImageUploadStatus {
  total: number;
  current: number;
  completed: number;
  fileName: string;
  phase: ImageUploadPhase;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────
const PRODUCT_SLUG_MAX_LENGTH = 96;
const uid = () => Math.random().toString(36).slice(2, 10);
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
const slugify = (s: string) => normalize(s).replace(/\s+/g, "-");
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
const tokenize = (s: string) => normalize(s).split(" ").filter(Boolean);
const matchesTokens = (hay: string, tokens: string[]) => tokens.length === 0 || tokens.every((token) => hay.includes(token));
const COMMON_TAGS = ["popular","nuevo","para-eventos","barra","metalizado","color-blanco","tecnopor","escolar","fiesta-infantil","manualidades","descartable","tela"];
const DEMO_COLLECTIONS = [
  { id: "collection-halloween", title: "Halloween", slug: "halloween", label: "Temporada", color: "#8B3FD1", keywords: ["halloween", "fiesta", "infantil", "globo", "decoracion", "metalizado"], subtitle: "Ideas para armar una vitrina, mesa o fiesta con un toque misterioso y divertido." },
  { id: "collection-dia-del-padre", title: "Día del Padre", slug: "dia-del-padre", label: "Regalos", color: "#2F6EB8", keywords: ["padre", "regalo", "metalizado", "globo", "popular", "detalle"], subtitle: "Detalles, arreglos y propuestas listas para sorprender sin complicarse." },
  { id: "collection-fiestas-patrias", title: "Fiestas Patrias", slug: "fiestas-patrias", label: "Perú", color: "#D23838", keywords: ["patrias", "peru", "rojo", "blanco", "fiesta", "manualidades", "escolar"], subtitle: "Rojo, blanco y celebración: productos para decorar, compartir y ambientar." },
];
const iconSize = 16;
const NEW_PRODUCT_ID = "__new_producto__";
const STRUCTURE_PANE_HEADER_OFFSET = 96;
const canonicalId = (id: string) => id.replace(/^drafts\./, "");

function makeNewProduct(): SProd {
  return {
    _id: NEW_PRODUCT_ID,
    nombre: "",
    descripcion: "",
    marca: "Genérico",
    visible: true,
    destacado: false,
    destacadoUbicaciones: [],
    medidas: "",
    observaciones: "",
    tags: [],
    unidadBase: "unidad",
    manejaStock: true,
    permiteVentaFraccionada: false,
    stock: null,
    presentaciones: [{ _key: uid(), nombre: "Unidad", factorConversion: 1, precio: null, visibleEnWeb: true, esDefault: true }],
    imagenes: [],
  };
}

function makeNewCollection(): SCollection {
  return {
    _id: "__new_collection__",
    titulo: "",
    subtitulo: "",
    etiqueta: "",
    slug: { current: "" },
    themeColor: C.plum,
    visible: true,
    orden: 0,
    items: [],
  };
}

function makeDefaultFeaturedGallery(): SFeaturedGallery {
  return {
    _id: "featuredGallery",
    titulo: "Ideas nuevas para celebrar",
    subtitulo: "",
    active: true,
    items: [],
  };
}

function makeNewFeaturedItem(): SFeaturedGalleryItem {
  return {
    _key: uid(),
    titulo: "",
    descripcion: "",
    mediaType: "image",
    mediaOrientation: "vertical",
    meta: "",
    ctaText: "Cotizar ahora",
    ctaAction: "whatsapp",
    targetSection: "catalogo",
    active: true,
    orden: 0,
  };
}

function imageUrl(img: SImg | undefined, client: ReturnType<typeof useClient>, width = 160, height = 160) {
  if (!img?.asset) return null;
  if (img.asset.url) return `${img.asset.url}?w=${width}&h=${height}&fit=crop&auto=format`;
  const ref = img.asset._ref;
  if (!ref) return null;
  const file = ref.replace("image-", "").replace(/-(\w+)$/, ".$1");
  return `https://cdn.sanity.io/images/${client.config().projectId}/${client.config().dataset}/${file}?w=${width}&h=${height}&fit=crop&auto=format`;
}

async function convertImageToAvif(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/avif" || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/convert-image", { method: "POST", body: formData });
  if (!response.ok) {
    throw new Error("No se pudo convertir la imagen a AVIF.");
  }

  const blob = await response.blob();
  if (blob.type !== "image/avif") {
    throw new Error("El conversor no devolvio una imagen AVIF valida.");
  }

  const headerFilename = response.headers.get("x-filename");
  const filename = (headerFilename || file.name.replace(/\.[^.]+$/, "") || "imagen").replace(/\.avif$/i, "");
  return new File([blob], `${filename}.avif`, { type: "image/avif" });
}

async function uploadOptimizedImage(
  client: ReturnType<typeof useClient>,
  file: File,
  onPhase?: (phase: Exclude<ImageUploadPhase, "done" | "error">, currentFile: File) => void
) {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    onPhase?.("uploading", file);
    return client.assets.upload("image", file, { filename: file.name });
  }

  onPhase?.("optimizing", file);
  const optimized = await convertImageToAvif(file);
  onPhase?.("uploading", optimized);
  return client.assets.upload("image", optimized, { filename: optimized.name });
}

// ── Styles ────────────────────────────────────────────────────────
const C = {
  bg: "#10131f", surface: "#171b2a", surface2: "#20263a", white: "#fff", panel: "#f7f8fb",
  plum: "#D2386C", ink: "#1F1B2E", inkSoft: "#5A5368", muted: "#8f98ad",
  line: "rgba(31,27,46,0.12)", darkLine: "rgba(255,255,255,0.12)", green: "#059669", red: "#dc2626", orange: "#d97706",
  yellowBg: "#fef3c7", yellowBorder: "#f59e0b", blueBg: "#eff6ff", blueBorder: "#bfdbfe",
};

const normalizeHexColor = (value?: string) => {
  const raw = (value || "").trim();
  const normalized = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : C.plum;
};

// ── Main Component ────────────────────────────────────────────────
export function InteractiveViewTool() {
  const client = useClient({ apiVersion: "2026-04-24" });
  const [prods, setProds] = useState<SProd[]>([]);
  const [cats, setCats] = useState<SCat[]>([]);
  const [subcats, setSubcats] = useState<SSubcat[]>([]);
  const [collections, setCollections] = useState<SCollection[]>([]);
  const [featuredGallery, setFeaturedGallery] = useState<SFeaturedGallery>(() => makeDefaultFeaturedGallery());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("__all");
  const [tagFilter, setTagFilter] = useState("__all");
  const [editing, setEditing] = useState<SProd | null>(null);
  const [editingCollection, setEditingCollection] = useState<SCollection | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [view, setView] = useState<"products" | "categories" | "collections" | "featured">("products");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden" | "duplicates">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState<DeleteRequest | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [deleteError, setDeleteError] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [p, c, sc, col, featured] = await Promise.all([
      client.fetch<SProd[]>(`*[
        _type == "producto" &&
        !(_id in path("drafts.**")) &&
        !(_id in path("versions.**")) &&
        !(_id in path("producto.migrated.**"))
      ]|order(nombre asc){
        _id,idExcel,nombre,descripcion,marca,visible,destacado,destacadoUbicaciones,medidas,observaciones,tags,
        unidadBase,manejaStock,permiteVentaFraccionada,stock,migratedFromVariant,slug,
        subcategoria->{_id,nombre,categoria->{_id,nombre,color}},
        presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault},
        imagenes[]{_key,asset}
      }`),
      client.fetch<SCat[]>(`*[_type=="categoria"]|order(orden asc, nombre asc){_id,idExcel,nombre,color,activo}`),
      client.fetch<SSubcat[]>(`*[_type=="subcategoria"]|order(nombre asc){_id,idExcel,nombre,activo,categoria->{_id,nombre,color}}`),
      client.fetch<SCollection[]>(`*[_type=="album"]|order(orden asc, titulo asc){
        _id,titulo,subtitulo,etiqueta,slug,themeColor,visible,orden,portada{asset},
        items[]{_key,titulo,descripcion,visible,mostrarEnPortada,producto->{_id,idExcel,nombre,visible,tags,imagenes[]{_key,asset},subcategoria->{_id,nombre,categoria->{_id,nombre,color}}}}
      }`),
      client.fetch<SFeaturedGallery | null>(`*[_type=="featuredGallery" && _id=="featuredGallery"][0]{
        _id,titulo,subtitulo,active,
        items[]{
          _key,titulo,descripcion,mediaType,mediaOrientation,imagen{asset},alt,focalPosition,
          youtubeUrl,youtubeThumbnail{asset},meta,ctaText,ctaHref,ctaAction,whatsappMessage,targetSection,active,orden
        }
      }`),
    ]);
    setProds(p); setCats(c); setSubcats(sc); setCollections(col);
    setFeaturedGallery(featured || makeDefaultFeaturedGallery());
    // Collect all unique tags
    const tags = new Set<string>();
    COMMON_TAGS.forEach(t => tags.add(t));
    p.forEach(prod => prod.tags?.forEach(t => tags.add(t)));
    setAllTags(Array.from(tags).sort());
    setLoading(false);
  }, [client]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Search with same logic as Navbar
  const filtered = useMemo(() => {
    let r = prods;
    if (catFilter !== "__all") r = r.filter(p => p.subcategoria?.categoria?._id === catFilter);
    if (tagFilter !== "__all") r = r.filter(p => p.tags?.includes(tagFilter));
    if (visibilityFilter === "visible") r = r.filter(p => p.visible !== false);
    if (visibilityFilter === "hidden") r = r.filter(p => p.visible === false);
    if (visibilityFilter === "duplicates") {
      const counts = new Map<string, number>();
      prods.forEach(p => {
        const key = normalize([p.idExcel, p.nombre].filter(Boolean).join(" "));
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      r = r.filter(p => (counts.get(normalize([p.idExcel, p.nombre].filter(Boolean).join(" "))) || 0) > 1);
    }
    if (search.trim()) {
      r = rankBySearch(r, search, (p) => [
        p.nombre,
        p.idExcel,
        p.descripcion,
        p.marca,
        p.medidas,
        p.observaciones,
        p.subcategoria?.nombre,
        p.subcategoria?.categoria?.nombre,
        ...(p.tags || []),
        ...(p.presentaciones || []).map((presentacion) => presentacion.nombre),
      ]);
    }
    return r;
  }, [prods, catFilter, tagFilter, search, visibilityFilter]);

  const activeCats = useMemo(() => cats.filter(c => c.activo !== false), [cats]);
  const categoryOptions = useMemo<FilterOption[]>(() => [
    { value: "__all", label: "Todas las categorías", count: prods.length, tone: "all" },
    ...activeCats.map(c => ({
      value: c._id,
      label: c.nombre,
      count: prods.filter(p => p.subcategoria?.categoria?._id === c._id).length,
      color: c.color || C.plum,
    })),
  ], [activeCats, prods]);
  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    prods.forEach(p => {
      const key = normalize([p.idExcel, p.nombre].filter(Boolean).join(" "));
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return prods.filter(p => (counts.get(normalize([p.idExcel, p.nombre].filter(Boolean).join(" "))) || 0) > 1).length;
  }, [prods]);
  const visibilityOptions = useMemo<FilterOption[]>(() => [
    { value: "all", label: "Todos", count: prods.length, tone: "all" },
    { value: "visible", label: "Visibles", count: prods.filter(p => p.visible !== false).length, tone: "visible" },
    { value: "hidden", label: "Ocultos", count: prods.filter(p => p.visible === false).length, tone: "hidden" },
    { value: "duplicates", label: "Posibles duplicados", count: duplicateCount, tone: "duplicates" },
  ], [duplicateCount, prods]);
  const tagOptions = useMemo<FilterOption[]>(() => [
    { value: "__all", label: "Todos los tags", count: prods.length, tone: "all" },
    ...allTags.map(tag => ({
      value: tag,
      label: tag,
      count: prods.filter(p => p.tags?.includes(tag)).length,
      color: C.plum,
    })),
  ], [allTags, prods]);
  const selectedProducts = useMemo(() => prods.filter(p => selectedIds.has(p._id)), [prods, selectedIds]);
  const filteredIds = useMemo(() => filtered.map(p => p._id), [filtered]);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredIds.forEach(id => next.delete(id));
      else filteredIds.forEach(id => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const hasActiveFilters = search.trim() !== "" || catFilter !== "__all" || tagFilter !== "__all" || visibilityFilter !== "all";
  const activeCategory = categoryOptions.find(o => o.value === catFilter);
  const activeTag = tagOptions.find(o => o.value === tagFilter);
  const activeVisibility = visibilityOptions.find(o => o.value === visibilityFilter);
  const clearProductFilters = () => {
    setSearch("");
    setCatFilter("__all");
    setTagFilter("__all");
    setVisibilityFilter("all");
  };

  const requestDelete = (products: SProd[], mode: DeleteRequest["mode"]) => {
    if (products.length === 0) return;
    setDeleteError("");
    setConfirmDelete({ products, mode });
  };

  const updateProducts = async (products: SProd[], build: (product: SProd) => Partial<SProd>) => {
    if (products.length === 0) return;
    setBulkSaving(true);
    try {
      let trx = client.transaction();
      const updates = products.map((product) => ({ product, patch: build(product) }));
      updates.forEach(({ product, patch }) => { trx = trx.patch(product._id, (p) => p.set(patch)); });
      await trx.commit();
      setProds((current) => current.map((product) => {
        const update = updates.find((item) => item.product._id === product._id);
        return update ? { ...product, ...update.patch } : product;
      }));
    } finally {
      setBulkSaving(false);
    }
  };

  const setSelectedVisibility = (visible: boolean) => updateProducts(selectedProducts, () => ({ visible }));
  const setProductsWithActiveTagVisibility = (visible: boolean) => {
    if (tagFilter === "__all") return;
    const targets = prods.filter((product) => product.tags?.includes(tagFilter));
    updateProducts(targets, () => ({ visible }));
  };
  const addTagToSelected = () => {
    const tag = slugify(bulkTag);
    if (!tag) return;
    updateProducts(selectedProducts, (product) => ({ tags: Array.from(new Set([...(product.tags || []), tag])) }));
    if (!allTags.includes(tag)) setAllTags((tags) => [...tags, tag].sort());
    setBulkTag("");
  };
  const removeTagFromSelected = () => {
    if (!bulkTag) return;
    updateProducts(selectedProducts, (product) => ({ tags: (product.tags || []).filter((tag) => tag !== bulkTag) }));
    setBulkTag("");
  };

  const confirmDeleteProducts = async () => {
    if (!confirmDelete) return;
    const ids = confirmDelete.products.map(p => p._id);
    setDeletingIds(new Set(ids));
    setDeleteError("");

    try {
      let trx = client.transaction();
      ids.forEach(id => { trx = trx.delete(id); });
      await trx.commit();
      const deleted = new Set(ids);
      setProds(ps => ps.filter(p => !deleted.has(p._id)));
      setSelectedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "No se pudo eliminar. Intenta de nuevo.");
    } finally {
      setDeletingIds(new Set());
    }
  };

  const handleSaved = (updated: SProd) => {
    setProds(ps => ps.some(p => p._id === updated._id) ? ps.map(p => p._id === updated._id ? updated : p) : [updated, ...ps]);
    setEditing(null);
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#dbe3f0", background: C.bg, minHeight: "100vh", fontFamily: "'Outfit',sans-serif" }}>
      <Loader2 size={24} style={{ animation: "iv-spin 0.8s linear infinite", verticalAlign: "middle", marginRight: 8 }} />
      Cargando contenido...
    </div>
  );

  const vis = prods.filter(p => p.visible !== false).length;

  return (
    <div className="iv-root" style={{ padding: "20px 28px", fontFamily: "'Outfit',sans-serif", background: C.bg, minHeight: "100vh", marginLeft: -1, position: "relative", zIndex: 1 }}>
      <style>{`
        .iv-root {
          box-shadow: -2px 0 0 ${C.bg};
        }
        body:has(.iv-root) [data-ui="PaneLayout"] {
          --card-border-color: rgba(255,255,255,0.08) !important;
        }
        body:has(.iv-root) [data-ui="Pane"] {
          box-shadow: 1px 0 0 rgba(255,255,255,0.08) !important;
        }
        .iv-root input::placeholder, .iv-root textarea::placeholder { color: #667085; opacity: 1; }
        .iv-root select, .iv-root input, .iv-root textarea { color: ${C.ink}; }
        .iv-header, .iv-filterbar, .iv-tabs, .iv-bulkbar, .iv-bulk-actions, .iv-action-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .iv-header {
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .iv-filterbar { margin-bottom: 14px; }
        .iv-tabs { margin-bottom: 14px; }
        .iv-bulkbar {
          justify-content: space-between;
          gap: 10px;
          background: ${C.surface};
          border: 1px solid ${C.darkLine};
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 14px;
        }
        .iv-action-group {
          gap: 6px;
          padding: 5px;
          border-radius: 10px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .iv-action-group-danger {
          background: rgba(220,38,38,0.08);
          border-color: rgba(248,113,113,0.22);
        }
        .iv-searchbox { flex: 1 1 360px; min-width: 220px; position: relative; }
        .iv-filter-control { width: var(--iv-filter-width); flex: 0 0 var(--iv-filter-width); }
        .iv-bulk-select { height: 34px; min-width: 150px; border-radius: 8px; border: 1px solid ${C.darkLine}; background: ${C.white}; color: ${C.ink}; font-family: inherit; font-size: 13px; padding: 0 8px; }
        .iv-product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
          gap: 12px;
        }
        @media (max-width: 1199px) {
          .iv-product-grid { grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }
        }
        @media (max-width: 640px) {
          .iv-root { padding-left: 16px !important; padding-right: 16px !important; }
          .iv-product-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .iv-header { align-items: flex-start; }
          .iv-header > div { width: 100%; justify-content: space-between; }
          .iv-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .iv-tabs button { justify-content: center; width: 100%; }
          .iv-filterbar { display: grid; grid-template-columns: 1fr; }
          .iv-searchbox,
          .iv-filter-control,
          .iv-filterbar > button {
            width: 100% !important;
            min-width: 0 !important;
            flex-basis: auto !important;
          }
          .iv-filterbar > button { justify-content: center; }
          .iv-bulkbar { display: grid; align-items: stretch; }
          .iv-bulk-actions { display: grid; grid-template-columns: 1fr; align-items: stretch; }
          .iv-action-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .iv-action-group .iv-bulk-select,
          .iv-action-group button { width: 100%; justify-content: center; }
          .iv-action-group-tags { grid-template-columns: 1fr 1fr; }
          .iv-action-group-tags .iv-bulk-select { grid-column: 1 / -1; }
          .iv-action-group-danger { grid-template-columns: 1fr; }
          .iv-feature-grid { grid-template-columns: 1fr !important; }
        }
        .iv-collection-modal { align-items: flex-start; }
        .iv-collection-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .iv-collection-actions { display: flex; gap: 8px; }
        .iv-collection-body { display: grid; grid-template-columns: minmax(280px, 0.42fr) minmax(0, 0.58fr); gap: 16px; }
        .iv-collection-search { display: flex; gap: 8px; align-items: center; }
        .iv-collection-products { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; max-height: 560px; overflow: auto; padding-right: 4px; }
        @media (max-width: 980px) {
          .iv-collection-body { grid-template-columns: 1fr; }
          .iv-collection-header { flex-wrap: wrap; align-items: flex-start; }
          .iv-collection-actions { width: 100%; justify-content: flex-end; }
          .iv-collection-products { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); max-height: 420px; }
        }
        @media (max-width: 640px) {
          .iv-collection-search { flex-direction: column; align-items: stretch; }
          .iv-collection-products { grid-template-columns: 1fr; max-height: 320px; }
        }
        @keyframes iv-spin { to { transform: rotate(360deg); } }
      `}</style>
      {/* Header */}
      <div className="iv-header">
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Eye size={28} color="#f472b6" /> Editor interactivo
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#cbd5e1" }}>{vis} visibles · {prods.length - vis} ocultos · {prods.length} total</span>
          <button onClick={fetchData} style={btnStyle("secondaryDark")}><RefreshCw size={iconSize} /> Refrescar</button>
        </div>
      </div>

      <div className="iv-tabs">
        <button onClick={() => setView("products")} style={viewToggleStyle(view === "products")}><Package size={iconSize} /> Productos</button>
        <button onClick={() => setView("featured")} style={viewToggleStyle(view === "featured")}><GalleryHorizontalEnd size={iconSize} /> Novedades</button>
        <button onClick={() => setView("categories")} style={viewToggleStyle(view === "categories")}><FolderTree size={iconSize} /> Categorías</button>
        <button onClick={() => setView("collections")} style={viewToggleStyle(view === "collections")}><Layers size={iconSize} /> Colecciones</button>
      </div>

      {/* Search + filter */}
      {view === "products" && <div className="iv-filterbar">
        <div className="iv-searchbox">
          <Search size={16} color="#64748b" style={{ position: "absolute", left: 14, top: 13, pointerEvents: "none" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, ID, marca..."
            style={{ width: "100%", height: 42, padding: "0 44px 0 38px", border: `1px solid ${search ? "#f472b6" : C.darkLine}`, borderRadius: 999, fontSize: 15, outline: "none", fontFamily: "inherit", background: C.white, boxSizing: "border-box", boxShadow: search ? "0 0 0 3px rgba(244,114,182,0.14)" : "none" }} />
          {search && (
            <button onClick={() => setSearch("")} title="Limpiar búsqueda" aria-label="Limpiar búsqueda"
              style={{ position: "absolute", right: 8, top: 6, width: 30, height: 30, border: "none", borderRadius: 999, background: "#eef2f7", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={15} />
            </button>
          )}
        </div>
        <FilterMenu
          label="Categoría"
          value={catFilter}
          options={categoryOptions}
          defaultValue="__all"
          width={250}
          onChange={setCatFilter}
        />
        <FilterMenu
          label="Estado"
          value={visibilityFilter}
          options={visibilityOptions}
          defaultValue="all"
          width={210}
          onChange={(value) => setVisibilityFilter(value as typeof visibilityFilter)}
        />
        <FilterMenu
          label="Tag"
          value={tagFilter}
          options={tagOptions}
          defaultValue="__all"
          width={210}
          onChange={setTagFilter}
        />
        <button onClick={() => setEditing(makeNewProduct())} style={btnStyle("primary")}><Plus size={iconSize} /> Agregar artículo</button>
      </div>}

      {view === "products" && hasActiveFilters && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "-4px 0 14px" }}>
          <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 700 }}>Filtros activos:</span>
          {search.trim() && <FilterChip label={`Búsqueda: ${search}`} onClear={() => setSearch("")} />}
          {catFilter !== "__all" && activeCategory && <FilterChip label={activeCategory.label} color={activeCategory.color} onClear={() => setCatFilter("__all")} />}
          {tagFilter !== "__all" && activeTag && <FilterChip label={`Tag: ${activeTag.label}`} color={C.plum} onClear={() => setTagFilter("__all")} />}
          {visibilityFilter !== "all" && activeVisibility && <FilterChip label={activeVisibility.label} tone={activeVisibility.tone} onClear={() => setVisibilityFilter("all")} />}
          {tagFilter !== "__all" && (
            <>
              <button onClick={() => setProductsWithActiveTagVisibility(true)} disabled={bulkSaving} style={{ ...btnStyle("secondaryDark"), height: 30, fontSize: 13, padding: "0 10px" }}><Eye size={13} /> Mostrar tag</button>
              <button onClick={() => setProductsWithActiveTagVisibility(false)} disabled={bulkSaving} style={{ ...btnStyle("secondaryDark"), height: 30, fontSize: 13, padding: "0 10px" }}><EyeOff size={13} /> Ocultar tag</button>
            </>
          )}
          <button onClick={clearProductFilters} style={{ ...btnStyle("secondaryDark"), height: 30, fontSize: 13, padding: "0 10px" }}>Limpiar filtros</button>
        </div>
      )}

      {view === "products" && (
        <div className="iv-bulkbar">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#e2e8f0", fontSize: 14, fontWeight: 600, cursor: filtered.length > 0 ? "pointer" : "default" }}>
            <input
              type="checkbox"
              checked={allFilteredSelected}
              disabled={filtered.length === 0}
              onChange={toggleSelectFiltered}
              style={{ width: 16, height: 16, accentColor: C.plum }}
            />
            {allFilteredSelected ? "Quitar selección visible" : `Seleccionar visibles (${filtered.length})`}
          </label>
          <div className="iv-bulk-actions">
            <span style={{ color: "#cbd5e1", fontSize: 14 }}>{selectedProducts.length} seleccionados</span>
            <div className="iv-action-group">
              <button
                onClick={clearSelection}
                disabled={selectedProducts.length === 0}
                style={{ ...btnStyle("secondaryDark"), height: 34, opacity: selectedProducts.length === 0 ? 0.45 : 1, cursor: selectedProducts.length === 0 ? "not-allowed" : "pointer" }}
              >
                <X size={14} /> Limpiar
              </button>
              <button
                onClick={() => setSelectedVisibility(true)}
                disabled={selectedProducts.length === 0 || bulkSaving}
                style={{ ...btnStyle("secondaryDark"), height: 34, opacity: selectedProducts.length === 0 ? 0.45 : 1 }}
              >
                <Eye size={14} /> Mostrar
              </button>
              <button
                onClick={() => setSelectedVisibility(false)}
                disabled={selectedProducts.length === 0 || bulkSaving}
                style={{ ...btnStyle("secondaryDark"), height: 34, opacity: selectedProducts.length === 0 ? 0.45 : 1 }}
              >
                <EyeOff size={14} /> Ocultar
              </button>
            </div>
            <div className="iv-action-group iv-action-group-tags">
              <select
                className="iv-bulk-select"
                value={bulkTag}
                onChange={(event) => setBulkTag(event.target.value)}
                disabled={selectedProducts.length === 0 || bulkSaving}
              >
                <option value="">Elegir tag</option>
                {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <button
                onClick={addTagToSelected}
                disabled={selectedProducts.length === 0 || !bulkTag || bulkSaving}
                style={{ ...btnStyle("secondaryDark"), height: 34, opacity: selectedProducts.length === 0 || !bulkTag ? 0.45 : 1 }}
              >
                <Tag size={14} /> Agregar tag
              </button>
              <button
                onClick={removeTagFromSelected}
                disabled={selectedProducts.length === 0 || !bulkTag || bulkSaving}
                style={{ ...btnStyle("secondaryDark"), height: 34, opacity: selectedProducts.length === 0 || !bulkTag ? 0.45 : 1 }}
              >
                <TagOffIcon size={14} /> Quitar tag
              </button>
            </div>
            <div className="iv-action-group iv-action-group-danger">
              <button
                onClick={() => requestDelete(selectedProducts, "bulk")}
                disabled={selectedProducts.length === 0}
                style={{ ...btnStyle("danger"), height: 34, opacity: selectedProducts.length === 0 ? 0.45 : 1, cursor: selectedProducts.length === 0 ? "not-allowed" : "pointer" }}
              >
                <Trash2 size={14} /> Eliminar seleccionados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {view === "products" && (
        <>
          <div className="iv-product-grid">
            {filtered.map(p => (
              <MiniCard
                key={p._id}
                prod={p}
                onEdit={() => setEditing(p)}
                client={client}
                selected={selectedIds.has(p._id)}
                deleting={deletingIds.has(p._id)}
                onToggleSelected={() => toggleSelected(p._id)}
                onRequestDelete={() => requestDelete([p], "single")}
                onUpdate={updated => setProds(ps => ps.map(x => x._id === updated._id ? updated : x))}
              />
            ))}
          </div>
          {filtered.length === 0 && <EmptyState icon={<Search size={24} />} text="Sin resultados" />}
        </>
      )}

      {view === "categories" && (
        <CategoryManager
          cats={cats}
          subcats={subcats}
          prods={prods}
          client={client}
          onCategoryDeleted={(id) => {
            setCats(cs => cs.filter(c => c._id !== id));
            if (catFilter === id) setCatFilter("__all");
          }}
          onCategoryCreated={(cat) => setCats(cs => [...cs, cat])}
          onCategoryUpdated={(updated) => {
            setCats(cs => cs.map(c => c._id === updated._id ? updated : c));
            setSubcats(ss => ss.map(sc => sc.categoria?._id === updated._id ? { ...sc, categoria: { _id: updated._id, nombre: updated.nombre, color: updated.color } } : sc));
            setProds(ps => ps.map(p => p.subcategoria?.categoria?._id === updated._id ? { ...p, subcategoria: { ...p.subcategoria, categoria: { _id: updated._id, nombre: updated.nombre, color: updated.color } } } : p));
          }}
          onSubcategoryDeleted={(id) => {
            setSubcats(ss => ss.filter(sc => sc._id !== id));
          }}
          onSubcategoryCreated={(subcat) => setSubcats(ss => [...ss, subcat])}
          onSubcategoryUpdated={(updated) => {
            setSubcats(ss => ss.map(sc => sc._id === updated._id ? updated : sc));
            setProds(ps => ps.map(p => p.subcategoria?._id === updated._id ? { ...p, subcategoria: updated } : p));
          }}
        />
      )}

      {view === "collections" && (
        <CollectionManager
          collections={collections}
          products={prods}
          client={client}
          onCreate={() => setEditingCollection(makeNewCollection())}
          onEdit={setEditingCollection}
          onDeleted={(id) => setCollections((current) => current.filter((collection) => collection._id !== id))}
          onDemoCreated={(created) => setCollections((current) => {
            const existing = new Set(current.map((collection) => canonicalId(collection._id)));
            return [...current, ...created.filter((collection) => !existing.has(canonicalId(collection._id)))];
          })}
        />
      )}

      {view === "featured" && (
        <FeaturedGalleryManager
          gallery={featuredGallery}
          client={client}
          onSaved={setFeaturedGallery}
        />
      )}

      {/* Edit drawer */}
      {editing && <EditDrawer prod={editing} client={client} subcats={subcats} allTags={allTags} onClose={() => setEditing(null)} onSaved={handleSaved} />}
      {editingCollection && (
        <CollectionEditor
          collection={editingCollection}
          products={prods}
          client={client}
          onClose={() => setEditingCollection(null)}
          onSaved={(saved) => {
            setCollections((current) => current.some((collection) => collection._id === saved._id)
              ? current.map((collection) => collection._id === saved._id ? saved : collection)
              : [saved, ...current]);
            setEditingCollection(null);
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal
          request={confirmDelete}
          deleting={deletingIds.size > 0}
          error={deleteError}
          onCancel={() => deletingIds.size === 0 && setConfirmDelete(null)}
          onConfirm={confirmDeleteProducts}
        />
      )}
    </div>
  );
}

// ── Mini Card ─────────────────────────────────────────────────────
function MiniCard({
  prod: p,
  onEdit,
  client,
  selected,
  deleting,
  onToggleSelected,
  onRequestDelete,
  onUpdate,
}: {
  prod: SProd;
  onEdit: () => void;
  client: ReturnType<typeof useClient>;
  selected: boolean;
  deleting: boolean;
  onToggleSelected: () => void;
  onRequestDelete: () => void;
  onUpdate: (p: SProd) => void;
}) {
  const [saving, setSaving] = useState(false);
  const thumb = imageUrl(p.imagenes?.[0], client, 180, 180);
  const destacadoUbicaciones = p.destacadoUbicaciones || (p.destacado ? ["preCatalog"] as DestacadoUbicacion[] : []);
  const isDestacado = destacadoUbicaciones.length > 0;
  const toggle = async (field: "visible") => {
    setSaving(true);
    const val = p.visible === false;
    await client.patch(p._id).set({ [field]: val }).commit();
    onUpdate({ ...p, [field]: val });
    setSaving(false);
  };
  const toggleDestacado = async () => {
    setSaving(true);
    const next: DestacadoUbicacion[] = isDestacado ? [] : ["preCatalog"];
    await client.patch(p._id).set({ destacadoUbicaciones: next, destacado: next.length > 0 }).commit();
    onUpdate({ ...p, destacadoUbicaciones: next, destacado: next.length > 0 });
    setSaving(false);
  };

  return (
    <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${selected ? C.plum : p.visible !== false ? "rgba(255,255,255,0.08)" : "#fca5a5"}`, opacity: p.visible !== false ? 1 : 0.68, display: "grid", gridTemplateColumns: "92px minmax(0, 1fr)", minHeight: 154, position: "relative", overflow: "hidden", boxShadow: selected ? "0 0 0 2px rgba(210,56,108,0.25), 0 10px 22px rgba(0,0,0,0.22)" : "0 10px 22px rgba(0,0,0,0.22)" }}>
      <label title={selected ? "Quitar de la selección" : "Seleccionar"} style={{ position: "absolute", top: 10, left: 10, zIndex: 2, width: 26, height: 26, borderRadius: 7, background: selected ? C.plum : "rgba(255,255,255,0.92)", border: `1px solid ${selected ? C.plum : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.16)" }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          disabled={deleting}
          style={{ width: 15, height: 15, accentColor: C.plum, cursor: "pointer" }}
        />
      </label>
      <div style={{ width: 92, minHeight: 154, background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {thumb ? (
          <img src={thumb} alt={p.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <ImageIcon size={28} color="#8792a5" />
        )}
      </div>
      {/* Left: info */}
      <div style={{ padding: "14px 92px 52px 14px", minWidth: 0 }}>
        <div title={`${p.subcategoria?.categoria?.nombre || ""} › ${p.subcategoria?.nombre || ""}`} style={{ fontSize: 12, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: p.subcategoria?.categoria?.color || C.plum, flexShrink: 0, boxShadow: "0 0 0 1px rgba(15,23,42,0.12)" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.subcategoria?.categoria?.nombre} › {p.subcategoria?.nombre}</span>
        </div>
        <div title={p.nombre} style={{ fontSize: 15.5, fontWeight: 700, color: C.ink, lineHeight: 1.26, marginTop: 5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.nombre}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          {p.idExcel && <span style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>{p.idExcel}</span>}
          <span style={{ fontSize: 12, color: p._id.startsWith("drafts.") ? C.orange : "#64748b", fontFamily: "monospace" }}>
            {p._id.startsWith("drafts.") ? "draft" : "pub"}
          </span>
          {p.marca && p.marca !== "Genérico" && <span style={{ fontSize: 13, color: C.plum }}>{p.marca}</span>}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: C.inkSoft }}>{p.presentaciones?.length || 0} pres{p.stock != null ? ` · Stock: ${p.stock}` : ""}</span>
          {p.imagenes && p.imagenes.length > 0 && <span style={{ fontSize: 14, color: C.green, display: "inline-flex", alignItems: "center", gap: 3 }}><ImageIcon size={13} /> {p.imagenes.length}</span>}
        </div>
      </div>
      {/* Right: actions */}
      <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
          <MiniToggle on={p.visible !== false} icon={p.visible !== false ? <Eye size={iconSize} /> : <EyeOff size={iconSize} />} onClick={() => toggle("visible")} disabled={saving || deleting} title={p.visible !== false ? "Ocultar" : "Mostrar"} />
          <MiniToggle on={isDestacado} icon={<Star size={iconSize} fill={isDestacado ? "currentColor" : "none"} />} onClick={toggleDestacado} disabled={saving || deleting} title={isDestacado ? "Quitar destacados" : "Destacar en precatálogo"} />
      </div>
      <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", gap: 4 }}>
          <button onClick={onRequestDelete} disabled={saving || deleting} title="Eliminar producto" style={{ ...btnStyle("danger"), height: 34, width: 36, padding: 0, justifyContent: "center", opacity: deleting ? 0.65 : 1 }}>
            {deleting ? <Loader2 size={14} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Trash2 size={14} />}
          </button>
          <button onClick={onEdit} disabled={deleting} style={{ ...btnStyle("primary"), height: 34, fontSize: 14, padding: "0 12px", opacity: deleting ? 0.65 : 1 }}><Pencil size={14} /> Editar</button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ request, deleting, error, onCancel, onConfirm }: {
  request: DeleteRequest;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = request.products.length;
  const isBulk = request.mode === "bulk";
  const preview = request.products.slice(0, 8);
  const totalPresentations = request.products.reduce((sum, p) => sum + (p.presentaciones?.length || 0), 0);
  const totalImages = request.products.reduce((sum, p) => sum + (p.imagenes?.length || 0), 0);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-products-title" style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(15, 18, 31, 0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "min(560px, 100%)", maxHeight: "min(760px, 92vh)", overflow: "auto", background: C.white, borderRadius: 12, boxShadow: "0 24px 80px rgba(0,0,0,0.38)", border: "1px solid rgba(15,23,42,0.12)" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 id="delete-products-title" style={{ margin: 0, fontSize: 20, color: C.ink, fontWeight: 800 }}>
              {isBulk ? `Eliminar ${count} artículos` : "Eliminar artículo"}
            </h2>
            <p style={{ margin: "4px 0 0", color: C.inkSoft, fontSize: 14 }}>
              Esta acción elimina documentos del CMS y no se puede deshacer desde esta vista.
            </p>
          </div>
          <button onClick={onCancel} disabled={deleting} title="Cancelar" style={{ ...btnStyle("secondary"), width: 36, height: 36, padding: 0, justifyContent: "center", opacity: deleting ? 0.5 : 1 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, color: "#991b1b", fontSize: 14, lineHeight: 1.45, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Confirma que quieres eliminar {isBulk ? "estos artículos" : "este artículo"}. Si solo quieres que no aparezca en la web, cancela y usa el botón de ojo para ocultarlo.
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
            <div style={deleteStatStyle}><strong>{count}</strong><span>artículos</span></div>
            <div style={deleteStatStyle}><strong>{totalPresentations}</strong><span>presentaciones</span></div>
            <div style={deleteStatStyle}><strong>{totalImages}</strong><span>imágenes</span></div>
          </div>

          <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            {preview.map(p => (
              <div key={p._id} style={{ padding: "10px 12px", borderBottom: "1px solid #eef2f7", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: C.ink, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre}</div>
                  <div style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace" }}>{p.idExcel || "sin ID Excel"} · {p._id}</div>
                </div>
                <span style={{ color: p.visible === false ? C.orange : C.green, fontSize: 12, fontWeight: 700 }}>{p.visible === false ? "oculto" : "visible"}</span>
              </div>
            ))}
            {count > preview.length && (
              <div style={{ padding: "10px 12px", color: C.inkSoft, fontSize: 13 }}>
                Y {count - preview.length} artículos más...
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: 14, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: 12, fontSize: 14 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 10, background: "#f8fafc" }}>
          <button onClick={onCancel} disabled={deleting} style={{ ...btnStyle("secondary"), opacity: deleting ? 0.55 : 1 }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{ ...btnStyle("danger"), background: C.red, color: "#fff", border: "1px solid #b91c1c", opacity: deleting ? 0.75 : 1 }}>
            {deleting ? <Loader2 size={15} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Trash2 size={15} />}
            {deleting ? "Eliminando..." : "Confirmar eliminación"}
          </button>
        </div>
      </div>
    </div>
  );
}

const deleteStatStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "10px 8px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  color: C.inkSoft,
  fontSize: 12,
};

function FilterMenu({ label, value, options, defaultValue, width, onChange }: {
  label: string;
  value: string;
  options: FilterOption[];
  defaultValue: string;
  width: number;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value) || options[0];
  const active = value !== defaultValue;

  return (
    <div className="iv-filter-control" style={{ "--iv-filter-width": `${width}px`, position: "relative", width } as React.CSSProperties} onBlur={(e) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 10,
          border: `1px solid ${active ? "#f472b6" : C.darkLine}`,
          background: active ? "#fff1f7" : C.white,
          color: active ? C.plum : C.ink,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "0 12px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: active ? 700 : 600,
          boxShadow: active ? "0 0 0 3px rgba(244,114,182,0.14)" : "none",
        }}
      >
        <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <OptionMarker option={selected} />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.label} {selected.count != null ? `(${selected.count})` : ""}
          </span>
        </span>
        <ChevronDown size={15} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", zIndex: 50, top: 48, left: 0, right: 0, background: C.white, color: C.ink, border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 18px 36px rgba(15,23,42,0.28)", padding: 6, maxHeight: 320, overflow: "auto" }}>
          <div style={{ padding: "6px 8px 8px", fontSize: 11, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>{label}</div>
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(option.value); setOpen(false); }}
                style={{
                  width: "100%",
                  border: `1px solid ${isSelected ? "#f9a8d4" : "transparent"}`,
                  background: isSelected ? "#fff1f7" : "transparent",
                  color: isSelected ? C.plum : C.ink,
                  borderRadius: 8,
                  padding: "8px 9px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: isSelected ? 800 : 600,
                  textAlign: "left",
                }}
              >
                <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <OptionMarker option={option} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{option.label}</span>
                </span>
                {option.count != null && <span style={{ flexShrink: 0, fontSize: 12, color: isSelected ? C.plum : C.inkSoft }}>{option.count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OptionMarker({ option }: { option: FilterOption }) {
  const color =
    option.color ||
    (option.tone === "visible" ? C.green :
      option.tone === "hidden" ? C.orange :
        option.tone === "duplicates" ? "#7c3aed" :
          "#94a3b8");

  return (
    <span style={{ width: 10, height: 10, borderRadius: option.tone === "all" ? 999 : 3, background: color, flexShrink: 0, boxShadow: "0 0 0 1px rgba(15,23,42,0.12)" }} />
  );
}

function FilterChip({ label, color, tone, onClear }: { label: string; color?: string; tone?: FilterOption["tone"]; onClear: () => void }) {
  const markerColor =
    color ||
    (tone === "visible" ? C.green :
      tone === "hidden" ? C.orange :
        tone === "duplicates" ? "#7c3aed" :
          "#94a3b8");

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 30, borderRadius: 999, border: "1px solid rgba(244,114,182,0.42)", background: "rgba(244,114,182,0.12)", color: "#fce7f3", padding: "0 8px 0 10px", fontSize: 13, fontWeight: 700 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: markerColor, flexShrink: 0 }} />
      <span style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <button onClick={onClear} title="Quitar filtro" aria-label="Quitar filtro" style={{ border: "none", background: "rgba(255,255,255,0.14)", color: "#fce7f3", width: 20, height: 20, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
        <X size={12} />
      </button>
    </span>
  );
}

function TagOffIcon({ size = 14 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
      <Tag size={size} />
      <span style={{ position: "absolute", width: Math.round(size * 1.35), height: 2, borderRadius: 999, background: "currentColor", transform: "rotate(-38deg)" }} />
    </span>
  );
}

function MiniToggle({ on, icon, onClick, disabled, title }: { on: boolean; icon: React.ReactNode; onClick: () => void; disabled: boolean; title: string }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ width: 30, height: 34, borderRadius: 8, border: `1px solid ${on ? C.green : "#d1d5db"}`, background: on ? "#f0fdf4" : "#f9fafb", color: on ? C.green : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {icon}
    </button>
  );
}

function FeaturedGalleryManager({
  gallery,
  client,
  onSaved,
}: {
  gallery: SFeaturedGallery;
  client: ReturnType<typeof useClient>;
  onSaved: (gallery: SFeaturedGallery) => void;
}) {
  const [draft, setDraft] = useState<SFeaturedGallery>(() => JSON.parse(JSON.stringify(gallery)));
  const [selectedKey, setSelectedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"image" | "thumbnail" | "">("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const next = JSON.parse(JSON.stringify(gallery)) as SFeaturedGallery;
    setDraft(next);
    setSelectedKey(next.items?.[0]?._key || "");
  }, [gallery]);

  const sortedItems = useMemo(
    () => [...(draft.items || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [draft.items]
  );
  const selectedItem = sortedItems.find((item) => item._key === selectedKey) || sortedItems[0] || null;
  const activeCount = sortedItems.filter((item) => item.active !== false).length;

  const setField = <K extends keyof SFeaturedGallery>(field: K, value: SFeaturedGallery[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const setItem = (key: string, patch: Partial<SFeaturedGalleryItem>) => {
    setDraft((current) => ({
      ...current,
      items: (current.items || []).map((item) => item._key === key ? { ...item, ...patch } : item),
    }));
  };

  const addItem = () => {
    const item = { ...makeNewFeaturedItem(), orden: sortedItems.length };
    setDraft((current) => ({ ...current, items: [...(current.items || []), item] }));
    setSelectedKey(item._key);
  };

  const removeItem = (key: string) => {
    const item = sortedItems.find((entry) => entry._key === key);
    if (!item || !window.confirm(`¿Eliminar la card "${item.titulo || "sin título"}"?`)) return;
    setDraft((current) => {
      const nextItems = (current.items || [])
        .filter((entry) => entry._key !== key)
        .map((entry, index) => ({ ...entry, orden: index }));
      setSelectedKey(nextItems[0]?._key || "");
      return { ...current, items: nextItems };
    });
  };

  const moveItem = (key: string, direction: -1 | 1) => {
    setDraft((current) => {
      const next = [...(current.items || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
      const index = next.findIndex((item) => item._key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return { ...current, items: next.map((entry, order) => ({ ...entry, orden: order })) };
    });
  };

  const uploadImage = async (kind: "image" | "thumbnail", files: FileList | null) => {
    if (!selectedItem || !files?.[0]) return;
    setUploading(kind);
    try {
      const asset = await uploadOptimizedImage(client, files[0]);
      const image = { _key: uid(), _type: "image", asset: { _ref: asset._id, url: asset.url } };
      setItem(selectedItem._key, kind === "image" ? { imagen: image } : { youtubeThumbnail: image });
    } finally {
      setUploading("");
      if (kind === "image" && imageInputRef.current) imageInputRef.current.value = "";
      if (kind === "thumbnail" && thumbInputRef.current) thumbInputRef.current.value = "";
    }
  };

  const toImageDoc = (image?: SImg) => {
    if (!image?.asset?._ref) return undefined;
    return { _type: "image", asset: { _type: "reference", _ref: image.asset._ref } };
  };

  const save = async () => {
    setSaving(true);
    try {
      const items = sortedItems.map((item, index) => {
        const mediaType = item.mediaType || "image";
        const doc: Record<string, unknown> = {
          _key: item._key || uid(),
          _type: "featuredGalleryItem",
          titulo: item.titulo?.trim() || "Card destacada",
          descripcion: item.descripcion || "",
          mediaType,
          mediaOrientation: item.mediaOrientation || (mediaType === "youtube" ? "horizontal" : "vertical"),
          alt: item.alt || "",
          focalPosition: item.focalPosition || "",
          youtubeUrl: item.youtubeUrl || "",
          meta: item.meta || "",
          ctaText: item.ctaText || "",
          ctaHref: item.ctaHref || "",
          ctaAction: item.ctaAction || "whatsapp",
          whatsappMessage: item.whatsappMessage || "",
          targetSection: item.targetSection || "catalogo",
          active: item.active !== false,
          orden: index,
        };
        const image = toImageDoc(item.imagen);
        const thumb = toImageDoc(item.youtubeThumbnail);
        if (image) doc.imagen = image;
        if (thumb) doc.youtubeThumbnail = thumb;
        return doc;
      });

      const data = {
        titulo: draft.titulo || "Ideas nuevas para celebrar",
        subtitulo: draft.subtitulo || "",
        active: draft.active !== false,
        items,
      };

      await client.createIfNotExists({ _id: "featuredGallery", _type: "featuredGallery" });
      await client.patch("featuredGallery").set(data).commit();
      onSaved({
        _id: "featuredGallery",
        titulo: data.titulo,
        subtitulo: data.subtitulo,
        active: data.active,
        items: sortedItems.map((item, index) => ({ ...item, orden: index })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.darkLine}`, borderRadius: 12, padding: 14 }}>
        <div>
          <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <GalleryHorizontalEnd size={20} color="#f472b6" /> Novedades
          </h2>
          <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: 14 }}>
            Edita el título, estado y cards de la sección de novedades destacadas sin salir de la vista interactiva.
          </p>
        </div>
        <button onClick={save} disabled={saving} style={{ ...btnStyle("save"), opacity: saving ? 0.72 : 1 }}>
          {saving ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={iconSize} />}
          {saving ? "Guardando..." : "Guardar sección"}
        </button>
      </div>

      <div className="iv-feature-grid" style={{ display: "grid", gridTemplateColumns: "minmax(260px, 0.35fr) minmax(0, 0.65fr)", gap: 14 }}>
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div style={{ background: C.white, borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
            <Field label="Título de sección">
              <input value={draft.titulo || ""} onChange={(event) => setField("titulo", event.target.value)} style={inputStyle(C.white, "#d1d5db")} />
            </Field>
            <Field label="Descripción breve">
              <textarea value={draft.subtitulo || ""} onChange={(event) => setField("subtitulo", event.target.value)} rows={3} style={{ ...inputStyle(C.white, "#d1d5db"), height: "auto", padding: "8px 12px" }} />
            </Field>
            <ToggleField label="Sección activa" help="Si está desactivada no se muestra en la web." value={draft.active !== false} onChange={(value) => setField("active", value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <CountBox label="Cards" value={sortedItems.length} />
              <CountBox label="Activas" value={activeCount} />
            </div>
            <button onClick={addItem} style={{ ...btnStyle("primary"), justifyContent: "center" }}><Plus size={iconSize} /> Agregar card</button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {sortedItems.map((item, index) => {
              const thumb = imageUrl(item.mediaType === "youtube" ? item.youtubeThumbnail : item.imagen, client, 160, 120);
              const selected = selectedItem?._key === item._key;
              return (
                <button
                  key={item._key}
                  onClick={() => setSelectedKey(item._key)}
                  style={{ display: "grid", gridTemplateColumns: "70px minmax(0, 1fr)", gap: 10, alignItems: "center", textAlign: "left", border: `1px solid ${selected ? "#f9a8d4" : C.darkLine}`, background: selected ? "#fff1f7" : C.surface, borderRadius: 12, padding: 8, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span style={{ height: 54, borderRadius: 9, overflow: "hidden", background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#8792a5" />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", color: selected ? C.plum : "#f8fafc", fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {index + 1}. {item.titulo || "Card sin título"}
                    </span>
                    <span style={{ display: "block", color: selected ? C.inkSoft : "#94a3b8", fontSize: 12, marginTop: 2 }}>
                      {item.mediaType === "youtube" ? "YouTube" : "Imagen"} · {item.active === false ? "oculta" : "activa"}
                    </span>
                  </span>
                </button>
              );
            })}
            {sortedItems.length === 0 && <EmptyState icon={<GalleryHorizontalEnd size={24} />} text="Todavía no hay cards destacadas." />}
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 12, padding: 14, minHeight: 420 }}>
          {selectedItem ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, color: C.ink, fontSize: 20 }}>{selectedItem.titulo || "Card sin título"}</h3>
                  <div style={{ color: C.inkSoft, fontSize: 13 }}>{selectedItem.mediaType === "youtube" ? "Video de YouTube" : "Imagen destacada"}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => moveItem(selectedItem._key, -1)} style={{ ...btnStyle("secondary"), width: 36, height: 34, padding: 0, justifyContent: "center" }} title="Subir orden"><ChevronDown size={14} style={{ transform: "rotate(180deg)" }} /></button>
                  <button onClick={() => moveItem(selectedItem._key, 1)} style={{ ...btnStyle("secondary"), width: 36, height: 34, padding: 0, justifyContent: "center" }} title="Bajar orden"><ChevronDown size={14} /></button>
                  <button onClick={() => removeItem(selectedItem._key)} style={{ ...btnStyle("danger"), width: 36, height: 34, padding: 0, justifyContent: "center" }} title="Eliminar card"><Trash2 size={14} /></button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <Field label="Título">
                  <input value={selectedItem.titulo || ""} onChange={(event) => setItem(selectedItem._key, { titulo: event.target.value })} style={inputStyle(C.white, "#d1d5db")} />
                </Field>
                <Field label="Meta / mini título">
                  <input value={selectedItem.meta || ""} onChange={(event) => setItem(selectedItem._key, { meta: event.target.value })} style={inputStyle(C.white, "#d1d5db")} placeholder="Ej: Nuevo, Video, Campaña escolar" />
                </Field>
              </div>

              <Field label="Descripción">
                <textarea value={selectedItem.descripcion || ""} onChange={(event) => setItem(selectedItem._key, { descripcion: event.target.value })} rows={3} style={{ ...inputStyle(C.white, "#d1d5db"), height: "auto", padding: "8px 12px" }} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                <Field label="Tipo de media">
                  <select value={selectedItem.mediaType || "image"} onChange={(event) => setItem(selectedItem._key, { mediaType: event.target.value as FeaturedMediaType })} style={inputStyle(C.white, "#d1d5db")}>
                    <option value="image">Imagen</option>
                    <option value="youtube">Video de YouTube</option>
                  </select>
                </Field>
                <Field label="Formato">
                  <select value={selectedItem.mediaOrientation || "vertical"} onChange={(event) => setItem(selectedItem._key, { mediaOrientation: event.target.value as FeaturedOrientation })} style={inputStyle(C.white, "#d1d5db")}>
                    <option value="vertical">Vertical / historia</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </Field>
                <ToggleField label="Card activa" value={selectedItem.active !== false} onChange={(value) => setItem(selectedItem._key, { active: value })} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {selectedItem.mediaType !== "youtube" ? (
                  <MediaPicker
                    label="Imagen"
                    image={selectedItem.imagen}
                    client={client}
                    uploading={uploading === "image"}
                    inputRef={imageInputRef}
                    onUpload={(files) => uploadImage("image", files)}
                    onRemove={() => setItem(selectedItem._key, { imagen: undefined })}
                  />
                ) : (
                  <>
                    <Field label="Link de YouTube">
                      <input value={selectedItem.youtubeUrl || ""} onChange={(event) => setItem(selectedItem._key, { youtubeUrl: event.target.value })} style={inputStyle(C.white, "#d1d5db")} placeholder="https://youtu.be/..." />
                    </Field>
                    <MediaPicker
                      label="Thumbnail opcional"
                      image={selectedItem.youtubeThumbnail}
                      client={client}
                      uploading={uploading === "thumbnail"}
                      inputRef={thumbInputRef}
                      onUpload={(files) => uploadImage("thumbnail", files)}
                      onRemove={() => setItem(selectedItem._key, { youtubeThumbnail: undefined })}
                    />
                  </>
                )}
                <Field label="Texto alternativo / foco">
                  <div style={{ display: "grid", gap: 8 }}>
                    <input value={selectedItem.alt || ""} onChange={(event) => setItem(selectedItem._key, { alt: event.target.value })} style={inputStyle(C.white, "#d1d5db")} placeholder="Texto alternativo" />
                    <input value={selectedItem.focalPosition || ""} onChange={(event) => setItem(selectedItem._key, { focalPosition: event.target.value })} style={inputStyle(C.white, "#d1d5db")} placeholder="50% 35%, center..." />
                  </div>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                <Field label="Texto CTA">
                  <input value={selectedItem.ctaText || ""} onChange={(event) => setItem(selectedItem._key, { ctaText: event.target.value })} style={inputStyle(C.white, "#d1d5db")} />
                </Field>
                <Field label="Acción CTA">
                  <select value={selectedItem.ctaAction || "whatsapp"} onChange={(event) => setItem(selectedItem._key, { ctaAction: event.target.value as FeaturedCtaAction })} style={inputStyle(C.white, "#d1d5db")}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="scroll">Scroll interno</option>
                  </select>
                </Field>
                {selectedItem.ctaAction === "scroll" ? (
                  <Field label="Sección destino">
                    <select value={selectedItem.targetSection || "catalogo"} onChange={(event) => setItem(selectedItem._key, { targetSection: event.target.value })} style={inputStyle(C.white, "#d1d5db")}>
                      <option value="novedades">Novedades</option>
                      <option value="catalogo">Catálogo</option>
                      <option value="horarios">Horarios</option>
                      <option value="contacto">Contacto</option>
                    </select>
                  </Field>
                ) : (
                  <Field label="Mensaje WhatsApp">
                    <input value={selectedItem.whatsappMessage || ""} onChange={(event) => setItem(selectedItem._key, { whatsappMessage: event.target.value })} style={inputStyle(C.white, "#d1d5db")} />
                  </Field>
                )}
              </div>

              <Field label="URL CTA opcional">
                <input value={selectedItem.ctaHref || ""} onChange={(event) => setItem(selectedItem._key, { ctaHref: event.target.value })} style={inputStyle(C.white, "#d1d5db")} placeholder="https://..." />
              </Field>
            </div>
          ) : (
            <EmptyState icon={<GalleryHorizontalEnd size={24} />} text="Agrega una card para empezar a editar la sección." />
          )}
        </div>
      </div>
    </div>
  );
}

function MediaPicker({
  label,
  image,
  client,
  uploading,
  inputRef,
  onUpload,
  onRemove,
}: {
  label: string;
  image?: SImg;
  client: ReturnType<typeof useClient>;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (files: FileList | null) => void;
  onRemove: () => void;
}) {
  const preview = imageUrl(image, client, 520, 360);

  return (
    <div>
      <label style={{ display: "block", fontSize: 16, fontWeight: 600, color: C.inkSoft, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => onUpload(event.target.files)} />
      <div style={{ border: "1px solid #d1d5db", borderRadius: 12, overflow: "hidden", background: "#f8fafc" }}>
        <button onClick={() => inputRef.current?.click()} style={{ width: "100%", aspectRatio: "16 / 10", border: "none", padding: 0, background: "#eef2f7", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {uploading ? <Loader2 size={22} color={C.plum} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : preview ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImagePlus size={28} color="#8792a5" />}
        </button>
        <div style={{ display: "flex", gap: 8, padding: 8 }}>
          <button onClick={() => inputRef.current?.click()} style={{ ...btnStyle("secondary"), height: 32, fontSize: 13, padding: "0 10px" }}><Upload size={13} /> Subir</button>
          {preview && <button onClick={onRemove} style={{ ...btnStyle("danger"), height: 32, fontSize: 13, padding: "0 10px" }}><Trash2 size={13} /> Quitar</button>}
        </div>
      </div>
    </div>
  );
}

function CollectionManager({
  collections,
  products,
  client,
  onCreate,
  onEdit,
  onDeleted,
  onDemoCreated,
}: {
  collections: SCollection[];
  products: SProd[];
  client: ReturnType<typeof useClient>;
  onCreate: () => void;
  onEdit: (collection: SCollection) => void;
  onDeleted: (id: string) => void;
  onDemoCreated: (collections: SCollection[]) => void;
}) {
  const [savingDemo, setSavingDemo] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const createDemoCollections = async () => {
    setSavingDemo(true);
    try {
      const existingSlugs = new Set(collections.map((collection) => collection.slug?.current).filter(Boolean));
      const visibleProducts = products.filter((product) => product.visible !== false && !product._id.startsWith("drafts."));
      const created: SCollection[] = [];

      for (const demo of DEMO_COLLECTIONS) {
        if (existingSlugs.has(demo.slug)) continue;
        const picked = pickProductsByKeywords(visibleProducts, demo.keywords).slice(0, 8);
        const doc = {
          _id: demo.id,
          _type: "album",
          titulo: demo.title,
          subtitulo: demo.subtitle,
          etiqueta: demo.label,
          slug: { _type: "slug", current: demo.slug },
          themeColor: demo.color,
          visible: true,
          orden: created.length,
          items: picked.map((product, index) => ({
            _key: uid(),
            _type: "albumItem",
            visible: true,
            mostrarEnPortada: index < 3,
            producto: { _type: "reference", _ref: canonicalId(product._id) },
          })),
        };
        await client.createIfNotExists(doc);
        created.push({
          _id: demo.id,
          titulo: demo.title,
          subtitulo: demo.subtitle,
          etiqueta: demo.label,
          slug: { current: demo.slug },
          themeColor: demo.color,
          visible: true,
          orden: created.length,
          items: picked.map((product, index) => ({ _key: uid(), visible: true, mostrarEnPortada: index < 3, producto: product })),
        });
      }

      onDemoCreated(created);
    } finally {
      setSavingDemo(false);
    }
  };

  const deleteCollection = async (collection: SCollection) => {
    if (!window.confirm(`¿Eliminar la colección "${collection.titulo}"?`)) return;
    setDeletingId(collection._id);
    try {
      await client.delete(collection._id);
      onDeleted(collection._id);
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: C.surface, border: `1px solid ${C.darkLine}`, borderRadius: 12, padding: 14 }}>
        <div>
          <h2 style={{ margin: 0, color: "#f8fafc", fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={20} color="#f472b6" /> Colecciones
          </h2>
          <p style={{ margin: "4px 0 0", color: "#cbd5e1", fontSize: 14 }}>
            Crea páginas compartibles como /halloween o /dia-del-padre con productos elegidos del catálogo.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={createDemoCollections} disabled={savingDemo} style={btnStyle("secondaryDark")}>
            {savingDemo ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <WandSparkles size={iconSize} />}
            Crear demos
          </button>
          <button onClick={onCreate} style={btnStyle("primary")}><Plus size={iconSize} /> Nueva colección</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {collections.map((collection) => {
          const thumb = imageUrl(collection.portada || collection.items?.find((item) => item.producto?.imagenes?.[0])?.producto?.imagenes?.[0], client, 420, 300);
          const slug = collection.slug?.current || slugify(collection.titulo);
          return (
            <article key={collection._id} style={{ overflow: "hidden", borderRadius: 14, border: `1px solid ${collection.visible === false ? "#fca5a5" : C.darkLine}`, background: C.white, boxShadow: "0 12px 28px rgba(0,0,0,0.24)" }}>
              <div style={{ height: 150, position: "relative", background: `linear-gradient(135deg, ${collection.themeColor || C.plum}33, #fff7ed)` }}>
                {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Palette size={30} color={collection.themeColor || C.plum} style={{ position: "absolute", left: 18, top: 18 }} />}
                <span style={{ position: "absolute", left: 12, bottom: 12, padding: "5px 9px", borderRadius: 999, background: collection.visible === false ? "#fee2e2" : "#dcfce7", color: collection.visible === false ? C.red : C.green, fontSize: 12, fontWeight: 800 }}>
                  {collection.visible === false ? "Oculta" : "Visible"}
                </span>
              </div>
              <div style={{ padding: 14, display: "grid", gap: 8 }}>
                <div style={{ color: collection.themeColor || C.plum, fontSize: 12, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.08em" }}>{collection.etiqueta || "Colección"}</div>
                <h3 style={{ margin: 0, color: C.ink, fontSize: 22, lineHeight: 1.05 }}>{collection.titulo}</h3>
                <div style={{ color: C.inkSoft, fontSize: 13 }}>/{slug} · {collection.items?.filter((item) => item.visible !== false).length || 0} productos visibles</div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ ...btnStyle("secondary"), height: 34, textDecoration: "none" }}><ExternalLink size={14} /> Abrir</a>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => deleteCollection(collection)} disabled={deletingId === collection._id} style={{ ...btnStyle("danger"), height: 34, width: 36, padding: 0, justifyContent: "center" }}>
                      {deletingId === collection._id ? <Loader2 size={14} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Trash2 size={14} />}
                    </button>
                    <button onClick={() => onEdit(collection)} style={{ ...btnStyle("primary"), height: 34 }}><Pencil size={14} /> Editar</button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {collections.length === 0 && <EmptyState icon={<Layers size={24} />} text="Todavía no hay colecciones. Puedes crear una o generar las demos." />}
    </div>
  );
}

function CollectionEditor({
  collection,
  products,
  client,
  onClose,
  onSaved,
}: {
  collection: SCollection;
  products: SProd[];
  client: ReturnType<typeof useClient>;
  onClose: () => void;
  onSaved: (collection: SCollection) => void;
}) {
  const [draft, setDraft] = useState<SCollection>(collection);
  const [productQuery, setProductQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const selectedIds = useMemo(() => new Set((draft.items || []).map((item) => item.producto?._id).filter(Boolean) as string[]), [draft.items]);
  const coverItemCount = useMemo(() => (draft.items || []).filter((item) => item.mostrarEnPortada).length, [draft.items]);
  const filteredProducts = useMemo(() => {
    return rankBySearch(products, productQuery, (product) => [
      product.nombre,
      product.idExcel,
      product.descripcion,
      product.marca,
      product.medidas,
      product.observaciones,
      product.subcategoria?.nombre,
      product.subcategoria?.categoria?.nombre,
      ...(product.tags || []),
      ...(product.presentaciones || []).map((presentacion) => presentacion.nombre),
    ]).slice(0, 80);
  }, [productQuery, products]);

  const setField = <K extends keyof SCollection>(field: K, value: SCollection[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleProduct = (product: SProd) => {
    setDraft((current) => {
      const exists = (current.items || []).some((item) => item.producto?._id === product._id);
      return {
        ...current,
        items: exists
          ? (current.items || []).filter((item) => item.producto?._id !== product._id)
          : [...(current.items || []), { _key: uid(), visible: true, producto: product }],
      };
    });
  };

  const toggleItemVisible = (productId: string) => {
    setDraft((current) => ({
      ...current,
      items: (current.items || []).map((item) => item.producto?._id === productId ? { ...item, visible: item.visible === false } : item),
    }));
  };

  const toggleCoverItem = (productId: string) => {
    setDraft((current) => {
      const currentCount = (current.items || []).filter((item) => item.mostrarEnPortada).length;
      return {
        ...current,
        items: (current.items || []).map((item) => {
          if (item.producto?._id !== productId) return item;
          if (item.mostrarEnPortada) return { ...item, mostrarEnPortada: false };
          if (currentCount >= 3) return item;
          return { ...item, mostrarEnPortada: true, visible: true };
        }),
      };
    });
  };

  const uploadCover = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const asset = await uploadOptimizedImage(client, file);
      setField("portada", { _type: "image", asset: { _ref: asset._id, url: asset.url } });
    } finally {
      setUploadingCover(false);
    }
  };

  const save = async () => {
    const title = draft.titulo.trim();
    if (!title) return;
    const slug = draft.slug?.current?.trim() || slugify(title);
    setSaving(true);
    try {
      const items = (draft.items || [])
        .filter((item) => item.producto && !item.producto._id.startsWith("drafts."))
        .map((item) => ({
          _key: item._key || uid(),
          _type: "albumItem",
          titulo: item.titulo,
          descripcion: item.descripcion,
          visible: item.visible !== false,
          mostrarEnPortada: item.mostrarEnPortada === true,
          producto: { _type: "reference", _ref: canonicalId(item.producto!._id) },
        }));
      const data = {
        titulo: title,
        subtitulo: draft.subtitulo || "",
        etiqueta: draft.etiqueta || "",
        slug: { _type: "slug", current: slug },
        themeColor: draft.themeColor || C.plum,
        visible: draft.visible !== false,
        orden: draft.orden || 0,
        items,
      };
      if (draft.portada?.asset?._ref) {
        Object.assign(data, {
          portada: {
            _type: "image",
            asset: { _type: "reference", _ref: draft.portada.asset._ref },
          },
        });
      }

      let savedId = draft._id;
      if (draft._id === "__new_collection__") {
        const created = await client.create({ _type: "album", ...data });
        savedId = created._id;
      } else {
        const patch = client.patch(draft._id).set(data);
        if (!draft.portada?.asset?._ref) patch.unset(["portada"]);
        await patch.commit();
      }

      onSaved({
        ...draft,
        _id: savedId,
        titulo: title,
        slug: { current: slug },
        themeColor: data.themeColor,
        visible: data.visible,
        items: (draft.items || []).filter((item) => item.producto && !item.producto._id.startsWith("drafts.")),
      });
    } finally {
      setSaving(false);
    }
  };

  const slug = draft.slug?.current || slugify(draft.titulo || "coleccion");

  const modalTopPadding = STRUCTURE_PANE_HEADER_OFFSET + 20;
  const modalMaxHeight = `calc(100vh - ${modalTopPadding + 20}px)`;

  return (
    <div role="dialog" aria-modal="true" className="iv-collection-modal" style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(15, 18, 31, 0.72)", display: "flex", justifyContent: "center", padding: `${modalTopPadding}px 20px 20px` }}>
      <div className="iv-collection-shell" style={{ width: "min(1120px, 100%)", maxHeight: modalMaxHeight, overflow: "auto", background: C.panel, borderRadius: 14, boxShadow: "0 24px 80px rgba(0,0,0,0.38)" }}>
        <div className="iv-collection-header" style={{ position: "sticky", top: 0, zIndex: 2, padding: "16px 18px", background: C.white, borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h2 style={{ margin: 0, color: C.ink, fontSize: 22 }}>Editar colección</h2>
            <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ color: C.plum, fontSize: 13, textDecoration: "none" }}>/{slug}</a>
          </div>
          <div className="iv-collection-actions">
            <button onClick={onClose} style={btnStyle("secondary")}><X size={iconSize} /> Cerrar</button>
            <button onClick={save} disabled={saving || !draft.titulo.trim()} style={{ ...btnStyle("save"), opacity: saving || !draft.titulo.trim() ? 0.6 : 1 }}>
              {saving ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={iconSize} />}
              Guardar
            </button>
          </div>
        </div>

        <div className="iv-collection-body" style={{ padding: 18 }}>
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <Field label="Título">
              <input value={draft.titulo} onChange={(event) => {
                const value = event.target.value;
                setDraft((current) => {
                  const previousAutoSlug = slugify(current.titulo || "");
                  const currentSlug = current.slug?.current || "";
                  const shouldUpdateSlug =
                    !currentSlug ||
                    currentSlug === previousAutoSlug ||
                    (currentSlug.length <= 3 && previousAutoSlug.startsWith(currentSlug));

                  return {
                    ...current,
                    titulo: value,
                    slug: { current: shouldUpdateSlug ? slugify(value) : currentSlug },
                  };
                });
              }} style={inputStyle(C.white, "#d1d5db")} placeholder="Ej: Halloween" />
            </Field>
            <Field label="Slug">
              <input value={draft.slug?.current || ""} onChange={(event) => setField("slug", { current: slugify(event.target.value) })} style={inputStyle(C.white, "#d1d5db")} placeholder="halloween" />
            </Field>
            <Field label="Etiqueta">
              <input value={draft.etiqueta || ""} onChange={(event) => setField("etiqueta", event.target.value)} style={inputStyle(C.white, "#d1d5db")} placeholder="Temporada" />
            </Field>
            <Field label="Descripción">
              <textarea value={draft.subtitulo || ""} onChange={(event) => setField("subtitulo", event.target.value)} rows={3} style={{ ...inputStyle(C.white, "#d1d5db"), height: "auto", padding: "8px 12px" }} />
            </Field>
            <Field label="Color principal" help="Elige un color base para botones y acentos de esta colección.">
              <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: 10, alignItems: "center" }}>
                <label
                  title="Elegir color"
                  style={{
                    width: 58,
                    height: 42,
                    padding: 4,
                    borderRadius: 14,
                    border: "1px solid #d1d5db",
                    background: C.white,
                    boxShadow: "0 12px 28px -22px rgba(31, 27, 46, 0.8)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="color"
                    value={normalizeHexColor(draft.themeColor)}
                    onChange={(event) => setField("themeColor", event.target.value.toUpperCase())}
                    style={{ width: "100%", height: "100%", padding: 0, border: 0, borderRadius: 10, background: "transparent", cursor: "pointer" }}
                    aria-label="Elegir color principal"
                  />
                </label>
                <input
                  value={draft.themeColor || C.plum}
                  onChange={(event) => setField("themeColor", event.target.value.toUpperCase())}
                  onBlur={(event) => setField("themeColor", normalizeHexColor(event.target.value))}
                  style={inputStyle(C.white, "#d1d5db")}
                  placeholder="#D2386C"
                />
              </div>
            </Field>
            <Field label="Imagen principal de portada" help="Se convierte a AVIF al subirla desde esta herramienta. Si no subes una, se usan los productos marcados como portada.">
              <div style={{ display: "grid", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  style={{ height: 150, border: "1px dashed #cbd5e1", borderRadius: 12, background: C.white, overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  {uploadingCover ? (
                    <Loader2 size={22} color={C.plum} style={{ animation: "iv-spin 0.8s linear infinite" }} />
                  ) : draft.portada ? (
                    <img src={imageUrl(draft.portada, client, 520, 320) || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImagePlus size={28} color="#8792a5" />
                  )}
                </button>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => uploadCover(event.target.files)} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => coverInputRef.current?.click()} style={{ ...btnStyle("secondary"), height: 32, fontSize: 13, padding: "0 10px" }}><Upload size={13} /> Subir</button>
                  {draft.portada && (
                    <button type="button" onClick={() => setField("portada", undefined)} style={{ ...btnStyle("danger"), height: 32, fontSize: 13, padding: "0 10px" }}><Trash2 size={13} /> Quitar</button>
                  )}
                </div>
              </div>
            </Field>
            <ToggleField label="Visible en el sitio" value={draft.visible !== false} onChange={(value) => setField("visible", value)} />
            <div style={{ padding: 12, borderRadius: 12, background: `linear-gradient(135deg, ${draft.themeColor || C.plum}44, #fff7ed)`, border: "1px solid #e5e7eb", color: C.ink }}>
              <strong>{draft.titulo || "Nombre de colección"}</strong>
              <div style={{ marginTop: 4, fontSize: 13, color: C.inkSoft }}>{(draft.items || []).filter((item) => item.visible !== false).length} productos visibles · {coverItemCount}/3 portadas</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <div className="iv-collection-search">
              <div style={{ flex: 1, position: "relative" }}>
                <Search size={15} color="#64748b" style={{ position: "absolute", left: 12, top: 11, pointerEvents: "none" }} />
                <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar productos para esta colección" style={{ ...inputStyle(C.white, "#d1d5db"), paddingLeft: 34 }} />
              </div>
              <span style={{ color: C.inkSoft, fontSize: 13 }}>{selectedIds.size} elegidos</span>
            </div>

            <div className="iv-collection-products">
              {filteredProducts.map((product) => {
                const selected = selectedIds.has(product._id);
                const item = (draft.items || []).find((entry) => entry.producto?._id === product._id);
                const thumb = imageUrl(product.imagenes?.[0], client, 120, 120);
                const isCoverItem = item?.mostrarEnPortada === true;
                return (
                  <div key={product._id} style={{ display: "grid", gridTemplateColumns: "58px minmax(0, 1fr)", gap: 8, alignItems: "center", padding: 8, borderRadius: 10, background: selected ? "#fff1f7" : C.white, border: `1px solid ${selected ? "#f9a8d4" : "#e5e7eb"}` }}>
                    <button onClick={() => toggleProduct(product)} style={{ width: 58, height: 58, borderRadius: 9, overflow: "hidden", border: "none", padding: 0, background: "#eef2f7", cursor: "pointer" }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#8792a5" />}
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <button onClick={() => toggleProduct(product)} style={{ display: "block", width: "100%", border: "none", background: "none", padding: 0, color: C.ink, fontWeight: 700, fontSize: 13, textAlign: "left", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.nombre}</button>
                      <div style={{ color: C.inkSoft, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.subcategoria?.nombre || "Sin subcategoría"}</div>
                      {selected && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                          <button onClick={() => toggleItemVisible(product._id)} style={{ ...btnStyle("secondary"), height: 26, fontSize: 12, padding: "0 8px" }}>
                            {item?.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                            {item?.visible === false ? "Oculto" : "Visible"}
                          </button>
                          <button
                            onClick={() => toggleCoverItem(product._id)}
                            disabled={!isCoverItem && coverItemCount >= 3}
                            title={!isCoverItem && coverItemCount >= 3 ? "Máximo 3 productos como portada" : "Usar este producto como portada"}
                            style={{ ...btnStyle(isCoverItem ? "primary" : "secondary"), height: 26, fontSize: 12, padding: "0 8px", opacity: !isCoverItem && coverItemCount >= 3 ? 0.55 : 1 }}
                          >
                            <Star size={12} fill={isCoverItem ? "currentColor" : "none"} />
                            Portada
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickProductsByKeywords(products: SProd[], keywords: string[]) {
  return products
    .map((product) => {
      const score = keywords.reduce((total, keyword) => total + searchScore(keyword, [
        product.nombre,
        product.idExcel,
        product.descripcion,
        product.marca,
        product.medidas,
        product.observaciones,
        product.subcategoria?.nombre,
        product.subcategoria?.categoria?.nombre,
        ...(product.tags || []),
      ]), 0);
      return { product, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);
}

function CategoryManager({ cats, subcats, prods, client, onCategoryDeleted, onCategoryCreated, onCategoryUpdated, onSubcategoryDeleted, onSubcategoryCreated, onSubcategoryUpdated }: {
  cats: SCat[];
  subcats: SSubcat[];
  prods: SProd[];
  client: ReturnType<typeof useClient>;
  onCategoryDeleted: (id: string) => void;
  onCategoryCreated: (cat: SCat) => void;
  onCategoryUpdated: (cat: SCat) => void;
  onSubcategoryDeleted: (id: string) => void;
  onSubcategoryCreated: (subcat: SSubcat) => void;
  onSubcategoryUpdated: (subcat: SSubcat) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addingCat, setAddingCat] = useState(false);
  const [newCatDraft, setNewCatDraft] = useState({ nombre: "", color: C.plum });
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catDraft, setCatDraft] = useState({ nombre: "", color: "" });
  const [addingSubcatFor, setAddingSubcatFor] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [editingSubcatId, setEditingSubcatId] = useState<string | null>(null);
  const [subcatDraft, setSubcatDraft] = useState("");

  const countsFor = (catId: string) => {
    const subcatCount = subcats.filter(sc => sc.categoria?._id === catId).length;
    const productCount = prods.filter(p => p.subcategoria?.categoria?._id === catId).length;
    return { subcatCount, productCount, total: subcatCount + productCount };
  };

  const productCountForSubcat = (subcatId: string) => prods.filter(p => p.subcategoria?._id === subcatId).length;

  const categorySubcats = (catId: string) => subcats.filter(sc => sc.categoria?._id === catId);

  const startEditCat = (cat: SCat) => {
    setEditingCatId(cat._id);
    setCatDraft({ nombre: cat.nombre || "", color: cat.color || C.plum });
  };

  const createCategory = async () => {
    const nombre = newCatDraft.nombre.trim();
    if (!nombre) {
      alert("Escribe un nombre para la categoría.");
      return;
    }

    setSavingId("new-category");
    try {
      const created = await client.create({
        _type: "categoria",
        nombre,
        color: normalizeHexColor(newCatDraft.color || C.plum),
        activo: true,
        slug: { _type: "slug", current: slugify(nombre) },
      });
      onCategoryCreated({ _id: created._id, nombre, color: normalizeHexColor(newCatDraft.color || C.plum), activo: true });
      setNewCatDraft({ nombre: "", color: C.plum });
      setAddingCat(false);
    } catch (err) {
      console.error("Error creando categoría:", err);
      alert(`No se pudo crear "${nombre}".`);
    } finally {
      setSavingId(null);
    }
  };

  const saveCategory = async (cat: SCat) => {
    const nombre = catDraft.nombre.trim();
    if (!nombre) {
      alert("El nombre de la categoría no puede estar vacío.");
      return;
    }

    setSavingId(cat._id);
    try {
      await client
        .patch(cat._id)
        .set({ nombre, color: normalizeHexColor(catDraft.color || C.plum), slug: { _type: "slug", current: slugify(nombre) } })
        .commit();
      onCategoryUpdated({ ...cat, nombre, color: normalizeHexColor(catDraft.color || C.plum) });
      setEditingCatId(null);
    } catch (err) {
      console.error("Error actualizando categoría:", err);
      alert(`No se pudo actualizar "${cat.nombre}".`);
    } finally {
      setSavingId(null);
    }
  };

  const startEditSubcat = (subcat: SSubcat) => {
    setEditingSubcatId(subcat._id);
    setSubcatDraft(subcat.nombre || "");
  };

  const createSubcategory = async (cat: SCat) => {
    const nombre = newSubcatName.trim();
    if (!nombre) {
      alert("Escribe un nombre para la subcategoría.");
      return;
    }

    setSavingId(`new-subcat-${cat._id}`);
    try {
      const created = await client.create({
        _type: "subcategoria",
        nombre,
        activo: true,
        slug: { _type: "slug", current: slugify(nombre) },
        categoria: { _type: "reference", _ref: cat._id },
      });
      onSubcategoryCreated({ _id: created._id, nombre, activo: true, categoria: { _id: cat._id, nombre: cat.nombre, color: cat.color } });
      setNewSubcatName("");
      setAddingSubcatFor(null);
      setExpanded(x => ({ ...x, [cat._id]: true }));
    } catch (err) {
      console.error("Error creando subcategoría:", err);
      alert(`No se pudo crear "${nombre}".`);
    } finally {
      setSavingId(null);
    }
  };

  const saveSubcategory = async (subcat: SSubcat) => {
    const nombre = subcatDraft.trim();
    if (!nombre) {
      alert("El nombre de la subcategoría no puede estar vacío.");
      return;
    }

    setSavingId(subcat._id);
    try {
      await client
        .patch(subcat._id)
        .set({ nombre, slug: { _type: "slug", current: slugify(nombre) } })
        .commit();
      onSubcategoryUpdated({ ...subcat, nombre });
      setEditingSubcatId(null);
    } catch (err) {
      console.error("Error actualizando subcategoría:", err);
      alert(`No se pudo actualizar "${subcat.nombre}".`);
    } finally {
      setSavingId(null);
    }
  };

  const deleteCategory = async (cat: SCat) => {
    const counts = countsFor(cat._id);
    if (counts.total > 0) {
      setExpanded(x => ({ ...x, [cat._id]: true }));
      alert(`"${cat.nombre}" todavía tiene ${counts.productCount} producto(s) y ${counts.subcatCount} subcategoría(s).\n\nPrimero elimina o mueve esos vínculos desde esta misma card.`);
      return;
    }

    const detail = `${counts.productCount} producto(s) y ${counts.subcatCount} subcategoría(s) vinculada(s)`;
    const ok = window.confirm(`¿Eliminar la categoría "${cat.nombre}"?\n\nTiene ${detail}.\n\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    setDeletingId(cat._id);
    try {
      await client.delete(cat._id);
      onCategoryDeleted(cat._id);
    } catch (err) {
      console.error("Error eliminando categoría:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`No se pudo eliminar "${cat.nombre}".\n\n${msg}\n\nSi tiene vínculos, primero mueve o elimina sus subcategorías/productos.`);
    } finally {
      setDeletingId(null);
    }
  };

  const deleteSubcategory = async (subcat: SSubcat) => {
    const productCount = productCountForSubcat(subcat._id);
    if (productCount > 0) {
      alert(`"${subcat.nombre}" todavía tiene ${productCount} producto(s).\n\nAntes de eliminarla, mueve esos productos a otra subcategoría.`);
      return;
    }

    const ok = window.confirm(`¿Eliminar la subcategoría "${subcat.nombre}"?\n\nTiene 0 productos asociados.\n\nEsta acción no se puede deshacer.`);
    if (!ok) return;

    setDeletingId(subcat._id);
    try {
      await client.delete(subcat._id);
      onSubcategoryDeleted(subcat._id);
    } catch (err) {
      console.error("Error eliminando subcategoría:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`No se pudo eliminar "${subcat.nombre}".\n\n${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12, background: C.surface, border: `1px solid ${C.darkLine}`, borderRadius: 8, padding: 12 }}>
        {addingCat ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input value={newCatDraft.nombre} onChange={e => setNewCatDraft(d => ({ ...d, nombre: e.target.value }))} placeholder="Nombre de la nueva categoría"
              style={{ ...inputStyle(C.white, "#d1d5db"), flex: "1 1 240px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 1 210px" }}>
              <label title="Elegir color" style={{ width: 44, height: 36, padding: 3, borderRadius: 10, border: "1px solid #d1d5db", background: C.white, cursor: "pointer", boxSizing: "border-box" }}>
                <input
                  type="color"
                  value={normalizeHexColor(newCatDraft.color)}
                  onChange={e => setNewCatDraft(d => ({ ...d, color: e.target.value.toUpperCase() }))}
                  aria-label="Elegir color de categoría"
                  style={{ width: "100%", height: "100%", padding: 0, border: 0, borderRadius: 7, background: "transparent", cursor: "pointer" }}
                />
              </label>
              <input
                value={newCatDraft.color}
                onChange={e => setNewCatDraft(d => ({ ...d, color: e.target.value.toUpperCase() }))}
                onBlur={e => setNewCatDraft(d => ({ ...d, color: normalizeHexColor(e.target.value) }))}
                placeholder="#D2386C"
                style={{ ...inputStyle(C.white, "#d1d5db"), flex: "1 1 120px" }}
              />
            </div>
            <button onClick={createCategory} disabled={savingId === "new-category"} style={btnStyle("save")}>
              {savingId === "new-category" ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={iconSize} />} Guardar
            </button>
            <button onClick={() => setAddingCat(false)} style={btnStyle("secondaryDark")}><X size={iconSize} /> Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setAddingCat(true)} style={btnStyle("secondaryDark")}><Plus size={iconSize} /> Agregar categoría</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
      {cats.map(cat => {
        const counts = countsFor(cat._id);
        const isEmpty = counts.total === 0;
        const isOpen = !!expanded[cat._id];
        const relatedSubcats = categorySubcats(cat._id);
        return (
          <div key={cat._id} style={{ background: C.white, borderRadius: 8, border: `1px solid ${isEmpty ? "rgba(16,185,129,0.35)" : C.line}`, padding: 16, boxShadow: "0 10px 22px rgba(0,0,0,0.22)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                {editingCatId === cat._id ? (
                  <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                    <input value={catDraft.nombre} onChange={e => setCatDraft(d => ({ ...d, nombre: e.target.value }))}
                      style={inputStyle(C.white, "#d1d5db")} placeholder="Nombre de la categoría" />
                    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8, alignItems: "center" }}>
                      <label title="Elegir color" style={{ width: 52, height: 36, padding: 3, borderRadius: 10, border: "1px solid #d1d5db", background: C.white, cursor: "pointer", boxSizing: "border-box" }}>
                        <input
                          type="color"
                          value={normalizeHexColor(catDraft.color)}
                          onChange={e => setCatDraft(d => ({ ...d, color: e.target.value.toUpperCase() }))}
                          aria-label="Elegir color de categoría"
                          style={{ width: "100%", height: "100%", padding: 0, border: 0, borderRadius: 7, background: "transparent", cursor: "pointer" }}
                        />
                      </label>
                      <input
                        value={catDraft.color}
                        onChange={e => setCatDraft(d => ({ ...d, color: e.target.value.toUpperCase() }))}
                        onBlur={e => setCatDraft(d => ({ ...d, color: normalizeHexColor(e.target.value) }))}
                        style={inputStyle(C.white, "#d1d5db")}
                        placeholder="#D2386C"
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: cat.color || C.plum, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0 }} />
                    <strong style={{ fontSize: 17, color: C.ink, lineHeight: 1.25 }}>{cat.nombre || "Sin nombre"}</strong>
                  </div>
                )}
                <div style={{ color: C.inkSoft, fontSize: 14, fontFamily: "monospace" }}>{cat.idExcel || cat._id}</div>
              </div>
              <span style={{ borderRadius: 999, padding: "3px 8px", fontSize: 12, fontWeight: 700, color: isEmpty ? C.green : C.orange, background: isEmpty ? "#ecfdf5" : "#fff7ed", border: `1px solid ${isEmpty ? "#bbf7d0" : "#fed7aa"}` }}>
                {isEmpty ? "Sin vínculos" : `${counts.total} vínculo(s)`}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              <CountBox label="Productos" value={counts.productCount} />
              <CountBox label="Subcategorías" value={counts.subcatCount} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: editingCatId === cat._id ? "1fr 1fr" : "1fr 1fr", gap: 8, marginTop: 12 }}>
              {editingCatId === cat._id ? (
                <>
                  <button onClick={() => saveCategory(cat)} disabled={savingId === cat._id} style={{ ...btnStyle("save"), justifyContent: "center", height: 34, fontSize: 14 }}>
                    {savingId === cat._id ? <Loader2 size={14} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={14} />} Guardar
                  </button>
                  <button onClick={() => setEditingCatId(null)} style={{ ...btnStyle("secondary"), justifyContent: "center", height: 34, fontSize: 14 }}><X size={14} /> Cancelar</button>
                </>
              ) : (
                <>
                  <button onClick={() => startEditCat(cat)} style={{ ...btnStyle("secondary"), justifyContent: "center", height: 34, fontSize: 14 }}><Pencil size={14} /> Editar</button>
                  <button onClick={() => setExpanded(x => ({ ...x, [cat._id]: !isOpen }))} style={{ ...btnStyle("secondary"), justifyContent: "center", height: 34, fontSize: 14 }}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Subcategorías
                  </button>
                </>
              )}
            </div>

            {isOpen && (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {addingSubcatFor === cat._id ? (
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, background: "#f8fafc", display: "grid", gap: 8 }}>
                    <input value={newSubcatName} onChange={e => setNewSubcatName(e.target.value)}
                      style={{ ...inputStyle(C.white, "#d1d5db"), height: 34, fontSize: 14 }} placeholder="Nombre de la nueva subcategoría" />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => createSubcategory(cat)} disabled={savingId === `new-subcat-${cat._id}`} style={{ ...btnStyle("save"), height: 32, fontSize: 13, padding: "0 10px" }}>
                        {savingId === `new-subcat-${cat._id}` ? <Loader2 size={13} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={13} />} Guardar
                      </button>
                      <button onClick={() => { setAddingSubcatFor(null); setNewSubcatName(""); }} style={{ ...btnStyle("secondary"), height: 32, fontSize: 13, padding: "0 10px" }}><X size={13} /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingSubcatFor(cat._id); setNewSubcatName(""); }} style={{ ...btnStyle("secondary"), height: 34, justifyContent: "center" }}><Plus size={14} /> Agregar subcategoría</button>
                )}
                {relatedSubcats.length === 0 && (
                  <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 10, color: C.inkSoft, fontSize: 14 }}>
                    Esta categoría no tiene subcategorías.
                  </div>
                )}
                {relatedSubcats.map(sc => {
                  const productCount = productCountForSubcat(sc._id);
                  const editing = editingSubcatId === sc._id;
                  return (
                    <div key={sc._id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {editing ? (
                            <input value={subcatDraft} onChange={e => setSubcatDraft(e.target.value)}
                              style={{ ...inputStyle(C.white, "#d1d5db"), height: 34, fontSize: 14 }} placeholder="Nombre de la subcategoría" />
                          ) : (
                            <strong style={{ color: C.ink, fontSize: 15 }}>{sc.nombre}</strong>
                          )}
                          <div style={{ color: C.inkSoft, fontSize: 13, fontFamily: "monospace", marginTop: 2 }}>{sc.idExcel || sc._id}</div>
                        </div>
                        <span style={{ flexShrink: 0, borderRadius: 999, padding: "2px 7px", fontSize: 12, fontWeight: 700, color: productCount === 0 ? C.green : C.orange, background: productCount === 0 ? "#ecfdf5" : "#fff7ed", border: `1px solid ${productCount === 0 ? "#bbf7d0" : "#fed7aa"}` }}>
                          {productCount} producto(s)
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                        {editing ? (
                          <>
                            <button onClick={() => saveSubcategory(sc)} disabled={savingId === sc._id} style={{ ...btnStyle("save"), height: 32, fontSize: 13, padding: "0 10px" }}>
                              {savingId === sc._id ? <Loader2 size={13} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={13} />} Guardar
                            </button>
                            <button onClick={() => setEditingSubcatId(null)} style={{ ...btnStyle("secondary"), height: 32, fontSize: 13, padding: "0 10px" }}><X size={13} /> Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditSubcat(sc)} style={{ ...btnStyle("secondary"), height: 32, fontSize: 13, padding: "0 10px" }}><Pencil size={13} /> Editar</button>
                            <button onClick={() => deleteSubcategory(sc)} disabled={deletingId === sc._id} style={{ ...btnStyle("danger"), height: 32, fontSize: 13, padding: "0 10px", opacity: deletingId === sc._id ? 0.65 : 1 }}>
                              {deletingId === sc._id ? <Loader2 size={13} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Trash2 size={13} />} Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => deleteCategory(cat)}
              disabled={deletingId === cat._id}
              style={{ ...btnStyle("danger"), width: "100%", marginTop: 14, justifyContent: "center", opacity: deletingId === cat._id ? 0.65 : 1 }}
            >
              {deletingId === cat._id ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Trash2 size={iconSize} />}
              Eliminar categoría
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function CountBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", background: "#f8fafc" }}>
      <div style={{ color: C.inkSoft, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ color: C.ink, fontSize: 20, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "#cbd5e1", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
      {icon}
      {text}
    </div>
  );
}

function SubcategorySearchSelect({ subcats, value, onChange, bg, border }: {
  subcats: SSubcat[];
  value?: SSubcat;
  onChange: (subcat: SSubcat) => void;
  bg: string;
  border: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedLabel = value ? `${value.categoria?.nombre || "Sin categoría"} › ${value.nombre}` : "";
  const shownValue = open ? query : selectedLabel;
  const activeSubcats = subcats.filter(sc => sc.activo !== false || sc._id === value?._id);
  const matches = activeSubcats
    .filter(sc => {
      const hay = normalize(`${sc.categoria?.nombre || ""} ${sc.nombre} ${sc.idExcel || ""}`);
      const tokens = normalize(query).split(" ").filter(Boolean);
      return tokens.length === 0 || tokens.every(t => hay.includes(t));
    })
    .slice(0, 12);

  const choose = (subcat: SSubcat) => {
    onChange(subcat);
    setQuery("");
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={shownValue}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        placeholder="Buscar subcategoría por nombre o categoría..."
        style={{ ...inputStyle(bg, border), paddingRight: 36 }}
      />
      <Search size={16} color="#667085" style={{ position: "absolute", right: 12, top: 10, pointerEvents: "none" }} />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: 42, left: 0, right: 0, maxHeight: 280, overflowY: "auto", background: C.white, border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 18px 36px rgba(15,23,42,0.22)" }}>
          {matches.length === 0 && (
            <div style={{ padding: 12, color: C.inkSoft, fontSize: 14 }}>Sin coincidencias.</div>
          )}
          {matches.map(sc => (
            <button
              key={sc._id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => choose(sc)}
              style={{
                display: "block",
                width: "100%",
                border: "none",
                background: sc._id === value?._id ? "#fce7f3" : C.white,
                color: C.ink,
                textAlign: "left",
                padding: "9px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 15,
              }}
            >
              <strong>{sc.categoria?.nombre || "Sin categoría"}</strong> › {sc.nombre}
              {sc.idExcel && <span style={{ color: C.inkSoft, fontSize: 12, marginLeft: 8, fontFamily: "monospace" }}>{sc.idExcel}</span>}
            </button>
          ))}
          <div style={{ padding: "8px 12px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setOpen(false)} style={{ ...btnStyle("secondary"), height: 30, fontSize: 13, padding: "0 10px" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Drawer (the big one) ─────────────────────────────────────
function EditDrawer({ prod, client, subcats, allTags, onClose, onSaved }: {
  prod: SProd; client: ReturnType<typeof useClient>; subcats: SSubcat[]; allTags: string[];
  onClose: () => void; onSaved: (p: SProd) => void;
}) {
  const [draft, setDraft] = useState<SProd>(() => JSON.parse(JSON.stringify(prod)));
  const [original] = useState<string>(() => JSON.stringify(prod));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"general" | "presentaciones" | "imagenes">("general");
  const [newTag, setNewTag] = useState("");
  const [saveError, setSaveError] = useState("");
  const [imageUploadStatus, setImageUploadStatus] = useState<ImageUploadStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isNew = prod._id === NEW_PRODUCT_ID;

  const isModified = JSON.stringify(draft) !== original;
const changed = (field: string) => {
    const o = JSON.parse(original) as Record<string, unknown>;
    const d = draft as unknown as Record<string, unknown>;
    return JSON.stringify(d[field]) !== JSON.stringify(o[field]);
  };

  const set = <K extends keyof SProd>(field: K, val: SProd[K]) => setDraft(d => ({ ...d, [field]: val }));

  // Save
  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      // Guard: subcategoria must have _id
      const subcatId = draft.subcategoria?._id;
      if (!subcatId || typeof subcatId !== "string") {
        alert("El artículo necesita una subcategoría antes de guardar.");
        setSaving(false);
        return;
      }

      const cleanName = draft.nombre.trim();
      if (!cleanName) {
        alert("El artículo necesita un nombre antes de guardar.");
        setSaving(false);
        return;
      }
      const saveDestacadoUbicaciones = draft.destacadoUbicaciones || (draft.destacado ? ["preCatalog"] as DestacadoUbicacion[] : []);
      const manualId = `M-${Date.now().toString(36)}-${uid()}`;
      const productId = isNew ? `prod-${manualId}` : canonicalId(draft._id);
      const productCode = draft.idExcel || (isNew ? manualId : productId);

      const doc: Record<string, unknown> = {
        nombre: cleanName,
        descripcion: draft.descripcion || "",
        marca: draft.marca || "Genérico",
        medidas: draft.medidas || "",
        observaciones: draft.observaciones || "",
        visible: draft.visible,
        destacado: saveDestacadoUbicaciones.length > 0,
        destacadoUbicaciones: saveDestacadoUbicaciones,
        tags: draft.tags || [],
        unidadBase: draft.unidadBase || "unidad",
        manejaStock: draft.manejaStock,
        permiteVentaFraccionada: draft.permiteVentaFraccionada,
        subcategoria: { _type: "reference", _ref: subcatId },
        slug: { _type: "slug", current: productSlugWithId(cleanName, productCode) },
      };

      // Stock at product level
      if (draft.stock != null) doc.stock = draft.stock;
      else doc.stock = null;

      if (draft.presentaciones) doc.presentaciones = draft.presentaciones.map(p => {
        const pDoc: Record<string, unknown> = { _key: p._key, _type: "presentacion", nombre: p.nombre || "", factorConversion: p.factorConversion || 1, visibleEnWeb: p.visibleEnWeb !== false, esDefault: !!p.esDefault };
        if (p.precio != null) pDoc.precio = p.precio;
        return pDoc;
      });

      let shouldUnsetImages = false;
      // Guard: only include images with valid _ref strings
      if (draft.imagenes && draft.imagenes.length > 0) {
        const validImages = draft.imagenes.filter(img => {
          const ref = img.asset?._ref;
          if (!ref || typeof ref !== "string") {
            console.warn("Imagen sin _ref válido, se omitirá:", img);
            return false;
          }
          return true;
        });
        doc.imagenes = validImages.map(img => ({
          _key: img._key || uid(),
          _type: "image",
          asset: { _type: "reference", _ref: img.asset._ref },
        }));
        shouldUnsetImages = validImages.length === 0;
      } else {
        shouldUnsetImages = true;
      }

      // Debug: log what we're about to save
      console.log("Guardando doc:", JSON.stringify(doc, null, 2));

      const saved = isNew
        ? await client.create({ _id: productId, _type: "producto", idExcel: productCode, ...doc })
        : await (shouldUnsetImages
            ? client.patch(draft._id).set(doc).unset(["imagenes"]).commit()
            : client.patch(draft._id).set(doc).commit());

      // Re-fetch to get resolved refs
      const updated = await client.fetch<SProd>(`*[_id==$id][0]{
        _id,idExcel,nombre,descripcion,marca,visible,destacado,destacadoUbicaciones,medidas,observaciones,tags,
        unidadBase,manejaStock,permiteVentaFraccionada,stock,migratedFromVariant,slug,
        subcategoria->{_id,nombre,categoria->{_id,nombre,color}},
        presentaciones[]{_key,nombre,factorConversion,precio,visibleEnWeb,esDefault},
        imagenes[]{_key,asset}
      }`, { id: saved._id });
      onSaved(updated);
    } catch (err) {
      console.error("Error guardando:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(`Error al guardar: ${msg}`);
    }
    setSaving(false);
  };

  const isImageUploading = !!imageUploadStatus && imageUploadStatus.phase !== "done" && imageUploadStatus.phase !== "error";
  const imageUploadProgress = imageUploadStatus
    ? Math.min(100, Math.round(((imageUploadStatus.completed + (imageUploadStatus.phase === "done" ? 1 : imageUploadStatus.phase === "uploading" ? 0.72 : imageUploadStatus.phase === "optimizing" ? 0.28 : 0)) / Math.max(1, imageUploadStatus.total)) * 100))
    : 0;
  const imageUploadLabel = imageUploadStatus?.phase === "optimizing"
    ? "Optimizando imagen"
    : imageUploadStatus?.phase === "uploading"
      ? "Subiendo imagen"
      : imageUploadStatus?.phase === "done"
        ? "Carga completada"
        : imageUploadStatus?.phase === "error"
          ? "Hubo un problema"
          : "";

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || isImageUploading) return;

    setImageUploadStatus({ total: files.length, current: 1, completed: 0, fileName: files[0].name, phase: "optimizing" });

    let completed = 0;
    let failed = 0;

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        const asset = await uploadOptimizedImage(client, file, (phase, currentFile) => {
          setImageUploadStatus({
            total: files.length,
            current: index + 1,
            completed,
            fileName: currentFile.name || file.name,
            phase,
          });
        });
        setDraft(d => ({
          ...d,
          imagenes: [...(d.imagenes || []), { _key: uid(), _type: "image", asset: { _ref: asset._id, url: asset.url } }],
        }));
        completed += 1;
        setImageUploadStatus({ total: files.length, current: index + 1, completed, fileName: file.name, phase: "uploading" });
      } catch (err) {
        failed += 1;
        console.error("Error subiendo imagen:", err);
        setImageUploadStatus({
          total: files.length,
          current: index + 1,
          completed,
          fileName: file.name,
          phase: "error",
          error: err instanceof Error ? err.message : "No se pudo subir esta imagen.",
        });
      }
    }

    setImageUploadStatus({
      total: files.length,
      current: files.length,
      completed,
      fileName: failed > 0 ? `${failed} imagen(es) no se pudieron subir` : "",
      phase: failed > 0 ? "error" : "done",
      error: failed > 0 ? "Revisa tu conexión y vuelve a intentar las imágenes faltantes." : undefined,
    });

    window.setTimeout(() => {
      setImageUploadStatus((current) => current?.phase === "done" ? null : current);
    }, 1800);

    e.target.value = "";
  };

  const removeImage = (idx: number) => setDraft(d => ({ ...d, imagenes: (d.imagenes || []).filter((_, i) => i !== idx) }));
  const moveImage = (idx: number, direction: -1 | 1) => {
    setDraft(d => {
      const images = [...(d.imagenes || [])];
      const target = idx + direction;
      if (target < 0 || target >= images.length) return d;
      [images[idx], images[target]] = [images[target], images[idx]];
      return { ...d, imagenes: images };
    });
  };
  const moveImageToStart = (idx: number) => {
    setDraft(d => {
      const images = [...(d.imagenes || [])];
      if (idx <= 0 || idx >= images.length) return d;
      const [image] = images.splice(idx, 1);
      images.unshift(image);
      return { ...d, imagenes: images };
    });
  };

  // Tags
  const addTag = (tag: string) => {
    const t = tag.toLowerCase().trim().replace(/\s+/g, "-");
    if (!t) return;
    if (draft.tags?.includes(t)) return;
    set("tags", [...(draft.tags || []), t]);
    setNewTag("");
  };
  const removeTag = (tag: string) => set("tags", (draft.tags || []).filter(t => t !== tag));
  const selectedDestacados = draft.destacadoUbicaciones || (draft.destacado ? ["preCatalog"] as DestacadoUbicacion[] : []);
  const toggleDestacadoUbicacion = (ubicacion: DestacadoUbicacion) => {
    const next = selectedDestacados.includes(ubicacion)
      ? selectedDestacados.filter((item) => item !== ubicacion)
      : [...selectedDestacados, ubicacion];
    setDraft((current) => ({ ...current, destacadoUbicaciones: next, destacado: next.length > 0 }));
  };

  // Presentaciones
  const addPres = () => setDraft(d => ({ ...d, presentaciones: [...(d.presentaciones || []), { _key: uid(), nombre: "", factorConversion: 1, precio: null, visibleEnWeb: true, esDefault: false }] }));
  const updatePres = (key: string, field: string, val: unknown) => setDraft(d => ({ ...d, presentaciones: (d.presentaciones || []).map(p => p._key === key ? { ...p, [field]: val } : p) }));
  const removePres = (key: string) => setDraft(d => ({ ...d, presentaciones: (d.presentaciones || []).filter(p => p._key !== key) }));

  const tabBtnStyle = (t: string) => ({
    padding: "8px 16px", border: "none", borderBottom: tab === t ? `2px solid ${C.plum}` : "2px solid transparent",
    background: "transparent", color: tab === t ? C.plum : C.inkSoft, fontWeight: tab === t ? 600 : 400,
    cursor: "pointer", fontSize: 15, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6,
  });

  const fieldBg = (field: string) => changed(field) ? C.yellowBg : C.white;
  const fieldBorder = (field: string) => changed(field) ? C.yellowBorder : "#d1d5db";

  return (
    <div style={{ position: "fixed", top: STRUCTURE_PANE_HEADER_OFFSET, right: 0, bottom: 0, left: 0, zIndex: 100, display: "flex" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ flex: 1, background: "rgba(31,27,46,0.4)", backdropFilter: "blur(4px)" }} />
      {/* Panel */}
      <div style={{ width: "min(680px, 90vw)", background: C.panel, overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-8px 0 30px rgba(0,0,0,0.15)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.white, position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 14, color: C.inkSoft, fontFamily: "monospace" }}>{isNew ? "Nuevo artículo" : (draft.idExcel || draft._id)}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>{draft.nombre || "Sin nombre todavía"}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isModified && <button onClick={() => setDraft(JSON.parse(original))} style={btnStyle("secondary")}><RotateCcw size={iconSize} /> Deshacer</button>}
            <button onClick={handleSave} disabled={(!isModified && !isNew) || saving}
              style={{ ...btnStyle("save"), opacity: (isModified || isNew) ? 1 : 0.4 }}>
              {saving ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Save size={iconSize} />}
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={onClose} aria-label="Cerrar" title="Cerrar" style={{ ...btnStyle("secondary"), width: 38, padding: 0, justifyContent: "center" }}><X size={iconSize} /></button>
          </div>
        </div>

        {/* Modified banner */}
        {isModified && (
          <div style={{ padding: "8px 20px", background: C.yellowBg, borderBottom: `1px solid ${C.yellowBorder}`, fontSize: 14, color: C.orange, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={iconSize} /> Hay cambios sin guardar. Los campos modificados aparecen en <span style={{ background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 4, padding: "1px 6px" }}>amarillo</span>.
          </div>
        )}
        {saveError && (
          <div style={{ padding: "8px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca", fontSize: 14, color: "#991b1b", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={iconSize} /> {saveError}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, padding: "0 20px", background: C.white }}>
          <button style={tabBtnStyle("general")} onClick={() => setTab("general")}><ClipboardList size={iconSize} /> General</button>
          <button style={tabBtnStyle("presentaciones")} onClick={() => setTab("presentaciones")}><Package size={iconSize} /> Presentaciones ({draft.presentaciones?.length || 0})</button>
          <button style={tabBtnStyle("imagenes")} onClick={() => setTab("imagenes")}><ImageIcon size={iconSize} /> Imágenes ({draft.imagenes?.length || 0})</button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, flex: 1 }}>

                        {/* Help block for product creation model */}
              <EditorHint
                title="¿Cómo crear productos?"
                body="Crea un producto por cada artículo específico y vendible. Si cambia la marca, tamaño, color, cantidad, formato o tipo, crea otro producto. Usa Presentaciones solo para indicar cómo se vende: unidad, docena, bolsa, metro, rollo, caja. Ejemplo: 'Block Navarrete A4 cuadriculado x50' → Presentación: Unidad. 'Globos latex R12 rojo' → Presentaciones: Unidad, Docena, Bolsa x100."
              />

          {/* ── General ── */}
          {tab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nombre" modified={changed("nombre")}>
                <input value={draft.nombre} onChange={e => set("nombre", e.target.value)}
                  style={inputStyle(fieldBg("nombre"), fieldBorder("nombre"))} />
              </Field>

              <Field label="Descripción" modified={changed("descripcion")}>
                <textarea value={draft.descripcion || ""} onChange={e => set("descripcion", e.target.value)} rows={3}
                  style={{ ...inputStyle(fieldBg("descripcion"), fieldBorder("descripcion")), height: "auto", padding: "8px 12px" }} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Marca" modified={changed("marca")}>
                  <input value={draft.marca || ""} onChange={e => set("marca", e.target.value)}
                    style={inputStyle(fieldBg("marca"), fieldBorder("marca"))} placeholder="Genérico" />
                </Field>
                <Field label="Medidas" modified={changed("medidas")}>
                  <input value={draft.medidas || ""} onChange={e => set("medidas", e.target.value)}
                    style={inputStyle(fieldBg("medidas"), fieldBorder("medidas"))} placeholder="Ej: 3 oz, A4" />
                </Field>
              </div>

              <Field label="Subcategoría" modified={changed("subcategoria")}>
                <SubcategorySearchSelect
                  subcats={subcats}
                  value={draft.subcategoria}
                  onChange={(sc) => set("subcategoria", sc)}
                  bg={fieldBg("subcategoria")}
                  border={fieldBorder("subcategoria")}
                />
              </Field>

              <Field label="Observaciones" modified={changed("observaciones")}>
                <textarea value={draft.observaciones || ""} onChange={e => set("observaciones", e.target.value)} rows={2}
                  style={{ ...inputStyle(fieldBg("observaciones"), fieldBorder("observaciones")), height: "auto", padding: "8px 12px" }} />
              </Field>

              {/* Tags */}
              <Field label="Tags / Etiquetas" modified={changed("tags")}>
                <div style={{ background: fieldBg("tags"), border: `1px solid ${fieldBorder("tags")}`, borderRadius: 10, padding: 10 }}>
                  {/* Current tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {(draft.tags || []).map(t => (
                      <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "rgba(210,56,108,0.08)", color: C.plum, borderRadius: 999, fontSize: 14 }}>
                        {t} <button onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    ))}
                    {(!draft.tags || draft.tags.length === 0) && <span style={{ fontSize: 14, color: "#6b7280" }}>Sin tags</span>}
                  </div>
                  {/* Add tag */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Nuevo tag..."
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
                      style={{ ...inputStyle(C.white, "#d1d5db"), flex: 1, height: 36, fontSize: 14 }} />
                    <button onClick={() => addTag(newTag)} style={{ ...btnStyle("primary"), height: 36, fontSize: 14, padding: "0 10px" }}><Plus size={14} /> Agregar</button>
                  </div>
                  {/* Suggestions */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                    {allTags.filter(t => !(draft.tags || []).includes(t)).slice(0, 12).map(t => (
                      <button key={t} onClick={() => addTag(t)}
                        style={{ padding: "2px 8px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 999, fontSize: 14, cursor: "pointer", color: C.inkSoft, fontFamily: "inherit" }}>
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, alignItems: "start" }}>
                <ToggleField label="Visible" help="Si está activo, el artículo aparece en la web y en el catálogo." value={!!draft.visible} onChange={v => set("visible", v)} modified={changed("visible")} />
                <Field label="Mostrar en precatálogo" help="Hace que el artículo aparezca en las dos filas móviles previas al catálogo." modified={changed("destacadoUbicaciones") || changed("destacado")}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", background: fieldBg("destacadoUbicaciones"), border: `1px solid ${fieldBorder("destacadoUbicaciones")}`, borderRadius: 10, padding: 8 }}>
                    {([
                      ["preCatalog", "Precatálogo"],
                    ] as const).map(([value, label]) => {
                      const active = selectedDestacados.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleDestacadoUbicacion(value)}
                          style={{
                            height: 34,
                            padding: "0 12px",
                            borderRadius: 999,
                            border: `1px solid ${active ? C.plum : "#d1d5db"}`,
                            background: active ? "rgba(210,56,108,0.12)" : C.white,
                            color: active ? C.plum : C.inkSoft,
                            fontWeight: 700,
                            fontSize: 14,
                            fontFamily: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          {active ? "✓ " : ""}{label}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <ToggleField label="Venta fraccionada" help="Úsalo cuando puede venderse por partes, metros, unidades sueltas, etc." value={!!draft.permiteVentaFraccionada} onChange={v => set("permiteVentaFraccionada", v)} modified={changed("permiteVentaFraccionada")} />
                <ToggleField label="Maneja stock" help="Actívalo si quieres controlar existencias. Desactívalo para artículos bajo pedido o solo cotización." value={!!draft.manejaStock} onChange={v => set("manejaStock", v)} modified={changed("manejaStock")} />
                <Field label="Unidad base" modified={changed("unidadBase")} help="Es la unidad mínima para contar o vender: unidad, metro, vaso, paquete, caja.">
                  <input value={draft.unidadBase || ""} onChange={e => set("unidadBase", e.target.value)}
                    style={inputStyle(fieldBg("unidadBase"), fieldBorder("unidadBase"))} placeholder="unidad, metro, vaso..." />
                </Field>
                {draft.manejaStock && (
                  <Field label="Stock actual" modified={changed("stock")} help="Cantidad disponible de este producto.">
                    <input type="number" value={draft.stock != null ? String(draft.stock) : ""} onChange={e => set("stock", e.target.value === "" ? null : Number(e.target.value))}
                      style={inputStyle(fieldBg("stock"), fieldBorder("stock"))} placeholder="Ej: 50" />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* ── Presentaciones ── */}
          {tab === "presentaciones" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <EditorHint
                title="Cuándo usar presentaciones"
                body="Usa presentaciones para definir cómo se vende o cotiza el artículo. Ej: unidad, paquete, rollo, metro o caja. La visibilidad se controla desde el producto completo: si el producto está visible, se muestran todas sus presentaciones; si está oculto, no se muestra ninguna."
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, color: C.inkSoft }}>{draft.presentaciones?.length || 0} presentaciones</span>
                <button onClick={addPres} style={btnStyle("primary")}><Plus size={iconSize} /> Agregar presentación</button>
              </div>
              {(draft.presentaciones || []).map((p, i) => {
                const origPres = JSON.parse(original).presentaciones?.find((op: SPres) => op._key === p._key);
                const presChanged = JSON.stringify(p) !== JSON.stringify(origPres);
                return (
                  <div key={p._key} style={{ background: presChanged ? C.yellowBg : C.white, border: `1px solid ${presChanged ? C.yellowBorder : "#e5e7eb"}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: C.ink }}>
                        Presentación {i + 1} {p.esDefault && <span style={{ color: C.plum, display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={14} fill="currentColor" /> Principal</span>} {presChanged && <span style={{ color: C.orange }}>●</span>}
                      </span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => {
                          // Set this as default, unset others
                          setDraft(d => ({ ...d, presentaciones: (d.presentaciones || []).map(pp => ({ ...pp, esDefault: pp._key === p._key })) }));
                        }} aria-label="Marcar como principal" title="Marcar como principal" style={{ ...btnStyle("secondary"), width: 34, height: 34, padding: 0, justifyContent: "center" }}><Star size={iconSize} fill={p.esDefault ? "currentColor" : "none"} /></button>
                        <button onClick={() => removePres(p._key)} aria-label="Eliminar presentación" title="Eliminar presentación" style={{ ...btnStyle("secondary"), width: 34, height: 34, padding: 0, justifyContent: "center", color: C.red }}><Trash2 size={iconSize} /></button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
                      <MiniInput label="Nombre" value={p.nombre || ""} onChange={val => updatePres(p._key, "nombre", val)} placeholder="Ej: Unidad, Pqt x100" />
                      <MiniInput label="Factor" value={p.factorConversion != null ? String(p.factorConversion) : ""} onChange={val => updatePres(p._key, "factorConversion", Number(val) || 1)} type="number" />
                      <MiniInput label="Precio S/" value={p.precio != null ? String(p.precio) : ""} onChange={val => updatePres(p._key, "precio", val === "" ? null : Number(val))} type="number" placeholder="Consultar" />
                    </div>
                  </div>
                );
              })}
              {(!draft.presentaciones || draft.presentaciones.length === 0) && (
                <div style={{ textAlign: "center", padding: 32, color: C.inkSoft, fontSize: 15, background: C.white, borderRadius: 12, border: `1px dashed ${C.line}` }}>
                  Sin presentaciones. Agrega las formas en que se vende este producto (unidad, paquete, metro...).
                </div>
              )}
            </div>
          )}

          {/* ── Imágenes ── */}
          {tab === "imagenes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontSize: 15, color: C.inkSoft }}>{draft.imagenes?.length || 0} imágenes</span>
                  <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 2 }}>
                    La imagen 1 será la principal en catálogo, producto y vistas previas. Puedes cambiar el orden con las flechas.
                  </div>
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImageUpload} disabled={isImageUploading} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={isImageUploading}
                    style={{ ...btnStyle("primary"), opacity: isImageUploading ? 0.72 : 1, cursor: isImageUploading ? "wait" : "pointer" }}
                  >
                    {isImageUploading ? <Loader2 size={iconSize} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <Upload size={iconSize} />}
                    {isImageUploading ? "Subiendo..." : "Subir imágenes"}
                  </button>
                </div>
              </div>

              {imageUploadStatus && (
                <div style={{ background: imageUploadStatus.phase === "error" ? "#fef2f2" : C.blueBg, border: `1px solid ${imageUploadStatus.phase === "error" ? "#fecaca" : C.blueBorder}`, borderRadius: 12, padding: 12, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: imageUploadStatus.phase === "error" ? "#991b1b" : C.ink, fontWeight: 700 }}>
                      {imageUploadStatus.phase === "error" ? <AlertTriangle size={16} /> : imageUploadStatus.phase === "done" ? <ImageIcon size={16} /> : <Loader2 size={16} style={{ animation: "iv-spin 0.8s linear infinite" }} />}
                      {imageUploadLabel}
                    </div>
                    <span style={{ color: imageUploadStatus.phase === "error" ? "#991b1b" : C.inkSoft, fontSize: 13, fontWeight: 700 }}>
                      {imageUploadStatus.completed}/{imageUploadStatus.total} imágenes · {imageUploadProgress}%
                    </span>
                  </div>
                  <div style={{ height: 9, background: "rgba(15,23,42,0.1)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${imageUploadProgress}%`, height: "100%", background: imageUploadStatus.phase === "error" ? C.red : C.plum, transition: "width 180ms ease" }} />
                  </div>
                  <div style={{ fontSize: 13, color: imageUploadStatus.phase === "error" ? "#991b1b" : C.inkSoft }}>
                    {imageUploadStatus.fileName ? `Archivo: ${imageUploadStatus.fileName}` : "Las imágenes se agregaron al borrador."}
                    {imageUploadStatus.error ? ` ${imageUploadStatus.error}` : ""}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {(draft.imagenes || []).map((img, i) => {
                  const imagesCount = draft.imagenes?.length || 0;
                  const url = img.asset?.url || (img.asset?._ref ? `https://cdn.sanity.io/images/${client.config().projectId}/${client.config().dataset}/${img.asset._ref.replace("image-", "").replace(/-(\w+)$/, ".$1")}` : null);
                  return (
                    <div key={img._key || i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${i === 0 ? C.plum : C.line}`, aspectRatio: "4/3", background: "#f3f4f6", boxShadow: i === 0 ? "0 0 0 2px rgba(210,56,108,0.14)" : "none" }}>
                      {url && <img src={`${url}?w=300&h=225&fit=crop`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      <button onClick={() => removeImage(i)} aria-label="Eliminar imagen" title="Eliminar imagen"
                        style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(220,38,38,0.9)", color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        ×
                      </button>
                      <div style={{ position: "absolute", top: 6, left: 6, background: i === 0 ? "rgba(210,56,108,0.95)" : "rgba(0,0,0,0.62)", color: "#fff", fontSize: 12, fontWeight: 800, padding: "3px 7px", borderRadius: 999 }}>
                        {i === 0 ? "Principal" : `#${i + 1}`}
                      </div>
                      <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", gap: 4, justifyContent: "space-between", alignItems: "center", background: "rgba(15,23,42,0.64)", backdropFilter: "blur(4px)", borderRadius: 8, padding: 4 }}>
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} title="Mover antes" aria-label="Mover antes"
                          style={{ ...imageOrderButtonStyle(i === 0), flex: 1 }}>←</button>
                        <button type="button" onClick={() => moveImageToStart(i)} disabled={i === 0} title="Usar como principal" aria-label="Usar como imagen principal"
                          style={{ ...imageOrderButtonStyle(i === 0), flex: 1, fontSize: 11 }}>1ª</button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i >= imagesCount - 1} title="Mover después" aria-label="Mover después"
                          style={{ ...imageOrderButtonStyle(i >= imagesCount - 1), flex: 1 }}>→</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(!draft.imagenes || draft.imagenes.length === 0) && (
                <div onClick={() => !isImageUploading && fileRef.current?.click()}
                  style={{ textAlign: "center", padding: 48, color: C.inkSoft, fontSize: 15, background: C.white, borderRadius: 12, border: `2px dashed ${C.line}`, cursor: isImageUploading ? "wait" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {isImageUploading ? <Loader2 size={28} style={{ animation: "iv-spin 0.8s linear infinite" }} /> : <ImagePlus size={28} />}
                  {isImageUploading ? "Subiendo imagen..." : "Haz clic para subir la primera imagen"}
                </div>
              )}

              {changed("imagenes") && (
                <div style={{ padding: "8px 12px", background: C.yellowBg, border: `1px solid ${C.yellowBorder}`, borderRadius: 8, fontSize: 14, color: C.orange, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={iconSize} />
                  Las imágenes o su orden se han modificado. Haz clic en "Guardar" para aplicar los cambios.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function imageOrderButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    minWidth: 0,
    height: 28,
    border: "none",
    borderRadius: 6,
    background: disabled ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.9)",
    color: disabled ? "rgba(255,255,255,0.45)" : C.ink,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    padding: "0 6px",
  };
}

// ── Reusable small components ─────────────────────────────────────
function Field({ label, modified, help, children }: { label: string; modified?: boolean; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 16, fontWeight: 600, color: C.inkSoft, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label} {modified && <span style={{ color: C.orange }}>●</span>}
      </label>
      {children}
      {help && <div style={{ marginTop: 5, fontSize: 13, color: C.inkSoft, lineHeight: 1.35 }}>{help}</div>}
    </div>
  );
}

function ToggleField({ label, help, value, onChange, modified }: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void; modified?: boolean }) {
  return (
    <div style={{ background: modified ? C.yellowBg : C.white, border: `1px solid ${modified ? C.yellowBorder : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, minHeight: 74 }}>
      <span style={{ minWidth: 0, paddingRight: 4 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: C.ink }}>{label} {modified && <span style={{ color: C.orange }}>●</span>}</span>
        {help && <span style={{ display: "block", marginTop: 3, fontSize: 12, color: C.inkSoft, lineHeight: 1.25 }}>{help}</span>}
      </span>
      <button
        onClick={() => onChange(!value)}
        aria-pressed={value}
        style={{
          width: 46,
          minWidth: 46,
          height: 26,
          flexShrink: 0,
          borderRadius: 999,
          border: `1px solid ${value ? C.green : "#cbd5e1"}`,
          cursor: "pointer",
          position: "relative",
          background: value ? C.green : "#e2e8f0",
          transition: "background 0.2s, border-color 0.2s",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            transition: "left 0.2s",
            boxShadow: "0 1px 4px rgba(15,23,42,0.24)",
          }}
        />
      </button>
    </div>
  );
}

function EditorHint({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#eef6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", color: "#1e3a8a" }}>
      <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.4 }}>{body}</div>
      </div>
    </div>
  );
}

function MiniInput({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 14, color: C.inkSoft, marginBottom: 3 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
        style={{ ...inputStyle(C.white, "#d1d5db"), height: 36, fontSize: 14 }} />
    </div>
  );
}

function inputStyle(bg: string, border: string): React.CSSProperties {
  return { width: "100%", height: 36, padding: "0 12px", border: `1px solid ${border}`, borderRadius: 8, fontSize: 15, fontFamily: "inherit", outline: "none", background: bg, transition: "border-color 0.2s, background 0.2s", boxSizing: "border-box" };
}

function viewToggleStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 38,
    padding: "0 14px",
    borderRadius: 8,
    border: `1px solid ${active ? "#f472b6" : C.darkLine}`,
    background: active ? "rgba(210,56,108,0.22)" : C.surface,
    color: active ? "#fce7f3" : "#cbd5e1",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function btnStyle(type: "primary" | "secondary" | "secondaryDark" | "save" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 16px", borderRadius: 8, border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
  if (type === "primary") return { ...base, background: C.plum, color: "#fff" };
  if (type === "save") return { ...base, background: C.green, color: "#fff" };
  if (type === "danger") return { ...base, background: "#fef2f2", color: C.red, border: "1px solid #fecaca" };
  if (type === "secondaryDark") return { ...base, background: C.surface2, color: "#e2e8f0", border: `1px solid ${C.darkLine}` };
  return { ...base, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" };
}
