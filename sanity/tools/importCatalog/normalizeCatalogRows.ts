// normalizeCatalogRows.ts — Normaliza las 5 hojas del Excel al formato de Sanity

// ── Raw types (from Excel) ────────────────────────────────────────
export interface RawCategoria {
  id_categoria: string;
  nombre: string;
  id_padre?: string;
  orden?: string | number;
  descripcion?: string;
}

export interface RawProducto {
  id_producto: string;
  nombre: string;
  descripcion?: string;
  categorias: string; // id de subcategoría (ej: "C-02-01")
  marca?: string;
  tags?: string;
  visible?: string;
  maneja_stock?: string;
  stock_actual?: string | number;
  permite_venta_fraccionada?: string;
  unidad_base?: string;
  medidas?: string;
  observaciones?: string;
}

export interface RawVariante {
  id_variante: string;
  id_producto: string;
  nombre_producto?: string;
  nombre_variante?: string;
  color?: string;
  "tamaño_medida"?: string;
  otros_atributos?: string;
  stock_actual?: string | number;
  imagen_archivo?: string;
  visible?: string;
}

export interface RawPresentacion {
  id_presentacion: string;
  id_producto: string;
  nombre_producto?: string;
  nombre_presentacion: string;
  factor_conversion: string | number;
  precio?: string | number;
  variantes_aplicables?: string;
  visible_en_web?: string;
  es_default?: string;
}

export interface RawTag {
  nombre_tag: string;
  descripcion?: string;
}

export interface ParsedCatalog {
  categorias: RawCategoria[];
  productos: RawProducto[];
  variantes: RawVariante[];
  presentaciones: RawPresentacion[];
  tags: RawTag[];
}

// ── Normalized types (for Sanity) ─────────────────────────────────
export interface NormCategoria {
  _id: string;
  _type: "categoria";
  idExcel: string;
  nombre: string;
  slug: { _type: "slug"; current: string };
  color: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface NormSubcategoria {
  _id: string;
  _type: "subcategoria";
  idExcel: string;
  nombre: string;
  slug: { _type: "slug"; current: string };
  categoriaRef: string; // sanity _id of parent categoria
  orden: number;
  activo: boolean;
}

export interface NormVariante {
  _key: string;
  idExcel: string;
  nombre?: string;
  color?: string;
  tamano?: string;
  otrosAtributos?: string;
  stock?: number | null;
  visible: boolean;
}

export interface NormPresentacion {
  _key: string;
  idExcel: string;
  nombre: string;
  factorConversion: number;
  precio?: number | null;
  visibleEnWeb: boolean;
  esDefault: boolean;
}

export interface NormProducto {
  _id: string;
  _type: "producto";
  idExcel: string;
  nombre: string;
  slug: { _type: "slug"; current: string };
  descripcion?: string;
  subcategoriaRef: string;
  marca: string;
  tags?: string[];
  medidas?: string;
  observaciones?: string;
  visible: boolean;
  destacado: boolean;
  orden: number;
  stock?: number | null;
  manejaStock: boolean;
  permiteVentaFraccionada: boolean;
  unidadBase: string;
  variantes: NormVariante[];
  presentaciones: NormPresentacion[];
}

export interface NormalizedCatalog {
  categorias: NormCategoria[];
  subcategorias: NormSubcategoria[];
  productos: NormProducto[];
  errors: string[];
  warnings: string[];
}

// ── Helpers ───────────────────────────────────────────────────────
export function makeSlug(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

const PRODUCT_SLUG_MAX_LENGTH = 96;

function makeProductIdSuffix(idExcel: string): string {
  const compactId = makeSlug(idExcel).replace(/-/g, "");
  if (!compactId) return "";
  return /^[a-z]/.test(compactId) ? compactId : `p${compactId}`;
}

export function makeProductSlug(nombre: string, idExcel: string): string {
  const suffix = makeProductIdSuffix(idExcel);
  const base = makeSlug(nombre);
  if (!suffix) return base.slice(0, PRODUCT_SLUG_MAX_LENGTH);

  const reserved = suffix.length + 1;
  const safeBase = base
    .slice(0, Math.max(1, PRODUCT_SLUG_MAX_LENGTH - reserved))
    .replace(/-+$/g, "");

  return `${safeBase}-${suffix}`;
}

function parseBool(val: string | undefined | null): boolean {
  if (!val) return false;
  return ["sí", "si", "true", "1", "yes"].includes(String(val).toLowerCase().trim());
}

function parseNum(val: string | number | undefined): number | null {
  if (val === "" || val === undefined || val === null) return null;
  const n = Number(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

// Colors for categories
const CAT_COLORS: Record<string, string> = {
  "servicios": "#8B5CF6",
  "descartables": "#FF7A59",
  "utiles-escolares": "#4BA3FF",
  "manualidades": "#3DD6B5",
  "fiestas-infantiles": "#FFD23F",
  "articulos-para-fiesta": "#FFD23F",
  "hogar-herramientas": "#D2386C",
};

// ── Main normalizer ───────────────────────────────────────────────
export function normalizeCatalog(raw: ParsedCatalog): NormalizedCatalog {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Separate top-level categories from subcategories
  const topCats: RawCategoria[] = [];
  const subCats: RawCategoria[] = [];

  for (const c of raw.categorias) {
    const id = String(c.id_categoria || "").trim();
    if (!id || !c.nombre) continue;
    const padre = String(c.id_padre || "").trim();
    if (!padre) {
      topCats.push(c);
    } else {
      subCats.push(c);
    }
  }

  // 2. Normalize categories
  const categorias: NormCategoria[] = topCats.map((c) => {
    const id = String(c.id_categoria).trim();
    const slug = makeSlug(c.nombre);
    return {
      _id: `cat-${id}`,
      _type: "categoria" as const,
      idExcel: id,
      nombre: c.nombre.trim(),
      slug: { _type: "slug" as const, current: slug },
      color: CAT_COLORS[slug] || "#D2386C",
      descripcion: c.descripcion ? String(c.descripcion).trim() : undefined,
      orden: Number(c.orden) || 0,
      activo: true,
    };
  });

  // 3. Normalize subcategories
  const subcategorias: NormSubcategoria[] = subCats.map((c) => {
    const id = String(c.id_categoria).trim();
    const padre = String(c.id_padre).trim();
    return {
      _id: `subcat-${id}`,
      _type: "subcategoria" as const,
      idExcel: id,
      nombre: c.nombre.trim(),
      slug: { _type: "slug" as const, current: makeSlug(c.nombre) },
      categoriaRef: `cat-${padre}`,
      orden: Number(c.orden) || 0,
      activo: true,
    };
  });

  // 4. Group variantes and presentaciones by product ID
  const variantesByProd = new Map<string, RawVariante[]>();
  for (const v of raw.variantes) {
    const pid = String(v.id_producto || "").trim();
    if (!pid) continue;
    if (!variantesByProd.has(pid)) variantesByProd.set(pid, []);
    variantesByProd.get(pid)!.push(v);
  }

  const presByProd = new Map<string, RawPresentacion[]>();
  for (const p of raw.presentaciones) {
    const pid = String(p.id_producto || "").trim();
    if (!pid) continue;
    if (!presByProd.has(pid)) presByProd.set(pid, []);
    presByProd.get(pid)!.push(p);
  }

  // 5. Normalize products
  const productos: NormProducto[] = [];

  for (const p of raw.productos) {
    const id = String(p.id_producto || "").trim();
    if (!id || !p.nombre) {
      errors.push(`Producto sin ID o nombre: ${JSON.stringify(p).slice(0, 100)}`);
      continue;
    }

    const catId = String(p.categorias || "").trim();
    if (!catId) {
      errors.push(`Producto ${id} sin categoría`);
      continue;
    }

    // Parse tags
    const tagsRaw = String(p.tags || "").trim();
    const tagsArr = tagsRaw ? tagsRaw.split(",").map(t => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean) : undefined;

    // Parse variantes
    const rawVars = variantesByProd.get(id) || [];
    const variantes: NormVariante[] = rawVars.map((v, i) => {
      const vid = String(v.id_variante || "").trim();
      const nombre = String(v.nombre_variante || "").trim() || undefined;
      const color = String(v.color || "").trim() || undefined;
      const tamKey = "tamaño_medida" as keyof RawVariante;
      const tamano = String(v[tamKey] || "").trim() || undefined;
      const stock = parseNum(v.stock_actual);
      return {
        _key: vid || `v-${i}`,
        idExcel: vid,
        nombre,
        color,
        tamano,
        otrosAtributos: String(v.otros_atributos || "").trim() || undefined,
        stock,
        visible: v.visible !== undefined ? parseBool(String(v.visible)) : true,
      };
    });

    // Parse presentaciones
    const rawPres = presByProd.get(id) || [];
    const presentaciones: NormPresentacion[] = rawPres.map((pr, i) => {
      const prid = String(pr.id_presentacion || "").trim();
      const factor = parseNum(pr.factor_conversion);
      if (!factor || factor <= 0) {
        warnings.push(`Presentación ${prid} tiene factor inválido: ${pr.factor_conversion}`);
      }
      return {
        _key: prid || `pr-${i}`,
        idExcel: prid,
        nombre: String(pr.nombre_presentacion || "").trim(),
        factorConversion: factor || 1,
        precio: parseNum(pr.precio),
        visibleEnWeb: pr.visible_en_web !== undefined ? parseBool(String(pr.visible_en_web)) : true,
        esDefault: pr.es_default !== undefined ? parseBool(String(pr.es_default)) : false,
      };
    });

    // Determine subcategoria ref
    const subcatRef = `subcat-${catId}`;

    productos.push({
      _id: `prod-${id}`,
      _type: "producto",
      idExcel: id,
      nombre: p.nombre.trim(),
      slug: { _type: "slug", current: makeProductSlug(p.nombre, id) },
      descripcion: String(p.descripcion || "").trim() || undefined,
      subcategoriaRef: subcatRef,
      marca: String(p.marca || "Genérico").trim(),
      tags: tagsArr,
      medidas: String(p.medidas || "").trim() || undefined,
      observaciones: String(p.observaciones || "").trim() || undefined,
      visible: p.visible !== undefined ? parseBool(String(p.visible)) : true,
      destacado: false,
      orden: 0,
      stock: parseNum(p.stock_actual),
      manejaStock: p.maneja_stock !== undefined ? parseBool(String(p.maneja_stock)) : true,
      permiteVentaFraccionada: p.permite_venta_fraccionada !== undefined ? parseBool(String(p.permite_venta_fraccionada)) : false,
      unidadBase: String(p.unidad_base || "unidad").trim(),
      variantes,
      presentaciones,
    });
  }

  return { categorias, subcategorias, productos, errors, warnings };
}
