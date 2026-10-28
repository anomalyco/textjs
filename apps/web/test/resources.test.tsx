import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { parseFrontmatter, POSTS, postPath, renderRss } from "../src/blog";
import { ROUTES } from "../src/entry-server";
import { CHANGELOG_RELEASES, parseChangelog } from "../src/pages/Changelog";
import { matchRoute, titleFor } from "../src/router";
import { Footer } from "../src/site/Chrome";

const ROOT = join(import.meta.dir, "..");

describe("changelog, blog, enterprise and status", () => {
  test("routes and titles", () => {
    expect(matchRoute("/changelog")).toEqual({ name: "changelog" });
    expect(matchRoute("/blog/")).toEqual({ name: "blog" });
    for (const p of POSTS) expect(matchRoute(postPath(p.slug))).toEqual({ name: "blog-post", slug: p.slug });
    expect(matchRoute("/blog/nope")).toEqual({ name: "not-found" });
    expect(matchRoute("/enterprise")).toEqual({ name: "enterprise" });
    expect(matchRoute("/status")).toEqual({ name: "status" });
    expect(titleFor({ name: "blog-post", slug: "text-js-1-0" })).toBe("Text.js 1.0 | Text.js");
  });

  test("CHANGELOG.md parses into releases, newest first", () => {
    expect(CHANGELOG_RELEASES[0]?.version).toBe("Unreleased");
    const v1 = CHANGELOG_RELEASES.find((r) => r.version === "1.0.0");
    expect(v1?.date).toBe("2026-10-31");
    expect(v1?.id).toBe("v1-0-0");
    expect(v1?.body).toContain("@textjs/next");
    const { releases } = parseChangelog("# Changelog\n\nIntro\n\n## [2.0.0] - 2027-01-02\n\n### Added\n\n- x\n");
    expect(releases).toEqual([{ version: "2.0.0", date: "2027-01-02", id: "v2-0-0", body: "### Added\n\n- x" }]);
  });

  test("blog posts have complete frontmatter by Adam", () => {
    expect(POSTS.map((p) => p.slug)).toEqual(["text-js-1-0", "turbolog-eliminating-the-flash", "the-inverted-architecture"]);
    for (const p of POSTS) {
      expect(p.author).toBe("Adam");
      expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.markdown.startsWith("---")).toBe(false);
    }
    expect(parseFrontmatter('---\ntitle: "A: B"\n---\nbody').data.title).toBe("A: B");
  });

  test("RSS feed lists every post", () => {
    const rss = renderRss();
    expect(rss).toStartWith('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rss).toContain('<atom:link href="https://textjs.org/blog/rss.xml"');
    for (const p of POSTS) expect(rss).toContain(`<link>https://textjs.org${postPath(p.slug)}</link>`);
    expect(rss).toContain("Turbolog: eliminating the flash");
    expect(rss.match(/<item>/g)?.length).toBe(POSTS.length);
  });

  test("pages render", () => {
    const cl = renderToStaticMarkup(<RouteView route={{ name: "changelog" }} />);
    expect(cl).toContain('id="v1-0-0"');
    expect(cl).toContain("v0.1.0");
    const blog = renderToStaticMarkup(<RouteView route={{ name: "blog" }} />);
    for (const p of POSTS) expect(blog).toContain(`href="${postPath(p.slug)}"`);
    expect(blog).toContain('href="/blog/rss.xml"');
    const post = renderToStaticMarkup(<RouteView route={{ name: "blog-post", slug: "turbolog-eliminating-the-flash" }} />);
    expect(post).toContain("70.6%");
    expect(post).toContain('class="prose"');
    const ent = renderToStaticMarkup(<RouteView route={{ name: "enterprise" }} />);
    expect(ent).toContain("99.99%");
    expect(ent).toContain("mailto:");
    expect(ent).toContain("Contact sales");
    const st = renderToStaticMarkup(<RouteView route={{ name: "status" }} />);
    for (const s of ["console.log", "console.clear", "Rarely used", "Yoga", "Turbolog encoder", "DevTools Throttler", "Respected", "Live benchmark", "57968b6"]) expect(st).toContain(s);
    for (const html of [cl, blog, post, ent, st]) expect(html).not.toContain("▲");
  });

  test("footer, prerender and sitemap include every page", () => {
    const footer = renderToStaticMarkup(<Footer />);
    const paths = ROUTES.map((r) => r.path);
    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    for (const p of ["/changelog", "/blog", "/enterprise", "/status"]) {
      expect(footer).toContain(`href="${p}"`);
      expect(paths).toContain(p);
      expect(sitemap).toContain(`https://textjs.org${p}<`);
    }
    for (const p of POSTS) {
      expect(paths).toContain(postPath(p.slug));
      expect(sitemap).toContain(`https://textjs.org${postPath(p.slug)}<`);
    }
  });
});
