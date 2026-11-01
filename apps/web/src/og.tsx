/**
 * Open Graph cards: the data behind every page's unfurl image (scripts/og/), built from the same
 * `ROUTES` titles and descriptions the prerenderer writes into each page's meta tags. Console
 * frames are real: the console companion is rendered for the route by `@textjs/react/testing`
 * and mirrored to HTML with `<ConsoleMirror>`, the component the site's own DevTools mirrors use.
 */

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { extractStyledFrame, TX_ERRORS } from "@textjs/core";
import { render } from "@textjs/react/testing";
import { ConsoleMirror } from "@textjs/react/dom";
import { formatPostDate, getPost, POSTS } from "./blog";
import { getDoc } from "./docs/registry";
import { chapterNumber, CHAPTERS, COMPLETE_SLUG, getChapter } from "./learn/course";
import { getProduct, PRODUCTS, type Product } from "./merch/products";
import { MERCH, onSale, saleOf } from "./merch/config";
import { STATS } from "./pages/Enterprise";
import terminalProducts from "../../terminal-shop/test/fixtures/products.json";
import { CompanionApp } from "./console-companion/App";
import { PRESETS } from "./console-companion/store";
import { OpenCodeWordmark, TerminalWordmark } from "./site/brand-marks";
import { CHANGELOG_RELEASES } from "./pages/Changelog";
import { COMPONENTS } from "./pages/status-components";
import { matchRoute, resetLocation } from "./router";
import type { PrerenderRoute } from "./entry-server";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export interface OgFrame {
  /** `<ConsoleMirror>` markup of one real frame. */
  html: string;
  cols: number;
  rows: number;
}

interface FrameOptions {
  /** Wait for real time too: lazy chunks and fetches resolve outside the virtual clock. */
  realTime?: boolean;
  /** App time to let pass before the frame is taken (timers run on a virtual clock). */
  ms?: number;
  /** Keys pressed after the first frame, before the clock runs. */
  keys?: string[];
  fontSize?: number;
}

export interface OgCard {
  path: string;
  /** File name under `/og/`, without the extension. */
  slug: string;
  template: "home" | "page" | "error" | "merch";
  /** Section label above the title (`Docs · Routing`). */
  section: string;
  title: string;
  description: string;
  /** Short facts under the description: a date and byline, a chapter length, a price. */
  meta: string[];
  /** A large monospace code shown instead of the section label (error pages). */
  code?: string;
  frame?: OgFrame;
  /** Asset URL of a product photo (`/assets/…`), resolved against `dist/` by the renderer. */
  photo?: string;
  /** Inline SVG wordmark of the app the page runs (OpenCode, terminal.shop). */
  wordmark?: string;
  /** Rows for a status-style list beside the title. */
  rows?: Array<{ label: string; value: string; tone: "ok" | "info" | "muted" }>;
  /** `og:image:alt`. */
  alt: string;
}

/** `/` → `home`, `/docs/routing` → `docs-routing`. */
export function ogSlug(path: string): string {
  return path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
}

/** Seeded `Math.random` (mulberry32) so demo frames are the same on every build. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Timer {
  at: number;
  every: number;
  run: () => void;
}

/**
 * A virtual clock for app timers (`setInterval`, and `setTimeout` with a delay), so a demo can be
 * advanced to a known moment without waiting for it. Zero-delay timeouts stay real: React and the
 * renderer use them to flush work.
 */
function virtualClock(): { advance(ms: number): void; restore(): void } {
  const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval, random: Math.random };
  const timers = new Map<number, Timer>();
  let now = 0;
  let seq = 0;
  const add = (cb: (...a: unknown[]) => void, ms: number, args: unknown[], repeat: boolean): number => {
    const id = 0x40000000 + ++seq;
    const every = Math.max(1, ms);
    timers.set(id, { at: now + every, every: repeat ? every : 0, run: () => cb(...args) });
    return id;
  };
  const g = globalThis as unknown as Record<string, unknown>;
  g.setTimeout = (cb: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => (ms && ms > 0 ? add(cb, ms, args, false) : real.setTimeout(cb, ms, ...args));
  g.setInterval = (cb: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => add(cb, ms ?? 0, args, true);
  const clear = (fallback: (id: never) => void) => (id: unknown) => (typeof id === "number" && timers.has(id) ? timers.delete(id) : fallback(id as never));
  g.clearTimeout = clear(real.clearTimeout);
  g.clearInterval = clear(real.clearInterval);
  Math.random = seeded(7);
  return {
    advance(ms) {
      const until = now + ms;
      for (;;) {
        let next: [number, Timer] | undefined;
        for (const entry of timers) if (entry[1].at <= until && (!next || entry[1].at < next[1].at)) next = entry;
        if (!next) break;
        const [id, t] = next;
        now = t.at;
        if (t.every) t.at += t.every;
        else timers.delete(id);
        t.run();
      }
      now = until;
    },
    restore() {
      Object.assign(globalThis, { setTimeout: real.setTimeout, clearTimeout: real.clearTimeout, setInterval: real.setInterval, clearInterval: real.clearInterval });
      Math.random = real.random;
    },
  };
}

// Geist Mono cells are 0.6em wide and its █ is 1.3em tall: at 15px a cell is a whole 9px and rows
// overlap by half a pixel, so block characters join without seams.
// Geist Mono cells are 0.6em wide and its █ is 1.3em tall: at 15px (or 10px) a cell is a whole
// number of pixels and rows overlap by under a pixel, so block characters join without seams.
const FRAME_FONT_SIZE = 15;
const lineHeightFor = (fontSize: number): number => Math.floor(fontSize * 1.3);

/** Renders the console companion at `path` and returns one frame. */
async function companionFrame(path: string, cols: number, rows: number, { ms = 0, keys = [], fontSize = FRAME_FONT_SIZE, realTime = false }: FrameOptions = {}): Promise<OgFrame> {
  resetLocation(path);
  const clock = virtualClock();
  try {
    const app = await render(<CompanionApp />, { cols, rows, theme: "geistDark", tabFocus: false });
    for (const k of keys) await app.press(k);
    // Small steps, so each tick renders the way a browser would paint between them.
    for (let t = 0; t < ms; t += 100) {
      if (realTime) await app.act(() => new Promise<void>((r) => setTimeout(r, 0)));
      await app.act(() => clock.advance(100));
    }
    const frame = extractStyledFrame(app.root.renderer.buffer);
    await app.unmount();
    return { html: renderToStaticMarkup(<ConsoleMirror frame={frame} fontSize={fontSize} lineHeight={lineHeightFor(fontSize)} style={{ display: "block" }} />), cols, rows };
  } finally {
    clock.restore();
  }
}

/**
 * terminal.shop signed out, browsing its products. The proxy it normally talks to is answered
 * in memory with the shop's recorded product list (apps/terminal-shop/test/fixtures).
 */
async function coffeeFrame(): Promise<OgFrame> {
  const status = {
    mode: "site",
    defaultEnv: "prod",
    environments: { prod: { label: "terminal.shop", api: "", enabled: true, serverToken: false }, dev: { label: "dev", api: "", enabled: false, serverToken: false } },
    session: { signedIn: false, configured: true, signInUrl: "/api/terminal/login", signOutUrl: "/api/terminal/logout" },
  };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.startsWith("data:")) return realFetch(input);
    if (url.endsWith("/_status")) return Response.json(status);
    if (url.endsWith("/api/product")) return Response.json({ data: terminalProducts });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  try {
    await import("./demos/terminal");
    return await companionFrame("/coffee", 80, 30, { ms: 3000, fontSize: 10, realTime: true });
  } finally {
    globalThis.fetch = realFetch;
  }
}

const svg = (node: ReactNode): string => renderToStaticMarkup(node);

/** `Routing | Text.js Docs` → `Routing`. */
function pageTitle(title: string): string {
  return title.replace(/\s+\|\s+(Text\.js( Docs| Playground| Merch)?|Learn Text\.js)$/, "");
}

/** The store's label for a product: "Coming soon", "Pre-order" or nothing once it's on sale. */
function availability(p: Product): string | null {
  if (!onSale(MERCH.provider, p.slug, p.sizes)) return "Coming soon";
  return saleOf(p.slug).preorder ? "Pre-order" : null;
}

/** `2026-10-31` → `Oct 31, 2026`. */
function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function price(n: number): string {
  return `$${n.toFixed(2)}`;
}

const HOME_DESCRIPTION = "Build full-stack React apps that render inside console.log.";

/** The card for one prerendered route (or the 404 page). */
export async function ogCard(route: PrerenderRoute): Promise<OgCard> {
  const { path, description } = route;
  const title = pageTitle(route.title);
  const base = { path, slug: ogSlug(path), template: "page" as const, section: "", title, description, meta: [] as string[] };
  const m = matchRoute(path);
  const alt = (section: string, t: string): string => `${section ? `${section}: ` : ""}${t}. ▼ Text.js`;

  switch (m.name) {
    case "home": {
      const frame = await companionFrame("/", 60, 21);
      return { ...base, template: "home", title: "The Console Framework", description: HOME_DESCRIPTION, frame, alt: "▼ Text.js, The Console Framework. The Text.js home page running in the DevTools console." };
    }
    case "docs": {
      const doc = getDoc(m.slug);
      if (path === "/docs") return { ...base, section: "Docs", title: "Documentation", alt: alt("Docs", "Documentation") };
      const section = `Docs · ${doc?.category ?? ""}`.replace(/ · $/, "");
      return { ...base, section, alt: alt("Docs", title) };
    }
    case "playground": {
      const preset = PRESETS.find((p) => p.id === m.preset) ?? PRESETS[0];
      const label = preset?.label ?? "Playground";
      // Streaming is shown once the stream has finished; the others at their first frame.
      const frame = await companionFrame(path, 64, 22, m.preset === "streaming" ? { ms: 6000 } : m.preset === "snake" ? { keys: ["right"], ms: 1500 } : {});
      return { ...base, section: "Playground", title: label, frame, alt: `${label}, a Text.js Playground demo, running in the DevTools console.` };
    }
    case "opencode": {
      const frame = await companionFrame(path, 64, 22);
      return { ...base, section: "Playground", title: "OpenCode in the Console", frame, wordmark: svg(<OpenCodeWordmark />), alt: "OpenCode Lite running in the DevTools console. ▼ Text.js" };
    }
    case "coffee":
      return { ...base, section: "Playground", title: "terminal.shop in the Console", frame: await coffeeFrame(), wordmark: svg(<TerminalWordmark />), alt: "The terminal.shop storefront in the DevTools console. ▼ Text.js" };
    case "learn": {
      if (m.slug === "") {
        const [section, rest] = title.split(": ");
        return { ...base, section: section ?? "Learn", title: rest ?? title, meta: [`${CHAPTERS.length} chapters`], frame: await companionFrame(path, 64, 20), alt: alt("Learn Text.js", rest ?? title) };
      }
      if (m.slug === COMPLETE_SLUG) return { ...base, section: "Learn Text.js", title: "Certificate", frame: await companionFrame(path, 64, 20), alt: alt("Learn Text.js", "Certificate") };
      const chapter = getChapter(m.slug);
      const section = `Learn · Chapter ${chapterNumber(m.slug)}`;
      const frame = await companionFrame(path, 64, 20, { ms: 3000 });
      return { ...base, section, meta: chapter ? [`${chapter.minutes} min`] : [], frame, alt: alt(section, title) };
    }
    case "errors":
      return {
        ...base,
        section: "Errors",
        title: "Error Codes",
        rows: TX_ERRORS.slice(0, 7).map((e) => ({ label: e.code, value: e.title, tone: "muted" as const })),
        alt: alt("Errors", "Error Codes"),
      };
    case "error": {
      const doc = TX_ERRORS.find((e) => e.code === m.code);
      const t = doc?.title ?? (m.code === "TX000" ? "Success" : title);
      return { ...base, template: "error", section: "Errors", code: m.code, title: t, description: doc ? `${doc.kind === "warning" ? "Warning" : "Error"} · ${doc.package}` : "", alt: `${m.code}: ${t}. ▼ Text.js` };
    }
    case "changelog": {
      const rows = CHANGELOG_RELEASES.filter((r) => r.date).slice(0, 7).map((r) => ({ label: r.version, value: formatPostDate(r.date as string), tone: "muted" as const }));
      return { ...base, section: "Changelog", rows, alt: alt("", "Changelog") };
    }
    case "blog":
      return { ...base, section: "Blog", rows: POSTS.slice(0, 7).map((p) => ({ label: shortDate(p.date), value: p.title, tone: "muted" as const })), alt: alt("", "Blog") };
    case "blog-post": {
      const post = getPost(m.slug);
      return { ...base, section: "Blog", meta: post ? [formatPostDate(post.date), post.author] : [], alt: alt("Blog", title) };
    }
    case "enterprise":
      return { ...base, section: "Enterprise", title: "Text.js Enterprise", rows: STATS.map((st) => ({ label: st.value, value: st.label, tone: "muted" as const })), alt: alt("", "Text.js Enterprise") };
    case "status":
      return {
        ...base,
        section: "Status",
        title: "Turbolog Status",
        rows: COMPONENTS.map((c) => ({ label: c.name, value: c.status, tone: c.tone })),
        alt: alt("", "Turbolog Status"),
      };
    case "merch": {
      if (m.slug === "") {
        const first = PRODUCTS[0];
        const open = PRODUCTS.some((p) => availability(p) !== "Coming soon");
        return { ...base, template: "merch", section: "Merch", meta: [`${PRODUCTS.length} products`, ...(open ? [] : ["Coming soon"])], photo: first?.images[0]?.large, alt: alt("", "Text.js Merch") };
      }
      const p = getProduct(m.slug);
      if (!p) return { ...base, template: "merch", section: "Merch", alt: alt("Merch", title) };
      const flag = availability(p);
      return {
        ...base,
        template: "merch",
        section: `Merch · ${p.number}`,
        meta: [p.color, price(p.price), ...(flag ? [flag] : [])],
        photo: p.images[0]?.large,
        alt: `${title}, ${p.color}. ▼ Text.js Merch`,
      };
    }
    case "not-found":
      return { ...base, slug: "404", template: "error", section: "", code: "404", title: "This page could not be found", description: "", alt: "404: This page could not be found. ▼ Text.js" };
  }
}

/** Cards for every route, in order, plus the 404 page. */
export async function ogCards(routes: readonly PrerenderRoute[], notFoundPath: string): Promise<OgCard[]> {
  const cards: OgCard[] = [];
  for (const r of routes) cards.push(await ogCard(r));
  cards.push(await ogCard({ path: notFoundPath, title: "404", description: "" }));
  resetLocation("/");
  return cards;
}
