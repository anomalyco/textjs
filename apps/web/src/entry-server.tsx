/**
 * Build-time prerenderer (`vite build --ssr`, driven by scripts/postbuild-pages.ts): every route
 * ships its final markup, so the first paint already has the final layout and the browser
 * entry only hydrates it.
 */

import { prerender } from "react-dom/static";
import { DOCS, docPath } from "./docs/registry";
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

export { titleFor, matchRoute };
export { PREFIT_MIRRORS_SCRIPT } from "./site/DevToolsWindow";
