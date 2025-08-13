import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { parseArgs } from "../src/cli/index";
import { corsHeaders, createBridgeHandler, isAllowedOrigin, normalizeTargetUrl, startProxy, type StartedBridge } from "../src/cli/proxy";

const AUTH = `Basic ${Buffer.from("opencode:secret").toString("base64")}`;

let upstream: ReturnType<typeof Bun.serve>;
let bridge: StartedBridge;
let base = "";
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
    discover: async () => ({ url: `http://127.0.0.1:${upstream.port}`, source: "service", authorization: AUTH }),
  });
  base = bridge.url;
});

afterAll(async () => {
  await bridge.close();
  upstream.stop(true);
});

describe("text proxy", () => {
  test("parses proxy flags", () => {
    expect(parseArgs(["proxy", "--port", "4100", "--target", "http://127.0.0.1:4096", "--allow-origin", "https://x.dev"])).toMatchObject({
      command: "proxy",
      port: 4100,
      target: "http://127.0.0.1:4096",
      allowOrigins: ["https://x.dev"],
    });
  });

  test("origin allowlist", () => {
    for (const o of ["https://textjs.org", "https://www.textjs.org", "https://textjs-avg.pages.dev", "https://abc123.textjs-avg.pages.dev", "http://localhost:5173", "http://127.0.0.1:3000"]) {
      expect(isAllowedOrigin(o)).toBe(true);
    }
    for (const o of ["https://evil.com", "http://textjs.org", "https://textjs.org.evil.com", "https://eviltextjs-avg.pages.dev", "null", "http://localhost.evil.com:80"]) {
      expect(isAllowedOrigin(o)).toBe(false);
    }
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
    expect(res.headers.get("access-control-max-age")).toBe("86400");
    expect(res.headers.get("vary")).toBe("Origin");
    expect(corsHeaders("https://textjs.org")["access-control-allow-private-network"]).toBe("true");
  });

  test("rejects foreign origins and hosts", async () => {
    const evil = await fetch(`${base}/api/session`, { headers: { origin: "https://evil.com" } });
    expect(evil.status).toBe(403);
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
    const handler = createBridgeHandler({ discover: async () => null });
    const rebind = await handler(new Request("http://attacker.example/api/session", { headers: { host: "attacker.example:4096" } }));
    expect(rebind.status).toBe(403);
  });

  test("forwards V2 /api/session with the daemon password injected, never exposing it", async () => {
    const res = await fetch(`${base}/api/session?parentID=null&limit=30`, { headers: { origin: "https://textjs.org", accept: "application/json" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://textjs.org");
    expect(res.headers.get("x-textjs-bridge")).toBe("1");
    const body = (await res.json()) as { data: Array<{ id: string }> };
    expect(body.data[0]?.id).toBe("ses_1");
    const last = seen.at(-1);
    expect(last?.path).toBe("/api/session?parentID=null&limit=30");
    expect(last?.auth).toBe(AUTH);
    expect(JSON.stringify([...res.headers])).not.toContain("secret");
  });

  test("writes require x-opencode-client", async () => {
    const denied = await fetch(`${base}/api/session/ses_1/prompt`, { method: "POST", headers: { origin: "https://textjs.org", "content-type": "application/json" }, body: "{}" });
    expect(denied.status).toBe(403);
    const ok = await fetch(`${base}/api/session/ses_1/prompt`, {
      method: "POST",
      headers: { origin: "https://textjs.org", "content-type": "application/json", "x-opencode-client": "1" },
      body: JSON.stringify({ text: "hello" }),
    });
    expect(ok.status).toBe(200);
    expect(seen.at(-1)?.body).toBe(JSON.stringify({ text: "hello" }));
  });

  test("/__bridge identifies the bridge", async () => {
    const res = await fetch(`${base}/__bridge`, { headers: { origin: "http://localhost:5173" } });
    expect(await res.json()).toMatchObject({ bridge: "textjs", connected: true });
  });

  test("streams SSE and cancels upstream when the browser disconnects", async () => {
    const ctrl = new AbortController();
    const res = await fetch(`${base}/api/event`, { headers: { origin: "https://textjs.org", accept: "text/event-stream" }, signal: ctrl.signal });
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
