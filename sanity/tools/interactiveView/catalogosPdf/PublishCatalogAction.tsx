import { useRef, useState } from "react";
import { useClient, type DocumentActionComponent } from "sanity";
import type { CatalogoPdf } from "../../../../src/lib/catalogosPdf";
import { saveCatalog } from "./catalogService";

// Enforce the same publication rules when a document is opened through a reference in Studio.
export const PublishCatalogAction: DocumentActionComponent = props => {
  const client = useClient({apiVersion:"2026-04-24"});
  const [busy,setBusy] = useState(false); const [error,setError] = useState(""); const operation = useRef(false);
  return {label:busy ? "Publicando…" : "Publicar catálogo PDF",disabled:busy || !props.draft && !props.published,
    onHandle:async () => {
      if(operation.current) return; operation.current = true; setBusy(true); setError("");
      try { await saveCatalog(client,(props.draft || props.published) as unknown as CatalogoPdf,true); props.onComplete(); }
      catch(e) { setError((e as Error).message); }
      finally {operation.current = false;setBusy(false);}
    },dialog:error ? {type:"confirm",message:error,onConfirm:()=>setError(""),onCancel:()=>setError(""),confirmButtonText:"Entendido"} : undefined,
  };
};
PublishCatalogAction.action = "publish";
