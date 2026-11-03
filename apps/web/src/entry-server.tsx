/**
 * Build-time prerenderer (`vite build --ssr`, driven by scripts/postbuild-pages.ts): every route
 * ships its final markup, so the first paint already has the final layout and the browser
 * entry only hydrates it.
 */

import { prerender } from "react-dom/static";
import { POSTS, postPath, renderRss } from "./blog";
import { DOCS_META, docPath } from "./docs/meta";
import { LEARN_ROUTES } from "./learn/routes";
import { MERCH_ROUTES } from "./merch/routes";
import { PRESETS, presetPath, type PresetId } from "./console-companion/store";
import { t } from "./i18n/t";
import { ERROR_DOCS as TX_ERRORS } from "./pages/tx000";
import { Root } from "./Root";
import { preloadAllRoutes, routeManifestSources } from "./route-loader";
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
  /** The page's own title for its share card, when `title` carries a suffix (`Routing` for `Routing | Text.js Docs`). */
  cardTitle?: string;
}

/** A Playground demo's name, the title of its share card. */
const demoLabel = (id: PresetId): string => PRESETS.find((p) => p.id === id)?.label ?? id;

export const ROUTES: readonly PrerenderRoute[] = [
  { path: "/", title: titleFor({ name: "home" }), description: "" },
  { path: "/docs", title: t("Documentation | Text.js"), description: t("Learn how to build React apps that render in the DevTools console.") },
  // Every page also lives at /docs/<slug> (/docs/introduction included).
  ...DOCS_META.map((d) => ({ path: `/docs/${d.slug}`, title: titleFor(matchRoute(`/docs/${d.slug}`)), description: d.description, canonical: docPath(d.slug), cardTitle: d.title })),
  // The Playground's demos, in picker order. OpenCode and terminal.shop have their own URLs.
  { path: "/playground", title: titleFor(matchRoute("/playground")), description: t("Pick a Text.js demo, open the DevTools console and press a few keys."), cardTitle: demoLabel("dashboard") },
  { path: presetPath("streaming"), title: titleFor(matchRoute(presetPath("streaming"))), description: t("Watch Markdown and a code diff stream into the DevTools console, then press r to replay it."), cardTitle: demoLabel("streaming") },
  { path: presetPath("snake"), title: titleFor(matchRoute(presetPath("snake"))), description: t("Play Snake in the DevTools console. The game loop is a Text.js app that reads the arrow keys with useInput."), cardTitle: demoLabel("snake") },
  { path: presetPath("doom"), title: titleFor(matchRoute(presetPath("doom"))), description: t("Play the Doom shareware episode in the DevTools console."), cardTitle: demoLabel("doom") },
  { path: "/opencode", title: titleFor({ name: "opencode" }), description: t("OpenCode Lite is a console client for the OpenCode coding agent. Connect a local server or try the sandbox.") },
  { path: "/coffee", title: titleFor({ name: "coffee" }), description: t("Browse the terminal.shop storefront and order coffee from the DevTools console.") },
  ...LEARN_ROUTES,
  { path: "/errors", title: titleFor({ name: "errors" }), description: t("Every Text.js error and warning code, with its cause and fix.") },
  ...TX_ERRORS.map((e) => ({ path: `/errors/${e.code}`, title: titleFor({ name: "error", code: e.code }), description: t("{code}: {title}. Cause and fix.", { code: e.code, title: e.title }) })),
  { path: "/errors/TX000", title: titleFor({ name: "error", code: "TX000" }), description: t("TX000: Success."), noindex: true },
  { path: "/changelog", title: titleFor({ name: "changelog" }), description: t("Release notes for every Text.js version.") },
  { path: "/blog", title: titleFor({ name: "blog" }), description: t("Releases and engineering notes from the Text.js team.") },
  ...POSTS.map((p) => ({ path: postPath(p.slug), title: titleFor({ name: "blog-post", slug: p.slug }), description: p.summary, cardTitle: p.title })),
  { path: "/enterprise", title: titleFor({ name: "enterprise" }), description: t("Text.js Enterprise adds a 99.99% console.log SLA, a named console engineer and security reviews.") },
  { path: "/status", title: titleFor({ name: "status" }), description: t("Check Turbolog component status, run the pipeline benchmark in your browser and see performance history.") },
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

export { titleFor, matchRoute, renderRss, routeManifestSources };
export { learnVideo } from "./learn/video";
export { humansTxt, llmsTxt, statusApi } from "./static-files";
export { renderHomeAnsi } from "./home-ansi";
export { ogCards } from "./og";
export { PREFIT_MIRRORS_SCRIPT, PREFIT_MIRRORS_WHILE_PARSING_SCRIPT } from "./site/DevToolsWindow";
