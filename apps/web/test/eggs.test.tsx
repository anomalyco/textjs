import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matchRoute } from "../src/router";
import { RouteView } from "../src/App";
import { SALES_HREF } from "../src/pages/Enterprise";
import { linkedInAddUrl } from "../src/learn/certificate";
import { consoleLogDown, mayForward } from "../src/console-health";
import { Footer } from "../src/site/Chrome";
import { onRequest, wantsAnsi } from "../functions/index";
import curlHttp, { isTerminalHttp } from "../workers/curl-http/index";
import { renderHomeAnsi } from "../src/home-ansi";
import { encodeLogoConsoleLog } from "../src/site/logo-console-gen";
import { LOGO_CONSOLE_LOG, LOGO_CONSOLE_LOG_INLINE } from "../src/site/logo-console";
import { LOGO_SVG, WORDMARK_SVG } from "../src/site/LogoMenu";
import { DevToolsWindow } from "../src/site/DevToolsWindow";
import { siteStore } from "../src/console-companion/store";
import { CompanionApp } from "../src/console-companion/App";
import { mount } from "./helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { HERO_FILES } from "../src/pages/home-files";
import { HighlightedCode } from "../src/site/highlight";
import { aliasResults, invertTriangles, isQuitCommand } from "../src/site/search-aliases";
import { matchesErrorQuery } from "../src/pages/Errors";
import { getTxError, TX_ERRORS, VERSION } from "@textjs/core";
import { humansTxt, llmsTxt, statusApi } from "../src/static-files";
import { DOCS, docPath } from "../src/docs/registry";
import { COMPONENTS } from "../src/pages/status-components";
import { INCIDENTS } from "../src/pages/status-incidents";

describe("hero files", () => {
  test("app/globals.css is empty and renders one numbered line", () => {
    const css = HERO_FILES.find((f) => f.name === "app/globals.css");
    expect(css).toEqual({ name: "app/globals.css", language: "css", code: "" });
    const html = renderToStaticMarkup(<HighlightedCode code="" language="css" lineNumbers />);
    expect(html.match(/class="line"/g)?.length).toBe(1);
    expect(html).toContain('<span class="ln">1</span></span>');
  });
});

describe("search", () => {
  const first = (q: string) => aliasResults(q)[0];

  test("React and Next.js terms return real pages", () => {
    for (const q of ["div", "span", "p", "dom", "<div>", " DIV "]) expect(first(q)).toMatchObject({ label: "TX003: Unknown host element", sub: "@textjs/react", href: "/errors/TX003" });
    for (const q of ["css", "tailwind", "className", "stylesheet"]) expect(first(q)).toMatchObject({ label: "Styling", sub: "Building Your Application", href: "/docs/styling" });
    for (const q of ["hydration", "hydrate"]) expect(first(q)).toMatchObject({ label: "Server Rendering and Partial Prerendering", href: "/docs/server-rendering" });
    expect(first("next.config")).toMatchObject({ label: "Project Structure", sub: "Getting Started", href: "/docs/project-structure" });
    for (const q of ["safari", "firefox"]) expect(first(q)).toMatchObject({ label: "Firefox and Safari", sub: "The Turbolog Engine", href: "/docs/turbolog-engine#firefox-and-safari" });
    expect(first("vercel")).toMatchObject({ label: "Deploying", href: "/docs/deploying" });
    expect(first("tx014")).toMatchObject({ href: "/errors/TX014", label: `TX014: ${getTxError("TX014")?.title}` });
    expect(aliasResults("tx000")).toEqual([]);
    expect(aliasResults("tx999")).toEqual([]);
    expect(aliasResults("divide")).toEqual([]);
    expect(aliasResults("")).toEqual([]);
  });

  test("every alias target exists", () => {
    for (const q of ["div", "css", "hydration", "next.config", "safari", "vercel"]) expect(aliasResults(q)).toHaveLength(1);
  });

  test("/errors finds TX003 by its cause", () => {
    expect(TX_ERRORS.filter((e) => matchesErrorQuery(e, "div")).map((e) => e.code)).toContain("TX003");
  });

  test("up-triangles flip to down-triangles", () => {
    expect(invertTriangles("\u25B2 Vercel \u25B2")).toBe("\u25BC Vercel \u25BC");
    expect(invertTriangles("\u25BC")).toBe("\u25BC");
  });

  test("vim quit commands", () => {
    for (const q of [":q", ":q!", ":wq", ":wq!", ":x", " :q "]) expect(isQuitCommand(q)).toBe(true);
    for (const q of ["q", ":w", ":qa", "::q", ":quit"]) expect(isQuitCommand(q)).toBe(false);
  });
});

describe("generated static files", () => {
  test("humans.txt", () => {
    const txt = humansTxt("2026-11-01");
    expect(txt).toStartWith("/* TEAM */\nAdam Elmore\nAnomaly · https://anoma.ly\n");
    expect(txt).toContain("The Chrome DevTools team. Sorry about the console.\n");
    expect(txt).toContain("Last update: 2026/11/01\n");
    expect(txt).toContain(`Text.js ${VERSION} (Turbolog)`);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("llms.txt lists every doc and error code", () => {
    const txt = llmsTxt();
    expect(txt).toStartWith("# Text.js\n\n> ");
    expect(txt).toContain(`- [Introduction](https://textjs.org/docs): ${DOCS[0]?.description}\n`);
    for (const d of DOCS) expect(txt).toContain(`](https://textjs.org${docPath(d.slug)}): ${d.description}`);
    for (const e of TX_ERRORS) expect(txt).toContain(`- [${e.code}: ${e.title}](https://textjs.org/errors/${e.code})`);
    expect(txt).toContain("- [TX001: Yoga is not initialized](https://textjs.org/errors/TX001)\n");
    expect(txt).not.toContain("TX000");
  });

  test("Statuspage v2 API", () => {
    const files = statusApi();
    const status = JSON.parse(files["status.json"]);
    expect(status).toEqual({
      page: { id: "textjs", name: "Text.js", url: "https://textjs.org/status", time_zone: "Etc/UTC", updated_at: "2026-10-31T00:00:00.000Z" },
      status: { indicator: "none", description: "All Systems Operational" },
    });
    const { components } = JSON.parse(files["components.json"]);
    expect(components.map((c: { name: string }) => c.name)).toEqual(["console.log", "console.clear", "Yoga", "Turbolog encoder", "DevTools Throttler", "textjs.org"]);
    for (const c of components) expect(c.status).toBe("operational");
    expect(components[1].description).toBe(COMPONENTS[1]?.detail);
    const summary = JSON.parse(files["summary.json"]);
    expect(Object.keys(summary)).toEqual(["page", "components", "incidents", "scheduled_maintenances", "status"]);
    expect(summary.components).toEqual(components);
    // Every incident is resolved, so none is current.
    expect(summary.incidents).toEqual([]);
    const { incidents } = JSON.parse(files["incidents.json"]);
    expect(incidents.length).toBe(INCIDENTS.length);
    for (const i of incidents) {
      expect(i.status).toBe("resolved");
      expect(i.shortlink).toBe(`https://textjs.org/status#${i.id}`);
      expect(i.incident_updates[0].status).toBe("resolved");
      expect(Date.parse(i.resolved_at)).toBeLessThanOrEqual(Date.parse(status.page.updated_at));
      for (const c of i.components) expect(components.map((x: { id: string }) => x.id)).toContain(c.id);
    }
  });
});

describe("nextjs.org paths redirect", () => {
  const root = join(import.meta.dir, "..");
  const rules = readFileSync(join(root, "public/_redirects"), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [from, to, status] = l.trim().split(/\s+/);
      return { from: from as string, to: to as string, status: Number(status) };
    });
  const next = rules.filter((r) => r.from.startsWith("/docs/app") || r.from.startsWith("/learn/dashboard-app"));

  test("every target is a real page", () => {
    expect(next.length).toBeGreaterThanOrEqual(20);
    for (const r of next) expect(matchRoute(r.to).name).not.toBe("not-found");
    expect(next.find((r) => r.from === "/docs/app/getting-started/css")).toEqual({ from: "/docs/app/getting-started/css", to: "/docs/styling", status: 301 });
  });

  test("specific paths come before catch-alls, which are temporary", () => {
    const catchAll = rules.findIndex((r) => r.from === "/docs/app/*");
    expect(rules[catchAll]?.status).toBe(302);
    for (const [i, r] of rules.entries()) if (r.from.startsWith("/docs/app/") && !r.from.endsWith("*")) expect(i).toBeLessThan(catchAll);
    for (const r of rules) if (!r.from.endsWith("*") && r.from !== "/learn/dashboard-app") expect(r.status).toBe(301);
  });

  test("vercel.json mirrors _redirects", () => {
    const cfg = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as { redirects: Array<{ source: string; destination: string; permanent: boolean }> };
    const expected = rules.filter((r) => !r.from.endsWith("/")).map((r) => ({ source: r.from.replace(/\/\*$/, "/:path*"), destination: r.to.replace(":splat", ":path*"), permanent: r.status === 301 }));
    expect(cfg.redirects).toEqual(expected);
  });

  test("renamed pages redirect permanently, and the Terminal sign in callback isn't caught", () => {
    const renamed = rules.filter((r) => r.from === "/terminal" || r.from.startsWith("/merch"));
    for (const r of renamed) {
      expect(r.status).toBe(301);
      if (!r.to.includes(":splat")) expect(matchRoute(r.to).name).not.toBe("not-found");
    }
    expect(renamed.find((r) => r.from === "/terminal")?.to).toBe("/coffee");
    expect(renamed.find((r) => r.from === "/merch/*")?.to).toBe("/store/:splat");
    // Old store slugs that the splat rule would send to a 404.
    for (const slug of ["frame-tee", "hoodie", "cap", "sticker-sheet"]) {
      expect(matchRoute(`/store/${slug}`).name).toBe("not-found");
      expect(renamed.find((r) => r.from === `/merch/${slug}`)?.to).toBe("/store");
    }
    expect(rules.some((r) => r.from.startsWith("/terminal/") || r.from === "/terminal/*" || r.from === "/*")).toBe(false);
  });
});

describe("enterprise", () => {
  test("the sales email opens with an intake form", () => {
    const url = new URL(SALES_HREF);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("enterprise@textjs.org");
    expect(url.searchParams.get("subject")).toBe("Text.js Enterprise");
    expect(url.searchParams.get("body")).toBe("Company:\r\nTeam size:\r\nDevTools dock position (bottom, left, right or undocked):\r\n%c spans per frame (text.stats().spanCount):\r\n");
    expect(renderToStaticMarkup(<RouteView route={{ name: "enterprise" }} />)).toContain(`href="${SALES_HREF.replace(/&/g, "&amp;")}"`);
  });

  test("the FAQ links a valid $0.00 sample invoice", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "enterprise" }} />);
    expect(html).toContain('<summary>Is there a procurement-friendly invoice?</summary><p>Yes. <a href="/enterprise/sample-invoice.pdf">Sample invoice (PDF)</a></p>');
    const pdf = readFileSync(join(import.meta.dir, "..", "public/enterprise/sample-invoice.pdf")).toString("latin1");
    expect(pdf).toStartWith("%PDF-1.4\n");
    expect(pdf.length).toBeLessThan(4096);
    for (const s of ["(Anomaly)", "(INVOICE)", "(SAMPLE)", "(October 31, 2026)", "(Text.js 1.0.0, Open Source plan \\(MIT\\))", "(Total due)", "(Due on receipt.)"]) expect(pdf).toContain(s);
    expect(pdf.match(/\(\$\d+\.\d\d\)/g)?.every((m) => m === "($0.00)")).toBe(true);
    // Every xref offset points at its object.
    const xref = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...pdf.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(pdf.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    const len = Number(/\/Length (\d+)/.exec(pdf)?.[1]);
    const start = pdf.indexOf("stream\n") + 7;
    expect(pdf.slice(start + len, start + len + 9)).toBe("endstream");
  });
});

describe("learn certificate", () => {
  test("Add to LinkedIn prefills the certification form", () => {
    expect(linkedInAddUrl(null)).toBeNull();
    expect(linkedInAddUrl("2026-11-01T02:00:00.000Z")).toBe(
      "https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=Learn%20Text.js&organizationName=Text.js&issueYear=2026&issueMonth=11&certUrl=https%3A%2F%2Ftextjs.org%2Flearn%2Fcertificate",
    );
  });

  test("the link holds its place, hidden, until the course is complete", () => {
    const html = renderToStaticMarkup(<RouteView route={{ name: "learn", slug: "certificate" }} />);
    expect(html).toContain('<a class="text-link" target="_blank" rel="noreferrer" style="visibility:hidden">Add to LinkedIn</a>');
  });
});

describe("console.log status", () => {
  const native = console.log;

  test("forwarding wrappers stay operational", () => {
    const orig = native;
    const wrappers: unknown[] = [
      native,
      native.bind(console),
      function (...args: unknown[]) {
        return orig.apply(console, args);
      },
      (...args: unknown[]) => orig(...args),
      (...args: unknown[]) => {
        void 0;
        orig.call(console, ...args);
      },
      // Sentry's shape.
      function sentry(this: unknown, ...args: unknown[]) {
        const breadcrumb = { level: "log", args };
        void breadcrumb;
        return orig.apply(this, args);
      },
      new Proxy(native, {}),
      async (...a: unknown[]) => orig(...a),
      { log(...a: unknown[]) { orig(...a); } }.log,
    ];
    for (const w of wrappers) {
      expect(mayForward(w)).toBe(true);
      expect(consoleLogDown(w, native)).toBe(false);
    }
  });

  test("replacements that can't call through are a major outage", () => {
    const noops: unknown[] = [
      () => {},
      function () {},
      function noop() {
        /* silence */
      },
      // biome-ignore lint: test shape
      (..._args: unknown[]) => undefined,
      () => null,
      () => void 0,
      async () => {},
      { log() {} }.log,
      new Function(""),
      eval("(function () { // quiet\n })"),
      eval("x => 0"),
      undefined,
      null,
      "log",
    ];
    for (const n of noops) {
      expect(mayForward(n)).toBe(false);
      expect(consoleLogDown(n, native)).toBe(true);
    }
  });

  test("the boot-time console.log is never an outage", () => {
    const quiet = () => {};
    expect(consoleLogDown(quiet, quiet)).toBe(false);
    expect(consoleLogDown(native, native)).toBe(false);
  });

  test("the footer shows operational in the prerender, with both labels sharing one cell", () => {
    const html = renderToStaticMarkup(<Footer />);
    expect(html).toContain('<a href="/status" class="footer-status"><span class="dot"></span><span class="footer-status-label"><span>All systems operational</span><span style="visibility:hidden">Major outage</span></span></a>');
  });
});

describe("curl textjs.org", () => {
  const req = (headers: Record<string, string>, method = "GET") => new Request("https://textjs.org/", { method, headers });

  test("only terminal clients that don't ask for HTML get ANSI", () => {
    for (const ua of ["curl/8.7.1", "Wget/1.21.4", "HTTPie/3.2.2", "xh/0.22.0"]) {
      expect(wantsAnsi(req({ "User-Agent": ua, Accept: "*/*" }))).toBe(true);
      expect(wantsAnsi(req({ "User-Agent": ua, Accept: "*/*" }, "HEAD"))).toBe(true);
      expect(wantsAnsi(req({ "User-Agent": ua, Accept: "text/html" }))).toBe(false);
      expect(wantsAnsi(req({ "User-Agent": ua, Accept: "*/*" }, "POST"))).toBe(false);
    }
    const chrome = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
    expect(wantsAnsi(req({ "User-Agent": chrome, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" }))).toBe(false);
    expect(wantsAnsi(req({ "User-Agent": chrome, Accept: "*/*" }))).toBe(false);
    expect(wantsAnsi(req({ "User-Agent": "Slackbot-LinkExpanding 1.0", Accept: "*/*" }))).toBe(false);
    expect(wantsAnsi(req({ Accept: "*/*" }))).toBe(false);
  });

  test("the Function serves the frame, and falls through on anything else", async () => {
    const next = async () => new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } });
    const env = (body: string | null, ok = true) => ({ ASSETS: { fetch: async () => (ok ? new Response(body) : new Response("nope", { status: 404 })) } });
    const curl = { "User-Agent": "curl/8.7.1", Accept: "*/*" };
    const res = await onRequest({ request: req(curl), env: env("FRAME"), next });
    expect(await res.text()).toBe("FRAME");
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Vary")).toBe("User-Agent, Accept");
    expect(await (await onRequest({ request: req(curl, "HEAD"), env: env("FRAME"), next })).text()).toBe("");
    expect(await (await onRequest({ request: req({ "User-Agent": "curl/8.7.1", Accept: "text/html" }), env: env("FRAME"), next })).text()).toBe("<!doctype html>");
    expect(await (await onRequest({ request: req(curl), env: env(null, false), next })).text()).toBe("<!doctype html>");
    const throws = { ASSETS: { fetch: async (): Promise<Response> => { throw new Error("x"); } } };
    expect(await (await onRequest({ request: req(curl), env: throws, next })).text()).toBe("<!doctype html>");
  });

  test("the http Worker only answers terminal clients, and only runs on plain http", async () => {
    const http = (headers: Record<string, string>, method = "GET", url = "http://textjs.org/") => new Request(url, { method, headers });
    const curl = { "User-Agent": "curl/8.7.1", Accept: "*/*" };
    expect(isTerminalHttp(http(curl))).toBe(true);
    expect(isTerminalHttp(http(curl, "HEAD"))).toBe(true);
    expect(isTerminalHttp(http(curl, "POST"))).toBe(false);
    expect(isTerminalHttp(http(curl, "GET", "https://textjs.org/"))).toBe(false);
    expect(isTerminalHttp(http(curl, "GET", "http://textjs.org/docs"))).toBe(false);
    expect(isTerminalHttp(http({ "User-Agent": "curl/8.7.1", Accept: "text/html" }))).toBe(false);
    expect(isTerminalHttp(http({ "User-Agent": "Mozilla/5.0", Accept: "*/*" }))).toBe(false);
    // An https route would put the Worker in front of every browser's home page load.
    const toml = readFileSync(join(import.meta.dirname, "../workers/curl-http/wrangler.toml"), "utf8");
    expect([...toml.matchAll(/pattern\s*=\s*"([^"]+)"/g)].map((m) => m[1])).toEqual(["http://textjs.org/"]);
    let passThrough = false;
    const real = globalThis.fetch;
    const seen: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      seen.push(input instanceof Request ? input.url : String(input));
      return new Response("ok");
    }) as typeof fetch;
    try {
      await curlHttp.fetch(http(curl), {}, { passThroughOnException: () => void (passThrough = true) });
      await curlHttp.fetch(http({ "User-Agent": "Mozilla/5.0" }, "GET", "http://textjs.org/"), {}, { passThroughOnException: () => undefined });
    } finally {
      globalThis.fetch = real;
    }
    expect(passThrough).toBe(true);
    expect(seen).toEqual(["https://textjs.org/", "http://textjs.org/"]);
  });

  test("the frame is the 80×24 console Home view", async () => {
    const ansi = await renderHomeAnsi();
    const plain = ansi.replace(/\u001b\[[0-9;]*m/g, "");
    const lines = plain.replace(/\n$/, "").split("\n");
    expect(lines).toHaveLength(24);
    for (const l of lines) expect([...l]).toHaveLength(80);
    expect(plain).toContain("▼ Text.js");
    expect(plain).toContain("React 19 in console.log");
    expect(plain).toContain("Geist Dark");
    expect(ansi).toContain("\u001b[0;38;2;");
    expect(ansi).not.toContain("\u001b[H");
    expect(ansi).not.toContain("\u25B2");
  });
});

describe("logo menu", () => {
  test("the console.log copy is fresh output of the Turbolog encoder", async () => {
    expect(await encodeLogoConsoleLog()).toBe(LOGO_CONSOLE_LOG);
    expect(await encodeLogoConsoleLog("firefox")).toBe(LOGO_CONSOLE_LOG_INLINE);
    expect(LOGO_CONSOLE_LOG_INLINE).toContain("line-height:14px;text-wrap-mode:nowrap;");
    expect(LOGO_CONSOLE_LOG_INLINE).not.toContain("margin-top");
    expect(LOGO_CONSOLE_LOG).toStartWith('console.log("%c');
    expect(LOGO_CONSOLE_LOG).not.toContain("\u25B2");
    // It's one call: evaluating it logs once, with the banner.
    const calls: unknown[][] = [];
    new Function("console", LOGO_CONSOLE_LOG)({ log: (...a: unknown[]) => calls.push(a) });
    expect(calls).toHaveLength(1);
    expect(String(calls[0]?.[0])).toContain("███████    █████ ████");
  });

  test("SVGs are the header mark", () => {
    expect(LOGO_SVG).toContain('d="M2 4h20L12 21.5z"');
    expect(WORDMARK_SVG).toContain('d="M2 4h20L12 21.5z"');
    // The wordmark is outlined (no <text>), so it renders without Geist installed.
    expect(WORDMARK_SVG).not.toContain("<text");
    expect(WORDMARK_SVG).not.toContain("font-family");
    expect((WORDMARK_SVG.match(/<path /g) ?? []).length).toBe(2);
  });
});

describe("inspect button", () => {
  test("the element picker is a wireframe toggle only where there's a root", () => {
    const plain = renderToStaticMarkup(<DevToolsWindow frame={null} cols={10} rows={2} />);
    expect(plain).toContain('<div class="dt-tabs" aria-hidden="true"><span class="dt-icon">');
    expect(plain).not.toContain("<button");
    const live = renderToStaticMarkup(<DevToolsWindow frame={null} cols={10} rows={2} onInspect={() => undefined} inspecting />);
    expect(live).toContain('<div class="dt-tabs"><button type="button" class="dt-icon dt-inspect active" aria-pressed="true" aria-label="Show layout wireframe">');
    expect(live).toContain('<span class="dt-tab active" aria-hidden="true">Console</span>');
  });

  test("Home's mirror toggles the companion wireframe through the store", () => {
    siteStore.reset();
    const html = renderToStaticMarkup(<RouteView route={{ name: "home" }} />);
    expect(html).toContain('aria-pressed="false" aria-label="Show layout wireframe"');
    expect(siteStore.getSnapshot().wireframe).toBe(false);
  });

  test("F2 in the companion flips the same flag", async () => {
    siteStore.reset();
    const h = await mount(<CompanionApp />, { cols: 100, rows: 26 });
    await h.key("f2");
    expect(siteStore.getSnapshot().wireframe).toBe(true);
    await h.key("f2");
    expect(siteStore.getSnapshot().wireframe).toBe(false);
    await h.unmount();
  });
});
