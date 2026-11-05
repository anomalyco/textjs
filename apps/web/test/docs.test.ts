import { describe, expect, test } from "bun:test";
import { parseMarkdown } from "@textjs/react";
import { DOC_CATEGORIES, DOCS_META, docPath, getDoc, headingsOf, neighbors, preloadDoc, toConsoleMarkdown, type DocPage } from "../src/docs/registry";
import { POSTS, POSTS_META } from "../src/blog";
import { POST_SUMMARIES } from "../src/blog/summaries";
import { DOC_DESCRIPTIONS } from "../src/docs/descriptions";
import { PREVIEW_META } from "../src/docs/preview-meta";
import { DOC_HEADINGS } from "../src/docs/search-index";
import { searchDocsMeta } from "../src/docs/search";
import { routeManifestSources } from "../src/route-loader";
import { aliasResults } from "../src/site/search-aliases";
import { PREVIEWS } from "../src/docs/previews";
import { PRODUCTS } from "../src/merch/products";
import { PRODUCTS_META } from "../src/merch/meta";
import { parseFence } from "../src/site/Markdown";
import { REPO_URL, docEditUrl } from "../src/site/links";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// test/setup.ts loads every page's Markdown.
const DOCS: DocPage[] = DOCS_META.map((m) => getDoc(m.slug) as DocPage);

const REQUIRED = [
  "introduction",
  "installation",
  "project-structure",
  "routing",
  "loading-and-errors",
  "route-handlers",
  "styling",
  "components-layout",
  "components-interactive",
  "components-content",
  "hooks-and-repl",
  "turbolog-engine",
  "opencode",
];

describe("documentation registry", () => {
  test("every page's edit link points at its Markdown file", () => {
    const appRoot = join(import.meta.dir, "..");
    for (const d of DOCS) {
      const url = docEditUrl(d.slug);
      expect(url.startsWith(`${REPO_URL}/edit/dev/apps/web/`)).toBe(true);
      const file = url.slice(`${REPO_URL}/edit/dev/apps/web/`.length);
      expect(existsSync(join(appRoot, file))).toBe(true);
      expect(readFileSync(join(appRoot, file), "utf8")).toBe(d.markdown);
    }
  });

  test("Markdown links to GitHub use the site's repo URL", () => {
    const dirs = ["src/docs/content", "src/blog"].map((d) => join(import.meta.dir, "..", d));
    for (const dir of dirs) {
      for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
        for (const m of readFileSync(join(dir, f), "utf8").matchAll(/https:\/\/github\.com\/[^\s)]*textjs[^\s)]*/g)) {
          expect(m[0].startsWith(`${REPO_URL}/`) || m[0] === REPO_URL).toBe(true);
        }
      }
    }
  });

  test("contains every required page exactly once", () => {
    const slugs = DOCS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of REQUIRED) expect(slugs).toContain(s);
    expect(DOCS.length).toBeGreaterThanOrEqual(13);
  });

  test("every page is concise, categorized and has sections", () => {
    for (const d of DOCS) {
      expect(DOC_CATEGORIES).toContain(d.category);
      expect(d.title.length).toBeGreaterThan(3);
      expect(d.description.length).toBeGreaterThan(20);
      expect(d.markdown.length).toBeGreaterThan(800);
      expect(headingsOf(d.markdown).length).toBeGreaterThanOrEqual(3);
      expect(parseMarkdown(d.markdown).length).toBeGreaterThan(8);
    }
  });

  test("heading ids are unique within each page", () => {
    for (const d of DOCS) {
      const headings = headingsOf(d.markdown);
      const ids = headings.map((h) => h.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(DOC_HEADINGS[d.slug]).toEqual(headings);
    }
  });

  test("split metadata modules match full content modules", () => {
    expect(POSTS_META).toEqual(POSTS.map(({ markdown: _m, summary: _s, ...meta }) => meta));
    expect(Object.keys(POST_SUMMARIES).sort()).toEqual(POSTS.map((p) => p.slug).sort());
    expect(Object.keys(DOC_DESCRIPTIONS).sort()).toEqual(DOCS_META.map((d) => d.slug).sort());
    expect(PRODUCTS_META).toEqual(PRODUCTS.map((p) => ({ slug: p.slug, name: p.name })));
    expect(Object.keys(PREVIEW_META).sort()).toEqual(Object.keys(PREVIEWS).sort());
    for (const [id, spec] of Object.entries(PREVIEWS)) {
      expect(PREVIEW_META[id]).toEqual({
        cols: spec.cols,
        rows: spec.rows,
        ...(spec.label ? { label: spec.label } : {}),
        ...(spec.hints ? { hints: spec.hints } : {}),
      });
    }
  });

  test("internal links resolve to real pages and anchors", () => {
    const linkRe = /\]\((\/[^)\s]*)\)/g;
    const routes = new Set(["/", "/docs", "/playground", "/opencode", "/status", ...DOCS.map((d) => docPath(d.slug))]);
    for (const d of DOCS) {
      for (const m of d.markdown.matchAll(linkRe)) {
        const [path, hash] = (m[1] as string).split("#") as [string, string | undefined];
        expect(routes.has(path)).toBe(true);
        if (hash) {
          const target = path === "/docs" ? getDoc("introduction") : getDoc(path.replace(/^\/docs\//, ""));
          expect(target).toBeDefined();
          expect(headingsOf(target?.markdown ?? "").map((h) => h.id)).toContain(hash);
        }
      }
    }
  });

  test("same-page #anchor links point at a heading on that page", () => {
    let count = 0;
    const missing: string[] = [];
    for (const d of DOCS) {
      const ids = headingsOf(d.markdown).map((h) => h.id);
      for (const m of d.markdown.matchAll(/\]\(#([^)\s]+)\)/g)) {
        count++;
        if (!ids.includes(m[1] as string)) missing.push(`${d.slug}#${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
    expect(count).toBeGreaterThan(0);
  });

  test("live preview fences reference registered previews", () => {
    let count = 0;
    for (const d of DOCS) {
      for (const block of parseMarkdown(d.markdown)) {
        if (block.type !== "code") continue;
        const fence = parseFence(block.language);
        if (fence.preview) {
          count++;
          expect(PREVIEWS[fence.preview]).toBeDefined();
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test("console markdown strips website-only fence metadata", () => {
    const md = "```tsx@app/page.tsx\nx\n```\n```tsx#counter\ny\n```";
    expect(toConsoleMarkdown(md)).toBe("```tsx\nx\n```\n```tsx\ny\n```");
  });

  test("brand uses ▼, never ▲", () => {
    for (const d of DOCS) expect(d.markdown.includes("▲")).toBe(false);
  });

  test("paths, neighbors and search", () => {
    expect(docPath("introduction")).toBe("/docs");
    expect(docPath("routing")).toBe("/docs/routing");
    expect(neighbors("introduction").prev).toBeUndefined();
    expect(neighbors("introduction").next?.slug).toBe("installation");
    expect(neighbors("opencode").next).toBeUndefined();
    expect(searchDocsMeta("turbolog")[0]?.doc.slug).toBe("turbolog-engine");
    expect(searchDocsMeta("usePathname").some((h) => h.doc.slug === "routing")).toBe(true);
    expect(searchDocsMeta("rdbx").some((h) => h.doc.slug === "loading-and-errors")).toBe(true);
    expect(searchDocsMeta("").length).toBe(DOCS.length);
  });

  test("every page's Markdown loads on its own, once", async () => {
    for (const d of DOCS) {
      expect(d.markdown.length).toBeGreaterThan(0);
      await preloadDoc(d.slug);
      expect(getDoc(d.slug)).toBe(d);
    }
    expect(getDoc(undefined)).toBe(getDoc("introduction"));
    await expect(preloadDoc("nope")).rejects.toThrow();
  });

  test("a docs page's chunks are its page module and its Markdown", () => {
    expect(routeManifestSources({ name: "docs", slug: "routing" })).toEqual(["src/pages/Docs.tsx", "src/docs/content/routing.md?raw"]);
    expect(routeManifestSources({ name: "home" })).toEqual(["src/pages/Home.tsx"]);
    expect(routeManifestSources({ name: "not-found" })).toEqual([]);
  });

  test("search also matches the English slug and heading ids", () => {
    // In English these equal the titles; in a locale build they find a translated page by its English name.
    expect(searchDocsMeta("open the console").find((h) => h.heading)?.heading?.id).toBe("open-the-console");
    expect(searchDocsMeta("project structure")[0]?.doc.slug).toBe("project-structure");
    const safari = aliasResults("safari")[0];
    expect(safari?.href).toBe("/docs/turbolog-engine#firefox-and-safari");
    expect(safari?.label).toBe("Firefox and Safari");
  });
});
