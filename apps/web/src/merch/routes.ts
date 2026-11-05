import { t } from "../i18n/t";
import { getProductMeta } from "./meta";

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
