/**
 * Open Graph cards: the data behind every page's unfurl image (scripts/og/), built from the same
 * `ROUTES` titles the prerenderer writes into each page's meta tags.
 */

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CATEGORY_LABELS, getDocMeta } from "./docs/meta";
import { t } from "./i18n/t";
import { chapterNumber, COMPLETE_SLUG } from "./learn/course";
import { getProduct, PRODUCTS } from "./merch/products";
import { PRESETS } from "./console-companion/store";
import { OpenCodeWordmark, TerminalWordmark } from "./site/brand-marks";
import { getErrorPageDoc } from "./pages/tx000";
import { matchRoute } from "./router";
import type { PrerenderRoute } from "./entry-server";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgCard {
  path: string;
  /** File name under `/og/`, without the extension. */
  slug: string;
  template: "home" | "page" | "error" | "merch";
  /** Section label beside the mark (`Docs · Getting Started`; the card shows its first part). */
  section: string;
  title: string;
  /** A monospace code shown instead of the section label (error pages). */
  code?: string;
  /** Asset URL of a product photo (`/assets/…`), resolved against `dist/` by the renderer. */
  photo?: string;
  /** Inline SVG wordmark of the app the page runs (OpenCode, terminal.shop). */
  wordmark?: string;
  /** `og:image:alt`. */
  alt: string;
  /** Language and direction of the card's text (English when absent). */
  lang?: string;
  dir?: "ltr" | "rtl";
}

/** `/` → `home`, `/docs/routing` → `docs-routing`. */
export function ogSlug(path: string): string {
  return path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
}

const svg = (node: ReactNode): string => renderToStaticMarkup(node);

/** `Routing | Text.js Docs` → `Routing`. */
function pageTitle(title: string): string {
  return title.replace(/\s+\|\s+(Text\.js( Docs| Playground| Store)?|Learn Text\.js)$/, "");
}

/** The card for one prerendered route (or the 404 page). */
export async function ogCard(route: PrerenderRoute): Promise<OgCard> {
  const { path } = route;
  const title = route.cardTitle ?? pageTitle(route.title);
  const base = { path, slug: ogSlug(path), template: "page" as const, section: "", title };
  const m = matchRoute(path);
  const alt = (section: string, page: string): string => (section ? t("Text.js {section}: {page}", { section, page }) : t("Text.js: {page}", { page }));

  switch (m.name) {
    case "home":
      return { ...base, template: "home", title: t("The Console Framework"), alt: alt("", t("The Console Framework")) };
    case "docs": {
      const doc = getDocMeta(m.slug);
      if (path === "/docs") return { ...base, title: t("Documentation"), alt: alt("", t("Documentation")) };
      const section = doc ? t("Docs · {category}", { category: CATEGORY_LABELS[doc.category] }) : t("Docs");
      return { ...base, section, alt: alt(t("Docs"), title) };
    }
    case "playground":
      return { ...base, section: "Playground", alt: alt("Playground", title) };
    case "opencode":
      return { ...base, section: "Playground", title: t("OpenCode in the Console"), wordmark: svg(<OpenCodeWordmark />), alt: alt("Playground", t("OpenCode in the Console")) };
    case "coffee":
      // The terminal wordmark names the shop; an all-lowercase title read a size smaller than its second line.
      return { ...base, section: "Playground", title: t("Coffee in the Console"), wordmark: svg(<TerminalWordmark />), alt: alt("Playground", t("Coffee from terminal.shop in the Console")) };
    case "learn": {
      if (m.slug === "" || m.slug === COMPLETE_SLUG) return { ...base, section: t("Learn Text.js"), alt: alt(t("Learn Text.js"), title) };
      const n = chapterNumber(m.slug);
      return { ...base, section: t("Learn · Chapter {n}", { n }), alt: alt(t("Learn, chapter {n}", { n }), title) };
    }
    case "errors":
      return { ...base, title: t("Error Codes"), alt: alt(t("Errors"), t("Error Codes")) };
    case "error": {
      const doc = getErrorPageDoc(m.code);
      const name = doc?.title ?? title;
      return { ...base, template: "error", section: t("Errors"), code: m.code, title: name, alt: alt(doc?.kind === "warning" ? t("warning") : t("error"), `${m.code}, ${name}`) };
    }
    case "changelog":
      return { ...base, alt: alt("", t("Changelog")) };
    case "blog":
      return { ...base, alt: alt("", t("Blog")) };
    case "blog-post":
      return { ...base, section: t("Blog"), alt: alt(t("Blog"), title) };
    case "enterprise":
      return { ...base, title: t("Text.js Enterprise"), alt: alt("", t("Text.js Enterprise")) };
    case "status":
      return { ...base, section: t("Status"), title: t("Turbolog Status"), alt: alt("", t("Turbolog Status")) };
    case "merch": {
      if (m.slug === "") {
        return { ...base, template: "merch", photo: PRODUCTS[0]?.images[0]?.large, alt: alt("", t("Text.js Store")) };
      }
      const p = getProduct(m.slug);
      if (!p) return { ...base, template: "merch", section: t("Store"), alt: alt(t("Store"), title) };
      return {
        ...base,
        template: "merch",
        section: t("Store · {number}", { number: p.number }),
        photo: p.images[0]?.large,
        alt: t("{name}, {color}, from the Text.js Store", { name: title, color: p.color }),
      };
    }
    case "not-found":
      return { ...base, slug: "404", template: "error", section: "", code: "404", title: t("This page could not be found"), alt: alt("404", t("This page could not be found")) };
  }
}

/** Cards for every route, in order, plus the 404 page. */
export async function ogCards(routes: readonly PrerenderRoute[], notFoundPath: string): Promise<OgCard[]> {
  const cards: OgCard[] = [];
  for (const r of routes) cards.push(await ogCard(r));
  cards.push(await ogCard({ path: notFoundPath, title: "404", description: "" }));
  return cards;
}
