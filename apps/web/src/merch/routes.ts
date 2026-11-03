import { t } from "../i18n/t";
import { getProductMeta, productPath, PRODUCTS_META } from "./meta";

/** `/store` and `/store/<slug>`; `null` for anything else. */
export function merchRoute(path: string): { name: "merch"; slug: string } | { name: "not-found" } | null {
  if (path === "/store") return { name: "merch", slug: "" };
  const m = /^\/store\/([^/]+)$/.exec(path);
  if (!m) return path.startsWith("/store/") ? { name: "not-found" } : null;
  const slug = m[1] as string;
  return getProductMeta(slug) ? { name: "merch", slug } : { name: "not-found" };
}

export function merchTitle(slug: string): string {
  const p = getProductMeta(slug);
  return p ? t("{name} | Text.js Store", { name: p.name }) : t("Store | Text.js");
}

export const MERCH_DESCRIPTION = t("The Text.js Store: tees, hoodies, caps and stickers with the ▼ and console.log, plus ⌘⌥J keycaps and a notebook.");

/** Prerendered store pages. */
export const MERCH_ROUTES: ReadonlyArray<{ path: string; title: string; description: string; cardTitle: string }> = [
  { path: "/store", title: merchTitle(""), description: MERCH_DESCRIPTION, cardTitle: t("Store") },
  ...PRODUCTS_META.map((p) => ({ path: productPath(p.slug), title: merchTitle(p.slug), description: p.summary, cardTitle: p.name })),
];
