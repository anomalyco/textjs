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
import { FrameEncoder, frameToText } from "@textjs/next/frame-protocol";
import { startDevServer } from "../../text/src/cli/dev";
import { DevServerMonitor } from "../src/dev-monitor";
import { connectFrameStream, discover, loopbackOrigin, postInput, probe } from "../src/dev-server";
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
  symlinkSync(join(REPO, "packages/text"), join(dir, "node_modules/@textjs/next"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "live-fixture", type: "module", private: true, dependencies: { "@textjs/next": "*" } }));
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ compilerOptions: { jsx: "react-jsx" } }));
  writeFileSync(join(dir, "app/layout.tsx"), 'import { Box, Text } from "@textjs/next";\nexport default function Layout({ children }: { children?: any }) { return <Box className="flex-col"><Text>▼ Fixture</Text>{children}</Box>; }\n');
  writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nexport default function Page() { return <Text>home v1</Text>; }\n');
  writeFileSync(
    join(dir, "app/counter/page.tsx"),
    'import { useEffect, useState } from "react";\nimport { Text, useInput } from "@textjs/next";\nexport default function Counter() {\n  const [n, setN] = useState(0);\n  const [api, setApi] = useState("…");\n  useEffect(() => { fetch("/api/hello").then((r) => r.json()).then((j) => setApi(j.msg)); }, []);\n  useInput((e) => { if (e.key === "up") setN((c) => c + 1); });\n  return <Text>{`count=${n} api=${api}`}</Text>;\n}\n',
  );
  writeFileSync(join(dir, "app/api/hello/route.ts"), 'export function GET() { return Response.json({ msg: "hi" }); }\n');
  writeFileSync(join(dir, "components/Badge.tsx"), 'import { Text } from "@textjs/next";\nexport function StatusBadge() { return <Text bold>● ready</Text>; }\n');
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

    writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nexport default function Page() { return <Text>home v2</Text>; }\n');
    s.input({ type: "navigate", href: "/" });
    s.reload();
    await until(() => frames.at(-1)?.includes("home v2"));
    s.dispose();
  }, 30_000);

  test("renders a named component export and reports component errors", async () => {
    const { s, frames, errors } = session();
    s.start({ kind: "component", file: join(dir, "components/Badge.tsx") }, 30, 2);
    await until(() => frames.at(-1)?.includes("● ready"));
    s.setTarget({ kind: "component", file: join(dir, "components/Broken.tsx") });
    await until(() => errors.some((e) => e?.includes("TX015: boom")));
    s.dispose();
  }, 30_000);
});
