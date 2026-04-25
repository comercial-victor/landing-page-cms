// normalizeCatalogRows.ts
// Convierte filas crudas (de Excel/CSV/JSON) al formato del schema de Sanity.

export interface RawRow {
  categoria?: string;
  categoria_slug?: string;
  categoria_color?: string;
  categoria_descripcion?: string;
  categoria_orden?: string | number;
  subcategoria?: string;
  subcategoria_slug?: string;
  subcategoria_orden?: string | number;
  producto?: string;
  producto_slug?: string;
  tipo?: string;
  descripcion?: string;
  detalles?: string;
  imagenes?: string;
  precio?: string | number;
  mostrar_desde?: string;
  unidad_venta?: string;
  tags?: string;
  mensaje_whatsapp?: string;
  stock?: string;
  destacado?: string;
  activo?: string;
  orden?: string | number;
  mostrar_ahorro_pack?: string;
}

export interface NormalizedCategoria {
  _id: string;
  _type: "categoria";
  nombre: string;
  slug: { _type: "slug"; current: string };
  color: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

export interface NormalizedSubcategoria {
  _id: string;
  _type: "subcategoria";
  nombre: string;
  slug: { _type: "slug"; current: string };
  categoriaSlug: string; // para resolver la referencia
  orden: number;
  activo: boolean;
}

export interface NormalizedProducto {
  _id: string;
  _type: "producto";
  nombre: string;
  slug: { _type: "slug"; current: string };
  tipo: "simple" | "pack" | "alquiler";
  subcategoriaSlug: string; // para resolver la referencia
  descripcion?: string;
  detalles?: string[];
  imagenesUrls?: string[]; // URLs crudas, se suben después
  precio?: number | null;
  precioDesde: boolean;
  unidadVenta?: string;
  tags?: string[];
  whatsappMensaje?: string;
  stock: "disponible" | "bajo" | "consultar";
  destacado: boolean;
  activo: boolean;
  orden: number;
  mostrarAhorroPack: boolean;
}

export interface RowError {
  row: number;
  field: string;
  message: string;
  critical: boolean;
}

export interface NormalizedCatalog {
  categorias: NormalizedCategoria[];
  subcategorias: NormalizedSubcategoria[];
  productos: NormalizedProducto[];
  errors: RowError[];
  warnings: RowError[];
}

// ── Slug generator ────────────────────────────────────────────────
export function makeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Boolean normalizer ────────────────────────────────────────────
function parseBool(val: string | undefined | null): boolean {
  if (!val) return false;
  return ["sí", "si", "true", "1", "activo", "disponible", "yes"].includes(
    String(val).toLowerCase().trim()
  );
}

// ── Stock normalizer ──────────────────────────────────────────────
function parseStock(val: string | undefined): "disponible" | "bajo" | "consultar" {
  if (!val) return "disponible";
  const v = val.toLowerCase().trim();
  if (v === "bajo") return "bajo";
  if (v === "consultar") return "consultar";
  return "disponible";
}

// ── Tipo normalizer ───────────────────────────────────────────────
function parseTipo(val: string | undefined): "simple" | "pack" | "alquiler" {
  if (!val) return "simple";
  const v = val.toLowerCase().trim();
  if (v === "pack") return "pack";
  if (v === "alquiler") return "alquiler";
  return "simple";
}

// ── Price normalizer ──────────────────────────────────────────────
function parsePrice(val: string | number | undefined): number | null {
  if (val === "" || val === undefined || val === null) return null;
  const n = Number(String(val).replace(",", "."));
  return isNaN(n) ? null : n;
}

// ── URL validator ─────────────────────────────────────────────────
function isValidUrl(url: string): boolean {
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

// ── Main normalizer ───────────────────────────────────────────────
export function normalizeRows(rows: RawRow[]): NormalizedCatalog {
  const categoriasMap = new Map<string, NormalizedCategoria>();
  const subcategoriasMap = new Map<string, NormalizedSubcategoria>();
  const productosMap = new Map<string, NormalizedProducto>();
  const errors: RowError[] = [];
  const warnings: RowError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2 porque fila 1 es header

    // ── Categoría ─────────────────────────────────────
    const catNombre = String(row.categoria || "").trim();
    if (!catNombre) {
      errors.push({ row: rowNum, field: "categoria", message: "Categoría obligatoria vacía", critical: true });
      return; // skip row
    }

    const catSlug = row.categoria_slug
      ? makeSlug(String(row.categoria_slug))
      : makeSlug(catNombre);

    if (!categoriasMap.has(catSlug)) {
      const color = String(row.categoria_color || "#D2386C").trim();
      if (color && !/^#[0-9A-Fa-f]{3,6}$/.test(color)) {
        warnings.push({ row: rowNum, field: "categoria_color", message: `Color inválido "${color}", se usará #D2386C`, critical: false });
      }
      categoriasMap.set(catSlug, {
        _id: `categoria-${catSlug}`,
        _type: "categoria",
        nombre: catNombre,
        slug: { _type: "slug", current: catSlug },
        color: /^#[0-9A-Fa-f]{3,6}$/.test(color) ? color : "#D2386C",
        descripcion: String(row.categoria_descripcion || "").trim() || undefined,
        orden: Number(row.categoria_orden) || 0,
        activo: row.activo !== undefined ? parseBool(String(row.activo)) : true,
      });
    }

    // ── Subcategoría ──────────────────────────────────
    const subNombre = String(row.subcategoria || "").trim();
    if (!subNombre) {
      errors.push({ row: rowNum, field: "subcategoria", message: "Subcategoría obligatoria vacía", critical: true });
      return;
    }

    const subSlug = row.subcategoria_slug
      ? makeSlug(String(row.subcategoria_slug))
      : makeSlug(subNombre);

    if (!subcategoriasMap.has(subSlug)) {
      subcategoriasMap.set(subSlug, {
        _id: `subcategoria-${subSlug}`,
        _type: "subcategoria",
        nombre: subNombre,
        slug: { _type: "slug", current: subSlug },
        categoriaSlug: catSlug,
        orden: Number(row.subcategoria_orden) || 0,
        activo: row.activo !== undefined ? parseBool(String(row.activo)) : true,
      });
    }

    // ── Producto (opcional: fila puede ser solo cat/subcat) ────────
    const prodNombre = String(row.producto || "").trim();
    if (!prodNombre) return; // fila solo define cat/subcat, ok

    const prodSlug = row.producto_slug
      ? makeSlug(String(row.producto_slug))
      : makeSlug(prodNombre);

    // Validar tipo
    const tipoRaw = String(row.tipo || "").trim();
    if (tipoRaw && !["simple", "pack", "alquiler"].includes(tipoRaw.toLowerCase())) {
      warnings.push({ row: rowNum, field: "tipo", message: `Tipo "${tipoRaw}" desconocido, se usará "simple"`, critical: false });
    }

    // Validar precio
    const precioRaw = row.precio;
    const precio = parsePrice(precioRaw);
    if (precioRaw !== undefined && precioRaw !== "" && precio === null) {
      warnings.push({ row: rowNum, field: "precio", message: `Precio "${precioRaw}" no es un número válido, se dejará vacío`, critical: false });
    }

    // Parsear detalles (separados por ; o |)
    const detallesRaw = String(row.detalles || "").trim();
    const detalles = detallesRaw
      ? detallesRaw.split(/[;|]/).map((d) => d.trim()).filter(Boolean)
      : undefined;

    // Parsear imágenes (URLs separadas por coma)
    const imagenesRaw = String(row.imagenes || "").trim();
    const imagenesUrls = imagenesRaw
      ? imagenesRaw.split(",").map((u) => u.trim()).filter(Boolean)
      : undefined;

    if (imagenesUrls) {
      imagenesUrls.forEach((url) => {
        if (!isValidUrl(url)) {
          warnings.push({ row: rowNum, field: "imagenes", message: `URL de imagen inválida: "${url}"`, critical: false });
        }
      });
    }

    // Parsear tags (separados por coma)
    const tagsRaw = String(row.tags || "").trim();
    const tagsArr = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter((t) => ["popular", "nuevo"].includes(t))
      : undefined;

    if (tagsRaw && (!tagsArr || tagsArr.length === 0)) {
      warnings.push({ row: rowNum, field: "tags", message: `Tags "${tagsRaw}" no reconocidos, deben ser "popular" o "nuevo"`, critical: false });
    }

    if (productosMap.has(prodSlug)) {
      warnings.push({ row: rowNum, field: "producto_slug", message: `Slug "${prodSlug}" duplicado, se actualizará con esta fila`, critical: false });
    }

    productosMap.set(prodSlug, {
      _id: `producto-${prodSlug}`,
      _type: "producto",
      nombre: prodNombre,
      slug: { _type: "slug", current: prodSlug },
      tipo: parseTipo(tipoRaw),
      subcategoriaSlug: subSlug,
      descripcion: String(row.descripcion || "").trim() || undefined,
      detalles,
      imagenesUrls,
      precio,
      precioDesde: parseBool(String(row.mostrar_desde || "")),
      unidadVenta: String(row.unidad_venta || "").trim() || undefined,
      tags: tagsArr,
      whatsappMensaje: String(row.mensaje_whatsapp || "").trim() || undefined,
      stock: parseStock(String(row.stock || "")),
      destacado: parseBool(String(row.destacado || "")),
      activo: row.activo !== undefined ? parseBool(String(row.activo)) : true,
      orden: Number(row.orden) || 0,
      mostrarAhorroPack: parseBool(String(row.mostrar_ahorro_pack || "")),
    });
  });

  return {
    categorias: Array.from(categoriasMap.values()),
    subcategorias: Array.from(subcategoriasMap.values()),
    productos: Array.from(productosMap.values()),
    errors,
    warnings,
  };
}

// ── JSON format normalizer ────────────────────────────────────────
export interface JsonFormat {
  categories?: Array<{
    name: string; slug?: string; color?: string;
    shortDescription?: string; order?: number; active?: boolean;
  }>;
  subcategories?: Array<{
    name: string; slug?: string; categorySlug: string;
    order?: number; active?: boolean;
  }>;
  products?: Array<{
    name: string; slug?: string; type?: string;
    subcategorySlug: string; description?: string;
    details?: string[]; images?: string[]; price?: number | null;
    showFromPrice?: boolean; unit?: string; tags?: string[];
    whatsappMessage?: string; inStock?: boolean; featured?: boolean;
    active?: boolean; order?: number; showPackSavings?: boolean;
  }>;
}

export function normalizeJson(data: JsonFormat): NormalizedCatalog {
  const errors: RowError[] = [];
  const warnings: RowError[] = [];
  const categorias: NormalizedCategoria[] = [];
  const subcategorias: NormalizedSubcategoria[] = [];
  const productos: NormalizedProducto[] = [];

  // Categorías
  (data.categories || []).forEach((c, i) => {
    if (!c.name) {
      errors.push({ row: i + 1, field: "name", message: "Categoría sin nombre", critical: true });
      return;
    }
    const slug = c.slug ? makeSlug(c.slug) : makeSlug(c.name);
    categorias.push({
      _id: `categoria-${slug}`,
      _type: "categoria",
      nombre: c.name,
      slug: { _type: "slug", current: slug },
      color: c.color || "#D2386C",
      descripcion: c.shortDescription,
      orden: c.order || 0,
      activo: c.active !== false,
    });
  });

  // Subcategorías
  (data.subcategories || []).forEach((s, i) => {
    if (!s.name) {
      errors.push({ row: i + 1, field: "name", message: "Subcategoría sin nombre", critical: true });
      return;
    }
    if (!s.categorySlug) {
      errors.push({ row: i + 1, field: "categorySlug", message: "Subcategoría sin categorySlug", critical: true });
      return;
    }
    const slug = s.slug ? makeSlug(s.slug) : makeSlug(s.name);
    subcategorias.push({
      _id: `subcategoria-${slug}`,
      _type: "subcategoria",
      nombre: s.name,
      slug: { _type: "slug", current: slug },
      categoriaSlug: makeSlug(s.categorySlug),
      orden: s.order || 0,
      activo: s.active !== false,
    });
  });

  // Productos
  (data.products || []).forEach((p, i) => {
    if (!p.name) {
      errors.push({ row: i + 1, field: "name", message: "Producto sin nombre", critical: true });
      return;
    }
    if (!p.subcategorySlug) {
      errors.push({ row: i + 1, field: "subcategorySlug", message: "Producto sin subcategorySlug", critical: true });
      return;
    }
    const slug = p.slug ? makeSlug(p.slug) : makeSlug(p.name);
    productos.push({
      _id: `producto-${slug}`,
      _type: "producto",
      nombre: p.name,
      slug: { _type: "slug", current: slug },
      tipo: parseTipo(p.type),
      subcategoriaSlug: makeSlug(p.subcategorySlug),
      descripcion: p.description,
      detalles: p.details,
      imagenesUrls: p.images,
      precio: p.price ?? null,
      precioDesde: p.showFromPrice || false,
      unidadVenta: p.unit,
      tags: p.tags,
      whatsappMensaje: p.whatsappMessage,
      stock: p.inStock === false ? "consultar" : "disponible",
      destacado: p.featured || false,
      activo: p.active !== false,
      orden: p.order || 0,
      mostrarAhorroPack: p.showPackSavings || false,
    });
  });

  return { categorias, subcategorias, productos, errors, warnings };
}
