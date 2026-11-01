/**
 * The `text mcp` tool surface: an MCP server whose tools drive a headless
 * Text.js app session (see `session.ts`).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VERSION } from "@textjs/core";
import { findText, type StyledRow } from "./frame";
import { createHitTester, formatTree } from "./inspect";
import { KeySpecError, MAX_KEYS_PER_CALL } from "./keys";
import { captureConsole, LogBuffer, txCodeOf, type ConsoleCapture, type LogLevel } from "./logs";
import { HeadlessSession, SessionError, type FrameSnapshot, type SessionOptions } from "./session";

export interface TextMcpServerOptions extends SessionOptions {
  /** Server name reported to clients (default `"textjs"`). */
  name?: string;
  /**
   * Route `console.*` into the `logs` tool while the server runs (default
   * `true`). Off when the caller already captures (the `text mcp` CLI does,
   * before anything else loads).
   */
  captureConsole?: boolean;
}

const INSTRUCTIONS = `This server runs a Text.js app (React rendered into a character grid) headlessly, in-process.
Workflow: list_routes → navigate → read_frame. Drive the UI with press (key combos such as "down", "ctrl+k", "tab tab enter", "down*3"), type, paste and scroll (mouse wheel). Input tools wait until the app is idle and return the new frame, so a separate read_frame is rarely needed.
Coordinates are zero-based cells: x = column, y = row. Use find to locate text, inspect_tree for the component tree with bounds and focus ids, wait_for for async UI, fetch to call app/**/route.ts handlers, logs for console output and React errors, and reload after editing files.`;

/** Mutex: tool calls run one at a time so input order is deterministic. */
export class Lock {
  private tail: Promise<void> = Promise.resolve();

  /** Wait for every earlier holder to release, then hold the lock until `release()` is called. */
  async acquire(): Promise<() => void> {
    let release!: () => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const prev = this.tail;
    this.tail = prev.then(() => held);
    await prev;
    return release;
  }
}

export class TimeoutError extends Error {}

/**
 * Race `work` against `ms`. On timeout the caller gets a {@link TimeoutError}
 * at once and `controller` is aborted so cancellable work stops.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, label: string, controller?: AbortController): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new TimeoutError(`${label} timed out after ${ms}ms.`);
      controller?.abort(error);
      reject(error);
    }, ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** Owns the session lifecycle: the app loads in the background so the MCP handshake never waits on it. */
export class SessionController {
  private session: HeadlessSession | null = null;
  private starting: Promise<HeadlessSession> | null = null;
  private capture: ConsoleCapture | null = null;
  readonly logs: LogBuffer;

  constructor(
    private readonly options: SessionOptions,
    private readonly shouldCapture = true,
  ) {
    this.logs = options.logs ?? new LogBuffer();
  }

  /** Start loading the app (idempotent). */
  start(): Promise<HeadlessSession> {
    if (this.session) return Promise.resolve(this.session);
    if (this.shouldCapture && !this.capture) this.capture = captureConsole(this.logs);
    if (!this.starting) {
      this.starting = HeadlessSession.start({ ...this.options, logs: this.logs }).then(
        (s) => {
          this.session = s;
          return s;
        },
        (error: unknown) => {
          this.starting = null;
          this.logs.push("error", "server", ["Failed to start the app:", error]);
          throw error;
        },
      );
    }
    return this.starting;
  }

  get(): Promise<HeadlessSession> {
    return this.start();
  }

  /** Reload the running session, or retry a failed start. */
  async reload(): Promise<{ session: HeadlessSession; purged: number }> {
    const s = this.session;
    if (s) return { session: s, purged: (await s.reload()).purged };
    return { session: await this.start(), purged: 0 };
  }

  async dispose(): Promise<void> {
    const s = this.session ?? (await this.starting?.catch(() => null)) ?? null;
    this.session = null;
    this.starting = null;
    await s?.dispose();
    this.capture?.restore();
    this.capture = null;
  }
}

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: unknown } | null)?.code;
  const tx = typeof code === "string" && /^TX\d{3}$/.test(code) ? code : txCodeOf(error);
  if (tx && !message.includes(tx)) return `Text.js error ${tx}: ${message} https://textjs.org/errors/${tx}`;
  return message;
}

function toolError(error: unknown): CallToolResult {
  const code = txCodeOf(error) ?? ((error as { code?: unknown } | null)?.code as string | undefined);
  const kind = error instanceof TimeoutError ? "timeout" : error instanceof KeySpecError ? "invalid_keys" : error instanceof SessionError ? "session" : "error";
  return {
    isError: true,
    content: [{ type: "text", text: errorText(error) }],
    structuredContent: { error: { kind, message: error instanceof Error ? error.message : String(error), ...(typeof code === "string" ? { code } : {}) } },
  };
}

function formatBounds(b: { x: number; y: number; width: number; height: number }): string {
  return `[${b.x},${b.y} ${b.width}×${b.height}]`;
}

const STATUS_HINTS: Record<Exclude<FrameSnapshot["status"], "running">, string> = {
  exited: "the app called exit(); call reload to restart",
  crashed: "uncaught error; read logs, fix it, then call reload",
  failed: "the app failed to load; read logs, fix it, then call reload",
};

/** Header lines + the frame text, the default content of every frame-returning tool. */
export function formatFrame(f: FrameSnapshot): string {
  const lines: string[] = [];
  const route = f.route === f.href ? f.href : `${f.href}  (route ${f.route})`;
  lines.push(`route: ${route}${f.title ? `  title: ${JSON.stringify(f.title)}` : ""}`);
  lines.push(`size: ${f.cols}×${f.rows}  frame: ${f.frame}  ${f.idle ? "idle" : "busy"}`);
  if (f.region) lines.push(`region: ${formatBounds(f.region)}`);
  if (f.focus) lines.push(`focus: ${f.focus.id}${f.focus.component ? ` ${f.focus.component}` : ""}${f.focus.bounds ? ` ${formatBounds(f.focus.bounds)}` : ""}${f.cursor ? `  cursor: ${f.cursor.x},${f.cursor.y}` : ""}`);
  else lines.push("focus: none");
  if (f.status !== "running") lines.push(`status: ${f.status} (${STATUS_HINTS[f.status]})`);
  if (f.newErrors > 0) lines.push(`errors: ${f.newErrors} new (call logs with level ["error"])`);
  lines.push("");
  lines.push(f.text);
  return lines.join("\n");
}

/**
 * Styled runs as compact lines for the text content (the JSON lives once, in
 * `structuredContent.styles`): `y x+width fg bg attrs "text"`, skipping
 * blank default-styled runs.
 */
export function formatStyles(rows: readonly StyledRow[]): string {
  const lines = ["styles (row col+width fg bg attrs \"text\"):"];
  for (const row of rows) {
    for (const r of row.runs) {
      if (r.bg === null && r.attrs === undefined && r.text.trim() === "") continue;
      lines.push(`${row.y} ${r.x}+${r.width} ${r.fg ?? "-"} ${r.bg ?? "-"} ${r.attrs?.join(",") || "-"} ${JSON.stringify(r.text)}`);
    }
  }
  return lines.join("\n");
}

function frameResult(f: FrameSnapshot, extra: Record<string, unknown> = {}, prefix?: string): CallToolResult {
  const { styles, ...rest } = f;
  let text = formatFrame(f);
  if (prefix) text = `${prefix}\n${text}`;
  const content: CallToolResult["content"] = [{ type: "text", text }];
  if (styles) content.push({ type: "text", text: formatStyles(styles) });
  return { content, structuredContent: { ...extra, ...rest, ...(styles ? { styles } : {}) } };
}

const regionSchema = z
  .object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    width: z.number().int().min(1),
    height: z.number().int().min(1),
  })
  .describe("Cell rectangle to read (zero-based). Default: the whole frame.");

/** `type` sends one key event per grapheme; longer input belongs in `paste`. */
const MAX_TYPE_CHARS = 2000;

const settleSchema = z.number().int().min(0).max(30_000).optional().describe("Max ms to wait for the app to go idle before reading (default 1500). 0 reads immediately.");

/** Create the MCP server. Call `controller.start()` (or any tool) to load the app. */
export function createTextMcpServer(options: TextMcpServerOptions): { server: McpServer; controller: SessionController } {
  const controller = new SessionController(options, options.captureConsole ?? true);
  const server = new McpServer(
    { name: options.name ?? "textjs", title: "▼ Text.js", version: VERSION },
    { instructions: INSTRUCTIONS, capabilities: { tools: {}, resources: {}, logging: {} } },
  );
  const lock = new Lock();

  /**
   * Run `work` under the lock with a hard timeout; any throw becomes a tool
   * error. A timed-out call returns at once and its work is aborted, but the
   * lock stays held until the work has actually stopped (a remount in
   * `reload` / start is not cancellable), so it never interleaves with the
   * next call.
   */
  const locked = async (ms: number, label: string, work: (signal: AbortSignal) => Promise<CallToolResult>): Promise<CallToolResult> => {
    const release = await lock.acquire();
    const ac = new AbortController();
    const running = (async () => work(ac.signal))();
    running.then(release, release);
    try {
      return await withTimeout(running, ms, label, ac);
    } catch (error) {
      return toolError(error);
    }
  };

  const tool = <A>(timeoutMs: number | ((args: A) => number), label: string, body: (s: HeadlessSession, args: A, signal: AbortSignal) => Promise<CallToolResult>) => {
    return (args: A): Promise<CallToolResult> =>
      locked(typeof timeoutMs === "function" ? timeoutMs(args) : timeoutMs, label, async (signal) => {
        const s = await controller.get();
        if (signal.aborted) throw signal.reason;
        return body(s, args, signal);
      });
  };

  const settleThen = async (s: HeadlessSession, settle: number | undefined, read: { styles?: boolean } = {}, signal?: AbortSignal): Promise<FrameSnapshot> => {
    if (settle !== 0) await s.settle({ timeout: settle ?? 1500, signal });
    return s.frame(read);
  };

  server.registerTool(
    "list_routes",
    {
      title: "List routes",
      description: "List the app's pages (app/**/page.tsx) and route handlers (app/**/route.ts), plus the current location.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    tool<Record<string, never>>(10_000, "list_routes", async (s) => {
      const r = s.routes();
      const lines = [`current: ${r.current}`, "", "pages:"];
      for (const p of r.pages) lines.push(`  ${p.dynamic ? "ƒ" : "○"} ${p.pattern}${p.file ? `  ${p.file}` : ""}`);
      lines.push("", "route handlers:");
      if (r.api.length === 0) lines.push("  (none)");
      for (const a of r.api) lines.push(`  ${a.pattern}  ${a.file}`);
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: r as unknown as Record<string, unknown> };
    }),
  );

  server.registerTool(
    "navigate",
    {
      title: "Navigate",
      description: "Navigate the app router (memory history) and return the settled frame. Pass `path` (e.g. \"/deployments/dpl_1?tab=logs\"), or `history: \"back\" | \"forward\"`.",
      inputSchema: {
        path: z.string().min(1).max(2048).optional().describe("App path to push, starting with /."),
        replace: z.boolean().optional().describe("Replace the current history entry instead of pushing."),
        history: z.enum(["back", "forward"]).optional(),
        settleMs: settleSchema,
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    tool<{ path?: string; replace?: boolean; history?: "back" | "forward"; settleMs?: number }>(35_000, "navigate", async (s, a, signal) => {
      if (a.history) s.navigate(a.history);
      else if (a.path !== undefined) {
        if (!a.path.startsWith("/")) throw new SessionError(`Paths must start with "/" (got ${JSON.stringify(a.path)}).`);
        s.navigate({ path: a.path, replace: a.replace });
      } else throw new SessionError("Pass `path` or `history`.");
      return frameResult(await settleThen(s, a.settleMs, {}, signal));
    }),
  );

  server.registerTool(
    "read_frame",
    {
      title: "Read frame",
      description:
        "Return the current frame as plain text, with route, size, focus and cursor. Waits for the app to go idle first. `styles: true` adds run-length encoded styled spans per row (fg/bg hex colors, bold/dim/italic/underline/strikethrough/inverse).",
      inputSchema: {
        styles: z.boolean().optional(),
        trim: z.boolean().optional().describe("Trim trailing spaces and blank rows (default true). Set false for a rectangular cell-grid snapshot."),
        region: regionSchema.optional(),
        settleMs: settleSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    tool<{ styles?: boolean; trim?: boolean; region?: { x: number; y: number; width: number; height: number }; settleMs?: number }>(35_000, "read_frame", async (s, a, signal) => {
      if (a.settleMs !== 0) await s.settle({ timeout: a.settleMs ?? 1500, signal });
      return frameResult(s.frame({ styles: a.styles, region: a.region, trim: a.trim }));
    }),
  );

  server.registerTool(
    "press",
    {
      title: "Press keys",
      description: `Press keys in order, then return the settled frame. Combos: "down", "enter", "escape", "tab", "shift+tab", "ctrl+k", "alt+x", "G" (shift+g), "?", "f2", "pageup", "space". Space-separated combos are a sequence ("down down enter"); "down*3" repeats. Max ${MAX_KEYS_PER_CALL} keys per call. All combos are validated before any key is sent.`,
      inputSchema: {
        keys: z.union([z.string().min(1).max(4000), z.array(z.string().min(1).max(200)).min(1).max(MAX_KEYS_PER_CALL)]),
        settleMs: settleSchema,
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    tool<{ keys: string | string[]; settleMs?: number }>(60_000, "press", async (s, a, signal) => {
      const n = await s.press(a.keys, signal);
      return frameResult(await settleThen(s, a.settleMs, {}, signal), { pressed: n }, `pressed ${n} key${n === 1 ? "" : "s"}`);
    }),
  );

  server.registerTool(
    "type",
    {
      title: "Type text",
      description: `Type text one key at a time into the focused component (\\n presses enter, \\t presses tab), then return the settled frame. \`submit: true\` presses enter afterwards. Up to ${MAX_TYPE_CHARS} characters; use paste for longer text.`,
      inputSchema: {
        text: z.string().max(MAX_TYPE_CHARS, `type sends one key per character (max ${MAX_TYPE_CHARS}); use paste for longer text.`),
        submit: z.boolean().optional(),
        settleMs: settleSchema,
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    tool<{ text: string; submit?: boolean; settleMs?: number }>(60_000, "type", async (s, a, signal) => {
      const n = await s.type(a.text, signal);
      if (a.submit) await s.press("return", signal);
      return frameResult(await settleThen(s, a.settleMs, {}, signal), { typed: n });
    }),
  );

  server.registerTool(
    "paste",
    {
      title: "Paste text",
      description: "Deliver text as one paste event (like ⌘V / bracketed paste), then return the settled frame.",
      inputSchema: { text: z.string().max(1_000_000), settleMs: settleSchema },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    tool<{ text: string; settleMs?: number }>(35_000, "paste", async (s, a, signal) => {
      await s.paste(a.text, signal);
      return frameResult(await settleThen(s, a.settleMs, {}, signal));
    }),
  );

  server.registerTool(
    "scroll",
    {
      title: "Scroll",
      description:
        "Scroll with the mouse wheel by `rows` (positive = down, negative = up) and optionally `cols`, then return the settled frame. <ScrollBox> scrolls on the wheel even when it has no keyboard focus. Wheel input is not positional: the focused ScrollBox gets it first, otherwise every wheel-enabled one.",
      inputSchema: {
        rows: z.number().int().min(-1000).max(1000).describe("Rows to scroll; positive scrolls down."),
        cols: z.number().int().min(-1000).max(1000).optional().describe("Columns to scroll; positive scrolls right."),
        settleMs: settleSchema,
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    tool<{ rows: number; cols?: number; settleMs?: number }>(35_000, "scroll", async (s, a, signal) => {
      const n = await s.scroll(a.rows, a.cols ?? 0, signal);
      return frameResult(await settleThen(s, a.settleMs, {}, signal), { scrolled: n });
    }),
  );

  server.registerTool(
    "resize",
    {
      title: "Resize",
      description: "Resize the grid (columns × rows; clamped to 10–1000 × 3–500) and return the settled frame.",
      inputSchema: { cols: z.number().int().min(1).max(1000), rows: z.number().int().min(1).max(500), settleMs: settleSchema },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    tool<{ cols: number; rows: number; settleMs?: number }>(35_000, "resize", async (s, a, signal) => {
      s.resize(a.cols, a.rows);
      return frameResult(await settleThen(s, a.settleMs, {}, signal));
    }),
  );

  server.registerTool(
    "inspect_tree",
    {
      title: "Inspect tree",
      description:
        "The React component tree interleaved with scene nodes (box / text) and their screen bounds [x,y w×h], plus every focusable id (useFocus) with its component, bounds and Tab eligibility. Use `component` to return only matching subtrees and `hosts: false` for components only.",
      inputSchema: {
        component: z.string().max(200).optional().describe("Case-insensitive component name filter."),
        hosts: z.boolean().optional().describe("Include box/text scene nodes (default true)."),
        maxDepth: z.number().int().min(1).max(200).optional().describe("Levels to return (default 40), counted from each match when `component` is set."),
        format: z.enum(["text", "json"]).optional().describe("text (indented, default) or json."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    tool<{ component?: string; hosts?: boolean; maxDepth?: number; format?: "text" | "json" }>(35_000, "inspect_tree", async (s, a, signal) => {
      await s.settle({ signal });
      const r = s.inspect({ component: a.component, hosts: a.hosts, maxDepth: a.maxDepth });
      const structured = { tree: r.tree, focusables: r.focusables, activeFocusId: r.activeFocusId };
      if (a.format === "json") return { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured as unknown as Record<string, unknown> };
      const lines = [r.tree ? formatTree(r.tree) : "(tree unavailable)", "", "focusables:"];
      if (r.focusables.length === 0) lines.push("  (none)");
      for (const f of r.focusables) {
        lines.push(`  ${f.focused ? "▸" : " "} ${f.id}${f.component ? ` ${f.component}` : ""}${f.bounds ? ` ${formatBounds(f.bounds)}` : ""}${f.tabbable ? "" : " (not tabbable)"}`);
      }
      return { content: [{ type: "text", text: lines.join("\n") }], structuredContent: structured as unknown as Record<string, unknown> };
    }),
  );

  server.registerTool(
    "find",
    {
      title: "Find text",
      description: "Locate text in the current frame. Returns each match's cell bounds, its row, and the component under it.",
      inputSchema: {
        text: z.string().min(1).max(1000),
        regex: z.boolean().optional().describe("Treat `text` as a JavaScript regular expression."),
        ignoreCase: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    tool<{ text: string; regex?: boolean; ignoreCase?: boolean; limit?: number }>(35_000, "find", async (s, a, signal) => {
      await s.settle({ signal });
      const buffer = s.buffer;
      if (!buffer) throw new SessionError("The app is not mounted.");
      let matches;
      try {
        matches = findText(buffer, a.text, { regex: a.regex, ignoreCase: a.ignoreCase, limit: a.limit });
      } catch (error) {
        throw new SessionError(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
      }
      const grid = s.sceneGrid;
      const hitTest = grid ? createHitTester(s.fiberProbe, grid) : () => ({ component: null, path: [] as string[] });
      const enriched = matches.map((m) => {
        const hit = hitTest(m.x, m.y);
        return { ...m, ...(hit.component ? { component: hit.component, path: hit.path } : {}) };
      });
      const text =
        enriched.length === 0
          ? `No match for ${JSON.stringify(a.text)}.`
          : enriched.map((m) => `${formatBounds(m)}${m.component ? `  ${m.component}` : ""}  ${JSON.stringify(m.line)}`).join("\n");
      return { content: [{ type: "text", text }], structuredContent: { matches: enriched } };
    }),
  );

  server.registerTool(
    "wait_for",
    {
      title: "Wait for",
      description:
        "Wait until `text` appears, `gone` disappears, and/or `href` matches the route. With no condition wait for idle. Returns the matching frame; use styles:true to capture transient styled output without racing a second read. Timeouts include the last frame.",
      inputSchema: {
        text: z.union([z.string().min(1).max(1000), z.array(z.string().min(1).max(1000)).min(1).max(8)]).optional().describe("One visible string, or up to eight strings that must all be on the same frame."),
        gone: z.string().min(1).max(1000).optional(),
        href: z.string().startsWith("/").max(4096).optional().describe("Exact app pathname + search + hash (not a route pattern)."),
        styles: z.boolean().optional(),
        trim: z.boolean().optional(),
        idle: z.boolean().optional().describe("Also require idle after the text condition holds."),
        quietMs: z.number().int().min(10).max(10_000).optional(),
        timeoutMs: z.number().int().min(0).max(120_000).optional().describe("Default 5000."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    tool<{ text?: string | string[]; gone?: string; href?: string; styles?: boolean; trim?: boolean; idle?: boolean; quietMs?: number; timeoutMs?: number }>(
      (a) => (a.timeoutMs ?? 5000) + 5000,
      "wait_for",
      async (s, a, signal) => {
        const timeout = a.timeoutMs ?? 5000;
        const start = Date.now();
        const required = Array.isArray(a.text) ? a.text : a.text === undefined ? [] : [a.text];
        const textOk = (): boolean => (a.href === undefined || a.href === s.href) && required.every(text => s.contains(text)) && (a.gone === undefined || !s.contains(a.gone));
        const needIdle = a.idle === true || (a.text === undefined && a.gone === undefined && a.href === undefined);
        for (;;) {
          if (signal.aborted) throw signal.reason;
          // Fail fast when the app exited, crashed or failed to load: nothing will change.
          s.assertRunning();
          if (textOk() && (!needIdle || s.isIdle(a.quietMs))) break;
          if (Date.now() - start >= timeout) {
            const f = s.frame({ peek: true });
            const what = [a.text !== undefined ? `text ${JSON.stringify(a.text)}` : "", a.gone !== undefined ? `${JSON.stringify(a.gone)} to disappear` : "", a.href !== undefined ? `route ${JSON.stringify(a.href)}` : "", needIdle ? "idle" : ""]
              .filter(Boolean)
              .join(" and ");
            throw new TimeoutError(`wait_for timed out after ${timeout}ms waiting for ${what}.\n\n${formatFrame(f)}`);
          }
          await new Promise((r) => setTimeout(r, 10));
        }
        return frameResult(s.frame({ styles: a.styles, trim: a.trim }), { waitedMs: Date.now() - start });
      },
    ),
  );

  server.registerTool(
    "logs",
    {
      title: "Logs",
      description:
        "Captured console output and React errors (caught by error boundaries, uncaught, and recoverable), newest last. Each entry has a `seq`; pass the last seen `seq` as `since` to read only new entries.",
      inputSchema: {
        since: z.number().int().min(0).optional(),
        level: z.array(z.enum(["log", "info", "warn", "error", "debug"])).optional(),
        limit: z.number().int().min(1).max(1000).optional().describe("Default 100 (newest kept)."),
        clear: z.boolean().optional().describe("Clear the buffer after reading."),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (a: { since?: number; level?: LogLevel[]; limit?: number; clear?: boolean }): Promise<CallToolResult> => {
      // Readable even when the app failed to load (that is when logs matter most).
      const entries = controller.logs.read({ since: a.since, levels: a.level, limit: a.limit ?? 100 });
      if (a.clear) controller.logs.clear();
      const text =
        entries.length === 0
          ? "(no log entries)"
          : entries.map((e) => `#${e.seq} +${e.t}ms ${e.level}${e.source !== "console" ? ` [${e.source}]` : ""}${e.code ? ` ${e.code}` : ""}: ${e.message}`).join("\n");
      return { content: [{ type: "text", text }], structuredContent: { entries, cursor: controller.logs.cursor } };
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch route handler",
      description: "Call one of the app's route handlers (app/**/route.ts) in-process, exactly as `text dev` serves it. Only same-origin paths like \"/api/health?x=1\".",
      inputSchema: {
        path: z.string().min(1).max(4096),
        method: z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.string().max(1_000_000).optional(),
        timeoutMs: z.number().int().min(1).max(120_000).optional().describe("Default 30000."),
        maxBytes: z.number().int().min(1).max(4_000_000).optional().describe("Max body bytes to read (default 65536); the rest is cancelled."),
        streamMs: z.number().int().min(0).max(60_000).optional().describe("text/event-stream responses: read this long, then cancel the stream (default 1000)."),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    tool<{ path: string; method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number; maxBytes?: number; streamMs?: number }>(
      (a) => a.timeoutMs ?? 30_000,
      "fetch",
      async (s, a, signal) => {
        const r = await s.request(a.path, { method: a.method, headers: a.headers, body: a.body, maxBytes: a.maxBytes, streamMs: a.streamMs }, signal);
        const head = `${r.status} ${r.statusText}`.trim() + (r.route ? `  (${r.route})` : "  (no matching route handler)");
        const headers = Object.entries(r.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        const text = `${head}\n${headers}\n\n${r.body}${r.streaming ? "\n… (stream still open; cancelled after streamMs)" : r.truncated ? "\n… (truncated)" : ""}`;
        return { content: [{ type: "text", text }], structuredContent: r as unknown as Record<string, unknown> };
      },
    ),
  );

  server.registerTool(
    "reload",
    {
      title: "Reload",
      description: "Re-import the app after editing files: unmounts, purges project modules from the module cache, re-scans app/, remounts at the current location and returns the settled frame. Also retries a failed start.",
      inputSchema: { settleMs: settleSchema },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    (a: { settleMs?: number }): Promise<CallToolResult> =>
      locked(60_000, "reload", async (signal) => {
        const { session, purged } = await controller.reload();
        return frameResult(await settleThen(session, a.settleMs, {}, signal), { purged }, `reloaded (${purged} modules re-imported)`);
      }),
  );

  server.registerResource(
    "frame",
    "text://frame",
    { title: "Current frame", description: "The current frame as plain text (with a route/focus header).", mimeType: "text/plain" },
    async (uri) => {
      const s = await withTimeout(controller.get(), 35_000, "text://frame");
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text: formatFrame(s.frame({ peek: true })) }] };
    },
  );

  server.registerResource(
    "routes",
    "text://routes",
    { title: "Routes", description: "Pages and route handlers in app/ (JSON).", mimeType: "application/json" },
    async (uri) => {
      const s = await withTimeout(controller.get(), 35_000, "text://routes");
      return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(s.routes(), null, 2) }] };
    },
  );

  return { server, controller };
}
