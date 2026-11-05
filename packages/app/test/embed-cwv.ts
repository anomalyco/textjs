#!/usr/bin/env bun
/**
 * Core Web Vitals of a host page with and without an embed, loaded the way a
 * marketing site's visitors load it: cold cache, Slow 4G (150 ms RTT, 1.6 Mbps)
 * and the CPU throttled 4×, DevTools closed. Modelled on apps/web/scripts/cls.mjs.
 *
 * Two hosts (a plain HTML page, and the same page running its own React 18 app
 * from an import map), each with no embed, with `embed.js`, and with `embed.js`
 * plus a `<text-console mirror>` and the CSS `text build --embed` prints, under
 * the hero (`mirror`) or below the first screen (`below`). Each case loads RUNS
 * times (default 7) in a fresh context. The embed's files come from a second
 * origin that gzips them, as a CDN would.
 *
 * After it settles, the visitor types in the page's field and clicks its buttons.
 *
 * Pass: CLS 0 everywhere, 0 ms of blocking time from the embed's scripts, no
 * long animation frame running them while the visitor uses the page, and a
 * median LCP within 15 ms of the same host without the embed. A mirror in the
 * first screen is usually the largest element, so LCP becomes the mirror's own
 * paint: the table also shows the LCP of the page's own content, outside
 * `<text-console>`. Exits 1 when a case fails.
 *
 *   bun packages/app/test/embed-cwv.ts
 *
 * Env: RUNS, OUT (writes results.json there), PLAYWRIGHT (playwright-core's
 * index.mjs), TEXTJS_CHROMIUM (a browser; default: playwright-core's own).
 * Heavy: run it on a VM, not a shared laptop.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";
import { buildApp } from "../src/cli/build";
import { REACT18_HEAD, REACT18_ROOT, react18Files } from "./embed-hosts";
import { createFixture, REPO } from "./server-fixture";

const RUNS = Number(process.env.RUNS ?? 7);
const OUT = process.env.OUT;
const PLAYWRIGHT = process.env.PLAYWRIGHT ?? join(REPO, "bench/devtools/node_modules/playwright-core/index.mjs");

const config = (body: string): string => `import { defineConfig } from "@textjs/app";\nexport default defineConfig(${body});\n`;

/** The status embed from the docs, at the default 120×36. */
const STATUS_PAGE = `import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";
export default function StatusEmbed() {
  const [tab, setTab] = useState(0);
  useInput((e) => {
    if (e.key === "left") setTab((t) => (t + 2) % 3);
    if (e.key === "right") setTab((t) => (t + 1) % 3);
  });
  return (
    <Box flexDirection="column" border="rounded" paddingX={2} paddingY={1}>
      <Text bold>▼ Acme Systems · All regions healthy</Text>
      <Text color="muted">{"Press ← → to inspect regions (" + ["us", "eu", "ap"][tab] + ")"}</Text>
    </Box>
  );
}
`;

const RTL_PAGE = `import { Text } from "@textjs/app";\nexport default function Page() { return <Text>مرحبا بالعالم</Text>; }\n`;
const SERVER_PAGE = `import { Text } from "@textjs/app";\nexport const runtime = "server";\nexport default function Page() { return <Text>server home</Text>; }\n`;

type Host = "plain" | "react18";
/** `mirror`: a `<text-console mirror>` under the hero; `below`: the same, below the first screen. */
type Condition = "none" | "embed" | "mirror" | "below";

interface Load {
  cls: number;
  lcp: number;
  lcpElement: string;
  /** The last LCP candidate outside `<text-console>`'s shadow root. */
  ownLcp: number;
  /** Blocking time (the part of each task over 50 ms) of scripts from the embed's origin. */
  embedTbt: number;
  /** Blocking time of every long animation frame. */
  tbt: number;
  /** Long animation frames while the visitor types in the page's field and clicks its buttons, and how many ran the embed's scripts. */
  inputFrames: number;
  embedInputFrames: number;
  /** CDP `ScriptDuration`, in ms. */
  script: number;
  /** Requests to the embed's origin. */
  requests: string[];
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

/** As `text build` prints sizes. */
const kb = (n: number): string => `${(n / 1000).toFixed(1)} kB`;

/** A static host for `dist/` that gzips, with the headers the adapters send for an embed. */
function serveDist(dist: string): ReturnType<typeof Bun.serve> {
  const types: Record<string, string> = { ".js": "text/javascript; charset=utf-8", ".wasm": "application/wasm" };
  return Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      const path = new URL(req.url).pathname;
      const file = join(dist, path);
      if (path.includes("..") || !existsSync(file) || !types[extname(file)]) return new Response("not found", { status: 404 });
      const body = gzipSync(readFileSync(file));
      return new Response(body, {
        headers: {
          "content-type": types[extname(file)] as string,
          "content-encoding": "gzip",
          "access-control-allow-origin": "*",
          "cross-origin-resource-policy": "cross-origin",
          "cache-control": path === "/embed.js" ? "public, max-age=0, must-revalidate" : "public, max-age=31536000, immutable",
        },
      });
    },
  });
}

const PROSE = Array.from({ length: 24 }, (_, i) => `<p>Section ${i + 1}. Acme runs your workloads in 18 regions with automatic failover, per-request logs and audit trails. Teams deploy several times a day and roll back in seconds.</p>`).join("\n");

function hostPage(host: Host, condition: Condition, embedSrc: string, reserveCss: string): string {
  const style = `body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#111}header{display:flex;gap:24px;padding:16px 32px;border-bottom:1px solid #ddd}main{max-width:960px;margin:0 auto;padding:32px}.hero h1{font-size:48px;line-height:1.1;margin:24px 0}.hero p{font-size:20px;color:#444;max-width:720px}form{display:flex;gap:8px;margin:24px 0}input{padding:8px;font:inherit}text-console{margin:32px 0}${condition === "mirror" || condition === "below" ? reserveCss : ""}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acme</title><link rel="icon" href="data:,"><style>${style}</style>${host === "react18" ? REACT18_HEAD : ""}</head>
<body>
<header><strong>Acme</strong><a href="#pricing">Pricing</a><a href="#docs">Docs</a><a href="#blog">Blog</a></header>
<main>
  <section class="hero">
    <h1>Ship infrastructure your whole team can read</h1>
    <p>Acme gives every service a status page, a live console and an audit log. Open DevTools on this page to see the status console.</p>
    <form><input aria-label="email" placeholder="you@company.com"><button type="button">Get started</button></form>
  </section>
  ${condition === "mirror" ? "<text-console mirror></text-console>" : ""}
  ${PROSE}
  ${condition === "below" ? "<text-console mirror></text-console>" : ""}
  ${host === "react18" ? REACT18_ROOT : ""}
</main>
${condition === "none" ? "" : `<script type="module" src="${embedSrc}"></script>`}
</body></html>`;
}

/** In the page before anything runs: layout shifts, LCP, and long animation frames with their scripts. */
function observe(embedOrigin: string): void {
  const w = window as unknown as { __cwv: { cls: number; lcp: number; lcpElement: string; ownLcp: number; tbt: number; embedTbt: number; inputFrames: number; embedInputFrames: number; inputFrom: number } };
  w.__cwv = { cls: 0, lcp: 0, lcpElement: "", ownLcp: 0, tbt: 0, embedTbt: 0, inputFrames: 0, embedInputFrames: 0, inputFrom: Infinity };
  // Elements inside a shadow root are reported as null.
  const describe = (el: Element | null | undefined): string => (el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}` : "shadow DOM");
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) if (!e.hadRecentInput) w.__cwv.cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as unknown as Array<{ startTime: number; element?: Element | null }>) {
      w.__cwv.lcp = e.startTime;
      w.__cwv.lcpElement = describe(e.element);
      if (e.element) w.__cwv.ownLcp = e.startTime;
    }
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const f of list.getEntries() as unknown as Array<{ startTime: number; duration: number; blockingDuration: number; scripts: Array<{ sourceURL: string; duration: number }> }>) {
      w.__cwv.tbt += f.blockingDuration;
      const embed = f.scripts.filter((s) => s.sourceURL.startsWith(embedOrigin));
      for (const s of embed) w.__cwv.embedTbt += Math.max(0, s.duration - 50);
      if (f.startTime >= w.__cwv.inputFrom) {
        w.__cwv.inputFrames++;
        if (embed.length > 0) w.__cwv.embedInputFrames++;
      }
    }
  }).observe({ type: "long-animation-frame", buffered: true });
}

async function main(): Promise<void> {
  if (!existsSync(PLAYWRIGHT)) throw new Error(`playwright-core not found at ${PLAYWRIGHT}: run \`bun install\` in bench/devtools, or set PLAYWRIGHT.`);
  // As users run it: production React.
  delete process.env.NODE_ENV;
  const client = createFixture({ "text.config.ts": config(`{ title: "Status", embed: true }`), "app/page.tsx": STATUS_PAGE }, "textjs-embed-cwv-");
  const rtl = createFixture({ "text.config.ts": config("{ embed: true }"), "app/page.tsx": RTL_PAGE }, "textjs-embed-cwv-rtl-");
  const server = createFixture({ "text.config.ts": config(`{ embed: { allowOrigins: ["https://www.example.com"] } }`), "app/page.tsx": SERVER_PAGE }, "textjs-embed-cwv-live-");
  try {
    const built = await buildApp({ root: client, log: false });
    const e = built.embed;
    if (!e) throw new Error("no embed output");
    const dist = join(client, "dist");
    const gz = (f: string): number => gzipSync(readFileSync(f)).length;
    const assets = readdirSync(join(dist, "assets"));
    const runtimeJs = e.lazyFiles.filter((f) => f.endsWith(".js")).reduce((n, f) => n + gz(join(dist, f)), 0);
    const wasm = e.lazyFiles.filter((f) => f.endsWith(".wasm")).reduce((n, f) => n + gz(join(dist, f)), 0);
    const rtlBuilt = await buildApp({ root: rtl, log: false });
    const rtlAssets = readdirSync(join(rtl, "dist/assets"));
    const bidi = rtlAssets.find((f) => /^bidi.*\.js$/.test(f));
    const live = await buildApp({ root: server, log: false });
    const player = live.embed?.lazyFiles.find((f) => f.includes("embed-player-"));
    console.log("Sizes (gzip), status embed at 120×36:");
    console.log(`  embed.js                     ${kb(e.entry.gzip)}`);
    console.log(`  <text-console>               ${kb(e.elementSize.gzip)}  (${e.element})`);
    console.log(`  client runtime + yoga.wasm   ${kb(runtimeJs + wasm)}  (${kb(runtimeJs)} JS + ${kb(wasm)} wasm)`);
    console.log(`  bidi chunk (on RTL text)     ${bidi ? kb(gz(join(rtl, "dist/assets", bidi))) : "not emitted"}  (RTL embed.js ${kb(rtlBuilt.embed?.entry.gzip ?? 0)})`);
    console.log(`  frame player (server route)  ${player ? kb(gz(join(server, "dist", player))) : "?"}  (server embed.js ${kb(live.embed?.entry.gzip ?? 0)})`);
    console.log(`  assets: ${assets.join(", ")}`);
    console.log();

    const cdn = serveDist(dist);
    const embedOrigin = `http://127.0.0.1:${cdn.port}`;
    const react = react18Files();
    const site = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch(req) {
        const url = new URL(req.url);
        const file = react[url.pathname];
        const gzip = (body: string, type: string): Response => new Response(gzipSync(body), { headers: { "content-type": type, "content-encoding": "gzip" } });
        if (file) return gzip(file.body, file.type);
        if (url.pathname !== "/") return new Response("not found", { status: 404 });
        const html = hostPage(url.searchParams.get("host") as Host, url.searchParams.get("c") as Condition, `${embedOrigin}/embed.js`, e.reserveCss);
        return gzip(html, "text/html; charset=utf-8");
      },
    });
    const { chromium } = (await import(PLAYWRIGHT)) as { chromium: { launch(o: Record<string, unknown>): Promise<any> } };
    const browser = await chromium.launch({ headless: true, ...(process.env.TEXTJS_CHROMIUM ? { executablePath: process.env.TEXTJS_CHROMIUM } : {}) });

    const load = async (host: Host, condition: Condition): Promise<Load> => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.addInitScript(observe, embedOrigin);
      const requests: string[] = [];
      let painted = false;
      page.on("request", (r: { url(): string }) => {
        if (r.url().startsWith(embedOrigin)) requests.push(new URL(r.url()).pathname);
      });
      page.on("console", (m: { text(): string }) => {
        if (m.text().includes("Acme Systems")) painted = true;
      });
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp.send("Performance.enable");
      await page.goto(`http://127.0.0.1:${site.port}/?host=${host}&c=${condition}`, { waitUntil: "load", timeout: 120_000 });
      const t0 = Date.now();
      // Wait for embed.js's first frame (and the mirror), then let the page settle.
      while (condition !== "none" && !painted && Date.now() - t0 < 20_000) await page.waitForTimeout(50);
      if (condition === "mirror" || condition === "below") await page.waitForFunction(() => (document.querySelector("text-console")?.shadowRoot?.textContent ?? "").includes("Acme"), null, { timeout: 20_000 });
      if (host === "react18") await page.waitForFunction(() => document.getElementById("r18-count") !== null, null, { timeout: 20_000 });
      await page.waitForTimeout(2000);
      // The visitor uses the page (after LCP, which input would end): its field, its button and, on the React page, React's.
      await page.evaluate(() => {
        (window as unknown as { __cwv: { inputFrom: number } }).__cwv.inputFrom = performance.now();
      });
      await page.click("input[aria-label=email]");
      await page.keyboard.type("ada@acme.com");
      await page.click("form button");
      if (host === "react18") {
        await page.click("#r18-count");
        await page.click("#r18-name");
        await page.keyboard.type("Ada");
      }
      await page.waitForTimeout(500);
      const cwv = (await page.evaluate(() => (window as unknown as { __cwv: Omit<Load, "script" | "requests"> }).__cwv)) as Omit<Load, "script" | "requests">;
      const metrics = (await cdp.send("Performance.getMetrics")) as { metrics: Array<{ name: string; value: number }> };
      const script = (metrics.metrics.find((m) => m.name === "ScriptDuration")?.value ?? 0) * 1000;
      await context.close();
      return { ...cwv, script, requests };
    };

    const results: Record<string, Load[]> = {};
    const hosts: Host[] = ["plain", "react18"];
    const conditions: Condition[] = ["none", "embed", "mirror", "below"];
    // Interleave the cases so drift on the machine spreads across all of them.
    for (let run = 0; run < RUNS; run++) {
      for (const host of hosts) {
        for (const condition of conditions) {
          const r = await load(host, condition);
          (results[`${host}/${condition}`] ??= []).push(r);
          process.stdout.write(".");
        }
      }
    }
    console.log("\n");
    await browser.close();
    site.stop(true);
    cdn.stop(true);

    let failed = false;
    const rows: string[] = ["| Host | Condition | CLS (max) | LCP median | LCP Δ vs none | LCP element | Own content LCP Δ | TBT from embed (max) | TBT, all (median) | Long frames on input, embed / all (max) | Script ms (median) | Embed requests |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"];
    for (const host of hosts) {
      const base = median((results[`${host}/none`] ?? []).map((r) => r.lcp));
      const ownBase = median((results[`${host}/none`] ?? []).map((r) => r.ownLcp));
      for (const condition of conditions) {
        const rs = results[`${host}/${condition}`] ?? [];
        const cls = Math.max(...rs.map((r) => r.cls));
        const lcp = median(rs.map((r) => r.lcp));
        const delta = lcp - base;
        const ownDelta = median(rs.map((r) => r.ownLcp)) - ownBase;
        const signed = (ms: number): string => (condition === "none" ? "–" : `${ms >= 0 ? "+" : ""}${ms.toFixed(0)} ms`);
        const embedTbt = Math.max(...rs.map((r) => r.embedTbt));
        const elements = [...new Set(rs.map((r) => r.lcpElement))].join(", ");
        const reqs = [...new Set(rs.flatMap((r) => r.requests))].map((p) => p.replace(/-[\w-]{8}\./, "-[hash].")).join(", ") || "none";
        const embedInput = Math.max(...rs.map((r) => r.embedInputFrames));
        const pass = cls === 0 && embedTbt === 0 && embedInput === 0 && (condition === "none" || delta <= 15);
        if (!pass) failed = true;
        rows.push(`| ${host} | ${condition} | ${cls.toFixed(4)} | ${lcp.toFixed(0)} ms | ${signed(delta)} | ${elements} | ${signed(ownDelta)} | ${embedTbt.toFixed(0)} ms | ${median(rs.map((r) => r.tbt)).toFixed(0)} ms | ${embedInput} / ${Math.max(...rs.map((r) => r.inputFrames))} | ${median(rs.map((r) => r.script)).toFixed(0)} | ${reqs} |${pass ? "" : " FAIL"}`);
      }
    }
    console.log(`${RUNS} cold loads per case, Slow 4G (150 ms RTT, 1.6 Mbps), CPU 4×, 1440×900, DevTools closed:\n`);
    console.log(rows.join("\n"));
    if (OUT) {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
    }
    if (failed) process.exitCode = 1;
  } finally {
    for (const d of [client, rtl, server]) rmSync(d, { recursive: true, force: true });
  }
}

await main();
