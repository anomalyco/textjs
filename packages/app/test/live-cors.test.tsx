/** @jsxImportSource @textjs/app/server */
/**
 * Cross-origin live sessions for embeds: `allowOrigins` (default deny),
 * preflights, credentials and origin-bound sessions.
 */
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { useState, type ReactNode } from "react";
import { initYoga } from "@textjs/core";
import { Text, useInput } from "@textjs/react";
import type { RouteManifest } from "../src/router";
import { LIVE_PATH, LIVE_SESSION_HEADER, type LiveServerMessage } from "../src/live-protocol";
import { LiveServer, type LiveServerOptions } from "../src/server/live";
import { createLiveApp, isServerPage } from "../src/server/live-app";
import { compileAllowOrigins, isEmbedAsset, resolveEmbed } from "../src/server/cors";
import { withoutActEnvironment } from "./helpers";

const A = "https://a.example";
const B = "https://b.example";

function Counter(): ReactNode {
  const [n, setN] = useState(0);
  useInput((e) => {
    if (e.input === "+") setN((v) => v + 1);
  });
  return <Text>{`count ${n}`}</Text>;
}

const routes = (): RouteManifest => ({ segment: "", page: { default: Counter, runtime: "server" }, children: [{ segment: "client", page: { default: () => <Text>client</Text> } }] });

async function until(fn: () => boolean, timeout = 3000): Promise<void> {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > timeout) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 5));
  }
}

interface Stream {
  status: number;
  headers: Headers;
  messages: LiveServerMessage[];
  close(): void;
}

async function open(base: string, headers: Record<string, string> = {}, query = "path=/&cols=30&rows=4"): Promise<Stream> {
  const ctrl = new AbortController();
  const res = await fetch(`${base}${LIVE_PATH}?${query}`, { headers, signal: ctrl.signal });
  const stream: Stream = { status: res.status, headers: res.headers, messages: [], close: () => ctrl.abort() };
  if (!res.body) return stream;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          for (const line of buf.slice(0, i).split("\n")) if (line.startsWith("data: ")) stream.messages.push(JSON.parse(line.slice(6)) as LiveServerMessage);
          buf = buf.slice(i + 2);
        }
      }
    } catch {
      // aborted
    }
  })();
  return stream;
}

const text = (s: Stream): string => JSON.stringify(s.messages.filter((m) => m.t === "f"));
const sidOf = (s: Stream): string => (s.messages.find((m) => m.t === "hello") as { sid: string }).sid;
/** What a browser on `origin` sends for the player's stream. */
const fromSite = (origin: string, extra: Record<string, string> = {}): Record<string, string> => ({ origin, "sec-fetch-site": "cross-site", accept: "text/event-stream", ...extra });

describe("allowOrigins patterns", () => {
  test("exact origins, subdomain and port wildcards, and *", () => {
    const allow = compileAllowOrigins(["https://www.example.com", "https://*.acme.dev", "http://localhost:*", "HTTPS://Upper.Example"]);
    if (!allow) throw new Error("expected a matcher");
    for (const o of ["https://www.example.com", "https://a.acme.dev", "https://x.y.acme.dev", "http://localhost:3000", "http://localhost", "https://upper.example"]) expect({ o, ok: allow(o) }).toEqual({ o, ok: true });
    for (const o of [
      "http://www.example.com",
      "https://www.example.com:8443",
      "https://example.com",
      "https://acme.dev",
      "https://evilacme.dev",
      "https://localhost:3000",
      "http://localhost.evil.com",
      // Not serialized origins: browsers never send these.
      "https://www.example.com/",
      "https://www.example.com/x",
      "https://user@www.example.com",
      "https://WWW.example.com",
      "null",
      "",
      "file://",
    ])
      expect({ o, ok: allow(o) }).toEqual({ o, ok: false });
    const any = compileAllowOrigins(["*"]);
    expect(any?.("https://anything.example")).toBe(true);
    expect(any?.("null")).toBe(false);
    expect(any?.("chrome-extension://abc")).toBe(false);
  });

  test("an empty list allows no other origin; invalid patterns fail loudly", () => {
    expect(compileAllowOrigins([])).toBeNull();
    for (const p of ["https://a.example/", "https://a.example/path", "a.example", "ftp://a.example", "null", "https://*.com", "https://*", "https://a.example:443", "https://a.example:99999", "https://user@a.example"]) {
      expect(() => compileAllowOrigins([p])).toThrow(/embed\.allowOrigins/);
    }
    expect(() => compileAllowOrigins(["https://a.example:443"])).toThrow(/"https:\/\/a\.example"/);
  });

  test("credentials need exact origins", () => {
    for (const p of ["*", "https://*.acme.dev", "http://localhost:*"]) expect(() => compileAllowOrigins([p], { credentials: true })).toThrow(/embed\.credentials/);
    expect(compileAllowOrigins([A], { credentials: true })?.(A)).toBe(true);
    expect(() => resolveEmbed({ embed: { allowOrigins: ["*"], credentials: true } })).toThrow(/embed\.credentials/);
    expect(() => new LiveServer({ allowOrigins: ["*"], allowCredentials: true, runtimeOf: () => "server", createApp: () => Promise.reject(new Error("unused")) })).toThrow(/embed\.credentials/);
  });

  test("resolveEmbed and the files that get public CORS headers", () => {
    expect(resolveEmbed({})).toEqual({ enabled: false, allowOrigins: [], allowCredentials: false });
    expect(resolveEmbed({ embed: false })).toEqual({ enabled: false, allowOrigins: [], allowCredentials: false });
    expect(resolveEmbed({ embed: true })).toEqual({ enabled: true, allowOrigins: [], allowCredentials: false });
    expect(resolveEmbed({ embed: { allowOrigins: [A], credentials: true } })).toEqual({ enabled: true, allowOrigins: [A], allowCredentials: true });
    for (const p of ["/embed.js", "/assets/embed-1a2b.js", "/assets/yoga-1a2b.wasm", "/assets/x/y.css"]) expect({ p, ok: isEmbedAsset(p) }).toEqual({ p, ok: true });
    for (const p of ["/", "/index.html", "/embed.jsx", "/x/embed.js", "/assets/", "/assets/page", "/assets/a.html", "/assets/A.HTM", "/api/x.json"]) expect({ p, ok: isEmbedAsset(p) }).toEqual({ p, ok: false });
  });
});

describe("cross-origin live sessions", () => {
  let http: Server | null = null;
  let live: LiveServer | null = null;
  let base = "";
  /** Request headers `authorize` saw, in order. */
  let seen: Headers[] = [];

  beforeAll(async () => {
    await initYoga();
  });

  async function start(opts: Partial<LiveServerOptions> = {}): Promise<void> {
    seen = [];
    live = new LiveServer({
      frameIntervalMs: 20,
      runtimeOf: (p) => (isServerPage(routes(), p) ? "server" : "client"),
      createApp: (init) => createLiveApp({ ...init, routes: routes() }),
      authorize: async (_href, headers) => {
        seen.push(headers);
        return true;
      },
      ...opts,
    });
    const l = live;
    http = createServer((req, res) => {
      void l.handle(req, res, req.url ?? "/").then((handled) => {
        if (!handled) {
          res.statusCode = 404;
          res.end();
        }
      });
    });
    await new Promise<void>((r) => (http as Server).listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  }

  afterEach(async () => {
    await withoutActEnvironment(() => live?.close());
    live = null;
    await new Promise<void>((r) => (http ? http.close(() => r()) : r()));
    http = null;
  });

  const post = (sid: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> =>
    fetch(`${base}${LIVE_PATH}`, { method: "POST", headers: { "content-type": "application/json", [LIVE_SESSION_HEADER]: sid, ...headers }, body: JSON.stringify(body) });
  const key = [{ type: "key", key: "+", input: "+" }];

  test("an allowed origin streams frames and drives the session", async () => {
    await withoutActEnvironment(async () => {
      await start({ allowOrigins: [A] });
      const s = await open(base, fromSite(A));
      expect(s.status).toBe(200);
      expect(s.headers.get("access-control-allow-origin")).toBe(A);
      expect(s.headers.get("vary")).toBe("Origin");
      expect(s.headers.get("access-control-allow-credentials")).toBeNull();
      await until(() => text(s).includes("count 0"));
      const r = await post(sidOf(s), key, { origin: A, "sec-fetch-site": "cross-site" });
      expect(r.status).toBe(204);
      expect(r.headers.get("access-control-allow-origin")).toBe(A);
      await until(() => text(s).includes("count 1"));
      // Errors carry the headers too, so the player can read a 410.
      s.close();
      await until(() => live?.sessions.size === 0 || live?.sessions.get(sidOf(s))?.connected === false);
      const gone = await post("A".repeat(32), [], { origin: A });
      expect(gone.status).toBe(410);
      expect(gone.headers.get("access-control-allow-origin")).toBe(A);
    });
  });

  test("preflight: allowed origins get the methods and headers, cached for 10 minutes", async () => {
    await start({ allowOrigins: [A] });
    const ok = await fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS", headers: { origin: A, "access-control-request-method": "POST", "access-control-request-headers": "content-type,x-textjs-live" } });
    expect(ok.status).toBe(204);
    expect(Object.fromEntries([...ok.headers].filter(([k]) => k.startsWith("access-control-") || k === "vary"))).toEqual({
      "access-control-allow-origin": A,
      "access-control-allow-methods": "GET, POST",
      "access-control-allow-headers": "Accept, Content-Type, Last-Event-ID, x-textjs-live",
      "access-control-max-age": "600",
      vary: "Origin",
    });
    const evil = await fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS", headers: { origin: "https://evil.example", "access-control-request-method": "POST" } });
    expect(evil.status).toBe(403);
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
    // The app's own pages never preflight: OPTIONS stays a 405 for them.
    const same = await fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS" });
    expect(same.status).toBe(405);
    expect(same.headers.get("allow")).toBe("GET, POST");
  });

  test("other origins, opaque origins, and non-script requests are refused", async () => {
    await withoutActEnvironment(async () => {
      await start({ allowOrigins: [A, "https://*.acme.dev"] });
      const s = await open(base, fromSite(A));
      await until(() => text(s).includes("count 0"));
      const refused = [
        await fetch(`${base}${LIVE_PATH}?path=/`, { headers: fromSite("https://evil.example") }),
        await fetch(`${base}${LIVE_PATH}?path=/`, { headers: fromSite("https://acme.dev") }),
        await fetch(`${base}${LIVE_PATH}?path=/`, { headers: fromSite("null") }),
        await fetch(`${base}${LIVE_PATH}?path=/`, { headers: { "sec-fetch-site": "cross-site" } }),
        await post(sidOf(s), key, { origin: "https://evil.example", "sec-fetch-site": "cross-site" }),
      ];
      for (const r of refused) {
        expect(r.status).toBe(403);
        expect(r.headers.get("access-control-allow-origin")).toBeNull();
      }
      // <img>, <script> and navigations don't ask for an event stream.
      const img = await fetch(`${base}${LIVE_PATH}?path=/`, { headers: { origin: A, "sec-fetch-site": "cross-site", accept: "image/*" } });
      expect(img.status).toBe(403);
      expect(live?.sessions.size).toBe(1);
      expect((await open(base, fromSite("https://x.acme.dev"))).status).toBe(200);
      s.close();
    });
  });

  test("a session only answers the origin that opened it", async () => {
    await withoutActEnvironment(async () => {
      await start({ allowOrigins: [A, B] });
      const s = await open(base, fromSite(A));
      await until(() => text(s).includes("count 0"));
      const sid = sidOf(s);
      // Another allowed origin, and the app's own pages, can't drive or resume it...
      expect((await post(sid, key, { origin: B, "sec-fetch-site": "cross-site" })).status).toBe(403);
      expect((await post(sid, key)).status).toBe(403);
      expect((await post(sid, key, { origin: base, "sec-fetch-site": "same-origin" })).status).toBe(403);
      const hijack = await open(base, fromSite(B, { "last-event-id": sid }));
      expect(hijack.status).toBe(403);
      expect((await open(base, { [LIVE_SESSION_HEADER]: sid })).status).toBe(403);
      // ...and can't end it either: the session is still A's, connected, at the same state.
      expect(live?.sessions.get(sid)?.connected).toBe(true);
      expect(text(s)).not.toContain("count 1");
      expect((await post(sid, key, { origin: A, "sec-fetch-site": "cross-site" })).status).toBe(204);
      await until(() => text(s).includes("count 1"));
      // The other way around: a same-origin session refuses allowed origins.
      const own = await open(base);
      await until(() => text(own).includes("count 0"));
      expect((await post(sidOf(own), key, { origin: A, "sec-fetch-site": "cross-site" })).status).toBe(403);
      expect((await post(sidOf(own), key)).status).toBe(204);
      s.close();
      own.close();
    });
  });

  test("credentials: cross-origin sessions are anonymous unless allowCredentials", async () => {
    await withoutActEnvironment(async () => {
      await start({ allowOrigins: [A] });
      const cookie = { cookie: "auth=1", authorization: "Bearer t" };
      const anon = await open(base, fromSite(A, cookie));
      await until(() => text(anon).includes("count 0"));
      expect(anon.headers.get("access-control-allow-credentials")).toBeNull();
      expect(seen.at(-1)?.get("cookie")).toBeNull();
      expect(seen.at(-1)?.get("authorization")).toBeNull();
      // A cookie showing up later doesn't re-authorize or change the session's identity.
      const before = seen.length;
      expect((await post(sidOf(anon), key, { origin: A, cookie: "auth=2" })).status).toBe(204);
      expect(seen.length).toBe(before);
      // The app's own pages still carry their cookies.
      const own = await open(base, cookie);
      await until(() => text(own).includes("count 0"));
      expect(seen.at(-1)?.get("cookie")).toBe("auth=1");
      anon.close();
      own.close();
      await withoutActEnvironment(() => live?.close());
      await new Promise<void>((r) => (http ? http.close(() => r()) : r()));

      await start({ allowOrigins: [A], allowCredentials: true });
      const cred = await open(base, fromSite(A, cookie));
      await until(() => text(cred).includes("count 0"));
      expect(cred.headers.get("access-control-allow-credentials")).toBe("true");
      expect(seen.at(-1)?.get("cookie")).toBe("auth=1");
      const pre = await fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS", headers: { origin: A, "access-control-request-method": "POST" } });
      expect(pre.headers.get("access-control-allow-credentials")).toBe("true");
      cred.close();
    });
  });

  test("the session caps hold under a concurrent burst while middleware runs", async () => {
    await withoutActEnvironment(async () => {
      await start({ allowOrigins: [A], maxSessions: 1, maxSessionsPerClient: 1, authorize: () => new Promise((r) => setTimeout(() => r(true), 50)) });
      const burst = await Promise.all(Array.from({ length: 6 }, () => open(base, fromSite(A))));
      expect(burst.map((s) => s.status).sort()).toEqual([200, 503, 503, 503, 503, 503]);
      expect(live?.sessions.size).toBe(1);
      for (const s of burst) s.close();
    });
  });

  test("a browser that leaves while middleware runs leaves no session behind", async () => {
    await withoutActEnvironment(async () => {
      let release: (ok: boolean) => void = () => undefined;
      let mounts = 0;
      await start({
        authorize: () => new Promise((r) => (release = r)),
        createApp: (init) => {
          mounts++;
          return createLiveApp({ ...init, routes: routes() });
        },
      });
      const ctrl = new AbortController();
      const pending = fetch(`${base}${LIVE_PATH}?path=/`, { signal: ctrl.signal }).catch(() => null);
      await until(() => live?.sessions.size === 1);
      ctrl.abort();
      await pending;
      await new Promise((r) => setTimeout(r, 50));
      release(true);
      await until(() => live?.sessions.size === 0);
      await new Promise((r) => setTimeout(r, 50));
      expect(mounts).toBe(0);
      expect(live?.sessions.size).toBe(0);
      // A denial releases the slot too.
      const denied = fetch(`${base}${LIVE_PATH}?path=/`).then((r) => r.text());
      await until(() => live?.sessions.size === 1);
      release(false);
      expect(await denied).toContain('"t":"load"');
      expect(live?.sessions.size).toBe(0);
    });
  });

  test("Authorization is a preflight-approved header only with credentials", async () => {
    const preflight = () => fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS", headers: { origin: A, "access-control-request-method": "GET", "access-control-request-headers": "authorization,x-textjs-live" } });
    await start({ allowOrigins: [A] });
    expect((await preflight()).headers.get("access-control-allow-headers")).toBe("Accept, Content-Type, Last-Event-ID, x-textjs-live");
    await withoutActEnvironment(() => live?.close());
    await new Promise<void>((r) => (http ? http.close(() => r()) : r()));
    await start({ allowOrigins: [A], allowCredentials: true });
    const pre = await preflight();
    expect(pre.status).toBe(204);
    expect(pre.headers.get("access-control-allow-headers")).toBe("Accept, Content-Type, Last-Event-ID, x-textjs-live, Authorization");
    expect(pre.headers.get("access-control-allow-credentials")).toBe("true");
    // What a browser checks: every requested header is allowed (case-insensitively), and the origin is echoed.
    const allowed = (pre.headers.get("access-control-allow-headers") ?? "").toLowerCase().split(/\s*,\s*/);
    for (const h of ["authorization", "x-textjs-live"]) expect(allowed).toContain(h);
    expect(pre.headers.get("access-control-allow-origin")).toBe(A);
  });

  test("no live answer is stored by a cache, errors included", async () => {
    await withoutActEnvironment(async () => {
      await start({ allowOrigins: [A] });
      const s = await open(base, fromSite(A));
      await until(() => text(s).includes("count 0"));
      const answers = [
        s,
        await post(sidOf(s), key, { origin: A }),
        await post("A".repeat(32), [], { origin: A }),
        await fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS", headers: { origin: A, "access-control-request-method": "POST" } }),
        await fetch(`${base}${LIVE_PATH}?path=/`, { headers: fromSite("https://evil.example") }),
        await fetch(`${base}${LIVE_PATH}?path=/client`),
      ];
      for (const r of answers) {
        expect({ status: r.status, cache: r.headers.get("cache-control"), vary: r.headers.get("vary") }).toEqual({ status: r.status, cache: "private, no-store, no-transform", vary: "Origin" });
      }
      s.close();
    });
  });

  test("without allowOrigins nothing changes: same-origin only, no CORS headers", async () => {
    await withoutActEnvironment(async () => {
      await start();
      const s = await open(base);
      expect(s.status).toBe(200);
      await until(() => text(s).includes("count 0"));
      const r = await post(sidOf(s), key);
      expect(r.status).toBe(204);
      for (const res of [s, r]) for (const h of ["access-control-allow-origin", "access-control-allow-credentials", "vary"]) expect(res.headers.get(h)).toBeNull();
      expect((await fetch(`${base}${LIVE_PATH}?path=/`, { headers: fromSite(A) })).status).toBe(403);
      expect((await post(sidOf(s), key, { origin: A })).status).toBe(403);
      const pre = await fetch(`${base}${LIVE_PATH}`, { method: "OPTIONS", headers: { origin: A, "access-control-request-method": "POST" } });
      expect(pre.status).toBe(403);
      expect(pre.headers.get("access-control-allow-origin")).toBeNull();
      s.close();
    });
  });
});
