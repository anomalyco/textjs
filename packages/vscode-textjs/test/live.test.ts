/**
 * End-to-end (no VS Code): a real `text dev` server, a fake browser tab on the
 * HMR socket, the extension's monitor/SSE client and input forwarding; plus
 * the headless runner rendering a fixture app in a child process.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ViteDevServer } from "vite";
import { CellBuffer, extractStyledFrame, type StyledFrame } from "@textjs/core";
import { FrameEncoder, frameToText } from "@textjs/app/frame-protocol";
import { startDevServer } from "../../app/src/cli/dev";
import { DevServerMonitor } from "../src/dev-monitor";
import { appUrl, connectFrameStream, discover, DiscoveryBackoff, loopbackOrigin, postInput, probe } from "../src/dev-server";
import { HeadlessSession } from "../src/headless";

const REPO = resolve(import.meta.dir, "../../..");
let dir = "";
let runnerPath = "";
let server: ViteDevServer;
let base = "";

async function until<T>(fn: () => T | undefined | null | false | Promise<T | undefined | null | false>, timeout = 8000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 25));
  }
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "textjs-vscode-live-"));
  mkdirSync(join(dir, "app/counter"), { recursive: true });
  mkdirSync(join(dir, "app/api/hello"), { recursive: true });
  mkdirSync(join(dir, "components"), { recursive: true });
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/app"), join(dir, "node_modules/@textjs/app"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "live-fixture", type: "module", private: true, dependencies: { "@textjs/app": "*" } }));
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { jsx: "react-jsx" } }));
  writeFileSync(join(dir, "app/layout.tsx"), 'import { Box, Text } from "@textjs/app";\nexport default function Layout({ children }: { children?: any }) { return <Box className="flex-col"><Text>▼ Fixture</Text>{children}</Box>; }\n');
  writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/app";\nexport default function Page() { return <Text>home v1</Text>; }\n');
  writeFileSync(
    join(dir, "app/counter/page.tsx"),
    'import { useEffect, useState } from "react";\nimport { Text, useInput } from "@textjs/app";\nexport default function Counter() {\n  const [n, setN] = useState(0);\n  const [api, setApi] = useState("…");\n  useEffect(() => { fetch("/api/hello").then((r) => r.json()).then((j) => setApi(j.msg)); }, []);\n  useInput((e) => { if (e.key === "up") setN((c) => c + 1); });\n  return <Text>{`count=${n} api=${api}`}</Text>;\n}\n',
  );
  writeFileSync(join(dir, "app/api/hello/route.ts"), 'export function GET() { return Response.json({ msg: "hi" }); }\n');
  writeFileSync(join(dir, "components/Badge.tsx"), 'import { Text } from "@textjs/app";\nexport function StatusBadge() { return <Text bold>● ready</Text>; }\n');
  writeFileSync(join(dir, "components/Broken.tsx"), 'export default function Broken() { throw new Error("TX015: boom"); }\n');

  const out = join(dir, ".runner");
  const built = await Bun.build({ entrypoints: [resolve(import.meta.dir, "../src/runner/runner.ts")], outdir: out, target: "node", format: "esm", naming: "runner.mjs" });
  if (!built.success) throw new Error(built.logs.map(String).join("\n"));
  runnerPath = join(out, "runner.mjs");

  server = await startDevServer({ root: dir, port: 38000 + Math.floor(Math.random() * 1500), log: false });
  base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
}, 30_000);

afterAll(async () => {
  await server?.close();
  rmSync(dir, { recursive: true, force: true });
});

function fakeTab(): Promise<{ ws: WebSocket; inputs: unknown[]; mirror: boolean[] }> {
  const ws = new WebSocket(`${base.replace("http", "ws")}/?token=${server.config.webSocketToken}`, "vite-hmr");
  const tab = { ws, inputs: [] as unknown[], mirror: [] as boolean[] };
  ws.onmessage = (e) => {
    const p = JSON.parse(String(e.data)) as { type: string; event?: string; data?: { active?: boolean } };
    if (p.type !== "custom") return;
    if (p.event === "textjs:input") tab.inputs.push(p.data);
    if (p.event === "textjs:mirror") tab.mirror.push(Boolean(p.data?.active));
  };
  return new Promise((r) => {
    ws.onopen = () => r(tab);
  });
}

describe("dev server client", () => {
  test("probe and discover match the project root", async () => {
    const status = await probe(base);
    expect(status?.name).toBe("textjs");
    expect((await discover([dir], { ports: [Number(new URL(base).port)] }))?.url).toBe(base);
    expect(await discover(["/somewhere/else"], { ports: [Number(new URL(base).port)] })).toBeNull();
    expect(await probe("http://localhost:1")).toBeNull();
  });

  test("only http loopback dev server URLs are used; bad URLs never throw", async () => {
    expect(loopbackOrigin("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(loopbackOrigin("http://127.0.0.1:3000/some/path")).toBe("http://127.0.0.1:3000");
    expect(loopbackOrigin("http://[::1]:3000")).toBe("http://[::1]:3000");
    expect(loopbackOrigin("http://app.localhost:3000")).toBe("http://app.localhost:3000");
    for (const bad of ["https://localhost:3000", "http://evil.example:3000", "http://10.0.0.2:3000", "http://0.0.0.0:3000", "http://localhost.evil.example", "http://user:pw@localhost:3000", "file:///etc/passwd", "javascript:alert(1)", "not a url", ""]) {
      expect(loopbackOrigin(bad)).toBeNull();
    }
    // A workspace-configured remote URL is never probed, streamed or sent input.
    const port = Number(new URL(base).port);
    expect(await discover([dir], { url: `http://evil.example:${port}` })).toBeNull();
    expect((await discover([dir], { url: `${base}/` }))?.url).toBe(base);
    const key = { type: "key", key: "Enter", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false } as const;
    expect(await postInput("http://evil.example", key)).toBe(false);
    expect(await postInput("http://local host:3000", key)).toBe(false);
    expect(await postInput("::not a url::", key)).toBe(false);
    for (const url of ["http://evil.example", "::not a url::", "http://local host:3000"]) {
      let closed = 0;
      const conn = connectFrameStream(url, { onFrame: () => undefined, onStatus: () => undefined, onSourceGone: () => undefined, onClose: () => closed++ });
      await until(() => closed === 1);
      conn.close();
    }
  });

  test("discovery tries localhost first and backs off ports that aren't this project's dev server", async () => {
    const { createServer } = await import("node:http");
    const hits: string[] = [];
    const other = createServer((req, res) => {
      hits.push(`other ${req.headers.host}`);
      res.statusCode = 404;
      res.end("not text.js");
    });
    await new Promise<void>((r) => other.listen(0, "127.0.0.1", () => r()));
    const otherPort = (other.address() as { port: number }).port;
    const ours = createServer((req, res) => {
      hits.push(`ours ${req.headers.host}`);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ name: "textjs", version: "1", root: dir, clients: 0, sources: 0, watchers: 0, grid: null, path: null }));
    });
    // Listening on both stacks: "localhost" answers whichever way it resolves.
    await new Promise<void>((r) => ours.listen(0, "localhost", () => r()));
    const ourPort = (ours.address() as { port: number }).port;
    let now = 1_000;
    const backoff = new DiscoveryBackoff(5_000, 20_000, () => now);
    try {
      const found = await discover([dir], { ports: [ourPort], backoff });
      expect(found?.url).toBe(`http://localhost:${ourPort}`);
      expect(hits.filter((h) => h.startsWith("ours"))).toEqual([`ours localhost:${ourPort}`]); // no second probe on 127.0.0.1

      expect(await discover([dir], { ports: [otherPort], backoff })).toBeNull();
      const first = hits.filter((h) => h.startsWith("other")).length;
      expect(first).toBeGreaterThanOrEqual(1);
      // Within the backoff window the foreign server isn't probed again.
      now += 1_000;
      expect(await discover([dir], { ports: [otherPort], backoff })).toBeNull();
      expect(hits.filter((h) => h.startsWith("other")).length).toBe(first);
      // After it, it is (and the delay doubles).
      now += 5_000;
      await discover([dir], { ports: [otherPort], backoff });
      expect(hits.filter((h) => h.startsWith("other")).length).toBeGreaterThan(first);
      const second = hits.filter((h) => h.startsWith("other")).length;
      now += 6_000;
      await discover([dir], { ports: [otherPort], backoff });
      expect(hits.filter((h) => h.startsWith("other")).length).toBe(second);
      backoff.clear();
      await discover([dir], { ports: [otherPort], backoff });
      expect(hits.filter((h) => h.startsWith("other")).length).toBeGreaterThan(second);
    } finally {
      for (const s of [other, ours]) {
        s.closeAllConnections();
        s.close();
      }
    }
  });

  test("appUrl puts routes under the app's basePath", () => {
    expect(appUrl("http://localhost:3000", "", "/logs")).toBe("http://localhost:3000/logs");
    expect(appUrl("http://localhost:3000", undefined, "logs")).toBe("http://localhost:3000/logs");
    expect(appUrl("http://localhost:3000", "/docs", "/logs")).toBe("http://localhost:3000/docs/logs");
    expect(appUrl("http://localhost:3000/", "/docs", "/")).toBe("http://localhost:3000/docs");
    expect(appUrl("http://localhost:3000", "", "/")).toBe("http://localhost:3000/");
  });

  test("frame stream: focused tab stays active, closed tab falls back, last tab gone clears", async () => {
    const { createServer } = await import("node:http");
    let push: (event: string, data: unknown) => void = () => undefined;
    const fake = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      push = (event, data) => res.write(`event: ${event}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`);
      res.write(": hi\n\n");
    });
    await new Promise<void>((r) => fake.listen(0, "127.0.0.1", () => r()));
    const url = `http://127.0.0.1:${(fake.address() as { port: number }).port}`;
    const seen: string[] = [];
    const gone: string[] = [];
    const conn = connectFrameStream(url, { onFrame: (f) => seen.push(f.source), onStatus: () => undefined, onSourceGone: (id) => gone.push(id), onClose: () => undefined });
    // `push` is replaced once the client is connected.
    await until(() => push.length === 2);
    const frame = (source: string, text: string, focused: boolean) => {
      const buf = new CellBuffer(10, 1);
      buf.drawText(0, 0, text, 0xffffffff, 0, 0);
      return new FrameEncoder().encode(extractStyledFrame(buf), { source, meta: { path: `/${source}`, focused } });
    };
    push("frame", frame("a", "tab a", true));
    await until(() => conn.activeSource === "a");
    for (let i = 0; i < 3; i++) push("frame", frame("b", `tab b ${i}`, false));
    await until(() => seen.filter((s) => s === "b").length === 3);
    expect(conn.activeSource).toBe("a");
    expect(frameToText(conn.current()!.frame)).toBe("tab a");
    push("gone", null);
    push("gone", { source: "a" });
    await until(() => gone.includes("a"));
    expect(conn.activeSource).toBe("b");
    expect(frameToText(conn.current()!.frame)).toBe("tab b 2");
    push("gone", { source: "b" });
    await until(() => gone.includes("b"));
    expect(conn.activeSource).toBeNull();
    expect(conn.current()).toBeNull();
    conn.close();
    fake.closeAllConnections();
    fake.close();
  });

  test("monitor streams live frames only while watching, and input reaches the tab", async () => {
    const monitor = new DevServerMonitor(200);
    monitor.configure([dir], base);
    monitor.start();
    await until(() => monitor.snapshot().url);
    const tab = await fakeTab();
    tab.ws.send(JSON.stringify({ type: "custom", event: "textjs:hello", data: { source: "t1", grid: { width: 40, height: 3 }, path: "/" } }));
    await until(() => monitor.snapshot().status?.sources === 1 || (monitor.poke(), false));
    expect(monitor.snapshot().status?.grid).toEqual({ width: 40, height: 3 });

    const frames: StyledFrame[] = [];
    monitor.onFrame((f) => frames.push(f.frame));
    monitor.setWatching(true);
    await until(() => tab.mirror.includes(true));

    const buf = new CellBuffer(40, 3);
    buf.drawText(0, 0, "▼ mirrored", 0xffffffff, 0x000000ff, 0);
    const enc = new FrameEncoder();
    tab.ws.send(JSON.stringify({ type: "custom", event: "textjs:frame", data: enc.encode(extractStyledFrame(buf), { source: "t1", meta: { path: "/" } }) }));
    await until(() => frames.length > 0);
    expect(frameToText(frames.at(-1)!)).toBe("▼ mirrored");
    expect(monitor.activeSource).toBe("t1");

    expect(await postInput(base, { type: "key", key: "ArrowUp", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }, "t1")).toBe(true);
    await until(() => tab.inputs.length > 0);
    expect(tab.inputs[0]).toMatchObject({ type: "key", key: "ArrowUp" });

    monitor.setWatching(false);
    await until(() => tab.mirror.at(-1) === false);
    monitor.dispose();
    tab.ws.close();
  }, 20_000);
});

describe("headless runner", () => {
  const node = Bun.which("node") ?? undefined;

  function session(): { s: HeadlessSession; frames: string[]; errors: Array<string | null> } {
    const frames: string[] = [];
    const errors: Array<string | null> = [];
    const s = new HeadlessSession({ runnerPath, root: dir, execPath: node }, {
      onFrame: (f) => frames.push(frameToText(f)),
      onError: (e) => errors.push(e ? e.message : null),
      onOutput: () => undefined,
    });
    return { s, frames, errors };
  }

  test("renders a route with its layout, runs route handlers, takes input and reloads on change", async () => {
    const { s, frames } = session();
    s.start({ kind: "route", path: "/" }, 40, 4);
    await until(() => frames.at(-1)?.includes("home v1"));
    expect(frames.at(-1)).toContain("▼ Fixture");

    s.setTarget({ kind: "route", path: "/counter" });
    await until(() => frames.at(-1)?.includes("count=0 api=hi"));
    s.input({ type: "key", key: "ArrowUp", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
    await until(() => frames.at(-1)?.includes("count=1"));

    s.resize(30, 3);
    await until(() => s.current()?.frame.width === 30);

    writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/app";\nexport default function Page() { return <Text>home v2</Text>; }\n');
    s.input({ type: "navigate", href: "/" });
    s.reload();
    await until(() => frames.at(-1)?.includes("home v2"));
    s.dispose();
  }, 30_000);

  test("ignores malformed IPC messages from the runner", async () => {
    const good = new FrameEncoder().encode(extractStyledFrame((() => { const b = new CellBuffer(8, 1); b.drawText(0, 0, "good", 0xffffffff, 0, 0); return b; })()), { meta: { path: "/ok" } });
    const fake = join(dir, ".runner/fake-runner.mjs");
    writeFileSync(
      fake,
      `process.on("message", (m) => {
  if (m.type !== "init") { if (m.type === "dispose") process.exit(0); return; }
  process.send(null);
  process.send("frame");
  process.send({ type: "frame", frame: { ...${JSON.stringify(good)}, meta: { path: 42 } } });
  process.send({ type: "frame", frame: { ...${JSON.stringify(good)}, rows: [[0, [["x", 0, 0]]]] } });
  process.send({ type: "frame", frame: ${JSON.stringify(good)} });
});\n`,
    );
    const frames: Array<{ text: string; path: unknown }> = [];
    const s = new HeadlessSession({ runnerPath: fake, root: dir, execPath: node }, {
      onFrame: (f, meta) => frames.push({ text: frameToText(f), path: meta.path }),
      onError: () => undefined,
      onOutput: () => undefined,
    });
    s.start({ kind: "route", path: "/" }, 8, 1);
    await until(() => frames.length > 0);
    await new Promise((r) => setTimeout(r, 100));
    expect(frames).toEqual([{ text: "good", path: "/ok" }]);
    s.dispose();
  }, 15_000);

  test("restarts a runner that stops answering, and SIGKILLs one that ignores dispose and SIGTERM", async () => {
    const stubborn = join(dir, ".runner/stubborn-runner.mjs");
    writeFileSync(
      stubborn,
      `process.on("SIGTERM", () => {});
process.on("message", (m) => {
  if (m.type === "init") { process.send({ type: "ready", version: "1" }); process.send({ type: "error", message: "pid " + process.pid }); }
});
setInterval(() => {}, 1000);\n`,
    );
    const alive = (pid: number): boolean => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    const pids: number[] = [];
    let exits = 0;
    const s = new HeadlessSession({ runnerPath: stubborn, root: dir, execPath: node, reloadTimeoutMs: 200, exitGraceMs: 100 }, {
      onFrame: () => undefined,
      onError: (e) => {
        const m = /^pid (\d+)$/.exec(e?.message ?? "");
        if (m) pids.push(Number(m[1]));
      },
      onExit: () => exits++,
      onOutput: () => undefined,
    });
    s.start({ kind: "route", path: "/" }, 10, 2);
    await until(() => pids.length === 1);
    const first = pids[0]!;
    s.reload(); // never answered
    await until(() => pids.length === 2, 5000);
    expect(pids[1]).not.toBe(first);
    expect(s.pid).toBe(pids[1]);
    await until(() => !alive(first), 3000);
    expect(exits).toBe(0); // the replaced runner exits quietly
    const second = pids[1]!;
    s.dispose();
    await until(() => !alive(second), 3000);
  }, 15_000);

  test("renders a named component export and reports component errors", async () => {
    const { s, frames, errors } = session();
    s.start({ kind: "component", file: join(dir, "components/Badge.tsx") }, 30, 2);
    await until(() => frames.at(-1)?.includes("● ready"));
    s.setTarget({ kind: "component", file: join(dir, "components/Broken.tsx") });
    await until(() => errors.some((e) => e?.includes("TX015: boom")));
    s.dispose();
  }, 30_000);
});
