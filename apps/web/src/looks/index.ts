import type { ComponentType } from "react";
import * as a1 from "./a1/look";
import * as a2 from "./a2/look";
import * as a3 from "./a3/look";

/**
 * Brand exploration (option A: keep the Text.js name, give it its own look). Each look owns its
 * folder: `look.css` (scoped under `html[data-look="aN"]`), `look.tsx` (the header mark and the
 * console banner) and `public/looks/aN-favicon.svg`. Pick one with `?look=a1|a2|a3`, `?look=` to reset.
 */
export interface Look {
  id: string;
  name: string;
  Mark: ComponentType<{ size: number }>;
  /** Rows of `█` and spaces for the console banner, replacing `▼ TEXT.JS`. */
  banner: readonly string[];
}

export const LOOKS: Record<string, Look> = { a1: a1.look, a2: a2.look, a3: a3.look };

export function currentLook(): Look | null {
  if (typeof document === "undefined") return null;
  return LOOKS[document.documentElement.dataset.look ?? ""] ?? null;
}

/** Swap the favicon for the active look. */
export function applyLookFavicon(): void {
  const look = currentLook();
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (look && link) link.href = `/looks/${look.id}-favicon.svg`;
}
