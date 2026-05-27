import React from "react";

export function VisionShortcutTool() {
  return (
    <div
      style={{
        minHeight: "100%",
        padding: "24px",
        color: "var(--card-fg-color)",
        background: "var(--card-bg-color)",
      }}
    >
      <div
        style={{
          maxWidth: 840,
          border: "1px solid var(--card-border-color)",
          borderRadius: 12,
          padding: 24,
          background: "var(--card-bg-color)",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: 13, opacity: 0.75 }}>
          Herramienta de diagnóstico
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: 28, lineHeight: 1.2 }}>
          Vision / GROQ
        </h1>
        <p style={{ margin: "0 0 18px", maxWidth: 720, lineHeight: 1.55 }}>
          Vision permite consultar directamente el dataset de Sanity con GROQ. Úsalo para verificar conteos,
          encontrar productos en borrador y revisar diferencias entre lo que ve el Studio y lo que ve la web pública.
        </p>
        <a
          href="/studio/vision"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 14px",
            borderRadius: 8,
            background: "#e83e7c",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Abrir Vision
        </a>
        <div style={{ marginTop: 24, padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.05)" }}>
          <strong>Query útil para empezar:</strong>
          <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto", marginBottom: 0 }}>
{`{
  "totalRaw": count(*[_type == "producto"]),
  "publicados": count(*[_type == "producto" && !(_id in path("drafts.**"))]),
  "drafts": count(*[_type == "producto" && _id in path("drafts.**")])
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
