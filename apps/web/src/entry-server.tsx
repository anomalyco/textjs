/**
 * Build-time prerenderer (`vite build --ssr`, driven by scripts/postbuild-pages.ts): every route
 * ships its final markup, so the first paint already has the final layout and the browser
 * entry only hydrates it.
 */

import { prerender } from "react-dom/static";
import { POSTS, postPath, renderRss } from "./blog";
import { DOCS, docPath } from "./docs/registry";
import { TX_ERRORS } from "@textjs/core";
import { LEARN_ROUTES } from "./learn/routes";
import { MERCH_ROUTES } from "./merch/routes";
import { Root } from "./Root";
import { matchRoute, resetLocation, titleFor } from "./router";

export interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  /** Canonical URL path when it differs from `path` (/docs/introduction → /docs). */
  canonical?: string;
}

export const ROUTES: readonly PrerenderRoute[] = [
  { path: "/", title: titleFor({ name: "home" }), description: "" },
  { path: "/docs", title: "Documentation | Text.js", description: "Learn how to build full-stack interactive React 19 apps inside browser DevTools console.log." },
  // Every page also lives at /docs/<slug> (/docs/introduction included).
  ...DOCS.map((d) => ({ path: `/docs/${d.slug}`, title: titleFor(matchRoute(`/docs/${d.slug}`)), description: d.description, canonical: docPath(d.slug) })),
  { path: "/playground", title: titleFor({ name: "playground" }), description: "Pick a Text.js demo, open the DevTools console and press a few keys." },
  { path: "/opencode", title: titleFor({ name: "opencode" }), description: "OpenCode Lite coding-agent TUI running inside browser DevTools console.log." },
  { path: "/terminal", title: titleFor({ name: "terminal" }), description: "The terminal.shop storefront in your DevTools console. Sign in with Terminal and order coffee from console.log." },
  ...LEARN_ROUTES,
  { path: "/errors", title: titleFor({ name: "errors" }), description: "Every Text.js error and warning code, what it means and how to fix it." },
  ...TX_ERRORS.map((e) => ({ path: `/errors/${e.code}`, title: titleFor({ name: "error", code: e.code }), description: `${e.code}: ${e.title}. What it means and how to fix it.` })),
  { path: "/changelog", title: titleFor({ name: "changelog" }), description: "Every notable change to Text.js, release by release." },
  { path: "/blog", title: titleFor({ name: "blog" }), description: "Releases and engineering notes from the Text.js team." },
  ...POSTS.map((p) => ({ path: postPath(p.slug), title: titleFor({ name: "blog-post", slug: p.slug }), description: p.summary })),
  { path: "/enterprise", title: titleFor({ name: "enterprise" }), description: "Text.js Enterprise: console compliance, a 99.99% console.log SLA and a named console engineer." },
  { path: "/status", title: titleFor({ name: "status" }), description: "Turbolog status: component health, a live in-browser pipeline benchmark and performance history." },
  ...MERCH_ROUTES,
];

/** Route path used for the static 404 page. */
export const NOT_FOUND_PATH = "/404";

export async function render(pathname: string): Promise<string> {
  resetLocation(pathname);
  // `prerender` (unlike `renderToString`) waits for lazy chunks such as the docs live previews.
  // An unbounded chunk size keeps every Suspense boundary inline instead of outlining large ones
  // into templates that inline scripts swap in later.
  const { prelude } = await prerender(<Root />, { progressiveChunkSize: Number.POSITIVE_INFINITY });
  const html = await new Response(prelude).text();
  if (html.includes("<!--$?-->") || html.includes("<!--$!-->")) throw new Error(`prerender of ${pathname} left a Suspense boundary unresolved`);
  return html;
}

export { titleFor, matchRoute, renderRss };
export { PREFIT_MIRRORS_SCRIPT, PREFIT_MIRRORS_WHILE_PARSING_SCRIPT } from "./site/DevToolsWindow";
