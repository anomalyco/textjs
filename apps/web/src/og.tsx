/**
 * Open Graph cards: the data behind every page's unfurl image (scripts/og/), built from the same
 * `ROUTES` titles the prerenderer writes into each page's meta tags.
 */

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TX_ERRORS } from "@textjs/core";
import { getDoc } from "./docs/registry";
import { chapterNumber, COMPLETE_SLUG } from "./learn/course";
import { getProduct, PRODUCTS } from "./merch/products";
import { PRESETS } from "./console-companion/store";
import { OpenCodeWordmark, TerminalWordmark } from "./site/brand-marks";
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
  const title = pageTitle(route.title);
  const base = { path, slug: ogSlug(path), template: "page" as const, section: "", title };
  const m = matchRoute(path);
  const alt = (section: string, t: string): string => `Text.js${section ? ` ${section}` : ""}: ${t}`;

  switch (m.name) {
    case "home":
      return { ...base, template: "home", title: "The Console Framework", alt: alt("", "The Console Framework") };
    case "docs": {
      const doc = getDoc(m.slug);
      if (path === "/docs") return { ...base, title: "Documentation", alt: alt("", "Documentation") };
      const section = `Docs · ${doc?.category ?? ""}`.replace(/ · $/, "");
      return { ...base, section, alt: alt("Docs", title) };
    }
    case "playground": {
      const preset = PRESETS.find((p) => p.id === m.preset) ?? PRESETS[0];
      const label = preset?.label ?? "Playground";
      return { ...base, section: "Playground", title: label, alt: alt("Playground", label) };
    }
    case "opencode":
      return { ...base, section: "Playground", title: "OpenCode in the Console", wordmark: svg(<OpenCodeWordmark />), alt: alt("Playground", "OpenCode in the Console") };
    case "coffee":
      // The terminal wordmark names the shop; an all-lowercase title read a size smaller than its second line.
      return { ...base, section: "Playground", title: "Coffee in the Console", wordmark: svg(<TerminalWordmark />), alt: alt("Playground", "Coffee from terminal.shop in the Console") };
    case "learn": {
      if (m.slug === "") {
        const [section, rest] = title.split(": ");
        return { ...base, section: section ?? "Learn", title: rest ?? title, alt: alt("Learn Text.js", rest ?? title) };
      }
      if (m.slug === COMPLETE_SLUG) return { ...base, section: "Learn Text.js", title: "Certificate", alt: alt("Learn Text.js", "Certificate") };
      const section = `Learn · Chapter ${chapterNumber(m.slug)}`;
      return { ...base, section, alt: alt(`Learn, chapter ${chapterNumber(m.slug)}`, title) };
    }
    case "errors":
      return { ...base, title: "Error Codes", alt: alt("Errors", "Error Codes") };
    case "error": {
      const doc = TX_ERRORS.find((e) => e.code === m.code);
      const t = doc?.title ?? (m.code === "TX000" ? "Success" : title);
      return { ...base, template: "error", section: "Errors", code: m.code, title: t, alt: alt(doc?.kind === "warning" ? "warning" : "error", `${m.code}, ${t}`) };
    }
    case "changelog":
      return { ...base, alt: alt("", "Changelog") };
    case "blog":
      return { ...base, alt: alt("", "Blog") };
    case "blog-post":
      return { ...base, section: "Blog", alt: alt("Blog", title) };
    case "enterprise":
      return { ...base, title: "Text.js Enterprise", alt: alt("", "Text.js Enterprise") };
    case "status":
      return { ...base, section: "Status", title: "Turbolog Status", alt: alt("", "Turbolog Status") };
    case "merch": {
      if (m.slug === "") {
        return { ...base, template: "merch", photo: PRODUCTS[0]?.images[0]?.large, alt: alt("", "Text.js Store") };
      }
      const p = getProduct(m.slug);
      if (!p) return { ...base, template: "merch", section: "Store", alt: alt("Store", title) };
      return {
        ...base,
        template: "merch",
        section: `Store · ${p.number}`,
        photo: p.images[0]?.large,
        alt: `${title}, ${p.color}, from the Text.js Store`,
      };
    }
    case "not-found":
      return { ...base, slug: "404", template: "error", section: "", code: "404", title: "This page could not be found", alt: alt("404", "This page could not be found") };
  }
}

/** Cards for every route, in order, plus the 404 page. */
export async function ogCards(routes: readonly PrerenderRoute[], notFoundPath: string): Promise<OgCard[]> {
  const cards: OgCard[] = [];
  for (const r of routes) cards.push(await ogCard(r));
  cards.push(await ogCard({ path: notFoundPath, title: "404", description: "" }));
  return cards;
}
