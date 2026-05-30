import React from "react";
import { set, unset, type StringInputProps } from "sanity";
import {
  Clock,
  Crown,
  ExternalLink,
  Ghost,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Layers3,
  MapPin,
  Megaphone,
  PartyPopper,
  Rabbit,
  School,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  TreePine,
} from "lucide-react";
import { CTA_ICON_OPTIONS, isSocialCtaIcon, type CtaIconValue } from "../../src/lib/ctaIconOptions";

const groupedOptions = CTA_ICON_OPTIONS.reduce<Record<string, typeof CTA_ICON_OPTIONS[number][]>>((acc, option) => {
  acc[option.group] = [...(acc[option.group] || []), option];
  return acc;
}, {});

const buttonBase: React.CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(36, 28, 47, 0.14)",
  background: "#fffdf8",
  borderRadius: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  font: "inherit",
  minHeight: 42,
  padding: "9px 10px",
  textAlign: "left",
};

function SocialStudioIcon({ value, size = 18 }: { value: string; size?: number }) {
  if (value === "whatsapp") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .15 5.33.15 11.88c0 2.1.55 4.15 1.6 5.95L.05 24l6.32-1.66a11.94 11.94 0 0 0 5.7 1.45h.01c6.57 0 11.92-5.33 11.92-11.89 0-3.17-1.24-6.16-3.48-8.42Zm-8.44 18.3h-.01c-1.7 0-3.37-.46-4.82-1.32l-.35-.21-3.75.98 1-3.65-.24-.38a9.86 9.86 0 0 1-1.5-5.32c0-5.45 4.45-9.88 9.92-9.88 2.65 0 5.14 1.03 7.01 2.9a9.82 9.82 0 0 1 2.9 7c0 5.45-4.45 9.88-9.91 9.88Zm5.43-7.4c-.3-.15-1.76-.86-2.03-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47a8.95 8.95 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.48.71.3 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.08 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.28-.2-.57-.35Z" />
      </svg>
    );
  }

  if (value === "instagram") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (value === "facebook") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.08 24 18.09 24 12.07Z" />
      </svg>
    );
  }

  if (value === "messenger") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.24 0 0 4.95 0 11.63c0 3.49 1.43 6.5 3.77 8.58V24l3.45-1.9c1.46.4 3.07.61 4.78.61 6.76 0 12-4.95 12-11.63S18.76 0 12 0Zm1.2 15.65-3.05-3.24-5.95 3.24 6.52-6.92 3.13 3.24 5.87-3.24-6.52 6.92Z" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.3 0 .6.05.88.14V9.4a6.34 6.34 0 1 0 5.46 6.27v-7a8.16 8.16 0 0 0 4.77 1.52v-3.5Z" />
    </svg>
  );
}

function StudioIcon({ value, size = 18 }: { value: string; size?: number }) {
  const props = { size, strokeWidth: 2.25, "aria-hidden": true };

  if (isSocialCtaIcon(value)) return <SocialStudioIcon value={value} size={size} />;

  switch (value as CtaIconValue) {
    case "home":
      return <Home {...props} />;
    case "sparkles":
      return <Sparkles {...props} />;
    case "collection":
      return <Layers3 {...props} />;
    case "catalog":
      return <ShoppingBag {...props} />;
    case "clock":
      return <Clock {...props} />;
    case "location":
      return <MapPin {...props} />;
    case "external":
      return <ExternalLink {...props} />;
    case "gift":
      return <Gift {...props} />;
    case "party":
      return <PartyPopper {...props} />;
    case "megaphone":
      return <Megaphone {...props} />;
    case "shoppingCart":
      return <ShoppingCart {...props} />;
    case "heart":
    case "valentine":
      return <Heart {...props} />;
    case "star":
      return <Star {...props} />;
    case "crown":
      return <Crown {...props} />;
    case "halloween":
      return <Ghost {...props} />;
    case "christmas":
      return <TreePine {...props} />;
    case "newYear":
      return <Sparkles {...props} />;
    case "teacher":
      return <GraduationCap {...props} />;
    case "school":
      return <School {...props} />;
    case "easter":
      return <Rabbit {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

export function CtaIconInput(props: StringInputProps) {
  const { value, onChange } = props;
  const selected = CTA_ICON_OPTIONS.find((option) => option.value === value);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {selected ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid rgba(36, 28, 47, 0.16)", borderRadius: 12, background: "rgba(255, 253, 248, 0.72)" }}>
          <StudioIcon value={selected.value} size={20} />
          <span style={{ fontWeight: 700 }}>Seleccionado: {selected.title}</span>
        </div>
      ) : (
        <div style={{ color: "#6f637a", fontSize: 13 }}>Sin icono elegido. El sitio usará un icono automático según la acción.</div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        {Object.entries(groupedOptions).map(([group, options]) => (
          <div key={group} style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "#6f637a", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{group}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(set(option.value))}
                    style={{
                      ...buttonBase,
                      borderColor: active ? "#D2386C" : "rgba(36, 28, 47, 0.14)",
                      boxShadow: active ? "0 0 0 2px rgba(210, 56, 108, 0.14)" : "none",
                      color: active ? "#2b123f" : "#2b2333",
                    }}
                  >
                    <StudioIcon value={option.value} size={18} />
                    <span>{option.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {value ? (
        <button
          type="button"
          onClick={() => onChange(unset())}
          style={{ ...buttonBase, justifyContent: "center", color: "#6f637a", background: "rgba(255,255,255,0.68)" }}
        >
          Quitar icono personalizado
        </button>
      ) : null}
    </div>
  );
}
