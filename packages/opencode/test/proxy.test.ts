import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { HELP, main, parseArgs } from "../src/cli";
import {
  corsHeaders,
  createBridgeHandler,
  createPairingCode,
  formatPairingCode,
  isAllowedOrigin,
  MAX_PAIR_ATTEMPTS,
  normalizePairingCode,
  normalizeTargetUrl,
  PAIR_PATH,
  startProxy,
  TOKEN_HEADER,
  type StartedBridge,
} from "../src/proxy";

const AUTH = `Basic ${Buffer.from("opencode:secret").toString("base64")}`;
const CODE = "K7F2QM";

let upstream: ReturnType<typeof Bun.serve>;
let bridge: StartedBridge;
let base = "";
/** Tokens per origin, paired once in `beforeAll`. */
const tokens: Record<string, string> = {};
const seen: Array<{ method: string; path: string; auth: string | null; body: string }> = [];
let sseClosed = false;

beforeAll(async () => {
  upstream = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      seen.push({ method: req.method, path: url.pathname + url.search, auth: req.headers.get("authorization"), body: req.method === "GET" ? "" : await req.text() });
      if (req.headers.get("authorization") !== AUTH) return new Response("unauthorized", { status: 401 });
      if (url.pathname === "/api/info") return Response.json({ version: "2.0.0" });
      if (url.pathname === "/api/session" && req.method === "GET") return Response.json({ data: [{ id: "ses_1", title: "Fix flaky SSE reconnect test", time: { created: 1, updated: 2 } }] });
      if (url.pathname === "/api/session/ses_1/prompt") return Response.json({ ok: true });
      if (url.pathname === "/api/event") {
        let timer: ReturnType<typeof setInterval> | undefined;
        const enc = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode(`data: ${JSON.stringify({ type: "server.connected", data: {} })}\n\n`));
            c.enqueue(enc.encode(`data: ${JSON.stringify({ type: "session.text.delta", data: { sessionID: "ses_1", delta: "hi" } })}\n\n`));
            timer = setInterval(() => c.enqueue(enc.encode(": ping\n\n")), 20);
          },
          cancel() {
            clearInterval(timer);
            sseClosed = true;
          },
        });
        return new Response(stream, { headers: { "content-type": "text/event-stream" } });
      }
      return new Response("not found", { status: 404 });
    },
  });
  bridge = await startProxy({
    port: 0,
    log: false,
    pairingCode: CODE,
    discover: async () => ({ url: `http://127.0.0.1:${upstream.port}`, source: "service", authorization: AUTH }),
  });
  base = bridge.url;
  for (const origin of ["https://textjs.org", "http://localhost:5173"]) tokens[origin] = await pairWith(base, origin, "k7f-2qm");
});

async function pairWith(url: string, origin: string | null, code: string): Promise<string> {
  const res = await fetch(`${url}${PAIR_PATH}`, {
    method: "POST",
    headers: { ...(origin ? { origin } : {}), "content-type": "application/json", "x-opencode-client": "1" },
    body: JSON.stringify({ code }),
  });
  const body = (await res.json()) as { token?: string };
  if (res.status !== 200 || !body.token) throw new Error(`pairing failed: ${res.status}`);
  return body.token;
}

/** Headers for a paired page on `origin`. */
const as = (origin: string, extra: Record<string, string> = {}): Record<string, string> => ({ origin, [TOKEN_HEADER]: tokens[origin] as string, ...extra });

afterAll(async () => {
  await bridge.close();
  upstream.stop(true);
});

describe("bunx @textjs/opencode proxy", () => {
  test("parses bridge flags", () => {
    expect(parseArgs(["proxy", "--port", "4100", "--target", "http://127.0.0.1:4096", "--allow-origin", "https://x.dev", "--allow-origin=https://y.dev"])).toMatchObject({
      command: "proxy",
      port: 4100,
      target: "http://127.0.0.1:4096",
      allowOrigins: ["https://x.dev", "https://y.dev"],
    });
    expect(parseArgs(["proxy", "--port=abc"]).port).toBeUndefined();
  });

  test("help lists proxy; bare runs print it and fail", async () => {
    expect(HELP).toContain("Usage: bunx @textjs/opencode proxy");
    expect(HELP).toMatch(/^\s+proxy\s+Bridge textjs\.org\/opencode/m);
    for (const flag of ["--port", "--target", "--allow-origin", "--version", "--help"]) expect(HELP).toContain(flag);
    const log = console.log;
    const error = console.error;
    const out: string[] = [];
    console.log = (...a: unknown[]) => void out.push(a.join(" "));
    console.error = (...a: unknown[]) => void out.push(a.join(" "));
    try {
      expect(await main([])).toBe(1);
      expect(await main(["--help"])).toBe(0);
      expect(await main(["serve"])).toBe(1);
      expect(await main(["--version"])).toBe(0);
    } finally {
      console.log = log;
      console.error = error;
    }
    expect(out.filter((l) => l === HELP)).toHaveLength(3);
    expect(out.join("\n")).toContain("Unknown command");
    expect(out.join("\n")).toMatch(/@textjs\/opencode v\d+\.\d+\.\d+/);
  });

  test("origin allowlist", () => {
    for (const o of ["https://textjs.org", "https://www.textjs.org", "http://localhost:5173", "http://127.0.0.1:3000", "http://[::1]:8080"]) {
      expect(isAllowedOrigin(o)).toBe(true);
    }
    for (const o of [
      "https://evil.com",
      "http://textjs.org",
      "https://textjs.org.evil.com",
      "https://evil-textjs.org",
      "https://xtextjs.org",
      "https://sub.textjs.org",
      "https://eviltextjs-avg.pages.dev",
      "null",
      "",
      "http://localhost.evil.com:80",
      "http://127.0.0.1.nip.io:3000",
      "https://textjs.org:8443",
      "https://textjs.org/",
      "https://textjs.org/x",
      "https://user@textjs.org",
      "https://TEXTJS.org",
      "file://",
    ]) {
      expect({ o, ok: isAllowedOrigin(o) }).toEqual({ o, ok: false });
    }
    // Preview deployments build any branch, so they need an explicit --allow-origin.
    for (const o of ["https://textjs-avg.pages.dev", "https://abc123.textjs-avg.pages.dev"]) expect(isAllowedOrigin(o)).toBe(false);
    expect(isAllowedOrigin("https://abc123.textjs-avg.pages.dev", ["https://abc123.textjs-avg.pages.dev"])).toBe(true);
    expect(isAllowedOrigin("https://abc123.textjs-avg.pages.dev", ["https://*.textjs-avg.pages.dev"])).toBe(true);
    expect(isAllowedOrigin("https://textjs-avg.pages.dev.evil.com", ["https://*.textjs-avg.pages.dev"])).toBe(false);
    expect(isAllowedOrigin("https://my.app", ["https://my.app"])).toBe(true);
    expect(normalizeTargetUrl("opencode service running at http://0.0.0.0:49374 (pid 1)")).toBe("http://127.0.0.1:49374");
  });

  test("OPTIONS preflight answers CORS + Private Network Access", async () => {
    const res = await fetch(`${base}/api/session`, {
      method: "OPTIONS",
      headers: { origin: "https://textjs.org", "access-control-request-method": "POST", "access-control-request-private-network": "true", "access-control-request-headers": "content-type,x-opencode-client" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://textjs.org");
    expect(res.headers.get("access-control-allow-private-network")).toBe("true");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-headers")).toContain("x-opencode-client");
    expect(res.headers.get("access-control-allow-headers")).toContain(TOKEN_HEADER);
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    expect(res.headers.get("access-control-max-age")).toBe("86400");
    expect(res.headers.get("vary")).toBe("Origin");
    expect(corsHeaders("https://textjs.org")["access-control-allow-private-network"]).toBe("true");
  });

  test("rejects foreign origins and hosts", async () => {
    const evil = await fetch(`${base}/api/session`, { headers: { origin: "https://evil.com" } });
    expect(evil.status).toBe(403);
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
    const handler = createBridgeHandler({ discover: async () => null });
    // DNS rebinding: the page's own hostname arrives as Host.
    for (const host of ["attacker.example:4096", "localhost.attacker.example", "127.0.0.1.nip.io:4096", "0.0.0.0:4096", "localhost.:4096", ""]) {
      const rebind = await handler(new Request("http://attacker.example/api/session", { headers: { host } }));
      expect({ host, status: rebind.status }).toEqual({ host, status: 403 });
    }
    const opaque = await fetch(`${base}/api/session`, { headers: { origin: "null" } });
    expect(opaque.status).toBe(403);
  });

  test("pairing codes are random, readable and forgiving to type", () => {
    const codes = new Set(Array.from({ length: 200 }, createPairingCode));
    expect(codes.size).toBeGreaterThan(195);
    for (const c of codes) expect(c).toMatch(/^[2-9A-HJKMNP-TV-Z]{6}$/);
    expect(formatPairingCode("K7F2QM")).toBe("K7F-2QM");
    expect(normalizePairingCode(" k7f-2qm ")).toBe("K7F2QM");
  });

  test("an allowed origin can't reach OpenCode without pairing", async () => {
    const before = seen.length;
    for (const path of ["/api/session", "/api/info", "/api/event", "/__textjs/keys", "/session?limit=1"]) {
      const res = await fetch(`${base}${path}`, { headers: { origin: "https://textjs.org" } });
      expect({ path, status: res.status }).toEqual({ path, status: 428 });
      expect(res.headers.get("access-control-allow-origin")).toBe("https://textjs.org");
      expect(res.headers.get("x-textjs-bridge")).toBe("1");
    }
    // Simple requests a hostile page can send without a preflight: no Origin, form posts, sendBeacon.
    expect((await fetch(`${base}/api/session`)).status).toBe(428);
    expect((await fetch(`${base}/api/session`, { headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "no-cors" } })).status).toBe(428);
    const form = await fetch(`${base}/api/session/ses_1/prompt`, { method: "POST", headers: { origin: "https://textjs.org", "content-type": "text/plain" }, body: "{}" });
    expect(form.status).toBe(428);
    const bad = await fetch(`${base}/api/session`, { headers: { origin: "https://textjs.org", [TOKEN_HEADER]: "not-a-token" } });
    expect(bad.status).toBe(428);
    expect(seen.length).toBe(before);
  });

  test("/__bridge says only that it's a bridge until paired", async () => {
    const unpaired = await fetch(`${base}/__bridge`, { headers: { origin: "https://textjs.org" } });
    expect(await unpaired.json()).toEqual({ bridge: "textjs", paired: false, locked: false });
    const paired = await fetch(`${base}/__bridge`, { headers: as("https://textjs.org") });
    expect(await paired.json()).toMatchObject({ bridge: "textjs", paired: true, connected: true });
  });

  test("tokens are bound to the origin that paired", async () => {
    const stolen = await fetch(`${base}/api/session`, { headers: { origin: "http://localhost:3000", [TOKEN_HEADER]: tokens["https://textjs.org"] as string } });
    expect(stolen.status).toBe(428);
    const noOrigin = await fetch(`${base}/api/session`, { headers: { [TOKEN_HEADER]: tokens["https://textjs.org"] as string } });
    expect(noOrigin.status).toBe(428);
    expect((await fetch(`${base}/api/session`, { headers: as("http://localhost:5173") })).status).toBe(200);
  });

  test("pairing needs POST, the client header and the code", async () => {
    expect((await fetch(`${base}${PAIR_PATH}`, { headers: { origin: "https://textjs.org" } })).status).toBe(405);
    const simple = await fetch(`${base}${PAIR_PATH}`, { method: "POST", headers: { origin: "https://textjs.org", "content-type": "text/plain" }, body: JSON.stringify({ code: CODE }) });
    expect(simple.status).toBe(403);
    const evil = await fetch(`${base}${PAIR_PATH}`, { method: "POST", headers: { origin: "https://evil.com", "content-type": "application/json", "x-opencode-client": "1" }, body: JSON.stringify({ code: CODE }) });
    expect(evil.status).toBe(403);
    expect(await evil.text()).not.toContain("token");
    const big = await fetch(`${base}${PAIR_PATH}`, { method: "POST", headers: { origin: "https://textjs.org", "content-type": "application/json", "x-opencode-client": "1" }, body: JSON.stringify({ code: CODE, pad: "x".repeat(4096) }) });
    expect(big.status).toBe(413);
  });

  test("wrong codes lock pairing, even when guessed in parallel", async () => {
    const events: string[] = [];
    const handler = createBridgeHandler({ pairingCode: CODE, discover: async () => null, onPairing: (e) => void events.push(e) });
    const guess = (code: string): Promise<Response> =>
      handler(
        new Request(`http://127.0.0.1:4096${PAIR_PATH}`, {
          method: "POST",
          headers: { host: "127.0.0.1:4096", origin: "http://localhost:3000", "content-type": "application/json", "x-opencode-client": "1" },
          body: JSON.stringify({ code }),
        }),
      );
    const first = await guess("AAAAAA");
    expect(first.status).toBe(403);
    expect(await first.json()).toEqual({ error: "Wrong code", attemptsLeft: MAX_PAIR_ATTEMPTS - 1 });
    const burst = await Promise.all(Array.from({ length: 200 }, (_, i) => guess(`B${String(i).padStart(5, "2")}`)));
    expect(burst.filter((r) => r.status === 403)).toHaveLength(MAX_PAIR_ATTEMPTS - 2);
    expect(burst.filter((r) => r.status === 429).length).toBe(200 - (MAX_PAIR_ATTEMPTS - 2));
    // Locked: even the right code is refused until the bridge restarts.
    expect((await guess(CODE)).status).toBe(429);
    expect(events).toEqual(["locked"]);
    const status = await handler(new Request("http://127.0.0.1:4096/__bridge", { headers: { host: "127.0.0.1:4096" } }));
    expect(await status.json()).toMatchObject({ paired: false, locked: true });
  });

  test("unpaired requests never run discovery", async () => {
    let discovered = 0;
    const handler = createBridgeHandler({
      pairingCode: CODE,
      discover: async () => {
        discovered++;
        return null;
      },
    });
    for (const path of ["/__bridge", "/api/session", "/__textjs/keys"]) await handler(new Request(`http://localhost:4096${path}`, { headers: { host: "localhost:4096", origin: "https://textjs.org" } }));
    expect(discovered).toBe(0);
  });

  test("forwards V2 /api/session with the daemon password injected, never exposing it", async () => {
    const res = await fetch(`${base}/api/session?parentID=null&limit=30`, { headers: as("https://textjs.org", { accept: "application/json" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://textjs.org");
    expect(res.headers.get("x-textjs-bridge")).toBe("1");
    const body = (await res.json()) as { data: Array<{ id: string }> };
    expect(body.data[0]?.id).toBe("ses_1");
    const last = seen.at(-1);
    expect(last?.path).toBe("/api/session?parentID=null&limit=30");
    expect(last?.auth).toBe(AUTH);
    expect(JSON.stringify([...res.headers])).not.toContain("secret");
    expect(last?.auth).not.toBeNull();
    // The pairing token stays between the page and the bridge.
    expect(JSON.stringify(seen)).not.toContain(tokens["https://textjs.org"] as string);
  });

  test("never echoes the password or forwards browser credentials", async () => {
    const res = await fetch(`${base}/api/missing`, { headers: as("https://textjs.org", { authorization: "Basic ZXZpbDpldmls", cookie: "a=b", host: "localhost" }) });
    expect(res.status).toBe(404);
    expect(seen.at(-1)?.auth).toBe(AUTH);
    const all = JSON.stringify([...res.headers]) + (await res.text());
    expect(all).not.toContain("secret");
    expect(all).not.toContain(AUTH.slice(6));
  });

  test("writes require x-opencode-client", async () => {
    const denied = await fetch(`${base}/api/session/ses_1/prompt`, { method: "POST", headers: as("https://textjs.org", { "content-type": "application/json" }), body: "{}" });
    expect(denied.status).toBe(403);
    const ok = await fetch(`${base}/api/session/ses_1/prompt`, {
      method: "POST",
      headers: as("https://textjs.org", { "content-type": "application/json", "x-opencode-client": "1" }),
      body: JSON.stringify({ text: "hello" }),
    });
    expect(ok.status).toBe(200);
    expect(seen.at(-1)?.body).toBe(JSON.stringify({ text: "hello" }));
  });

  test("odd request targets stay on the OpenCode server", async () => {
    const { connect } = await import("node:net");
    const port = new URL(base).port;
    const raw = (target: string): Promise<string> =>
      new Promise((resolve, reject) => {
        const socket = connect(Number(port), "127.0.0.1", () => {
          socket.write(`GET ${target} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nOrigin: https://textjs.org\r\n${TOKEN_HEADER}: ${tokens["https://textjs.org"]}\r\nConnection: close\r\n\r\n`);
        });
        let out = "";
        socket.on("data", (d) => (out += d.toString()));
        socket.on("end", () => resolve(out));
        socket.on("error", reject);
      });
    for (const target of ["//evil.example/api/info", "/../../api/info", "/api/%2e%2e/info"]) {
      const before = seen.length;
      const res = await raw(target);
      // Forwarded to the mock upstream (which answers), never to another host (which would be a 502).
      expect(res.split("\r\n")[0]).not.toContain("502");
      expect(seen.length).toBe(before + 1);
    }
  });

  test("caps request bodies", async () => {
    const res = await fetch(`${base}/api/session/ses_1/prompt`, {
      method: "POST",
      headers: as("https://textjs.org", { "content-type": "application/json", "x-opencode-client": "1" }),
      body: "x".repeat(4 * 1024 * 1024 + 1),
    });
    expect(res.status).toBe(413);
  });

  test("/__bridge identifies the bridge", async () => {
    const res = await fetch(`${base}/__bridge`, { headers: as("http://localhost:5173") });
    expect(await res.json()).toMatchObject({ bridge: "textjs", connected: true });
  });

  test("streams SSE and cancels upstream when the browser disconnects", async () => {
    const ctrl = new AbortController();
    const res = await fetch(`${base}/api/event`, { headers: as("https://textjs.org", { accept: "text/event-stream" }), signal: ctrl.signal });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("access-control-allow-origin")).toBe("https://textjs.org");
    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    let text = "";
    while (!text.includes("session.text.delta")) {
      const { value, done } = await reader.read();
      if (done) break;
      text += new TextDecoder().decode(value);
    }
    expect(text).toContain("server.connected");
    expect(text).toContain('"delta":"hi"');
    ctrl.abort();
    await reader.cancel().catch(() => undefined);
    for (let i = 0; i < 50 && !sseClosed; i++) await Bun.sleep(20);
    expect(sseClosed).toBe(true);
  });
});
