export function waLink(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

export function fmtSoles(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return "S/ " + new Intl.NumberFormat("es-PE").format(n);
}
