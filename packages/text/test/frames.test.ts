import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ViteDevServer } from "vite";
import { CellBuffer, extractStyledFrame } from "@textjs/core";
import { startDevServer } from "../src/cli/dev";
import { FrameDecoder, FrameEncoder, FRAMES_PATH, INPUT_PATH, MIRROR_HEADER, STATUS_PATH, frameToText, type DevStatus, type WireFrame } from "../src/frame-protocol";
import { request as httpRequest } from "node:http";
import { isFetchMetadataAllowed, isLoopbackAddress, isLoopbackHost, isSameOriginRequest } from "../src/server/frames";
import { isAllowedDevHost } from "../src/vite-plugin";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));

let dir = "";
let server: ViteDevServer;
let base = "";

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "textjs-frames-"));
  mkdirSync(join(dir, "app"), { recursive: true });
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/text"), join(dir, "node_modules/@textjs/next"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "frames-fixture", type: "module", private: true }));
  writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nexport default function Page() { return <Text>hello</Text>; }\n');
  server = await startDevServer({ root: dir, port: 36000 + Math.floor(Math.random() * 2000), log: false });
  base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
}, 30_000);

afterAll(async () => {
  await server?.close();
  rmSync(dir, { recursive: true, force: true });
});

/** A fake browser tab on the Vite HMR socket. */
async function connectTab(): Promise<{ ws: WebSocket; messages: Array<{ event: string; data: unknown }> }> {
  const url = `${base.replace("http", "ws")}/?token=${server.config.webSocketToken}`;
  const ws = new WebSocket(url, "vite-hmr");
  const messages: Array<{ event: string; data: unknown }> = [];
  ws.onmessage = (e) => {
    const p = JSON.parse(String(e.data)) as { type: string; event?: string; data?: unknown };
    if (p.type === "custom" && p.event) messages.push({ event: p.event, data: p.data });
  };
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("ws failed"));
  });
  return { ws, messages };
}

function sendCustom(ws: WebSocket, event: string, data: unknown): void {
  ws.send(JSON.stringify({ type: "custom", event, data }));
}

async function until<T>(fn: () => T | undefined | false | Promise<T | undefined | false>, timeout = 3000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}

/** Minimal SSE reader over fetch. */
function subscribe(): { events: Array<{ event: string; data: unknown }>; close(): void } {
  const events: Array<{ event: string; data: unknown }> = [];
  const ctrl = new AbortController();
  void (async () => {
    const res = await fetch(`${base}${FRAMES_PATH}`, { signal: ctrl.signal });
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const ev = /^event: (.*)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (ev && data) events.push({ event: ev, data: JSON.parse(data) });
      }
    }
  })().catch(() => undefined);
  return { events, close: () => ctrl.abort() };
}

/** A raw HTTP request (lets tests set `Host` and Fetch Metadata headers freely). */
function raw(path: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: Record<string, unknown>; body: string }> {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: u.hostname, port: u.port, path, method: options.method ?? "GET", headers: options.headers, agent: false }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => {
        body += c;
        // SSE never ends: resolve on the first bytes.
        if (res.statusCode === 200 && path === FRAMES_PATH) {
          resolve({ status: res.statusCode, headers: res.headers, body });
          req.destroy();
        }
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end(options.body);
  });
}

describe("dev frame mirror", () => {
  test("helpers: loopback and same-origin checks", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("10.0.0.2")).toBe(false);
    expect(isLoopbackAddress(undefined)).toBe(false);
    expect(isSameOriginRequest({ headers: {} })).toBe(true);
    expect(isSameOriginRequest({ headers: { origin: "http://localhost:3000", host: "localhost:3000" } })).toBe(true);
    expect(isSameOriginRequest({ headers: { origin: "https://evil.example", host: "localhost:3000" } })).toBe(false);
    for (const h of ["localhost", "localhost:3000", "LOCALHOST:3000", "app.localhost:3000", "127.0.0.1:3000", "127.1.2.3", "[::1]:3000", "[::1]"]) expect(isLoopbackHost(h)).toBe(true);
    for (const h of [undefined, "", "evil.example", "evil.example:3000", "localhost.evil.example", "localhost:3000@evil", "10.0.0.2:3000", "0.0.0.0:3000", "[::2]:3000", "[::1]evil", "127.0.0.1.nip.io", "localhost."]) {
      expect(isLoopbackHost(h)).toBe(false);
    }
    expect(isFetchMetadataAllowed({ headers: {} }, FRAMES_PATH)).toBe(true);
    expect(isFetchMetadataAllowed({ headers: { "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors" } }, FRAMES_PATH)).toBe(true);
    expect(isFetchMetadataAllowed({ headers: { "sec-fetch-site": "none" } }, STATUS_PATH)).toBe(true);
    expect(isFetchMetadataAllowed({ headers: { "sec-fetch-site": "cross-site" } }, STATUS_PATH)).toBe(false);
    expect(isFetchMetadataAllowed({ headers: { "sec-fetch-site": "same-site" } }, INPUT_PATH)).toBe(false);
    expect(isFetchMetadataAllowed({ headers: { "sec-fetch-site": "same-origin", "sec-fetch-mode": "no-cors" } }, FRAMES_PATH)).toBe(false);
  });

  test("isAllowedDevHost only accepts a bracketed IPv6 literal with an optional port", () => {
    const srv = { config: { server: { allowedHosts: [] } } } as never;
    expect(isAllowedDevHost(srv, "[::1]:3000")).toBe(true);
    expect(isAllowedDevHost(srv, "[::1]")).toBe(true);
    expect(isAllowedDevHost(srv, "[::1]evil.example")).toBe(false);
    expect(isAllowedDevHost(srv, "[::1]:3000.evil.example")).toBe(false);
    expect(isAllowedDevHost(srv, "[evil.example]")).toBe(false);
    expect(isAllowedDevHost(srv, "evil.example")).toBe(false);
  });

  test("DNS rebinding: a non-loopback Host is rejected even when Vite allows every host", async () => {
    const cfg = server.config.server as { allowedHosts: unknown };
    const saved = cfg.allowedHosts;
    cfg.allowedHosts = true;
    try {
      const port = new URL(base).port;
      const rebound = { host: `evil.example:${port}`, origin: `http://evil.example:${port}` };
      expect((await raw(STATUS_PATH, { headers: rebound })).status).toBe(403);
      expect((await raw(STATUS_PATH, { headers: { host: `evil.example:${port}` } })).status).toBe(403);
      expect((await raw(FRAMES_PATH, { headers: rebound })).status).toBe(403);
      const input = await raw(INPUT_PATH, {
        method: "POST",
        headers: { ...rebound, "content-type": "application/json", [MIRROR_HEADER]: "1" },
        body: JSON.stringify({ type: "key", key: "Enter" }),
      });
      expect(input.status).toBe(403);
      // The real loopback name still works.
      expect((await raw(STATUS_PATH, { headers: { host: `localhost:${port}` } })).status).toBe(200);
    } finally {
      cfg.allowedHosts = saved;
    }
  });

  test("Fetch Metadata: cross-site and no-cors requests are rejected and never register a watcher", async () => {
    const port = new URL(base).port;
    const host = `localhost:${port}`;
    // <img src> / fetch(..., { mode: "no-cors" }) from another site: no Origin header.
    const img = await raw(FRAMES_PATH, { headers: { host, "sec-fetch-site": "cross-site", "sec-fetch-mode": "no-cors", "sec-fetch-dest": "image" } });
    expect(img.status).toBe(403);
    expect(img.headers["x-content-type-options"]).toBe("nosniff");
    expect((await raw(FRAMES_PATH, { headers: { host, "sec-fetch-site": "same-origin", "sec-fetch-mode": "no-cors" } })).status).toBe(403);
    expect((await raw(STATUS_PATH, { headers: { host, "sec-fetch-site": "cross-site", "sec-fetch-mode": "cors" } })).status).toBe(403);
    // Cross-site POST (even a CORS-safelisted one) is rejected.
    const post = await raw(INPUT_PATH, {
      method: "POST",
      headers: { host, origin: "https://evil.example", "sec-fetch-site": "cross-site", "sec-fetch-mode": "no-cors", "content-type": "text/plain" },
      body: JSON.stringify({ type: "key", key: "Enter" }),
    });
    expect(post.status).toBe(403);
    const s = (await (await fetch(`${base}${STATUS_PATH}`)).json()) as DevStatus;
    expect(s.watchers).toBe(0);
    // Same-origin EventSource requests are fine.
    const ok = await raw(FRAMES_PATH, { headers: { host, "sec-fetch-site": "same-origin", "sec-fetch-mode": "cors" } });
    expect(ok.status).toBe(200);
    expect(ok.headers["x-content-type-options"]).toBe("nosniff");
    await until(async () => ((await (await fetch(`${base}${STATUS_PATH}`)).json()) as DevStatus).watchers === 0);
  });

  test("status reports the project", async () => {
    const s = (await (await fetch(`${base}${STATUS_PATH}`)).json()) as DevStatus;
    expect(s).toMatchObject({ name: "textjs", watchers: 0, grid: null });
    expect(s.root).toContain("textjs-frames-");
  });

  test("relays tab frames to watchers, replays them to late subscribers and forwards input", async () => {
    const tab = await connectTab();
    sendCustom(tab.ws, "textjs:hello", { source: "tab-a", grid: { width: 90, height: 30 }, path: "/start" });
    await until(() => tab.messages.find((m) => m.event === "textjs:mirror"));
    expect(tab.messages.find((m) => m.event === "textjs:mirror")?.data).toEqual({ active: false });
    // Tabs report their size and path without streaming frames (for editor status bars).
    const hello = (await (await fetch(`${base}${STATUS_PATH}`)).json()) as DevStatus;
    expect(hello).toMatchObject({ sources: 1, watchers: 0, grid: { width: 90, height: 30 }, path: "/start" });

    const sub = subscribe();
    await until(() => tab.messages.some((m) => m.event === "textjs:mirror" && (m.data as { active: boolean }).active));

    const buf = new CellBuffer(16, 2);
    buf.drawText(0, 0, "▼ live frame", 0xededffff, 0x0a0a0aff, 0);
    const enc = new FrameEncoder();
    sendCustom(tab.ws, "textjs:frame", enc.encode(extractStyledFrame(buf), { source: "tab-a", meta: { path: "/" } }));
    buf.drawText(0, 1, "row two", 0xededffff, 0x0a0a0aff, 0);
    sendCustom(tab.ws, "textjs:frame", enc.encode(extractStyledFrame(buf), { source: "tab-a" }));

    const frames = await until(() => {
      const f = sub.events.filter((e) => e.event === "frame");
      return f.length >= 2 ? f : false;
    });
    const dec = new FrameDecoder();
    for (const f of frames) dec.apply(f.data as WireFrame);
    expect(frameToText(dec.frame!)).toBe("▼ live frame\nrow two");

    const status = (await (await fetch(`${base}${STATUS_PATH}`)).json()) as DevStatus;
    expect(status).toMatchObject({ sources: 1, watchers: 1, grid: { width: 16, height: 2 }, path: "/" });

    // A late subscriber gets the current state as one full frame.
    const late = subscribe();
    const replay = await until(() => late.events.find((e) => e.event === "frame"));
    expect((replay.data as WireFrame).full).toBe(true);
    expect(frameToText(new FrameDecoder().apply(replay.data as WireFrame)!)).toBe("▼ live frame\nrow two");
    late.close();

    // Input: JSON + header required; forwarded to the tab.
    const post = (body: unknown, headers: Record<string, string> = { "content-type": "application/json", [MIRROR_HEADER]: "1" }) =>
      fetch(`${base}${INPUT_PATH}`, { method: "POST", headers, body: JSON.stringify(body) });
    expect((await post({ type: "key", key: "ArrowDown" }, { "content-type": "text/plain" })).status).toBe(400);
    expect((await post({ type: "exec", cmd: "rm" })).status).toBe(400);
    expect((await post({ type: "key", key: "ArrowDown" }, { "content-type": "application/json", [MIRROR_HEADER]: "1", origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ type: "key", key: "ArrowDown", source: "tab-a" })).status).toBe(204);
    const input = await until(() => tab.messages.find((m) => m.event === "textjs:input"));
    expect(input.data).toMatchObject({ type: "key", key: "ArrowDown" });

    // Malformed frames are dropped.
    sendCustom(tab.ws, "textjs:frame", { v: 1, source: "tab-a", width: 1, height: 1, full: true, styles: [["url(x)", null, 0]], rows: [] });

    sub.close();
    tab.ws.close();
    await until(() => tab.ws.readyState === WebSocket.CLOSED);
    const after = await until(async () => {
      const s = (await (await fetch(`${base}${STATUS_PATH}`)).json()) as DevStatus;
      return s.sources === 0 ? s : false;
    });
    expect(after.sources).toBe(0);
  }, 15_000);

  test("rejects foreign origins on the stream", async () => {
    const res = await fetch(`${base}${FRAMES_PATH}`, { headers: { origin: "https://evil.example" } });
    expect(res.status).toBe(403);
  });
});
