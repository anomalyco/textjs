/** @jsxImportSource @textjs/app/server */
// Like `text dev` / `text build`, route modules compile against the server JSX runtime (async components work).
import { afterEach, describe, expect, jest, test } from "bun:test";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { EventEmitter } from "node:events";
import { act, Suspense, useState, type ReactNode } from "react";
import { ATTR_BOLD, ATTR_UNDERLINE, CellBuffer, initYoga } from "@textjs/core";
import { drawPixels } from "@textjs/core/experimental";
import { Box, Image, Text, useInput } from "@textjs/react";
import { useRouter } from "../src/navigation";
import { AppRouter, createMemoryHistory, type RouteManifest } from "../src/router";
import { FramePlayerCore, safeHref } from "../src/live-player";
import { LiveFrameDecoder, LiveFrameEncoder, LIVE_PATH, LIVE_SESSION_HEADER, parseLiveInput, type LiveFrame, type LiveServerMessage } from "../src/live-protocol";
import { LiveServer, LiveSession, isSameOriginRequest } from "../src/server/live";
import { createLiveApp, isServerPage, prerenderAnsi, prerenderShell, routeRuntime, type LiveApp } from "../src/server/live-app";
import { injectShell, shellPath, shellScript } from "../src/server/ppr";
import { serverComponent, stableKey, ServerComponentCache } from "../src/server/server-components";
import { createTestRoot, FakeConsole, withoutActEnvironment } from "./helpers";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until(fn: () => boolean, timeout = 3000): Promise<void> {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > timeout) throw new Error("timed out");
    await sleep(5);
  }
}

// ---------------------------------------------------------------------------
// Fixture app
// ---------------------------------------------------------------------------

function Counter(): ReactNode {
  const [n, setN] = useState(0);
  const router = useRouter();
  useInput((e) => {
    if (e.input === "+") setN((v) => v + 1);
    if (e.input === "c") router.push("/client");
    if (e.input === "o") router.push("/other");
  });
  return (
    <Box flexDirection="column" padding={1} borderStyle="rounded" title="counter">
      <Text bold color="cyan">{`count ${n}`}</Text>
      <Text underline>{"wide: 漢字 · emoji: 👩‍💻 · 100% https://textjs.org"}</Text>
    </Box>
  );
}

let probes = 0;
async function SlowData({ label }: { label: string }): Promise<ReactNode> {
  probes++;
  await sleep(40);
  return <Text>{`data:${label}`}</Text>;
}

function AsyncPage(): ReactNode {
  return (
    <Box flexDirection="column">
      <Text>static shell</Text>
      <Suspense fallback={<Text>loading…</Text>}>
        <SlowData label="ready" />
      </Suspense>
    </Box>
  );
}

const Layout = ({ children }: { children?: ReactNode }): ReactNode => (
  <Box flexDirection="column">
    <Text>▼ layout</Text>
    {children}
  </Box>
);

function routes(): RouteManifest {
  return {
    segment: "",
    layout: { default: Layout },
    page: { default: Counter, runtime: "server", metadata: { title: "Home" } },
    children: [
      { segment: "async", page: { default: AsyncPage, runtime: "server" } },
      { segment: "other", page: { default: () => <Text>other server page</Text>, runtime: "server", metadata: { title: "Other" } } },
      { segment: "client", page: { default: () => <Text>client page</Text> } },
    ],
  };
}

// ---------------------------------------------------------------------------

describe("live protocol", () => {
  test("cell codec round-trips every cell exactly (wide, pooled graphemes, controls, translucency)", () => {
    const a = new CellBuffer(24, 4);
    a.clear(0x0a0a0aff, 0xededed00);
    a.drawText(0, 0, "hello 漢字 👩‍💻 x", 0xff0000ff, 0x00000000, ATTR_BOLD);
    a.drawText(2, 1, "100% https://a.b", 0x00ff00ff, 0x11223380, ATTR_UNDERLINE);
    a.fillRect(0, 2, 24, 1, 0x334455ff, 0x01, 0xffffffff);
    a.drawText(0, 3, "\ud83d", 0xffffffff, 0); // lone surrogate stays a single cell
    const enc = new LiveFrameEncoder();
    const frame = enc.encode(a) as LiveFrame;
    expect(frame.k).toBe(1);
    const wire = JSON.parse(JSON.stringify(frame)) as LiveFrame;
    const b = new CellBuffer(1, 1);
    expect(new LiveFrameDecoder().apply(b, wire)).toBe(true);
    expect([...b.chars].map((c, i) => (c >= 0x80000000 ? b.graphemePool[c & 0x7fffffff] : c) === (a.chars[i]! >= 0x80000000 ? a.graphemePool[a.chars[i]! & 0x7fffffff] : a.chars[i]))).not.toContain(false);
    expect([...b.fg]).toEqual([...a.fg]);
    expect([...b.bg]).toEqual([...a.bg]);
    expect([...b.attrs]).toEqual([...a.attrs]);
    expect(b.toPlainString()).toBe(a.toPlainString());
    // Unchanged → nothing; one row changed → one row.
    expect(enc.encode(a)).toBeNull();
    a.drawText(0, 1, "Z", 0xffffffff, 0x000000ff);
    const delta = enc.encode(a) as LiveFrame;
    expect(delta.k).toBeUndefined();
    expect(delta.r.map((r) => r[0])).toEqual([1]);
  });

  test("encodeRow materializes pixel sprites via readCells()", () => {
    const a = new CellBuffer(8, 2);
    a.clear(0x09090bff);
    drawPixels(a, {
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      source: { width: 2, height: 2, data: new Uint32Array([0xff0000ff, 0x00ff00ff, 0x0000ffff, 0xffffffff]) },
      fit: "fill",
    });
    const enc = new LiveFrameEncoder();
    const frame = enc.encode(a) as LiveFrame;
    const b = new CellBuffer(1, 1);
    expect(new LiveFrameDecoder().apply(b, frame)).toBe(true);
    expect(b.getCell(0, 0)).toMatchObject({ char: "▀", fg: 0xff0000ff, bg: 0x0000ffff });
    expect(b.getCell(1, 0)).toMatchObject({ char: "▀", fg: 0x00ff00ff, bg: 0xffffffff });
  });

  test("rejects malformed input events", () => {
    expect(parseLiveInput({ type: "key", key: "a", input: "a" })).toMatchObject({ type: "key", key: "a", ctrl: false });
    expect(parseLiveInput({ type: "key", key: "" })).toBeNull();
    expect(parseLiveInput({ type: "key", key: "x".repeat(65) })).toBeNull();
    expect(parseLiveInput({ type: "resize", cols: 1e9, rows: -4 })).toEqual({ type: "resize", cols: 400, rows: 1 });
    expect(parseLiveInput({ type: "nav", href: "//evil.example/x" })).toBeNull();
    expect(parseLiveInput({ type: "nav", href: "https://evil.example" })).toBeNull();
    expect(parseLiveInput({ type: "eval", code: "1" })).toBeNull();
    expect(parseLiveInput(null)).toBeNull();
  });
});

describe("server components", () => {
  test("stable keys ignore rebuilt objects and elements but not values", () => {
    const cache = new ServerComponentCache();
    expect(stableKey({ params: { id: "1" }, children: <Text>a</Text> }, cache, 0)).toBe(stableKey({ children: <Text>a</Text>, params: { id: "1" } }, cache, 0));
    expect(stableKey({ id: "1" }, cache, 0)).not.toBe(stableKey({ id: 1 }, cache, 0));
    // Fresh callbacks every render must not change the key (that would retry forever).
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      expect(stableKey({ f: (): void => undefined }, cache, 0)).toBe(stableKey({ f: (): void => undefined }, cache, 0));
    } finally {
      console.warn = warn;
    }
  });

  test("keys by value at any depth (deep JSX, Map, Set, URL, class instances); cycles terminate; the cache is bounded", () => {
    const cache = new ServerComponentCache({ maxEntries: 3 });
    const deep = (label: string) => (
      <Box>
        <Box>
          <Box>
            <Box>
              <Box>
                <Text>{label}</Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    );
    expect(stableKey({ c: deep("a") }, cache, 0)).toBe(stableKey({ c: deep("a") }, cache, 0));
    expect(stableKey({ c: deep("a") }, cache, 0)).not.toBe(stableKey({ c: deep("b") }, cache, 0));
    expect(stableKey({ m: new Map([["k", 1]]), s: new Set([1, 2]), u: new URL("https://a.dev/x"), r: /x/g }, cache, 0)).toBe(
      stableKey({ m: new Map([["k", 1]]), s: new Set([2, 1]), u: new URL("https://a.dev/x"), r: /x/g }, cache, 0),
    );
    expect(stableKey({ u: new URL("https://a.dev/x") }, cache, 0)).not.toBe(stableKey({ u: new URL("https://a.dev/y") }, cache, 0));
    class Point {
      constructor(
        readonly x: number,
        readonly y: number,
      ) {}
    }
    expect(stableKey({ p: new Point(1, 2) }, cache, 0)).toBe(stableKey({ p: new Point(1, 2) }, cache, 0));
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(stableKey(cyclic, cache, 0)).toContain("cycle");
    const fn = async ({ n }: { n: number }): Promise<ReactNode> => <Text>{String(n)}</Text>;
    for (let n = 0; n < 10; n++) void cache.read(fn, { n }, "g");
    expect(cache.size).toBe(3);
  });

  test("async components suspend once and resolve (no retry loop)", async () => {
    await withoutActEnvironment(async () => {
      probes = 0;
      const t = await createTestRoot();
      const Slow = serverComponent(SlowData);
      t.root.render(
        <Suspense fallback={<Text>wait</Text>}>
          <Slow label="x" />
        </Suspense>,
      );
      expect(t.frame()).toContain("wait");
      await until(() => t.frame().includes("data:x"));
      expect(probes).toBe(1);
      t.root.unmount();
    });
  });
});

describe("live app", () => {
  let app: LiveApp | null = null;
  afterEach(async () => {
    await withoutActEnvironment(() => app?.dispose());
    app = null;
  });

  test("server frames are byte-identical to client-rendered frames", async () => {
    await initYoga();
    // Client: the regular renderer + driver.
    const client = await createTestRoot({ width: 60, height: 14 });
    await client.render(<AppRouter routes={routes()} history={createMemoryHistory("/")} errorStore={null} documentTitle={false} />);
    // Server: live app → encoder → (JSON) → frame player → driver, outside act() like production.
    let frames = 0;
    const enc = new LiveFrameEncoder();
    const con = new FakeConsole();
    const player = new FramePlayerCore({ console: con, schedule: null });
    const pump = (): void => {
      const f = enc.encode((app as LiveApp).buffer);
      if (f) player.applyFrame(JSON.parse(JSON.stringify(f)) as LiveFrame);
      player.paint();
    };
    await withoutActEnvironment(async () => {
      app = await createLiveApp({ routes: routes(), path: "/", cols: 60, rows: 14, onFrame: () => frames++ });
      app.flush();
      pump();
    });
    expect(con.logs[0]).toEqual(client.console.logs[0] as unknown[]);
    expect(con.clears).toBe(client.console.clears);
    expect(frames).toBeGreaterThan(0);

    // Input round-trip: the same key on both sides yields the same next frame.
    await client.press("+");
    client.frame();
    await withoutActEnvironment(() => {
      const live = app as LiveApp;
      live.input({ type: "key", key: "+", input: "+", code: "", repeat: false, ctrl: false, meta: false, shift: false, alt: false });
      live.flush();
      pump();
    });
    expect(client.root.renderer.buffer.toPlainString()).toContain("count 1");
    expect(con.logs.at(-1)).toEqual(client.console.logs.at(-1) as unknown[]);

    // Resize keyframes.
    await withoutActEnvironment(() => {
      const live = app as LiveApp;
      live.input({ type: "resize", cols: 40, rows: 10 });
      live.flush();
      pump();
    });
    expect(player.buffer.width).toBe(40);
    expect(player.buffer.toPlainString()).toContain("count 1");
    await client.unmount();
  });

  test("the focus hint travels to the player, which draws it in the console only", async () => {
    await withoutActEnvironment(async () => {
      const banners: unknown[] = [];
      app = await createLiveApp({ routes: routes(), path: "/", cols: 60, rows: 14, focused: false, onBanner: (b) => banners.push(b) });
      app.flush();
      expect(banners.at(-1)).toMatchObject({ text: "Click the page to use the keyboard" });
      expect(app.buffer.toPlainString()).not.toContain("Click the page");
      const enc = new LiveFrameEncoder();
      const con = new FakeConsole();
      const player = new FramePlayerCore({ console: con, schedule: null });
      player.applyFrame(JSON.parse(JSON.stringify(enc.encode(app.buffer))) as LiveFrame);
      player.setBanner(JSON.parse(JSON.stringify(banners.at(-1))));
      player.paint();
      expect(String(con.logs.at(-1)?.[0])).toContain("Click the page to use the keyboard");
      expect(player.buffer.toPlainString()).not.toContain("Click the page");
      app.input({ type: "focus", focused: true });
      app.flush();
      expect(banners.at(-1)).toBeNull();
      player.setBanner({ text: 1 });
      player.paint();
      expect(String(con.logs.at(-1)?.[0])).not.toContain("Click the page");
    });
  });

  test("the player blinks the hint, then holds it, and stops when it goes away", async () => {
    const g = globalThis as { matchMedia?: (query: string) => { matches: boolean } };
    jest.useFakeTimers();
    try {
      await withoutActEnvironment(async () => {
        const banners: unknown[] = [];
        app = await createLiveApp({ routes: routes(), path: "/", cols: 60, rows: 14, focused: false, onBanner: (b) => banners.push(b) });
        app.flush();
        const buffer = JSON.parse(JSON.stringify(new LiveFrameEncoder().encode(app.buffer))) as LiveFrame;
        const hint = JSON.parse(JSON.stringify(banners.at(-1))) as unknown;
        app.dispose();
        app = null;
        jest.clearAllTimers();
        g.matchMedia = () => ({ matches: false });
        const con = new FakeConsole();
        const player = new FramePlayerCore({ console: con, schedule: (cb) => cb(), frameInterval: 0 });
        player.applyFrame(buffer);
        player.setBanner(hint);
        expect(jest.getTimerCount()).toBe(1);
        const frames = player.frames;
        jest.advanceTimersByTime(8 * 700);
        expect(player.frames - frames).toBe(8);
        expect(String(con.logs.at(-1)?.slice(1).join("|"))).toContain("background-color:#ffc53d");
        expect(jest.getTimerCount()).toBe(0);
        player.setBanner(null);
        player.setBanner(hint);
        jest.advanceTimersByTime(700);
        expect(String(con.logs.at(-1)?.slice(1).join("|"))).toContain("background-color:#000000");
        player.setBanner(null);
        expect(jest.getTimerCount()).toBe(0);
      });
    } finally {
      jest.useRealTimers();
      delete g.matchMedia;
    }
  });

  test("a passive server route never sends the hint; an interactive one sends it while blurred and clears it", async () => {
    await withoutActEnvironment(async () => {
      const banners: unknown[] = [];
      app = await createLiveApp({ routes: routes(), path: "/other", cols: 60, rows: 14, focused: false, onBanner: (b) => banners.push(b) });
      app.flush();
      app.input({ type: "focus", focused: true });
      app.input({ type: "focus", focused: false });
      app.flush();
      expect(app.buffer.toPlainString()).toContain("other server page");
      expect(banners).toEqual([]);
      // Client-side navigation to the interactive counter: it wants keys, so the blurred page gets the hint.
      app.input({ type: "nav", href: "/" });
      await until(() => banners.length > 0);
      expect(banners.at(-1)).toMatchObject({ text: "Click the page to use the keyboard" });
      // Back to the passive page: the handler goes away, and so does the hint.
      app.input({ type: "nav", href: "/other" });
      await until(() => banners.at(-1) === null);
      expect(banners.at(-1)).toBeNull();
    });
  });

  test("focusHint: false keeps server routes free of the hint", async () => {
    await withoutActEnvironment(async () => {
      const banners: unknown[] = [];
      app = await createLiveApp({ routes: routes(), path: "/", cols: 60, rows: 14, focused: false, focusHint: false, onBanner: (b) => banners.push(b) });
      app.flush();
      expect(banners).toEqual([]);
    });
  });

  test("async server components stream into their Suspense holes", async () => {
    await withoutActEnvironment(async () => {
      probes = 0;
      app = await createLiveApp({ routes: routes(), path: "/async", cols: 40, rows: 8 });
      app.flush();
      expect(app.buffer.toPlainString()).toContain("loading…");
      await until(() => {
        (app as LiveApp).flush();
        return (app as LiveApp).buffer.toPlainString().includes("data:ready");
      });
      expect(probes).toBe(1);
    });
  });

  test("navigation reports the target runtime; titles follow metadata", async () => {
    await withoutActEnvironment(async () => {
      const navs: Array<[string, string]> = [];
      const titles: string[] = [];
      app = await createLiveApp({
        routes: routes(),
        path: "/",
        cols: 40,
        rows: 8,
        onNavigate: (href, _a, runtime) => navs.push([href, runtime]),
        onTitle: (t) => titles.push(t),
      });
      app.flush();
      const key = (input: string): void => (app as LiveApp).input({ type: "key", key: input, input, code: "", repeat: false, ctrl: false, meta: false, shift: false, alt: false });
      key("o");
      app.flush();
      // Browser Back: applied without echoing a URL update.
      app.input({ type: "nav", href: "/" });
      app.flush();
      key("c");
      app.flush();
      await sleep(5);
      expect(navs).toEqual([
        ["/other", "server"],
        ["/client", "client"],
      ]);
      expect(titles).toContain("Home");
      expect(titles).toContain("Other");
      expect(routeRuntime(routes(), "/missing")).toBe("server");
      expect(isServerPage(routes(), "/missing")).toBe(false);
      expect(isServerPage(routes(), "/client")).toBe(false);
      expect(isServerPage(routes(), "/other")).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

interface Stream {
  messages: LiveServerMessage[];
  ids: string[];
  status: number;
  close(): void;
  done: Promise<void>;
}

async function openStream(base: string, query: string, headers: Record<string, string> = {}): Promise<Stream> {
  const ctrl = new AbortController();
  const res = await fetch(`${base}${LIVE_PATH}?${query}`, { headers, signal: ctrl.signal });
  const stream: Stream = { messages: [], ids: [], status: res.status, close: () => ctrl.abort(), done: Promise.resolve() };
  if (!res.body) return stream;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  stream.done = (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i);
          buf = buf.slice(i + 2);
          for (const line of block.split("\n")) {
            if (line.startsWith("data: ")) stream.messages.push(JSON.parse(line.slice(6)) as LiveServerMessage);
            if (line.startsWith("id: ")) stream.ids.push(line.slice(4));
          }
        }
      }
    } catch {
      // aborted
    }
  })();
  return stream;
}

describe("live server (SSE + POST)", () => {
  let http: Server | null = null;
  let live: LiveServer | null = null;
  let base = "";

  async function start(opts: { graceMs?: number; maxSessions?: number } = {}): Promise<void> {
    live = new LiveServer({
      reconnectGraceMs: opts.graceMs ?? 5000,
      maxSessions: opts.maxSessions,
      frameIntervalMs: 20,
      runtimeOf: (p) => (isServerPage(routes(), p) ? "server" : "client"),
      createApp: (init) => createLiveApp({ ...init, routes: routes() }),
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

  const frames = (s: Stream): LiveFrame[] => s.messages.filter((m): m is LiveFrame => m.t === "f");
  const decode = (s: Stream): CellBuffer => {
    const buf = new CellBuffer(0, 0);
    const d = new LiveFrameDecoder();
    for (const f of frames(s)) d.apply(buf, f);
    return buf;
  };
  const post = (sid: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> =>
    fetch(`${base}${LIVE_PATH}`, { method: "POST", headers: { "content-type": "application/json", [LIVE_SESSION_HEADER]: sid, ...headers }, body: JSON.stringify(body) });

  test("session lifecycle: hello, keyframe, input round-trip, title, cleanup", async () => {
    await withoutActEnvironment(async () => {
      await start({ graceMs: 60 });
      const s = await openStream(base, "path=/&cols=50&rows=12");
      expect(s.status).toBe(200);
      await until(() => frames(s).length > 0);
      const hello = s.messages[0] as Extract<LiveServerMessage, { t: "hello" }>;
      expect(hello.t).toBe("hello");
      expect(hello.sid).toMatch(/^[A-Za-z0-9_-]{32}$/);
      expect(s.ids).toEqual([hello.sid]);
      expect(frames(s)[0]?.k).toBe(1);
      expect(decode(s).toPlainString()).toContain("count 0");
      await until(() => s.messages.some((m) => m.t === "title" && m.title === "Home"));

      const r = await post(hello.sid, [{ type: "key", key: "+", input: "+" }, { type: "key", key: "+", input: "+" }, { type: "bogus" }]);
      expect(r.status).toBe(204);
      await until(() => decode(s).toPlainString().includes("count 2"));
      // Deltas carry only the changed rows.
      expect(frames(s).at(-1)?.k).toBeUndefined();
      expect((frames(s).at(-1)?.r.length ?? 0) <= 2).toBe(true);

      expect(live?.sessions.size).toBe(1);
      s.close();
      await until(() => live?.sessions.size === 0);
      expect((await post(hello.sid, [])).status).toBe(410);
    });
  });

  test("a stream that re-attaches after focus came back clears the player's banner", async () => {
    await withoutActEnvironment(async () => {
      await start();
      const a = await openStream(base, "path=/&cols=50&rows=12&focused=0");
      await until(() => a.messages.some((m) => m.t === "banner" && m.banner !== null) && frames(a).length > 0);
      const sid = (a.messages[0] as { sid: string }).sid;
      a.close();
      await until(() => live?.sessions.get(sid)?.connected === false);
      // Focus returns while the stream is down; the browser reports it on the next POST.
      expect((await post(sid, [{ type: "focus", focused: true }])).status).toBe(204);
      const b = await openStream(base, "path=/&cols=50&rows=12&focused=1", { "Last-Event-ID": sid });
      await until(() => frames(b).length > 0);
      expect(b.messages.some((m) => m.t === "banner" && m.banner !== null)).toBe(false);

      // The player as the browser runs it: `hello` starts a stream, then banners and frames apply in order.
      const con = new FakeConsole();
      const player = new FramePlayerCore({ console: con, schedule: null });
      const play = (msgs: LiveServerMessage[]): void => {
        for (const m of msgs) {
          if (m.t === "hello") player.startStream();
          else if (m.t === "banner") player.setBanner(m.banner);
          else if (m.t === "f") player.applyFrame(m);
        }
        player.paint();
      };
      play(a.messages);
      expect(String(con.logs.at(-1)?.[0])).toContain("Click the page to use the keyboard");
      play(b.messages);
      expect(String(con.logs.at(-1)?.[0])).not.toContain("Click the page to use the keyboard");
      // An unchanged banner doesn't repaint.
      const logged = con.logs.length;
      player.setBanner(null);
      player.paint();
      expect(con.logs.length).toBe(logged);
      b.close();
    });
  });

  test("reconnect resumes the same session (Last-Event-ID) with a fresh keyframe", async () => {
    await withoutActEnvironment(async () => {
      await start();
      const a = await openStream(base, "path=/&cols=50&rows=12");
      await until(() => frames(a).length > 0);
      const sid = (a.messages[0] as { sid: string }).sid;
      await post(sid, [{ type: "key", key: "+", input: "+" }]);
      await until(() => decode(a).toPlainString().includes("count 1"));
      a.close();
      await until(() => live?.sessions.get(sid)?.connected === false);
      const b = await openStream(base, "path=/ignored&cols=50&rows=12", { "Last-Event-ID": sid });
      await until(() => frames(b).length > 0);
      expect(b.messages[0]).toMatchObject({ t: "hello", sid, resumed: true });
      expect(frames(b)[0]?.k).toBe(1);
      expect(decode(b).toPlainString()).toContain("count 1");
      // A second stream for the same session replaces the first (newest wins).
      // The session id travels in a header (never the URL, which ends up in logs).
      const c = await openStream(base, "path=/", { [LIVE_SESSION_HEADER]: sid });
      // A sid in the query string is ignored: this opens /client (a document load), not the session.
      expect(await (await fetch(`${base}${LIVE_PATH}?sid=${sid}&path=/client`)).text()).toContain('"t":"load"');
      await until(() => frames(c).length > 0);
      await b.done;
      expect(live?.sessions.size).toBe(1);
      c.close();
    });
  });

  test("one session per tab; unknown ids and cross-site requests are rejected", async () => {
    await withoutActEnvironment(async () => {
      await start({ maxSessions: 2 });
      const t1 = await openStream(base, "path=/");
      const t2 = await openStream(base, "path=/other");
      await until(() => frames(t1).length > 0 && frames(t2).length > 0);
      expect((t1.messages[0] as { sid: string }).sid).not.toBe((t2.messages[0] as { sid: string }).sid);
      expect(decode(t2).toPlainString()).toContain("other server page");
      expect((await openStream(base, "path=/")).status).toBe(503);
      // Unguessable / unknown resume ids start nothing new when full, and never attach.
      const forged = await openStream(base, "path=/", { "Last-Event-ID": "A".repeat(32) });
      expect(forged.status).toBe(503);
      expect((await fetch(`${base}${LIVE_PATH}?path=/`, { headers: { "sec-fetch-site": "cross-site" } })).status).toBe(403);
      expect((await fetch(`${base}${LIVE_PATH}?path=/`, { headers: { origin: "https://evil.example" } })).status).toBe(403);
      const sid = (t1.messages[0] as { sid: string }).sid;
      expect((await post(sid, [], { origin: "https://evil.example" })).status).toBe(403);
      expect((await fetch(`${base}${LIVE_PATH}`, { method: "POST", headers: { [LIVE_SESSION_HEADER]: sid, "content-type": "text/plain" }, body: "[]" })).status).toBe(400);
      expect((await post(sid, { not: "an array" })).status).toBe(400);
      t1.close();
      t2.close();
    });
  });

  test("client routes are handed back to the browser", async () => {
    await withoutActEnvironment(async () => {
      await start();
      const s = await openStream(base, "path=/client");
      await s.done;
      expect(s.messages).toEqual([{ t: "load", href: "/client" }]);
      expect(live?.sessions.size).toBe(0);
    });
  });

  test("same-origin check", () => {
    const req = (headers: Record<string, string>) => ({ headers: { host: "a.test", ...headers } }) as never;
    expect(isSameOriginRequest(req({}))).toBe(true);
    expect(isSameOriginRequest(req({ "sec-fetch-site": "same-origin", origin: "http://a.test" }))).toBe(true);
    expect(isSameOriginRequest(req({ "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameOriginRequest(req({ origin: "null" }))).toBe(false);
  });
});

describe("backpressure", () => {
  test("a blocked socket coalesces frames and resumes with the latest state on drain", async () => {
    await withoutActEnvironment(async () => {
      const chunks: string[] = [];
      let writable = true;
      const res = Object.assign(new EventEmitter(), {
        writableEnded: false,
        write(chunk: string) {
          chunks.push(chunk);
          return writable;
        },
        end() {},
      }) as unknown as ServerResponse;
      const fakeServer = { reconnectGraceMs: 1000, dispose: () => undefined } as unknown as LiveServer;
      const session = new LiveSession(fakeServer, 10);
      session.app = await createLiveApp({ routes: routes(), path: "/", cols: 40, rows: 8, onFrame: () => session.markDirty() });
      session.attach(res, false);
      await until(() => session.framesSent === 1);
      writable = false;
      const key = { type: "key", key: "+", input: "+", code: "", repeat: false, ctrl: false, meta: false, shift: false, alt: false } as const;
      session.input([key]);
      await until(() => session.framesSent === 2);
      // Socket is now full: further changes are not written…
      for (let i = 0; i < 5; i++) {
        session.input([key]);
        await sleep(15);
      }
      expect(session.framesSent).toBe(2);
      // …until it drains; then one frame carries the latest state.
      writable = true;
      (res as unknown as EventEmitter).emit("drain");
      await until(() => session.framesSent === 3);
      await sleep(40);
      expect(session.framesSent).toBe(3);
      const buf = new CellBuffer(0, 0);
      const dec = new LiveFrameDecoder();
      for (const c of chunks) if (c.startsWith("data: ") && c.includes('"t":"f"')) dec.apply(buf, JSON.parse(c.slice(6)) as LiveFrame);
      expect(buf.toPlainString()).toContain("count 6");
      session.close();
    });
  });
});

describe("frame player pacing", () => {
  test("paces frames ≥ the interval, 110ms after a clear, and holds while hidden", async () => {
    let t = 0;
    const queue: Array<{ at: number; cb: () => void }> = [];
    const con = new FakeConsole();
    const player = new FramePlayerCore({ console: con, now: () => t, schedule: (cb, delay) => queue.push({ at: t + delay, cb }) });
    const enc = new LiveFrameEncoder();
    const buf = new CellBuffer(10, 2);
    const push = (s: string): void => {
      buf.drawText(0, 0, s, 0xffffffff, 0x000000ff);
      const f = enc.encode(buf);
      if (f) player.applyFrame(f);
    };
    const run = (): void => {
      const due = queue.splice(0);
      for (const q of due) {
        t = Math.max(t, q.at);
        q.cb();
      }
    };
    push("a");
    expect(queue[0]?.at).toBe(0);
    run();
    expect(con.clears).toBe(1);
    expect(con.logs.length).toBe(1);
    push("b");
    expect(queue[0]?.at).toBe(110);
    push("c");
    expect(queue.length).toBe(1);
    run();
    expect(con.logs.length).toBe(2);
    push("d");
    expect(queue[0]?.at).toBe(t + 66);
    run();
    player.setHidden(true);
    push("e");
    expect(queue.length).toBe(0);
    player.setHidden(false);
    expect(queue.length).toBe(1);
  });

  test("with a prerendered shell the first frame appends (no clear)", () => {
    const con = new FakeConsole();
    const player = new FramePlayerCore({ console: con, schedule: null, shell: true });
    const buf = new CellBuffer(4, 1);
    buf.drawText(0, 0, "hi", 0xffffffff, 0);
    player.applyFrame(new LiveFrameEncoder().encode(buf) as LiveFrame);
    player.paint();
    expect(con.clears).toBe(0);
    expect(con.logs.length).toBe(1);
  });
});

describe("partial prerendering", () => {
  test("the shell is the first frame with Suspense fallbacks, replayed by an inline script", async () => {
    const calls = await withoutActEnvironment(() => prerenderShell({ routes: routes(), path: "/async", cols: 30, rows: 6 }));
    expect(calls[0]).toEqual({ method: "clear", args: [] });
    expect(calls[1]?.method).toBe("log");
    expect(calls[1]?.args[0]?.startsWith("%c\u200b%c\n")).toBe(true);
    const plain = (calls[1]?.args[0] ?? "").replace(/%c/g, "");
    expect(plain).toContain("static shell");
    expect(plain).toContain("loading…");
    expect(plain).not.toContain("data:");

    const script = shellScript(calls, shellPath("", "/async"));
    expect(script).not.toContain("</script><");
    const html = injectShell(`<html><head><script type="module" src="/a.js"></script></head><body></body></html>`, script);
    expect(html.indexOf("data-textjs-shell")).toBeLessThan(html.indexOf('type="module"'));

    const replay = (pathname: string): { con: FakeConsole; win: { __TEXTJS_SHELL__?: number } } => {
      const con = new FakeConsole();
      const win: { __TEXTJS_SHELL__?: number } = {};
      const body = script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
      new Function("console", "location", "window", body)(con, { pathname }, win);
      return { con, win };
    };
    const hit = replay("/async/");
    expect(hit.con.clears).toBe(1);
    expect(hit.con.logs).toEqual([calls[1]?.args as unknown[]]);
    expect(hit.win.__TEXTJS_SHELL__).toBe(1);
    // An SPA-fallback copy of the document never paints another route's shell.
    const miss = replay("/elsewhere");
    expect(miss.con.logs.length).toBe(0);
    expect(miss.win.__TEXTJS_SHELL__).toBeUndefined();

    // Firefox and Safari replay the same format string with their inline-console CSS.
    expect(calls[1]?.inlineArgs?.[0]).toBe("line-height:100vh;");
    expect(calls[1]?.inlineArgs?.length).toBe((calls[1]?.args.length ?? 0) - 1);
    const replayIn = (supports: string[], win: object = {}): FakeConsole => {
      const con = new FakeConsole();
      const body = script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
      const css = { supports: (property: string) => supports.includes(property) };
      new Function("console", "location", "window", "CSS", "navigator", body)(con, { pathname: "/async" }, win, css, {});
      return con;
    };
    // Firefox is checked before `window.chrome` (an extension shim), and Chromium never gets the inline CSS.
    expect(replayIn(["-moz-appearance"], { chrome: {} }).logs).toEqual([[calls[1]?.args[0], ...(calls[1]?.inlineArgs ?? [])]]);
    expect(replayIn(["-webkit-hyphens"], { chrome: {} }).logs).toEqual([calls[1]?.args as unknown[]]);
    expect(replayIn(["-moz-appearance"]).logs).toEqual([[calls[1]?.args[0], ...(calls[1]?.inlineArgs ?? [])]]);
    expect(replayIn(["-webkit-hyphens"]).logs).toEqual([[calls[1]?.args[0], ...(calls[1]?.inlineArgs ?? [])]]);
    expect(replayIn([]).logs).toEqual([calls[1]?.args as unknown[]]);
  });

  test("rendered roots are released: no promise collects listeners across renders", async () => {
    // React attaches ping and retry listeners, which hold the root and its cell buffer, to the promise a
    // suspended component throws. A promise shared by every render (and never settled) would keep every root alive.
    async function Slow(): Promise<ReactNode> {
      return <Text>data</Text>;
    }
    const manifest: RouteManifest = {
      segment: "",
      page: {
        default: () => (
          <Suspense fallback={<Text>wait</Text>}>
            <Slow />
          </Suspense>
        ),
      },
    };
    const listeners = new Map<Promise<unknown>, number>();
    const then = Promise.prototype.then;
    Promise.prototype.then = function (this: Promise<unknown>, ...args: Parameters<typeof then>) {
      listeners.set(this, (listeners.get(this) ?? 0) + 1);
      return then.apply(this, args) as never;
    } as typeof then;
    try {
      for (let i = 0; i < 20; i++) {
        const frame = await withoutActEnvironment(() => prerenderAnsi({ routes: manifest, path: "/", cols: 20, rows: 3 }));
        expect(frame?.ansi).toContain("wait");
      }
    } finally {
      Promise.prototype.then = then;
    }
    expect(Math.max(...listeners.values())).toBeLessThan(10);
  });

  test("the client's first frame after a shell appends below it and matches the shell", async () => {
    const calls = await withoutActEnvironment(() => prerenderShell({ routes: routes(), path: "/other", cols: 30, rows: 6 }));
    const client = await createTestRoot({ width: 30, height: 6, initialClear: false });
    await client.render(<AppRouter routes={routes()} history={createMemoryHistory("/other")} errorStore={null} documentTitle={false} />);
    expect(client.console.clears).toBe(0);
    // Same frame, minus the curtain the test console doesn't use.
    expect(`%c\u200b%c\n${client.console.logs[0]?.[0]}`).toBe(calls[1]?.args[0] as string);
    await act(async () => client.root.unmount());
  });
});

describe("live shell with pixel sprites", () => {
  test("bakes <Image> into the shell as the half-blocks the live stream sends, with no data URL", async () => {
    const pixels = { width: 8, height: 8, data: new Uint8ClampedArray(8 * 8 * 4).map((_, i) => (i % 4 === 3 ? 255 : (i * 37) % 256)) };
    const imageRoutes: RouteManifest = {
      segment: "",
      layout: { default: Layout },
      page: { default: () => <Image pixels={pixels} width={8} />, runtime: "server" },
    };
    const calls = await withoutActEnvironment(() => prerenderShell({ routes: imageRoutes, path: "/", cols: 20, rows: 6 }));
    const log = calls.find((c) => c.method === "log" && c.args[0]?.includes("▀"));
    expect(log).toBeDefined();
    expect(calls.every((c) => c.args.every((a) => !a.includes("url(")) && (c.inlineArgs ?? []).every((a) => !a.includes("url(")))).toBe(true);
  });
});

describe("live hardening", () => {
  test("nav hrefs can't leave the origin; pastes normalize CRLF; malformed escapes don't throw", () => {
    for (const href of ["/\\evil.example/x", "/\u0000x", "/a\\b", "/x\ny"]) expect(parseLiveInput({ type: "nav", href })).toBeNull();
    expect(parseLiveInput({ type: "nav", href: "/ops?x=1", delta: -1 })).toEqual({ type: "nav", href: "/ops?x=1", delta: -1 });
    expect(parseLiveInput({ type: "paste", text: "a\r\nb\rc" })).toEqual({ type: "paste", text: "a\nb\nc" });
    expect(safeHref("/ok")).toBe("/ok");
    for (const bad of ["//evil.example", "/\\evil.example", "javascript:alert(1)", "https://evil.example/", 42]) expect(safeHref(bad)).toBeNull();
    expect(safeHref("/other", "/console")).toBeNull();
    expect(safeHref("/console/x", "/console")).toBe("/console/x");
    const buf = new CellBuffer(4, 1);
    expect(new LiveFrameDecoder().apply(buf, { t: "f", w: 4, h: 1, k: 1, s: [[0, 0, 0]], r: [[0, [0, "\u0002ff"]]] })).toBe(false);
  });

  test("X-Forwarded-Host only counts behind a trusted proxy; origins must be http(s)", () => {
    const req = (headers: Record<string, string>) => ({ headers: { host: "internal:3000", ...headers } }) as never;
    expect(isSameOriginRequest(req({ origin: "https://app.dev", "x-forwarded-host": "app.dev" }))).toBe(false);
    expect(isSameOriginRequest(req({ origin: "https://app.dev", "x-forwarded-host": "app.dev", "x-forwarded-proto": "https" }), true)).toBe(true);
    expect(isSameOriginRequest(req({ origin: "http://app.dev", "x-forwarded-host": "app.dev", "x-forwarded-proto": "https" }), true)).toBe(false);
    expect(isSameOriginRequest(req({ origin: "ftp://internal:3000" }))).toBe(false);
  });

  test("history stays aligned: server back sends go(delta); client Back with delta moves through entries", async () => {
    await withoutActEnvironment(async () => {
      const navs: Array<[string, string, number | undefined]> = [];
      const app = await createLiveApp({ routes: routes(), path: "/", cols: 40, rows: 8, onNavigate: (href, action, _r, delta) => navs.push([href, action, delta]) });
      try {
        app.history.push("/other");
        app.history.back();
        expect(navs).toEqual([
          ["/other", "push", undefined],
          ["/", "pop", -1],
        ]);
        // Browser Forward onto the existing entry: no new entry, no echo.
        app.input({ type: "nav", href: "/other", delta: 1 });
        expect(app.history.index).toBe(1);
        expect(app.history.entries.length).toBe(2);
        expect(navs.length).toBe(2);
      } finally {
        app.dispose();
      }
    });
  });

  test("authorize gates server-side transitions; denials become document loads", async () => {
    await withoutActEnvironment(async () => {
      const navs: Array<[string, string]> = [];
      const app = await createLiveApp({
        routes: routes(),
        path: "/",
        cols: 40,
        rows: 8,
        authorize: async (href) => !href.startsWith("/other"),
        onNavigate: (href, _a, runtime) => navs.push([href, runtime]),
      });
      try {
        app.history.push("/other");
        await until(() => navs.length === 1);
        app.input({ type: "nav", href: "/other" });
        await until(() => navs.length === 2);
        expect(app.history.location.pathname).toBe("/");
        expect(navs).toEqual([
          ["/other", "client"],
          ["/other", "client"],
        ]);
        app.history.push("/async");
        await until(() => app.history.location.pathname === "/async");
      } finally {
        app.dispose();
      }
    });
  });

  test("the server evicts disconnected sessions before refusing, caps per client, rate-limits input", async () => {
    await withoutActEnvironment(async () => {
      const live = new LiveServer({ maxSessions: 1, reconnectGraceMs: 60_000, frameIntervalMs: 20, runtimeOf: () => "server", createApp: (init) => createLiveApp({ ...init, routes: routes() }) });
      const http = createServer((req, res) => void live.handle(req, res, req.url ?? "/"));
      await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
      const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
      try {
        const a = await openStream(base, "path=/");
        await until(() => a.messages.some((m) => m.t === "f"));
        const sidA = (a.messages[0] as { sid: string }).sid;
        a.close();
        await until(() => [...live.sessions.values()].every((s) => !s.connected));
        const b = await openStream(base, "path=/other");
        expect(b.status).toBe(200);
        await until(() => b.messages.some((m) => m.t === "f"));
        expect(live.sessions.has(sidA)).toBe(false);
        const sidB = (b.messages[0] as { sid: string }).sid;
        const post = (events: unknown[]) => fetch(`${base}${LIVE_PATH}`, { method: "POST", headers: { "content-type": "application/json", [LIVE_SESSION_HEADER]: sidB }, body: JSON.stringify(events) });
        expect((await post(Array.from({ length: 65 }, () => ({ type: "focus", focused: true })))).status).toBe(413);
        let limited = false;
        for (let i = 0; i < 12 && !limited; i++) limited = (await post(Array.from({ length: 64 }, () => ({ type: "focus", focused: true })))).status === 429;
        expect(limited).toBe(true);
        b.close();
      } finally {
        live.close();
        await new Promise<void>((r) => http.close(() => r()));
      }
    });
  });
});

describe("prerendering errors", () => {
  test("a route that throws (or redirects) while prerendering gets no shell", async () => {
    const boom: RouteManifest = {
      segment: "",
      page: {
        default: () => {
          throw new Error("db down");
        },
      },
    };
    // Like the build, prerender outside act().
    await expect(withoutActEnvironment(() => prerenderShell({ routes: boom, path: "/", cols: 20, rows: 4 }))).rejects.toThrow(/db down/);
    const ok = await withoutActEnvironment(() => prerenderShell({ routes: routes(), path: "/other", cols: 30, rows: 4 }));
    expect(ok.some((c) => c.args.join("").includes("other server page"))).toBe(true);
    expect(shellScript(ok, "/other")).toContain("__TEXTJS_SHELL_AT__=");
  });
});
