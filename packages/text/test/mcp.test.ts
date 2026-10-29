import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createTextMcpServer, type SessionController } from "../src/mcp";
import { findText, frameText, styledRows } from "../src/mcp/frame";
import { parseKeyInput, textToKeyEvents } from "../src/mcp/keys";
import { formatLogArgs, LogBuffer, txCodeOf } from "../src/mcp/logs";
import { parseMcpArgs } from "../src/mcp/cli";
import { CellBuffer, initYoga } from "@textjs/core";

const DASHBOARD = resolve(import.meta.dir, "../../../examples/dashboard");
const BIN = resolve(import.meta.dir, "../bin/text.ts");

const TOOLS = ["list_routes", "navigate", "read_frame", "press", "type", "paste", "resize", "inspect_tree", "find", "wait_for", "logs", "fetch", "reload"];

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
    expect(() => parseKeyInput("a,b")).toThrow(/single key stroke/);
    expect(() => parseKeyInput("down*100000")).toThrow(/Too many keys/);
    // Validation is all-or-nothing.
    expect(() => parseKeyInput("down nope*2 up")).toThrow();
  });

  test("types text, mapping newlines and tabs", () => {
    expect(textToKeyEvents("Hi\r\n\t").map((e) => e.key)).toEqual(["h", "i", "return", "tab"]);
    expect(textToKeyEvents("A")[0]).toMatchObject({ input: "A", shift: true });
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

    const waited = await call(client, "wait_for", { text: "api/health", timeoutMs: 1000 });
    expect(waited.isError).toBeFalsy();
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
    const r = await call(client, "resize", { cols: 60, rows: 20 });
    const s = r.structuredContent as { cols: number; rows: number; text: string };
    expect([s.cols, s.rows]).toEqual([60, 20]);
    expect(Math.max(...s.text.split("\n").map((l) => [...l].length))).toBeLessThanOrEqual(60);
    await call(client, "resize", { cols: 100, rows: 32 });
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
