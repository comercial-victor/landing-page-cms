export const CTA_ICON_OPTIONS = [
  { title: "WhatsApp", value: "whatsapp", group: "Redes sociales" },
  { title: "Instagram", value: "instagram", group: "Redes sociales" },
  { title: "Facebook", value: "facebook", group: "Redes sociales" },
  { title: "Messenger", value: "messenger", group: "Redes sociales" },
  { title: "TikTok", value: "tiktok", group: "Redes sociales" },
  { title: "Inicio", value: "home", group: "Navegación" },
  { title: "Novedades", value: "sparkles", group: "Navegación" },
  { title: "Colecciones", value: "collection", group: "Navegación" },
  { title: "Catálogo", value: "catalog", group: "Navegación" },
  { title: "Horarios", value: "clock", group: "Navegación" },
  { title: "Ubícanos", value: "location", group: "Navegación" },
  { title: "Link externo", value: "external", group: "Navegación" },
  { title: "Regalo", value: "gift", group: "Fiesta y campañas" },
  { title: "Fiesta", value: "party", group: "Fiesta y campañas" },
  { title: "Oferta / anuncio", value: "megaphone", group: "Fiesta y campañas" },
  { title: "Compra", value: "shoppingCart", group: "Fiesta y campañas" },
  { title: "Favorito", value: "heart", group: "Fiesta y campañas" },
  { title: "Estrella", value: "star", group: "Fiesta y campañas" },
  { title: "Corona", value: "crown", group: "Fiesta y campañas" },
  { title: "Halloween", value: "halloween", group: "Festividades" },
  { title: "Navidad", value: "christmas", group: "Festividades" },
  { title: "Año Nuevo", value: "newYear", group: "Festividades" },
  { title: "Día del maestro", value: "teacher", group: "Festividades" },
  { title: "Escolar", value: "school", group: "Festividades" },
  { title: "Pascua", value: "easter", group: "Festividades" },
  { title: "San Valentín", value: "valentine", group: "Festividades" },
] as const;

export type CtaIconValue = (typeof CTA_ICON_OPTIONS)[number]["value"];

export const SOCIAL_CTA_ICON_VALUES = ["whatsapp", "instagram", "facebook", "messenger", "tiktok"] as const;
export type SocialCtaIconValue = (typeof SOCIAL_CTA_ICON_VALUES)[number];

export function isSocialCtaIcon(value?: string): value is SocialCtaIconValue {
  return SOCIAL_CTA_ICON_VALUES.includes(value as SocialCtaIconValue);
}
