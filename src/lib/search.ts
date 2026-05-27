export type SearchableValue = string | number | null | undefined | false;

const STOP_WORDS = new Set([
  "a",
  "al",
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "lo",
  "un",
  "una",
  "unos",
  "unas",
  "para",
  "por",
  "con",
  "en",
  "y",
  "o",
]);

const TOKEN_ALIASES: Record<string, string> = {
  // Colores: permite buscar "roja" y encontrar "rojo", etc.
  roja: "rojo",
  rojas: "rojo",
  rojos: "rojo",
  negro: "negro",
  negra: "negro",
  negros: "negro",
  negras: "negro",
  blanco: "blanco",
  blanca: "blanco",
  blancos: "blanco",
  blancas: "blanco",
  amarillo: "amarillo",
  amarilla: "amarillo",
  amarillos: "amarillo",
  amarillas: "amarillo",
  dorado: "dorado",
  dorada: "dorado",
  dorados: "dorado",
  doradas: "dorado",
  plateado: "plateado",
  plateada: "plateado",
  plateados: "plateado",
  plateadas: "plateado",
  rosado: "rosado",
  rosada: "rosado",
  rosados: "rosado",
  rosadas: "rosado",
  morado: "morado",
  morada: "morado",
  morados: "morado",
  moradas: "morado",
  anaranjado: "naranja",
  anaranjada: "naranja",
  anaranjados: "naranja",
  anaranjadas: "naranja",
  naranjas: "naranja",
  verde: "verde",
  verdes: "verde",
  celestes: "celeste",
  azules: "azul",
  marrones: "marron",
  beiges: "beige",
  transparentes: "transparente",
  surtidos: "surtido",
  surtidas: "surtido",

  // Variantes comunes de escritura en catálogo.
  lapisero: "lapicero",
  lapiseros: "lapicero",
  lapiceros: "lapicero",
  lapices: "lapiz",
  plumones: "plumon",
  boligrafos: "lapicero",
  boligrafo: "lapicero",
  pegamentos: "pegamento",
  siliconas: "silicona",
  globos: "globo",
  cintas: "cinta",
  vasos: "vaso",
  platos: "plato",
  servilletas: "servilleta",
  cucharas: "cuchara",
  tenedores: "tenedor",
  cuchillos: "cuchillo",
  bolsas: "bolsa",
  sorbetes: "sorbete",
  tecnopores: "tecnopor",
  manualidades: "manualidad",
};

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function basicNormalize(value: string) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/(\d)[.,](\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function singularize(token: string) {
  if (token.length <= 4) return token;
  if (token.endsWith("ces") && token.length > 5) return `${token.slice(0, -3)}z`;
  if (token.endsWith("es") && token.length > 5) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 4) return token.slice(0, -1);
  return token;
}

export function normalizeSearchToken(token: string) {
  const clean = basicNormalize(token).replace(/\s+/g, "");
  if (!clean) return "";

  const alias = TOKEN_ALIASES[clean];
  if (alias) return alias;

  const singular = singularize(clean);
  return TOKEN_ALIASES[singular] || singular;
}

export function tokenizeSearch(value: SearchableValue | SearchableValue[]) {
  const raw = Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value ?? "");

  return basicNormalize(raw)
    .split(/\s+/)
    .map(normalizeSearchToken)
    .filter((token) => token && !STOP_WORDS.has(token));
}

export function normalizeSearchText(value: SearchableValue | SearchableValue[]) {
  return tokenizeSearch(value).join(" ");
}

export function compactSearchText(value: SearchableValue | SearchableValue[]) {
  return tokenizeSearch(value).join("");
}

function tokenMatches(hayToken: string, queryToken: string) {
  if (hayToken === queryToken) return true;

  // Permite búsquedas parciales útiles: "lapic" encuentra "lapicero".
  if (queryToken.length >= 3 && hayToken.startsWith(queryToken)) return true;

  // Permite casos como "1cm" vs "1 cm" mediante el compact, no por token.
  return false;
}

export function searchScore(query: string, values: SearchableValue[]) {
  const queryTokens = tokenizeSearch(query);
  if (queryTokens.length === 0) return 1;

  const hayTokens = tokenizeSearch(values);
  if (hayTokens.length === 0) return 0;

  const hayCompact = hayTokens.join("");
  const queryCompact = queryTokens.join("");
  let score = 0;

  if (queryCompact && hayCompact.includes(queryCompact)) {
    score += 80;
  }

  for (const queryToken of queryTokens) {
    const exact = hayTokens.includes(queryToken);
    const partial = !exact && hayTokens.some((hayToken) => tokenMatches(hayToken, queryToken));

    if (!exact && !partial) return 0;

    score += exact ? 20 : 8;
  }

  const firstToken = queryTokens[0];
  if (firstToken && hayTokens[0] && tokenMatches(hayTokens[0], firstToken)) {
    score += 10;
  }

  return score;
}

export function matchesSearch(query: string, values: SearchableValue[]) {
  return searchScore(query, values) > 0;
}

export function rankBySearch<T>(items: T[], query: string, values: (item: T) => SearchableValue[]) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return items;

  return items
    .map((item, index) => ({ item, index, score: searchScore(cleanQuery, values(item)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
