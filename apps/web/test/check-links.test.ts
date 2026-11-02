import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkSite, extractIds, extractRefs, formatReport } from "../scripts/check-links";
import { learnVideo } from "../src/learn/video";

const page = (body: string, head = "") =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width">${head}</head><body>${body}</body></html>`;

let dist: string;

function write(rel: string, content: string) {
  const file = join(dist, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

beforeAll(() => {
  dist = mkdtempSync(join(tmpdir(), "check-links-"));
  write("index.html", page(`<a href="/docs/routing">routing</a><a href="/docs/">docs</a><a href="#top" id="top">top</a>`));
  write(
    "docs/routing.html",
    page(
      `<h2 id="layouts">Layouts</h2><a href="/docs/routing#layouts">ok</a><a href="/docs/routing#nope">bad anchor</a>
       <a href="#layouts">same page</a><a href="/docs/missing">missing</a><a href="/docs/app/routing">old path</a>
       <a href="/api/terminal">function route</a><a href="/">home</a><a href="mailto:hi@textjs.org">mail</a>
       <img src="/og/home.png" srcset="/og/home.png 1x, /og/nope.png 2x"><video poster="/poster-missing.jpg"></video>`,
      `<link rel="stylesheet" href="/assets/index.css"><link rel="preconnect" href="https://media.textjs.org" crossorigin>
       <meta property="og:image" content="https://textjs.org/og/home.png?v=1"><meta name="twitter:image" content="https://textjs.org/og/gone.png">`,
    ),
  );
  write("docs/index.html", page(`<a href="/docs/routing?x=1">q</a><a href="/old">old</a><a href="/broken-target">bad redirect</a>`));
  write("og/home.png", "png");
  write("assets/index.css", "body{}");
  write("404.html", page(`<a href="/">home</a>`));
  write("_redirects", "/docs/app/* /docs 302\n/old /docs/routing 301\n/broken-target /nowhere 301\n");
  write("_routes.json", JSON.stringify({ version: 1, include: ["/", "/api/terminal", "/api/terminal/*"] }));
  write(
    "sitemap.xml",
    `<urlset><url><loc>https://textjs.org/</loc></url><url><loc>https://textjs.org/docs/routing</loc></url><url><loc>https://textjs.org/gone</loc></url></urlset>`,
  );
});

afterAll(() => {
  rmSync(dist, { recursive: true, force: true });
});

const issueKeys = (report: Awaited<ReturnType<typeof checkSite>>) =>
  report.issues.map((issue) => `${issue.group} ${issue.url}`);

describe("extractRefs", () => {
  test("reads link and asset attributes, decodes entities, and skips scripts, comments and preconnects", () => {
    const html = page(
      `<!-- <a href="/commented">x</a> --><a href="/a?x=1&amp;y=2">a</a><script>var s = '<a href="/in-script">';</script>
       <img src="/i.png" srcset="/i-1x.png 1x, /i-2x.png 2x"><video poster="/p.jpg"><source src="/v.mp4"></video>`,
      `<link rel="canonical" href="https://textjs.org/docs"><link rel="stylesheet" href="/s.css"><link rel="preconnect" href="https://media.textjs.org">
       <meta property="og:url" content="https://textjs.org/x"><meta property="og:image" content="/og.png">`,
    );
    const refs = extractRefs(html, "/page").map((r) => `${r.kind} ${r.tag}.${r.attr} ${r.raw}`);
    expect(refs).toEqual([
      "link link.href https://textjs.org/docs",
      "asset link.href /s.css",
      "link meta.content https://textjs.org/x",
      "asset meta.content /og.png",
      "link a.href /a?x=1&y=2",
      "asset img.src /i.png",
      "asset img.srcset /i-1x.png",
      "asset img.srcset /i-2x.png",
      "asset video.poster /p.jpg",
      "asset source.src /v.mp4",
    ]);
  });
});

describe("extractIds", () => {
  test("collects id attributes and named anchors", () => {
    expect([...extractIds(page(`<h2 id="a">A</h2><a name="old"></a><span id="b"></span>`))].sort()).toEqual(["a", "b", "old"]);
  });
});

describe("checkSite (internal)", () => {
  test("reports broken links, anchors and assets; accepts routes, trailing slashes, redirects and function routes", async () => {
    const report = await checkSite({ distDir: dist });
    expect(issueKeys(report)).toEqual([
      "anchor https://textjs.org/docs/routing#nope",
      "asset https://textjs.org/og/gone.png",
      "asset https://textjs.org/og/nope.png",
      "asset https://textjs.org/poster-missing.jpg",
      "internal https://textjs.org/broken-target",
      "internal https://textjs.org/docs/missing",
      "internal https://textjs.org/gone",
      "redirect https://textjs.org/docs/app/routing",
      "redirect https://textjs.org/old",
    ]);
    expect(report.broken).toBe(7);
    expect(report.externalChecked).toBe(false);
  });

  test("reports a redirect whose destination is missing", async () => {
    const report = await checkSite({ distDir: dist });
    const issue = report.issues.find((i) => i.url === "https://textjs.org/broken-target");
    expect(issue?.detail).toBe("redirects to missing /nowhere");
  });

  test("lists the source of each problem", async () => {
    const report = await checkSite({ distDir: dist });
    const missing = report.issues.find((i) => i.url === "https://textjs.org/docs/missing");
    expect(missing?.sources).toEqual(["/docs/routing <a href>"]);
    expect(formatReport(report)).toContain("← /docs/routing <a href>");
  });

  test("does not report an anchor that exists on the target page", async () => {
    const report = await checkSite({ distDir: dist });
    expect(report.issues.some((i) => i.url.endsWith("#layouts"))).toBe(false);
  });
});

describe("checkSite (external)", () => {
  const responses: Record<string, Array<[string, number]>> = {
    "https://example.com/head-405": [["HEAD", 405], ["GET", 200]],
    "https://example.com/gone": [["HEAD", 404], ["GET", 404]],
    "https://x.com/post": [["HEAD", 403], ["GET", 403]],
  };

  test("probes each URL with HEAD and falls back to GET only when HEAD fails", async () => {
    const calls: string[] = [];
    const fetchStub = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push(`${method} ${url}`);
      const planned = responses[url]?.find(([m]) => m === method);
      const status = planned?.[1] ?? 200;
      return new Response(null, { status });
    }) as typeof fetch;

    writeFileSync(
      join(dist, "docs", "external.html"),
      page(
        `<a href="https://example.com/head-405">a</a><a href="https://example.com/gone">b</a><a href="https://example.com/gone#x">b again</a>
         <a href="https://x.com/post">c</a><a href="https://github.com/adamdotdevin/textjs">repo</a>`,
      ),
    );
    const report = await checkSite({ distDir: dist, external: true, fetch: fetchStub });
    rmSync(join(dist, "docs", "external.html"));

    expect(calls.filter((c) => c.endsWith("https://example.com/gone"))).toEqual([
      "HEAD https://example.com/gone",
      "GET https://example.com/gone",
    ]);
    expect(calls.filter((c) => c.endsWith("https://example.com/head-405"))).toEqual([
      "HEAD https://example.com/head-405",
      "GET https://example.com/head-405",
    ]);
    expect(issueKeys(report)).toContain("external https://example.com/gone");
    expect(issueKeys(report)).not.toContain("external https://example.com/head-405");
    expect(issueKeys(report)).toContain("unverified https://x.com/post");
    expect(issueKeys(report)).toContain("repo https://github.com/adamdotdevin/textjs");
    expect(report.issues.find((i) => i.url === "https://example.com/gone")?.sources).toHaveLength(1);
  });

  test("checks media.textjs.org Learn videos with HEAD only", async () => {
    const calls: string[] = [];
    const fetchStub = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    const report = await checkSite({ distDir: dist, external: true, fetch: fetchStub });
    const videos = calls.filter((c) => c.includes("media.textjs.org"));
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every((c) => c.startsWith("HEAD "))).toBe(true);
    expect(report.externalChecked).toBe(true);
  });

  test("reports media videos that are missing", async () => {
    const src = learnVideo("getting-started")!.src;
    const fetchStub = (async (input: string | URL | Request) => {
      return new Response(null, { status: String(input) === src ? 404 : 200 });
    }) as typeof fetch;
    const report = await checkSite({ distDir: dist, external: true, fetch: fetchStub });
    expect(issueKeys(report)).toContain(`media ${src}`);
  });
});

describe("formatReport", () => {
  test("says when nothing is broken", () => {
    const text = formatReport({ issues: [], broken: 0, pages: 1, internalRefs: 0, externalUrls: 0, externalChecked: false });
    expect(text).toContain("No broken links.");
  });
});
