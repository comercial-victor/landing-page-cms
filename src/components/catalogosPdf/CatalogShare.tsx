"use client";
import { useState } from "react";
import { catalogWhatsapp } from "@/lib/catalogosPdf";

export default function CatalogShare({title,url}: {title:string;url:string}) {
  const [message,setMessage] = useState("");
  async function copy() { try { await navigator.clipboard.writeText(url); setMessage("Enlace copiado."); } catch { setMessage(`Copia este enlace: ${url}`); } }
  async function share() {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({title,text:`Catálogo ${title} de Comercial Víctor`,url}); }
    catch(e) { if((e as Error).name !== "AbortError") await copy(); }
  }
  return <><div className="pdf-actions"><a className="pdf-whatsapp" href={catalogWhatsapp(title,url)} target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a><button onClick={() => void copy()}>Copiar enlace</button><button onClick={() => void share()}>Compartir…</button></div><p role="status" className="pdf-share-status">{message}</p></>;
}
