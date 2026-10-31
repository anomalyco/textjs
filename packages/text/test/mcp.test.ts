import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createTextMcpServer, type SessionController } from "../src/mcp";
import { Lock, withTimeout } from "../src/mcp/server";
import { HeadlessSession, sameOriginUrl } from "../src/mcp/session";
import { findText, frameContains, frameText, styledRows } from "../src/mcp/frame";
import { parseKeyInput, textToKeyEvents } from "../src/mcp/keys";
import { formatLogArgs, LogBuffer, txCodeOf } from "../src/mcp/logs";
import { parseMcpArgs } from "../src/mcp/cli";
import { CellBuffer, initYoga } from "@textjs/core";

const DASHBOARD = resolve(import.meta.dir, "../../../examples/dashboard");
const BIN = resolve(import.meta.dir, "../bin/text.ts");

const TOOLS = ["list_routes", "navigate", "read_frame", "press", "type", "paste", "scroll", "resize", "inspect_tree", "find", "wait_for", "logs", "fetch", "reload"];

// The app runs outside act(), like production code.
const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
let prevAct: boolean | undefined;
beforeAll(() => {
  prevAct = g.IS_REACT_ACT_ENVIRONMENT;
  g.IS_REACT_ACT_ENVIRONMENT = false;
});
afterAll(() => {
  g.IS_REACT_ACT_ENVIRONMENT = prevAct;
});

function text(r: CallToolResult): string {
  return r.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
}

async function connect(options: Parameters<typeof createTextMcpServer>[0]): Promise<{ client: Client; controller: SessionController; close(): Promise<void> }> {
  const { server, controller } = createTextMcpServer(options);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "textjs-test", version: "1.0.0" });
  await client.connect(clientSide);
  return {
    client,
    controller,
    async close() {
      await client.close();
      await controller.dispose();
    },
  };
}

function call(client: Client, name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
  return client.callTool({ name, arguments: args }) as Promise<CallToolResult>;
}

describe("text mcp · units", () => {
  test("parses key input: names, modifiers, sequences, repeats", () => {
    expect(parseKeyInput("ctrl+k").map((e) => [e.key, e.ctrl])).toEqual([["k", true]]);
    expect(parseKeyInput("down down enter").map((e) => e.key)).toEqual(["down", "down", "return"]);
    expect(parseKeyInput(["tab", "shift+tab"]).map((e) => [e.key, e.shift])).toEqual([
      ["tab", false],
      ["tab", true],
    ]);
    expect(parseKeyInput("down*3").length).toBe(3);
    expect(parseKeyInput("G")[0]).toMatchObject({ key: "g", shift: true, input: "G" });
    expect(parseKeyInput(" ")[0]?.key).toBe("space");
    expect(() => parseKeyInput("ctrl+zz")).toThrow(/TX007/);
    expect(() => parseKeyInput("hyper+k")).toThrow(/TX006/);
    expect(() => parseKeyInput("a,b")).toThrow(/TX009.*single key stroke/);
    expect(() => parseKeyInput("down*100000")).toThrow(/Too many keys/);
    // Validation is all-or-nothing.
    expect(() => parseKeyInput("down nope*2 up")).toThrow();
  });

  test("types text, mapping newlines and tabs", () => {
    expect(textToKeyEvents("Hi\r\n\t").map((e) => e.key)).toEqual(["h", "i", "return", "tab"]);
    expect(textToKeyEvents("A")[0]).toMatchObject({ input: "A", shift: true });
    // One key per grapheme: ZWJ sequences, skin tones and combining marks stay whole.
    expect(textToKeyEvents("👩‍💻👍🏽é").map((e) => e.input)).toEqual(["👩‍💻", "👍🏽", "é"]);
  });

  test("frame helpers use cell columns around wide graphemes", async () => {
    await initYoga();
    const buf = new CellBuffer(12, 2);
    buf.clear(0);
    buf.drawText(0, 0, "日本 ok", 0xffffffff, 0);
    buf.drawText(0, 1, "x 100%", 0xff0000ff, 0x000000ff);
    expect(frameText(buf)).toBe("日本 ok\nx 100%");
    expect(findText(buf, "ok")).toEqual([{ x: 5, y: 0, width: 2, height: 1, line: "日本 ok" }]);
    expect(findText(buf, "本")[0]).toMatchObject({ x: 2, width: 2 });
    expect(findText(buf, "\\d+%", { regex: true })[0]).toMatchObject({ x: 2, y: 1, width: 4 });
    expect(frameText(buf, { x: 5, y: 0, width: 2, height: 1 })).toBe("ok");
    const rows = styledRows(buf, { x: 0, y: 1, width: 6, height: 1 });
    expect(rows[0]?.runs[0]).toMatchObject({ x: 0, text: "x 100%", fg: "#ff0000", bg: "#000000" });
  });

  test("frame helpers: NBSP reads as a space, wide cells at a region edge, blank rows omitted", async () => {
    await initYoga();
    const buf = new CellBuffer(12, 3);
    buf.clear(0);
    // Fields draw their block cursor on U+00A0.
    buf.drawText(0, 0, "abc\u00a0x", 0xffffffff, 0);
    buf.drawText(0, 2, "日本 ok", 0xffffffff, 0x101010ff);
    expect(frameText(buf)).toBe("abc x\n\n日本 ok");
    expect(findText(buf, "abc x")).toHaveLength(1);
    expect(frameContains(buf, "abc ")).toBe(true);
    // Region starting on the second cell of 日: a blank cell, not a dropped one.
    const rows = styledRows(buf, { x: 1, y: 2, width: 4, height: 1 });
    expect(rows[0]?.runs[0]).toMatchObject({ x: 1, width: 4, text: " 本 " });
    // Row 1 is blank and default-styled: omitted.
    expect(styledRows(buf).map((r) => r.y)).toEqual([0, 2]);
    const cut = { x: 0, y: 2, width: 3, height: 1 };
    expect(frameText(buf, cut, false)).toBe("日 ");
    expect(styledRows(buf, cut)[0]?.runs[0]).toMatchObject({ text: "日 ", width: 3 });
  });

  test("log buffer: cursors, levels, TX codes, %c stripping", () => {
    const logs = new LogBuffer(3);
    logs.push("log", "console", ["%chello", "color:red", "world"]);
    logs.push("error", "react", [Object.assign(new Error("boom"), { code: "TX004" })]);
    logs.push("warn", "console", ["w"]);
    logs.push("info", "console", ["i"]);
    expect(logs.read().map((e) => e.message)).toEqual([expect.stringContaining("boom"), "w", "i"]);
    expect(logs.read({ levels: ["error"] })[0]?.code).toBe("TX004");
    expect(logs.read({ since: 3 }).map((e) => e.message)).toEqual(["i"]);
    expect(formatLogArgs(["%chello", "color:red", "world"])).toBe("hello world");
    // Directives are consumed left to right: %c drops its style, %s keeps its argument.
    expect(formatLogArgs(["%c%s%c done", "color:red", "build", "color:blue"])).toBe("build done");
    expect(formatLogArgs(["%s is %c%d%%", "cpu", "font-weight:bold", 42])).toBe("cpu is 42%");
    expect(formatLogArgs(["100%%c literal", "extra"])).toBe("100%c literal extra");
    expect(formatLogArgs(["%c only style"])).toBe("%c only style");
    expect(formatLogArgs(["%o and %c", { a: 1 }, "color:red", "tail"])).toBe("{ a: 1 } and  tail");
    expect(txCodeOf(new Error("Text.js error TX018: nope"))).toBe("TX018");
    expect(logs.errorsSince(0)).toBe(1);
  });

  test("`text mcp` is dispatched before Vite or any other command module loads", () => {
    const src = readFileSync(resolve(import.meta.dir, "../src/cli/index.ts"), "utf8");
    expect(src).not.toMatch(/^import .* from "\.\/(build|dev|start|proxy|run)";?$/m);
    expect(src).not.toMatch(/^import .* from "vite"/m);
  });

  test("parses CLI args", () => {
    expect(parseMcpArgs(["mcp", "examples/dashboard", "--path", "/logs", "--cols=80", "--rows", "24", "--no-config"])).toMatchObject({
      dir: "examples/dashboard",
      path: "/logs",
      cols: 80,
      rows: 24,
      skipConfig: true,
    });
    expect(parseMcpArgs(["mcp"]).dir).toBe(".");
    expect(parseMcpArgs(["mcp", "--colz", "80", "-x", "app"]).unknown).toEqual(["--colz", "-x"]);
    expect(parseMcpArgs(["mcp", "--verbose"]).unknown).toEqual([]);
  });
});

describe("text mcp · dashboard", () => {
  let client: Client;
  let close: () => Promise<void>;

  beforeAll(async () => {
    const c = await connect({ root: DASHBOARD, cols: 100, rows: 32 });
    client = c.client;
    close = c.close;
  });
  afterAll(async () => {
    await close();
  });

  test("advertises every tool, resources and instructions", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([...TOOLS].sort());
    for (const t of tools) {
      expect(t.description?.length ?? 0).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe("object");
    }
    expect(tools.find((t) => t.name === "read_frame")?.annotations?.readOnlyHint).toBe(true);
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri).sort()).toEqual(["text://frame", "text://routes"]);
    expect(client.getInstructions()).toContain("read_frame");
    expect(client.getServerVersion()?.name).toBe("textjs");
  });

  test("read_frame renders the overview after the app is idle", async () => {
    const r = await call(client, "read_frame");
    expect(r.isError).toBeFalsy();
    const out = text(r);
    expect(out).toContain("route: /");
    expect(out).toContain("Recent deployments");
    expect(out).toContain("▼ Edge Console");
    const s = r.structuredContent as { cols: number; rows: number; href: string; title: string; idle: boolean };
    expect(s).toMatchObject({ cols: 100, rows: 32, href: "/", title: "Overview · Edge Console" });
  });

  test("read_frame styles and regions", async () => {
    const r = await call(client, "read_frame", { styles: true, region: { x: 0, y: 1, width: 40, height: 1 } });
    const s = r.structuredContent as { text: string; styles: Array<{ y: number; runs: Array<{ text: string; fg: string | null; attrs?: string[] }> }> };
    expect(s.text).toContain("▼ Edge Console");
    expect(s.styles).toHaveLength(1);
    const brand = s.styles[0]?.runs.find((run) => run.text.includes("Edge Console"));
    expect(brand?.attrs).toContain("bold");
    expect(brand?.fg).toMatch(/^#[0-9a-f]{6}/);
    // The text content carries compact style lines, not a second copy of the JSON.
    const content = (r.content as Array<{ text: string }>).map((c) => c.text);
    expect(content).toHaveLength(2);
    expect(content[1]).toMatch(/^styles \(/);
    expect(content[1]).toMatch(/\n1 \d+\+\d+ #[0-9a-f]{6} \S+ bold "[^"]*Edge Console/);
    expect(content.join("")).not.toContain('"runs"');
  });

  test("list_routes lists pages and route handlers", async () => {
    const r = await call(client, "list_routes");
    const s = r.structuredContent as { pages: Array<{ pattern: string; dynamic: boolean }>; api: Array<{ pattern: string; file: string }>; current: string };
    const patterns = s.pages.map((p) => p.pattern);
    expect(patterns[0]).toBe("/");
    for (const p of ["/deployments", "/deployments/[id]", "/logs", "/settings"]) expect(patterns).toContain(p);
    expect(s.pages.find((p) => p.pattern === "/deployments/[id]")?.dynamic).toBe(true);
    expect(s.api).toContainEqual({ pattern: "/api/health", file: "app/api/health/route.ts" });
    expect(text(r)).toContain("ƒ /deployments/[id]");
  });

  test("navigate + press drive the deployments list", async () => {
    const nav = await call(client, "navigate", { path: "/deployments" });
    expect(text(nav)).toContain("8 total");
    expect(text(nav)).toContain("› ● dpl_8f2kq1");
    expect((nav.structuredContent as { focus: { component?: string } }).focus.component).toBe("Select");

    const down = await call(client, "press", { keys: "down" });
    expect(text(down)).toContain("› ● dpl_7hx0pz");
    expect(text(down)).toContain("fix: cart badge overflow");
    expect((down.structuredContent as { pressed: number }).pressed).toBe(1);

    const open = await call(client, "press", { keys: ["enter"] });
    expect((open.structuredContent as { href: string; route: string })).toMatchObject({ href: "/deployments/dpl_7hx0pz", route: "/deployments/[id]" });

    const back = await call(client, "navigate", { history: "back" });
    expect((back.structuredContent as { href: string }).href).toBe("/deployments");
  });

  test("press rejects bad combos with TX codes and sends nothing", async () => {
    await call(client, "navigate", { path: "/deployments" });
    const before = text(await call(client, "read_frame"));
    const r = await call(client, "press", { keys: "down ctrl+zz" });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("TX007");
    expect((r.structuredContent as { error: { code: string; kind: string } }).error).toMatchObject({ code: "TX007", kind: "invalid_keys" });
    expect(text(await call(client, "read_frame"))).toBe(before);
  });

  test("find returns cell bounds and the component under each match", async () => {
    await call(client, "navigate", { path: "/deployments" });
    const r = await call(client, "find", { text: "dpl_5rw9vb" });
    const { matches } = r.structuredContent as { matches: Array<{ x: number; y: number; width: number; component?: string; path?: string[] }> };
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0]).toMatchObject({ width: 10 });
    expect(matches[0]?.path).toContain("Select");
    const none = await call(client, "find", { text: "definitely not on screen" });
    expect(text(none)).toContain("No match");
    const bad = await call(client, "find", { text: "(", regex: true });
    expect(bad.isError).toBe(true);
  });

  test("inspect_tree shows components, bounds and focusables", async () => {
    await call(client, "navigate", { path: "/deployments" });
    const r = await call(client, "inspect_tree", { format: "json" });
    const s = r.structuredContent as { tree: { children: unknown[] }; focusables: Array<{ id: string; focused: boolean; component?: string; bounds?: object }>; activeFocusId: string };
    const focused = s.focusables.find((f) => f.focused);
    expect(focused).toMatchObject({ component: "Select" });
    expect(focused?.bounds).toBeDefined();
    expect(s.activeFocusId).toBe(focused?.id as string);
    const flat = JSON.stringify(s.tree);
    expect(flat).toContain('"DeploymentsPage"');
    expect(flat).toContain('"RootLayout"');

    const filtered = text(await call(client, "inspect_tree", { component: "DeploymentsPage" }));
    expect(filtered.split("\n")[1]).toMatch(/^\s+DeploymentsPage\s+\[\d+,\d+ \d+×\d+\]/);
    expect(filtered).toContain('"Deployments"');
    expect(filtered).toContain("focusables:");

    // maxDepth counts from each match, so deep components are still found.
    const shallow = await call(client, "inspect_tree", { component: "DeploymentsPage", maxDepth: 2, format: "json" });
    const tree = (shallow.structuredContent as { tree: { children: Array<{ name: string; children?: Array<{ children?: unknown[] }> }> } }).tree;
    expect(tree.children.map((c) => c.name)).toEqual(["DeploymentsPage"]);
    const match = tree.children[0];
    expect(match?.children?.length).toBeGreaterThan(0);
    for (const c of match?.children ?? []) expect(c.children).toBeUndefined();
    const top = await call(client, "inspect_tree", { maxDepth: 1, format: "json" });
    for (const c of (top.structuredContent as { tree: { children: Array<{ children?: unknown[] }> } }).tree.children) expect(c.children).toBeUndefined();
    // Paths and trees start below the inspector's probe.
    expect(JSON.stringify((await call(client, "inspect_tree", { format: "json" })).structuredContent)).not.toContain("FiberProbe");
  });

  test("type, paste and wait_for on the logs page", async () => {
    await call(client, "navigate", { path: "/logs" });
    // Pause the live tail, then focus the filter with "/".
    const focused = await call(client, "press", { keys: "space /" });
    expect(text(focused)).toContain("❚❚ paused");
    const s = focused.structuredContent as { focus: { id: string; component: string }; cursor: { x: number; y: number } | null };
    expect(s.focus).toMatchObject({ id: "log-filter", component: "Input" });
    expect(s.cursor).not.toBeNull();

    const typed = await call(client, "type", { text: "api" });
    expect(text(typed)).toContain("│ /  api");
    expect((typed.structuredContent as { cursor: { x: number } }).cursor.x).toBe((s.cursor?.x ?? 0) + 3);

    const pasted = await call(client, "paste", { text: "/health" });
    expect(text(pasted)).toContain("/  api/health");

    const waited = await call(client, "wait_for", { text: "api/health", href: "/logs", styles: true, trim: false, timeoutMs: 1000 });
    expect(waited.isError).toBeFalsy();
    expect(waited.structuredContent?.styles).toBeArray();
    expect((waited.structuredContent?.text as string).split("\n")).toHaveLength(32);
    expect((await call(client, "wait_for", { href: "/settings", text: "api/health", timeoutMs: 0 })).isError).toBe(true);
    const timedOut = await call(client, "wait_for", { text: "never-appears", timeoutMs: 100 });
    expect(timedOut.isError).toBe(true);
    expect(text(timedOut)).toContain("timed out after 100ms");
    expect(text(timedOut)).toContain("Runtime Logs");

    const gone = await call(client, "press", { keys: "escape" });
    expect((gone.structuredContent as { focus: unknown }).focus).toBeNull();
  });

  test("wait_for idle reports when a live page never settles", async () => {
    await call(client, "navigate", { path: "/logs" });
    // Unpause if paused, so a log line arrives every 450ms.
    const frame = text(await call(client, "read_frame"));
    if (frame.includes("paused")) await call(client, "press", { keys: "space" });
    const idle = await call(client, "wait_for", { quietMs: 2000, timeoutMs: 600 });
    expect(idle.isError).toBe(true);
    expect(text(idle)).toContain("idle");
    await call(client, "press", { keys: "space" });
    const ok = await call(client, "wait_for", { idle: true, timeoutMs: 2000 });
    expect(ok.isError).toBeFalsy();
  });

  test("resize reflows the frame", async () => {
    await call(client, "navigate", { path: "/" });
    try {
      const r = await call(client, "resize", { cols: 60, rows: 20 });
      const s = r.structuredContent as { cols: number; rows: number; text: string };
      expect([s.cols, s.rows]).toEqual([60, 20]);
      expect(Math.max(...s.text.split("\n").map((l) => [...l].length))).toBeLessThanOrEqual(60);
      expect((await call(client, "reload")).structuredContent).toMatchObject({ cols: 60, rows: 20 });
      const crop = await call(client, "read_frame", { region: { x: 57, y: 18, width: 10, height: 5 }, trim: false });
      expect(crop.structuredContent).toMatchObject({ cols: 60, rows: 20, region: { x: 57, y: 18, width: 3, height: 2 } });
      expect((crop.structuredContent as { text: string }).text.split("\n").map((s) => s.length)).toEqual([3, 3]);
    } finally {
      await call(client, "resize", { cols: 100, rows: 32 });
    }
  });

  test("type is capped and points long input at paste", async () => {
    const r = await call(client, "type", { text: "x".repeat(2001) });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("use paste");
  });

  test("fetch runs route handlers in-process", async () => {
    const health = await call(client, "fetch", { path: "/api/health" });
    const s = health.structuredContent as { status: number; body: string; route: string; headers: Record<string, string> };
    expect(s.status).toBe(200);
    expect(s.route).toBe("/api/health");
    expect(JSON.parse(s.body)).toMatchObject({ status: "ok", engine: "Turbolog" });
    const filtered = await call(client, "fetch", { path: "/api/deployments?status=error" });
    expect(JSON.parse((filtered.structuredContent as { body: string }).body).deployments.every((d: { status: string }) => d.status === "error")).toBe(true);
    const missing = await call(client, "fetch", { path: "/api/nope" });
    expect((missing.structuredContent as { status: number; route: null }).status).toBe(404);
    const external = await call(client, "fetch", { path: "https://example.com" });
    expect(external.isError).toBe(true);
    const notAllowed = await call(client, "fetch", { path: "/api/health", method: "DELETE" });
    expect((notAllowed.structuredContent as { status: number }).status).toBe(405);
  });

  test("resources expose the current frame and route list", async () => {
    await call(client, "navigate", { path: "/settings" });
    const frame = await client.readResource({ uri: "text://frame" });
    expect((frame.contents[0] as { text: string }).text).toContain("route: /settings");
    const routes = await client.readResource({ uri: "text://routes" });
    expect(JSON.parse((routes.contents[0] as { text: string }).text).current).toBe("/settings");
  });

  test("async server components (`runtime = \"server\"` /status) resolve and settle", async () => {
    const r = await call(client, "navigate", { path: "/status", settleMs: 10_000 });
    const out = text(r);
    expect(out).toContain("route: /status");
    expect(out).toContain("CPUs");
    for (const id of ["iad1", "sfo1", "fra1", "cdg1", "hnd1"]) expect(out).toMatch(new RegExp(`${id}\\s+.*p50 \\d+ms`));
    expect(out).not.toContain("probing…");
    expect(out).not.toContain("Application error");
    expect((r.structuredContent as { idle: boolean }).idle).toBe(true);
    // router.refresh() + new props re-run the async components.
    const again = await call(client, "press", { keys: "r", settleMs: 10_000 });
    expect(text(again)).toContain("attempt 2");
    expect(text(again)).not.toContain("probing…");
    expect(text(await call(client, "logs", { level: ["error"] }))).not.toContain("async");
  }, 30_000);

  test("schema violations are rejected", async () => {
    const r = await call(client, "resize", { cols: "wide", rows: 10 });
    expect(r.isError).toBe(true);
    const nav = await call(client, "navigate", { path: "deployments" });
    expect(nav.isError).toBe(true);
    expect(text(nav)).toContain('must start with "/"');
  });

  test("concurrent calls are serialized in order", async () => {
    await call(client, "navigate", { path: "/deployments" });
    const [a, b, c] = await Promise.all([
      call(client, "press", { keys: "down" }),
      call(client, "press", { keys: "down" }),
      call(client, "press", { keys: "up" }),
    ]);
    expect(text(a)).toContain("› ● dpl_7hx0pz");
    expect(text(b)).toContain("› ● dpl_6m3ty8");
    expect(text(c)).toContain("› ● dpl_7hx0pz");
  });
});

describe("text mcp · reload, logs and errors", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-${process.pid}`);
  let client: Client;
  let close: () => Promise<void>;

  const write = (rel: string, body: string): void => {
    const file = join(dir, rel);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, body);
  };

  beforeAll(async () => {
    rmSync(dir, { recursive: true, force: true });
    write("lib/label.ts", `export const label = "one";\n`);
    write(
      "app/page.tsx",
      `import { Text } from "@textjs/react";
import { label } from "../lib/label";
export default function Home() {
  console.log("rendered home", { label });
  return <Text>{"hello " + label}</Text>;
}
`,
    );
    write(
      "app/boom/page.tsx",
      `export default function Boom(): never {
  throw Object.assign(new Error("kaboom"), { code: "TX004" });
}
`,
    );
    write(
      "app/api/echo/route.ts",
      `export async function POST(request: Request): Promise<Response> {
  return Response.json({ got: await request.text(), method: request.method });
}
`,
    );
    const c = await connect({ root: dir, cols: 40, rows: 6, skipConfig: true });
    client = c.client;
    close = c.close;
  });
  afterAll(async () => {
    await close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("captures app console output", async () => {
    expect(text(await call(client, "read_frame"))).toContain("hello one");
    const r = await call(client, "logs", { level: ["log"] });
    expect(text(r)).toContain("rendered home");
    const { entries, cursor } = r.structuredContent as { entries: Array<{ seq: number }>; cursor: number };
    expect(entries.length).toBeGreaterThan(0);
    const after = await call(client, "logs", { since: cursor });
    expect(text(after)).toBe("(no log entries)");
  });

  test("render errors are logged with TX codes and flagged on the frame", async () => {
    const r = await call(client, "navigate", { path: "/boom" });
    expect(text(r)).toMatch(/errors: \d+ new/);
    const logs = await call(client, "logs", { level: ["error"] });
    expect(text(logs)).toContain("kaboom");
    expect(text(logs)).toContain("TX004");
    // The counter resets once read.
    expect(text(await call(client, "read_frame"))).not.toMatch(/errors: \d+ new/);
    await call(client, "navigate", { path: "/" });
  });

  test("fetch POSTs a body to a route handler", async () => {
    const r = await call(client, "fetch", { path: "/api/echo", method: "POST", body: "ping" });
    expect(JSON.parse((r.structuredContent as { body: string }).body)).toEqual({ got: "ping", method: "POST" });
  });

  test("reload re-imports changed modules (including non-route imports)", async () => {
    write("lib/label.ts", `export const label = "two";\n`);
    const r = await call(client, "reload");
    expect(r.isError).toBeFalsy();
    expect(text(r)).toContain("hello two");
    expect((r.structuredContent as { purged: number }).purged).toBeGreaterThanOrEqual(2);
  });

  test("reload picks up new routes and survives syntax errors", async () => {
    write("app/fresh/page.tsx", `import { Text } from "@textjs/react";\nexport default function Fresh() { return <Text>fresh route</Text>; }\n`);
    await call(client, "reload");
    expect(text(await call(client, "navigate", { path: "/fresh" }))).toContain("fresh route");

    write("app/fresh/page.tsx", `export default function Fresh( { return <Text>broken</Text>; }\n`);
    const broken = await call(client, "reload");
    expect(broken.isError).toBe(true);
    expect(text(broken)).toContain("Reload failed");
    const blocked = await call(client, "press", { keys: "down" });
    expect(blocked.isError).toBe(true);
    expect(text(blocked)).toContain("call `reload`");
    expect(text(await call(client, "logs", { level: ["error"] }))).toContain("Failed to load");

    write("app/fresh/page.tsx", `import { Text } from "@textjs/react";\nexport default function Fresh() { return <Text>fixed route</Text>; }\n`);
    const fixed = await call(client, "reload");
    expect(fixed.isError).toBeFalsy();
    expect(text(fixed)).toContain("fixed route");
  });
});

describe("text mcp · portals, focus attribution and paint order", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-portal-${process.pid}`);
  let client: Client;
  let close: () => Promise<void>;

  beforeAll(async () => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "app/overlay"), { recursive: true });
    writeFileSync(
      join(dir, "app/page.tsx"),
      `import { useState } from "react";
import { Box, Input, Modal, Text, useFocusManager } from "@textjs/react";

// String state equal to a focus id ("q") must not claim that id.
function Label() {
  const [label] = useState("q");
  return <Text>{"label " + label}</Text>;
}

export default function Home() {
  // useFocusManager() memoizes on [manager, activeId]: must not mark Home as focused.
  const fm = useFocusManager();
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  return (
    <Box className="flex-col w-full h-full">
      <Label />
      <Input id="q" value={q} onChange={setQ} />
      {Array.from({ length: 10 }, (_, i) => (
        <Text key={i}>{"behind ".repeat(8) + i}</Text>
      ))}
      <Text>{"active " + String(fm.activeId)}</Text>
      <Modal open title="Rename" width={30}>
        <Text>modal body</Text>
        <Input id="rename" value={name} onChange={setName} autoFocus />
      </Modal>
    </Box>
  );
}
`,
    );
    writeFileSync(
      join(dir, "app/overlay/page.tsx"),
      `import { Box, Text } from "@textjs/react";

function Deep() {
  return (
    <Box className="flex-col w-full">
      <Box className="flex-col w-full">
        <Box className="flex-col w-full">
          <Text>{"under ".repeat(10)}</Text>
          <Text>{"under ".repeat(10)}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function Overlay() {
  return (
    <Box position="absolute" top={0} left={2} zIndex={5} bg="#202020">
      <Text>overlay text</Text>
    </Box>
  );
}

export default function Page() {
  return (
    <Box className="flex-col w-full h-full">
      <Deep />
      <Overlay />
    </Box>
  );
}
`,
    );
    const c = await connect({ root: dir, cols: 60, rows: 16, skipConfig: true });
    client = c.client;
    close = c.close;
  });
  afterAll(async () => {
    await close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("focus, bounds and cursor inside a <Modal> portal", async () => {
    const r = await call(client, "read_frame");
    const s = r.structuredContent as { focus: { id: string; component?: string; bounds?: { x: number; y: number; width: number; height: number } }; cursor: { x: number; y: number } | null; text: string };
    expect(s.focus).toMatchObject({ id: "rename", component: "Input" });
    expect(s.focus.bounds).toBeDefined();
    const modal = (await call(client, "find", { text: "modal body" })).structuredContent as { matches: Array<{ x: number; y: number }> };
    const body = modal.matches[0] as { x: number; y: number };
    expect(s.focus.bounds?.y).toBeGreaterThan(body.y);
    expect(s.cursor).not.toBeNull();
    expect(s.cursor?.y).toBe(s.focus.bounds?.y as number);
  });

  test("inspect_tree traverses portals and attributes focus ids to their useFocus() owner", async () => {
    const r = await call(client, "inspect_tree", { format: "json" });
    const s = r.structuredContent as { tree: unknown; focusables: Array<{ id: string; component?: string; focused: boolean }> };
    const flat = JSON.stringify(s.tree);
    expect(flat).toContain('"kind":"portal"');
    expect(flat).toContain('"modal body"');
    expect(s.focusables.find((f) => f.id === "rename")).toMatchObject({ component: "Input", focused: true });
    expect(s.focusables.find((f) => f.id === "q")).toMatchObject({ component: "Input", focused: false });
    const owners: Array<{ name: string; focusId?: string }> = [];
    const walk = (n: { name: string; focusId?: string; children?: unknown[] }): void => {
      if (n.focusId !== undefined) owners.push({ name: n.name, focusId: n.focusId });
      for (const c of n.children ?? []) walk(c as typeof n);
    };
    walk(s.tree as { name: string });
    expect(owners).toEqual([
      { name: "Input", focusId: "q" },
      { name: "Input", focusId: "rename" },
    ]);
    expect(text(await call(client, "inspect_tree"))).toContain("Portal");
  });

  test("find attributes text in a portal to the modal, not the page behind it", async () => {
    const r = await call(client, "find", { text: "modal body" });
    const [m] = (r.structuredContent as { matches: Array<{ component?: string; path?: string[] }> }).matches;
    expect(m?.path).toContain("Modal");
    const path = m?.path ?? [];
    expect(path.indexOf("Home")).toBeGreaterThanOrEqual(0);
    expect(path.indexOf("Home")).toBeLessThan(path.indexOf("Modal"));
    expect(path).not.toContain("FiberProbe");
  });

  test("find honors paint order: an absolute zIndex layer wins over deeper boxes beneath it", async () => {
    await call(client, "navigate", { path: "/overlay" });
    const r = await call(client, "find", { text: "overlay text" });
    const [m] = (r.structuredContent as { matches: Array<{ component?: string; path?: string[] }> }).matches;
    expect(m?.path).toContain("Overlay");
    expect(m?.path).not.toContain("Deep");
    const under = (await call(client, "find", { text: "under under under under under under under under" })).structuredContent as { matches: Array<{ path?: string[] }> };
    expect(under.matches.at(-1)?.path).toContain("Deep");
    await call(client, "navigate", { path: "/" });
  });
});

describe("text mcp · fetch, cancellation and lifecycle", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-life-${process.pid}`);
  let client: Client;
  let close: () => Promise<void>;
  const flags = globalThis as { __mcpHangAborted?: boolean; __mcpStreamCancelled?: boolean };

  const write = (rel: string, body: string): void => {
    const file = join(dir, rel);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, body);
  };

  beforeAll(async () => {
    rmSync(dir, { recursive: true, force: true });
    write(
      "app/page.tsx",
      `import { Text, useApp, useInput } from "@textjs/react";
export default function Home() {
  const app = useApp();
  useInput((e) => {
    if (e.input === "q") app.exit();
  });
  return <Text>life home</Text>;
}
`,
    );
    write(
      "app/hang/page.tsx",
      `import { useEffect } from "react";
import { Text } from "@textjs/react";
export default function Hang() {
  useEffect(() => {
    void fetch("/api/hang").catch(() => undefined);
  }, []);
  return <Text>hanging fetch</Text>;
}
`,
    );
    write(
      "app/api/hang/route.ts",
      `export async function GET(request: Request): Promise<Response> {
  await new Promise<void>((resolve) => request.signal.addEventListener("abort", () => resolve()));
  (globalThis as { __mcpHangAborted?: boolean }).__mcpHangAborted = true;
  return new Response("aborted");
}
`,
    );
    write(
      "app/api/sse/route.ts",
      `export const dynamic = "force-dynamic";
export function GET(): Response {
  let timer: ReturnType<typeof setInterval> | undefined;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode("data: hello\\n\\n"));
      timer = setInterval(() => controller.enqueue(enc.encode("data: tick\\n\\n")), 50);
    },
    cancel() {
      clearInterval(timer);
      (globalThis as { __mcpStreamCancelled?: boolean }).__mcpStreamCancelled = true;
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}
`,
    );
    write("app/api/big/route.ts", `export function GET(): Response {\n  return new Response("x".repeat(1_000_000), { headers: { "content-type": "text/plain" } });\n}\n`);
    write("app/api/static/route.ts", `export const dynamic = "force-static";\nexport function GET(request: Request): Response {\n  return Response.json({ url: request.url });\n}\n`);
    const c = await connect({ root: dir, cols: 40, rows: 6, skipConfig: true, origin: "http://localhost:4321/" });
    client = c.client;
    close = c.close;
  });
  afterAll(async () => {
    await close();
    rmSync(dir, { recursive: true, force: true });
    delete flags.__mcpHangAborted;
    delete flags.__mcpStreamCancelled;
  });

  test("a timed-out fetch aborts the handler and releases the lock", async () => {
    const started = Date.now();
    const r = await call(client, "fetch", { path: "/api/hang", timeoutMs: 200 });
    expect(r.isError).toBe(true);
    expect((r.structuredContent as { error: { kind: string } }).error.kind).toBe("timeout");
    const next = await call(client, "read_frame", { settleMs: 0 });
    expect(Date.now() - started).toBeLessThan(5000);
    expect(text(next)).toContain("life home");
    for (let i = 0; i < 50 && !flags.__mcpHangAborted; i++) await new Promise((res) => setTimeout(res, 10));
    expect(flags.__mcpHangAborted).toBe(true);
  });

  test("event streams return their first events and are cancelled", async () => {
    const started = Date.now();
    const r = await call(client, "fetch", { path: "/api/sse", streamMs: 300 });
    expect(r.isError).toBeFalsy();
    const s = r.structuredContent as { status: number; body: string; streaming?: boolean; truncated: boolean };
    expect(Date.now() - started).toBeLessThan(5000);
    expect(s).toMatchObject({ status: 200, streaming: true, truncated: true });
    expect(s.body).toContain("data: hello");
    expect(s.body).toContain("data: tick");
    expect(text(r)).toContain("stream still open");
    for (let i = 0; i < 50 && !flags.__mcpStreamCancelled; i++) await new Promise((res) => setTimeout(res, 10));
    expect(flags.__mcpStreamCancelled).toBe(true);
  });

  test("large bodies are read only up to maxBytes", async () => {
    const r = await call(client, "fetch", { path: "/api/big", maxBytes: 1000 });
    const s = r.structuredContent as { body: string; truncated: boolean; streaming?: boolean };
    expect(s.truncated).toBe(true);
    expect(s.body.length).toBe(1000);
    expect(s.streaming).toBeUndefined();
  });

  test("route handlers run with text dev's segment config semantics", async () => {
    const r = await call(client, "fetch", { path: "/api/static?x=1" });
    expect(JSON.parse((r.structuredContent as { body: string }).body).url).toBe("http://localhost:4321/api/static");
  });

  test("protocol-relative and backslash paths are not same-origin", async () => {
    for (const path of ["/\\evil.com", "//evil.com", "/\\/evil.com"]) {
      const r = await call(client, "fetch", { path });
      expect(r.isError).toBe(true);
      expect(text(r)).toContain("own route handlers");
    }
    expect(sameOriginUrl("/\\evil.com", "http://localhost:3000")).toBeNull();
    expect(sameOriginUrl("http://localhost:3000.evil.com/x", "http://localhost:3000")).toBeNull();
    expect(sameOriginUrl("http://localhost:3000/api/x?y=1", "http://localhost:3000")?.pathname).toBe("/api/x");
    expect(sameOriginUrl("/api/x", "http://localhost:3000")?.href).toBe("http://localhost:3000/api/x");
  });

  test("an in-flight fetch from before a reload does not keep the session busy", async () => {
    const busy = await call(client, "navigate", { path: "/hang", settleMs: 300 });
    expect(text(busy)).toContain("hanging fetch");
    expect((busy.structuredContent as { idle: boolean }).idle).toBe(false);
    await call(client, "navigate", { path: "/" });
    const reloaded = await call(client, "reload", { settleMs: 1000 });
    expect(reloaded.isError).toBeFalsy();
    expect((reloaded.structuredContent as { idle: boolean }).idle).toBe(true);
  });

  test("exit() then reload restarts the app; wait_for fails fast while exited", async () => {
    const exited = await call(client, "press", { keys: "q" });
    expect(text(exited)).toContain("status: exited (the app called exit(); call reload to restart)");
    const started = Date.now();
    const waited = await call(client, "wait_for", { text: "never", timeoutMs: 5000 });
    expect(waited.isError).toBe(true);
    expect(text(waited)).toMatch(/call `reload`/i);
    expect(Date.now() - started).toBeLessThan(1000);
    const back = await call(client, "reload");
    expect(back.isError).toBeFalsy();
    expect(text(back)).toContain("life home");
    expect(text(back)).not.toContain("status:");
  });

  test("a reload whose config fails to load marks the session failed", async () => {
    write("text.config.ts", `throw new Error("config exploded");\n`);
    const c = await connect({ root: dir, cols: 40, rows: 6 });
    try {
      // Start fails: config is loaded.
      const first = await call(c.client, "read_frame");
      expect(first.isError).toBe(true);
      rmSync(join(dir, "text.config.ts"));
      const ok = await call(c.client, "reload");
      expect(ok.isError).toBeFalsy();
      write("text.config.ts", `throw new Error("config exploded again");\n`);
      const broken = await call(c.client, "reload");
      expect(broken.isError).toBe(true);
      expect(text(broken)).toContain("config exploded again");
      const frame = await c.controller.get();
      expect(frame.frame({ peek: true }).status).toBe("failed");
      const blocked = await call(c.client, "press", { keys: "down" });
      expect(text(blocked)).toContain("call `reload`");
      const waited = await call(c.client, "wait_for", { text: "life home", timeoutMs: 3000 });
      expect(waited.isError).toBe(true);
      expect(text(waited)).toContain("failed to load");
      rmSync(join(dir, "text.config.ts"));
      expect((await call(c.client, "reload")).isError).toBeFalsy();
    } finally {
      rmSync(join(dir, "text.config.ts"), { force: true });
      await c.close();
    }
  });

  test("an aborted signal stops input dispatch before any key is sent", async () => {
    const s = await HeadlessSession.start({ root: dir, skipConfig: true });
    try {
      const ac = new AbortController();
      ac.abort(new Error("cancelled"));
      await expect(s.press("q", ac.signal)).rejects.toThrow("cancelled");
      expect(s.frame().status).toBe("running");
    } finally {
      await s.dispose();
    }
  });
});

describe("text mcp · cursor on wide graphemes and NBSP", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-field-${process.pid}`);
  let client: Client;
  let close: () => Promise<void>;
  beforeAll(async () => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "app"), { recursive: true });
    writeFileSync(
      join(dir, "app/page.tsx"),
      `import { useState } from "react";
import { Box, Input, Text } from "@textjs/react";
export default function Home() {
  const [v, setV] = useState("");
  return (
    <Box className="flex-col">
      <Text>field:</Text>
      <Input id="f" value={v} onChange={setV} autoFocus />
    </Box>
  );
}
`,
    );
    const c = await connect({ root: dir, cols: 30, rows: 4, skipConfig: true });
    client = c.client;
    close = c.close;
  });
  afterAll(async () => {
    await close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("find and wait_for match text before the NBSP cursor cell", async () => {
    await call(client, "type", { text: "abc" });
    const found = await call(client, "find", { text: "abc " });
    expect((found.structuredContent as { matches: unknown[] }).matches).toHaveLength(1);
    const waited = await call(client, "wait_for", { text: "abc ", timeoutMs: 500 });
    expect(waited.isError).toBeFalsy();
  });

  test("the cursor on a wide grapheme is reported once", async () => {
    await call(client, "press", { keys: "ctrl+u" });
    const typed = await call(client, "type", { text: "日本" });
    const end = (typed.structuredContent as { cursor: { x: number; y: number } | null }).cursor;
    expect(end).not.toBeNull();
    const left = await call(client, "press", { keys: "left" });
    const s = left.structuredContent as { cursor: { x: number; y: number } | null; text: string };
    expect(s.cursor).toEqual({ x: (end?.x ?? 0) - 2, y: end?.y as number });
  });
});

describe("text mcp · scroll", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-scroll-${process.pid}`);
  let client: Client;
  let close: () => Promise<void>;
  beforeAll(async () => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "app"), { recursive: true });
    writeFileSync(
      join(dir, "app/page.tsx"),
      `import { Box, ScrollBox, Text } from "@textjs/react";
export default function Home() {
  return (
    <Box className="flex-col w-full h-full">
      <ScrollBox className="grow">
        {Array.from({ length: 40 }, (_, i) => <Text key={i}>{"line " + i}</Text>)}
      </ScrollBox>
    </Box>
  );
}
`,
    );
    const c = await connect({ root: dir, cols: 30, rows: 5, skipConfig: true });
    client = c.client;
    close = c.close;
  });
  afterAll(async () => {
    await close();
    rmSync(dir, { recursive: true, force: true });
  });

  test("scroll wheels an unfocused ScrollBox down and up", async () => {
    expect(text(await call(client, "read_frame"))).toContain("line 0");
    const down = await call(client, "scroll", { rows: 10 });
    expect(down.isError).toBeFalsy();
    expect((down.structuredContent as { scrolled: number }).scrolled).toBe(10);
    expect((down.structuredContent as { text: string }).text.split("\n")[0]).toMatch(/^line 10\b/);
    const up = await call(client, "scroll", { rows: -4 });
    expect((up.structuredContent as { text: string }).text.split("\n")[0]).toMatch(/^line 6\b/);
  });
});

describe("text mcp · fetch routing across sessions", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-fetch-${process.pid}`);
  beforeAll(() => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "app"), { recursive: true });
    writeFileSync(join(dir, "app/page.tsx"), `import { Text } from "@textjs/react";\nexport default function Home() { return <Text>a</Text>; }\n`);
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("sessions share globalThis.fetch and restore it in any dispose order", async () => {
    const original = globalThis.fetch;
    const a = await HeadlessSession.start({ root: dir, skipConfig: true });
    const router = globalThis.fetch;
    const b = await HeadlessSession.start({ root: DASHBOARD, skipConfig: true });
    try {
      expect(globalThis.fetch).not.toBe(original);
      expect(globalThis.fetch).toBe(router);
      await a.dispose();
      expect(globalThis.fetch).toBe(router);
      // The remaining session still serves the app's fetch.
      const health = await globalThis.fetch("/api/health");
      expect((await health.json()) as object).toMatchObject({ status: "ok" });
    } finally {
      await a.dispose();
      await b.dispose();
    }
    expect(globalThis.fetch).toBe(original);
  }, 30_000);

});

describe("text mcp · Lock and withTimeout", () => {
  test("a timed-out holder keeps the lock until its work stops", async () => {
    const lock = new Lock();
    const order: string[] = [];
    const release = await lock.acquire();
    const second = lock.acquire().then((r) => {
      order.push("second");
      r();
    });
    const ac = new AbortController();
    let finish!: () => void;
    const work = new Promise<void>((r) => (finish = r)).then(() => order.push("first done"));
    const timedOut = withTimeout(work, 20, "work", ac).catch((e: Error) => e.message);
    expect(await timedOut).toBe("work timed out after 20ms.");
    expect(ac.signal.aborted).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(order).toEqual([]);
    finish();
    await work;
    release();
    await second;
    expect(order).toEqual(["first done", "second"]);
  });
});

describe("text mcp · start failures", () => {
  test("a missing app/ directory becomes a TX018 tool error, not a crash", async () => {
    const c = await connect({ root: join(import.meta.dir, "does-not-exist"), skipConfig: true });
    try {
      const r = await call(c.client, "read_frame");
      expect(r.isError).toBe(true);
      expect(text(r)).toContain("TX018");
      const logs = await call(c.client, "logs");
      expect(text(logs)).toContain("Failed to start");
      expect((await call(c.client, "reload")).isError).toBe(true);
    } finally {
      await c.close();
    }
  });
});

describe("text mcp · stdio", () => {
  const dir = join(import.meta.dir, `.tmp-mcp-stdio-${process.pid}`);

  beforeAll(() => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "app"), { recursive: true });
    writeFileSync(
      join(dir, "app/page.tsx"),
      `import { Text } from "@textjs/react";
let once = false;
export default function Home() {
  console.log("console noise");
  console.info("more noise");
  process.stdout.write("stray stdout write\\n");
  if (!once) {
    once = true;
    // Bun prints these natively to fd 1, bypassing process.stdout.write.
    console.count();
    console.count("hits");
    console.countReset("hits");
    console.count("hits");
    console.group("group label");
    console.log("inside group");
    console.groupCollapsed("collapsed label");
    console.warn("nested warn");
    console.groupEnd();
    console.groupEnd();
    console.log("after group");
    console.dirxml({ dirxml: 1 });
    console.table([{ col: "table cell" }]);
    console.dir({ dir: { deep: true } });
    console.trace("trace message");
    console.assert(false, "assert message");
    console.assert(true, "assert never");
    console.time("timer");
    console.timeLog("timer", "time log extra");
    console.timeEnd("timer");
    console.timeEnd("missing timer");
    (console as unknown as { write?: (s: string) => number }).write?.("console.write raw\\n");
    console.clear();
    console.debug("debug line");
  }
  return <Text>stdio ok</Text>;
}
`,
    );
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("unknown flags are a usage error on stderr", () => {
    const r = Bun.spawnSync([process.execPath, BIN, "mcp", dir, "--colz", "80"]);
    expect(r.exitCode).toBe(2);
    expect(r.stdout.toString()).toBe("");
    expect(r.stderr.toString()).toContain("unknown option --colz");
  });

  test("exits when stdout breaks (EPIPE)", async () => {
    const proc = Bun.spawn([process.execPath, BIN, "mcp", dir, "--no-config"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    // Close our end of stdout, then make the server write a response.
    await proc.stdout.cancel();
    proc.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } })}\n`);
    proc.stdin.flush();
    const code = await Promise.race([proc.exited, new Promise<"alive">((r) => setTimeout(() => r("alive"), 10_000))]);
    if (code === "alive") proc.kill();
    expect(code).toBe(0);
  }, 20_000);

  test("speaks clean JSON-RPC over stdout and exits when the client disconnects", async () => {
    const transport = new StdioClientTransport({ command: process.execPath, args: [BIN, "mcp", dir, "--no-config", "--cols", "30", "--rows", "4"], stderr: "pipe" });
    let stderr = "";
    transport.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    const errors: Error[] = [];
    transport.onerror = (e) => errors.push(e);
    const client = new Client({ name: "stdio-test", version: "1.0.0" });
    await client.connect(transport);
    const r = (await client.callTool({ name: "read_frame", arguments: {} })) as CallToolResult;
    expect(text(r)).toContain("stdio ok");
    const logs = (await client.callTool({ name: "logs", arguments: { limit: 1000 } })) as CallToolResult;
    const out = text(logs);
    expect(out).toContain("console noise");
    expect(out).toContain("stray stdout write");
    for (const line of [
      "log: default: 1",
      "log: hits: 1",
      "log: group label",
      "log:   inside group",
      "log:   collapsed label",
      "warn:     nested warn",
      "log: after group",
      "dirxml: 1",
      "table cell",
      "deep: true",
      "debug: Trace: trace message",
      "error: Assertion failed: assert message",
      "time log extra",
      'warn: Timer "missing timer" does not exist',
      "console.write raw",
      "debug: debug line",
    ])
      expect(out).toContain(line);
    expect(out).not.toContain("assert never");
    expect(out).toMatch(/log: timer: \d+\.\d{3}ms time log extra/);
    expect(out).toMatch(/log: timer: \d+\.\d{3}ms\n/);
    // Every stdout line parsed as JSON-RPC: a stray byte would surface as a transport error.
    expect(errors).toEqual([]);
    const pid = transport.pid;
    await client.close();
    expect(stderr).toContain("Text.js MCP server");
    // The server process exits on its own once stdin closes.
    let alive = true;
    for (let i = 0; i < 100 && alive; i++) {
      await new Promise((res) => setTimeout(res, 50));
      try {
        process.kill(pid as number, 0);
      } catch {
        alive = false;
      }
    }
    expect(alive).toBe(false);
  }, 30_000);
});
