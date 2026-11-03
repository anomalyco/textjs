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
import { presetPath } from "./console-companion/store";
import { Root } from "./Root";
import { preloadAllRoutes, ROUTE_MANIFEST_SRC } from "./route-loader";
import { matchRoute, resetLocation, titleFor } from "./router";

await preloadAllRoutes();

export interface PrerenderRoute {
  path: string;
  title: string;
  description: string;
  /** Canonical URL path when it differs from `path` (/docs/introduction → /docs). */
  canonical?: string;
  /** Prerendered so the URL returns 200, but kept out of search indexes. */
  noindex?: boolean;
}

export const ROUTES: readonly PrerenderRoute[] = [
  { path: "/", title: titleFor({ name: "home" }), description: "" },
  { path: "/docs", title: "Documentation | Text.js", description: "Learn how to build React apps that render in the DevTools console." },
  // Every page also lives at /docs/<slug> (/docs/introduction included).
  ...DOCS.map((d) => ({ path: `/docs/${d.slug}`, title: titleFor(matchRoute(`/docs/${d.slug}`)), description: d.description, canonical: docPath(d.slug) })),
  // The Playground's demos, in picker order. OpenCode and terminal.shop have their own URLs.
  { path: "/playground", title: titleFor(matchRoute("/playground")), description: "Pick a Text.js demo, open the DevTools console and press a few keys." },
  { path: presetPath("streaming"), title: titleFor(matchRoute(presetPath("streaming"))), description: "Watch Markdown and a code diff stream into the DevTools console, then press r to replay it." },
  { path: presetPath("snake"), title: titleFor(matchRoute(presetPath("snake"))), description: "Play Snake in the DevTools console. The game loop is a Text.js app that reads the arrow keys with useInput." },
  { path: presetPath("doom"), title: titleFor(matchRoute(presetPath("doom"))), description: "Play the DOOM shareware episode in the DevTools console, drawn in half-block pixels." },
  { path: "/opencode", title: titleFor({ name: "opencode" }), description: "OpenCode Lite is a console client for the OpenCode coding agent. Connect a local server or try the sandbox." },
  { path: "/coffee", title: titleFor({ name: "coffee" }), description: "Browse the terminal.shop storefront and order coffee from the DevTools console." },
  ...LEARN_ROUTES,
  { path: "/errors", title: titleFor({ name: "errors" }), description: "Every Text.js error and warning code, with its cause and fix." },
  ...TX_ERRORS.map((e) => ({ path: `/errors/${e.code}`, title: titleFor({ name: "error", code: e.code }), description: `${e.code}: ${e.title}. Cause and fix.` })),
  { path: "/errors/TX000", title: titleFor({ name: "error", code: "TX000" }), description: "TX000: Success.", noindex: true },
  { path: "/changelog", title: titleFor({ name: "changelog" }), description: "Release notes for every Text.js version." },
  { path: "/blog", title: titleFor({ name: "blog" }), description: "Releases and engineering notes from the Text.js team." },
  ...POSTS.map((p) => ({ path: postPath(p.slug), title: titleFor({ name: "blog-post", slug: p.slug }), description: p.summary })),
  { path: "/enterprise", title: titleFor({ name: "enterprise" }), description: "Text.js Enterprise adds a 99.99% console.log SLA, a named console engineer and security reviews." },
  { path: "/status", title: titleFor({ name: "status" }), description: "Check Turbolog component status, run the pipeline benchmark in your browser and see performance history." },
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

export { titleFor, matchRoute, renderRss, ROUTE_MANIFEST_SRC };
export { learnVideo } from "./learn/video";
export { humansTxt, llmsTxt, statusApi } from "./static-files";
export { renderHomeAnsi } from "./home-ansi";
export { ogCards } from "./og";
export { PREFIT_MIRRORS_SCRIPT, PREFIT_MIRRORS_WHILE_PARSING_SCRIPT } from "./site/DevToolsWindow";
