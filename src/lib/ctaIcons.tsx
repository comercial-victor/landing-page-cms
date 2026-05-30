import type { ReactNode } from "react";
import {
  Clock,
  Crown,
  Egg,
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
  Snowflake,
  Sparkles,
  Star,
  TreePine,
} from "lucide-react";
import type { SocialPlatform } from "@/types";
import { ContactIcon } from "@/lib/social";
import { isSocialCtaIcon, type CtaIconValue } from "@/lib/ctaIconOptions";

interface CtaIconProps {
  icon?: string;
  action?: "whatsapp" | "customUrl" | "scroll";
  contactPlatform?: SocialPlatform;
  size?: number;
}

function LucideIcon({ icon, size }: { icon: string; size: number }) {
  const props = { size, strokeWidth: 2.35, "aria-hidden": true };

  switch (icon as CtaIconValue) {
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
      return null;
  }
}

export function CtaIcon({ icon, action, contactPlatform = "whatsapp", size = 18 }: CtaIconProps): ReactNode {
  if (icon && isSocialCtaIcon(icon)) {
    return <ContactIcon platform={icon} size={size} />;
  }

  if (icon === "easterEgg") return <Egg size={size} strokeWidth={2.35} aria-hidden="true" />;
  if (icon === "winter") return <Snowflake size={size} strokeWidth={2.35} aria-hidden="true" />;

  if (icon) {
    const selected = LucideIcon({ icon, size });
    if (selected) return selected;
  }

  if (action === "whatsapp") return <ContactIcon platform={contactPlatform} size={size} />;
  if (action === "customUrl") return <ExternalLink size={size} strokeWidth={2.35} aria-hidden="true" />;
  return <Sparkles size={size} strokeWidth={2.35} aria-hidden="true" />;
}
