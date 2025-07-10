import { describe, expect, test } from "bun:test";
import { parseMarkdown } from "@textjs/react";
import { DOC_CATEGORIES, DOCS, docPath, getDoc, headingsOf, neighbors, searchDocs, toConsoleMarkdown } from "../src/docs/registry";
import { PREVIEWS } from "../src/docs/previews";
import { parseFence } from "../src/site/Markdown";

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
  test("contains every required page exactly once", () => {
    const slugs = DOCS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of REQUIRED) expect(slugs).toContain(s);
    expect(DOCS.length).toBeGreaterThanOrEqual(13);
  });

  test("every page is substantial, categorized and has sections", () => {
    for (const d of DOCS) {
      expect(DOC_CATEGORIES).toContain(d.category);
      expect(d.title.length).toBeGreaterThan(3);
      expect(d.description.length).toBeGreaterThan(20);
      expect(d.markdown.length).toBeGreaterThan(1500);
      expect(headingsOf(d.markdown).length).toBeGreaterThanOrEqual(3);
      expect(parseMarkdown(d.markdown).length).toBeGreaterThan(8);
    }
  });

  test("heading ids are unique within each page", () => {
    for (const d of DOCS) {
      const ids = headingsOf(d.markdown).map((h) => h.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test("internal links resolve to real pages and anchors", () => {
    const linkRe = /\]\((\/[^)\s]*)\)/g;
    const routes = new Set(["/", "/docs", "/playground", "/opencode", "/showcase", ...DOCS.map((d) => docPath(d.slug))]);
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
    expect(searchDocs("turbolog")[0]?.doc.slug).toBe("turbolog-engine");
    expect(searchDocs("usePathname").some((h) => h.doc.slug === "routing")).toBe(true);
    expect(searchDocs("rdbx").some((h) => h.doc.slug === "loading-and-errors")).toBe(true);
    expect(searchDocs("").length).toBe(DOCS.length);
  });
});
