/**
 * Screenshot harness for the preview webview: renders the dashboard example
 * offscreen with `@textjs/next/testing`, encodes the frames with the real
 * frame protocol and writes one static page per UI state into `.harness/`,
 * then serves them on http://localhost:4719.
 *
 *   bun run harness            # build + serve
 *   bun scripts/harness.ts --no-serve
 */

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createElement } from "react";
import { extractStyledFrame } from "@textjs/core";
import { render } from "@textjs/next/testing";
import { AppRouter, createMemoryHistory } from "@textjs/next/router";
import { encodeFullFrame, type WireFrame } from "@textjs/next/frame-protocol";
import { loadRuntimeManifest } from "../../text/src/cli/run";
import { scanApp } from "../../text/src/server/scan";
import type { PreviewState } from "../src/webview-protocol";

const ROOT = resolve(import.meta.dir, "..");
const OUT = join(ROOT, ".harness");
const DASHBOARD = resolve(ROOT, "../../examples/dashboard");

async function frameOf(path: string, cols: number, rows: number, keys?: string): Promise<WireFrame> {
  const routes = await loadRuntimeManifest(scanApp(DASHBOARD));
  const app = await render(createElement(AppRouter, { routes, history: createMemoryHistory(path), theme: "geistDark", documentTitle: false, errorStore: null }), { cols, rows });
  await app.wait(60);
  if (keys) await app.press(keys);
  await app.wait(30);
  const frame = encodeFullFrame(extractStyledFrame(app.root.renderer.buffer), { meta: { path } });
  await app.unmount();
  return frame;
}

const base: PreviewState = {
  mode: "live",
  preference: "auto",
  server: { state: "running", url: "http://localhost:3000", clients: 1 },
  target: { label: "app/page.tsx", kind: "route" },
  path: "/",
  error: null,
  follow: false,
  fontSize: 12,
  mac: true,
  hint: "Mirroring the browser tab · click the console to interact",
  focused: true,
  loading: false,
};

interface Scenario {
  name: string;
  title: string;
  state: PreviewState;
  frame: WireFrame | null;
  focus?: boolean;
  width: number;
  height: number;
}

const live = await frameOf("/", 100, 30);
const logs = await frameOf("/logs", 104, 26);
const logsShort = await frameOf("/logs", 104, 22);
const deployments = await frameOf("/deployments", 104, 26, "down down");

const scenarios: Scenario[] = [
  { name: "live", title: "Live — mirroring text dev", state: base, frame: live, width: 980, height: 640 },
  {
    name: "headless",
    title: "Headless — rendering the open file",
    state: {
      ...base,
      mode: "headless",
      server: { state: "stopped", url: null, clients: 0 },
      target: { label: "app/logs/page.tsx", kind: "route" },
      path: "/logs",
      hint: "Headless render · start the dev server to mirror the real app",
    },
    frame: logs,
    width: 860,
    height: 560,
  },
  {
    name: "focused",
    title: "Keyboard input forwarded",
    state: { ...base, mode: "headless", target: { label: "app/deployments/page.tsx", kind: "route" }, path: "/deployments", server: { state: "running", url: "http://localhost:3000", clients: 0 }, hint: "Headless render · open the app in a browser to mirror it live" },
    frame: deployments,
    focus: true,
    width: 860,
    height: 560,
  },
  {
    name: "error",
    title: "Errors with TX links",
    state: {
      ...base,
      mode: "headless",
      server: { state: "stopped", url: null, clients: 0 },
      target: { label: "app/settings/page.tsx", kind: "route" },
      path: "/settings",
      hint: "Headless render · start the dev server to mirror the real app",
      error: {
        message: 'TX015: The default export is not a React Component in "app/settings/page.tsx".',
        file: "/app/settings/page.tsx",
        stack: 'Error: TX015: The default export is not a React Component in "app/settings/page.tsx".\n    at resolveComponent (router.tsx:57:11)\n    at RouteTree (router.tsx:301:19)\n\nLearn more: https://textjs.org/errors/TX015',
      },
    },
    frame: logsShort,
    width: 860,
    height: 560,
  },
  {
    name: "empty",
    title: "Empty state",
    state: { ...base, mode: "idle", target: null, path: null, server: { state: "stopped", url: null, clients: 0 }, hint: null },
    frame: null,
    width: 640,
    height: 420,
  },
];

mkdirSync(OUT, { recursive: true });
copyFileSync(join(ROOT, "dist/webview.js"), join(OUT, "webview.js"));
copyFileSync(join(ROOT, "webview/styles.css"), join(OUT, "styles.css"));

const page = (s: Scenario): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>▼ Preview harness — ${s.title}</title>
<link rel="stylesheet" href="styles.css" />
<style>html,body{background:#181818}#root{width:${s.width}px;height:${s.height}px;border:1px solid #2b2b2b;overflow:hidden}</style>
</head>
<body>
<div id="root"></div>
<script>
  window.__posted = [];
  const state = ${JSON.stringify(s.state)};
  const frame = ${JSON.stringify(s.frame)};
  window.acquireVsCodeApi = () => ({
    getState: () => null,
    setState: () => {},
    postMessage(m) {
      window.__posted.push(m);
      if (m.type === "ready") {
        window.postMessage({ type: "state", state }, "*");
        if (frame) window.postMessage({ type: "frame", frame }, "*");
        ${s.focus ? 'setTimeout(() => document.querySelector(".sink")?.focus(), 50);' : ""}
      }
    },
  });
</script>
<script src="webview.js"></script>
</body>
</html>
`;

for (const s of scenarios) writeFileSync(join(OUT, `${s.name}.html`), page(s));
writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html><meta charset="utf-8"><title>▼ Preview harness</title><body style="font:13px system-ui;background:#111;color:#ddd;padding:24px"><h1 style="font-size:16px">▼ Text.js preview harness</h1><ul>${scenarios.map((s) => `<li><a style="color:#4daafc" href="${s.name}.html">${s.title}</a></li>`).join("")}</ul></body>`,
);
console.log(`▼ wrote ${scenarios.length} scenarios to .harness/`);

if (!process.argv.includes("--no-serve")) {
  const server = Bun.serve({
    port: 4719,
    hostname: "127.0.0.1",
    fetch(req) {
      const path = new URL(req.url).pathname.replace(/^\/$/, "/index.html");
      if (path.includes("..")) return new Response("Not Found", { status: 404 });
      return new Response(Bun.file(join(OUT, path)));
    },
  });
  console.log(`▼ harness at http://127.0.0.1:${server.port}/`);
}
