import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteView } from "../src/App";
import { parseFrontmatter, POSTS, postPath, renderRss } from "../src/blog";
import { ROUTES } from "../src/entry-server";
import { CHANGELOG_RELEASES, parseChangelog } from "../src/pages/Changelog";
import { COMPONENTS, LAUNCH } from "../src/pages/status-components";
import history from "../src/pages/status-history.json";
import { INCIDENTS } from "../src/pages/status-incidents";
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
    const first = CHANGELOG_RELEASES[0];
    expect(first?.version === "Unreleased" ? first.body.trim() : first?.date).toBeTruthy();
    const v1 = CHANGELOG_RELEASES.find((r) => r.version === "1.0.0");
    expect(v1?.date).toBe("2026-10-31");
    expect(v1?.id).toBe("v1-0-0");
    expect(v1?.body).toContain("@textjs/next");
    const { releases } = parseChangelog("# Changelog\n\nIntro\n\n## [2.0.0] - 2027-01-02\n\n### Added\n\n- x\n");
    expect(parseChangelog("# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-10-31\n\n- y\n").releases.map((r) => r.version)).toEqual(["1.0.0"]);
    expect(releases).toEqual([{ version: "2.0.0", date: "2027-01-02", id: "v2-0-0", body: "### Added\n\n- x" }]);
  });

  test("blog posts have complete frontmatter by Adam", () => {
    expect(POSTS.map((p) => p.slug)).toEqual([
      "text-js-1-0",
      "the-inverted-architecture",
      "turbolog-eliminating-the-flash",
      "right-to-left-text",
      "keyboard-shortcuts-with-usekeymap",
      "server-rendering-in-the-console",
      "figlet-fonts",
      "laying-out-the-console-with-yoga",
      "text-js-0-1",
      "rendering-react-into-console-log",
    ]);
    // The first post follows the first npm release of @textjs/core, and none is dated after 1.0.
    expect(POSTS.at(-1)?.date).toBe("2025-02-12");
    for (const p of POSTS) expect(p.date <= "2026-10-31" && p.date >= LAUNCH).toBe(true);
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
    for (const s of ["console.log", "console.clear", "Rarely used", "Yoga", "Turbolog encoder", "DevTools Throttler", "Respected", "Live benchmark", "57968b6", "Past incidents"]) expect(st).toContain(s);
    for (const i of INCIDENTS) expect(st).toContain(`id="${i.id}"`);
    // Every one of the 90 days has data, and only past incidents color a bar.
    expect(st.match(/class="st-bar"/g)).toBeNull();
    expect(st).not.toContain("st-bar-outage");
    expect(st).toContain("st-bar-minor");
    for (const html of [cl, blog, post, ent, st]) expect(html).not.toContain("▲");
  });

  test("status incidents are resolved, ordered and inside the timeline", () => {
    const names = COMPONENTS.map((c) => c.name);
    let previous = Infinity;
    for (const i of INCIDENTS) {
      const times = i.updates.map((u) => Date.parse(u.at));
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(i.updates[0]?.status).toBe("investigating");
      expect(i.updates.at(-1)?.status).toBe("resolved");
      expect(i.updates.filter((u) => u.status === "resolved").length).toBe(1);
      expect(times[0]!).toBeLessThan(previous);
      previous = times[0]!;
      expect(i.updates[0]!.at.slice(0, 10) >= LAUNCH).toBe(true);
      expect(i.updates.at(-1)!.at.slice(0, 10) <= history.measuredAt).toBe(true);
      for (const c of i.components) expect(names).toContain(c);
      expect(i.commits.length + i.links.length).toBeGreaterThan(0);
      for (const l of i.links) expect(matchRoute(l.href.split("#")[0] as string).name).not.toBe("not-found");
    }
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
