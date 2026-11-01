import { getProduct, PRODUCTS, productPath } from "./products";

/** `/merch` and `/merch/<slug>`; `null` for anything else. */
export function merchRoute(path: string): { name: "merch"; slug: string } | { name: "not-found" } | null {
  if (path === "/merch") return { name: "merch", slug: "" };
  const m = /^\/merch\/([^/]+)$/.exec(path);
  if (!m) return path.startsWith("/merch/") ? { name: "not-found" } : null;
  const slug = m[1] as string;
  return getProduct(slug) ? { name: "merch", slug } : { name: "not-found" };
}

export function merchTitle(slug: string): string {
  const p = getProduct(slug);
  return p ? `${p.name} | Text.js Merch` : "Merch | Text.js";
}

export const MERCH_DESCRIPTION = "Text.js merch: a heavyweight tee with the first textjs.org console frame on the back, a hoodie, a cap, stickers, ⌘⌥J keycaps and a notebook.";

/** Prerendered store pages. */
export const MERCH_ROUTES: ReadonlyArray<{ path: string; title: string; description: string }> = [
  { path: "/merch", title: merchTitle(""), description: MERCH_DESCRIPTION },
  ...PRODUCTS.map((p) => ({ path: productPath(p.slug), title: merchTitle(p.slug), description: p.description[0] as string })),
];
