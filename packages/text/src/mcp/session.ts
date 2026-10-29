/**
 * A headless Text.js app session for `text mcp`: the `app/` directory mounted
 * in-process (same route manifest and in-process route handlers as `text run`,
 * memory history), rendered into an offscreen cell grid and driven with keys.
 *
 * Frame pacing is deterministic for agents: every input waits for the app to
 * go idle — no scheduled frame, no in-flight `fetch`, and no commit or frame
 * for `quietMs` — before the frame is read.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { existsSync, realpathSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { ATTR_INVERSE, ATTR_WIDE_CONT, initYoga, InputEngine, type ConsoleTarget, type KeyInputEvent, type RendererScheduler } from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ThemeName } from "@textjs/react";
import { createMemoryHistory, type MemoryHistory } from "../history";
import { isNavigationError } from "../navigation-errors";
import { AppRouter } from "../router";
import { resolveMetadata, resolveRoute, searchParamsToRecord, type FlatRoute, type RouteManifest } from "../routing";
import { listApiRoutes, listPages, matchApiRoute, scanApp, toApiManifest, type ApiRoute, type AppScan } from "../server/scan";
import type { RouteHandlerModule } from "../server/http";
import { runRouteHandlerWithCache } from "../server/cache-route";
import { loadRuntimeManifest } from "../cli/run";
import { installServerJsxRuntime } from "../server/bun-jsx";
import { prepareServerManifest } from "../server/live-app";
import { ServerComponentCache, ServerComponentsProvider } from "../server/server-components";
import { loadTextConfig } from "../cli/config";
import { frameContains, frameText, styledRows, type Region, type StyledRow } from "./frame";
import { FiberProbe, inspect, type Bounds, type InspectOptions, type InspectResult, type SceneGrid } from "./inspect";
import { parseKeyInput, textToKeyEvents } from "./keys";
import { LogBuffer, txCodeOf } from "./logs";

export interface SessionOptions {
  /** Project root (the directory containing `app/`). */
  root: string;
  /** Initial pathname (default `/`). */
  path?: string;
  /** Grid size (default: `text.config.ts` `viewport`, else 100×32). */
  cols?: number;
  rows?: number;
  theme?: ThemeName;
  /** Skip `text.config.ts`. */
  skipConfig?: boolean;
  /** Shared log buffer (console capture writes into the same buffer). */
  logs?: LogBuffer;
  /** Origin same-origin `fetch()` paths resolve against (default `http://localhost:3000`). */
  origin?: string;
  /** Quiet period that counts as idle (default 50ms). */
  quietMs?: number;
}

export interface SettleResult {
  idle: boolean;
  waitedMs: number;
}

export interface FocusSummary {
  id: string;
  component?: string;
  bounds?: Bounds;
}

export interface FrameSnapshot {
  text: string;
  cols: number;
  rows: number;
  /** Current location (`pathname + search + hash`). */
  href: string;
  /** Matched route pattern (`/deployments/[id]`, or `/_not-found`). */
  route: string;
  title?: string;
  /** Count of distinct frames painted since the session started. */
  frame: number;
  idle: boolean;
  focus: FocusSummary | null;
  /** Block-cursor position inside the focused component, when one is visible. */
  cursor: { x: number; y: number } | null;
  /** Errors logged since the previous frame read (see the `logs` tool). */
  newErrors: number;
  /** Set when the app is not mounted (it called `exit()`, crashed, or failed to load). */
  status: "running" | "exited" | "crashed" | "failed";
  styles?: StyledRow[];
}

export interface FetchResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  /** Body was cut at `maxBytes`, or an event stream was cut after `streamMs`. */
  truncated: boolean;
  /** The response was still streaming when reading stopped (event streams). */
  streaming?: boolean;
  /** Matched `app/**\/route.ts` pattern. */
  route: string | null;
}

/** A tool-facing error with an optional `TX###` code. */
export class SessionError extends Error {
  readonly code: string | undefined;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "SessionError";
    this.code = code;
  }
}

const nullConsole: ConsoleTarget = { clear() {}, log() {} };
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const MIN_FRAME_GAP_MS = 8;
/**
 * React throttles revealing resolved Suspense boundaries (300ms after the
 * last fallback commit), so a settled server-component promise may commit
 * that much later: stay busy until it can have.
 */
const SUSPENSE_REVEAL_MS = 350;

/** `setTimeout`-driven frames, with the pending set visible for idle detection. */
class TrackedScheduler implements RendererScheduler {
  readonly pending = new Set<ReturnType<typeof setTimeout>>();
  private lastRun = 0;
  constructor(private readonly onActivity: () => void) {}
  request(cb: () => void): unknown {
    this.onActivity();
    // A small gap caps runaway render loops at ~120fps without slowing input.
    const delay = Math.max(0, this.lastRun + MIN_FRAME_GAP_MS - Date.now());
    const h = setTimeout(() => {
      this.pending.delete(h);
      this.lastRun = Date.now();
      cb();
    }, delay);
    this.pending.add(h);
    return h;
  }
  cancel(handle: unknown): void {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
    this.pending.delete(handle as ReturnType<typeof setTimeout>);
  }
  dispose(): void {
    for (const h of this.pending) clearTimeout(h);
    this.pending.clear();
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** `@textjs/next` sources (`src/` or `dist/`): never purged on reload. */
const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export class HeadlessSession {
  readonly logs: LogBuffer;
  readonly rootDir: string;
  private readonly options: SessionOptions;
  private scan!: AppScan;
  private manifest: RouteManifest | null = null;
  private appRoot: ConsoleRoot | null = null;
  private scheduler: TrackedScheduler | null = null;
  private probe: FiberProbe | null = null;
  private readonly history: MemoryHistory;
  private theme: ThemeName | undefined;
  private cols = 100;
  private rows = 32;
  private generation = 0;
  private frameSeq = 0;
  private lastActivity = Date.now();
  /** In-flight `fetch` calls per mount generation (a stale app's hung request never blocks idleness). */
  private readonly inflight = new Map<number, number>();
  private errorCursor = 0;
  /** Normalized `options.origin` (no trailing slash). */
  private readonly origin: string;
  private status: FrameSnapshot["status"] = "failed";
  private loadError: unknown = null;
  private disposed = false;
  /** Async Server Components' promises (pending ones keep the session busy). */
  private readonly serverCache: ServerComponentCache;
  readonly quietMs: number;

  private constructor(options: SessionOptions) {
    this.options = options;
    this.rootDir = resolve(options.root);
    this.logs = options.logs ?? new LogBuffer();
    this.history = createMemoryHistory(options.path ?? "/");
    this.quietMs = options.quietMs ?? 50;
    this.origin = new URL(options.origin ?? "http://localhost:3000").origin;
    this.serverCache = new ServerComponentCache(() => this.touch());
    this.history.listen(() => this.touch());
  }

  /** Load `text.config.ts`, import every route module and mount the app. */
  static async start(options: SessionOptions): Promise<HeadlessSession> {
    const session = new HeadlessSession(options);
    await initYoga();
    await session.loadConfig();
    await session.mount();
    if (session.status === "failed") {
      const err = session.loadError;
      await session.dispose();
      throw err instanceof Error ? err : new SessionError(errorMessage(err));
    }
    await session.settle();
    session.errorCursor = session.logs.cursor;
    return session;
  }

  private touch(): void {
    this.lastActivity = Date.now();
  }

  private async loadConfig(): Promise<void> {
    let cfgCols: number | undefined;
    let cfgRows: number | undefined;
    let appDir = "app";
    if (!this.options.skipConfig) {
      const { config } = await loadTextConfig(this.rootDir, "serve");
      const vp = (config as { viewport?: { width?: unknown; height?: unknown; theme?: unknown } }).viewport;
      if (typeof vp?.width === "number") cfgCols = vp.width;
      if (typeof vp?.height === "number") cfgRows = vp.height;
      if (typeof vp?.theme === "string" && this.options.theme === undefined) this.theme = vp.theme as ThemeName;
      if (typeof config.appDir === "string") appDir = config.appDir;
    }
    if (this.options.theme !== undefined) this.theme = this.options.theme;
    this.cols = clampCols(this.options.cols ?? cfgCols ?? 100);
    this.rows = clampRows(this.options.rows ?? cfgRows ?? 32);
    this.scan = scanApp(this.rootDir, appDir);
    if (!existsSync(this.scan.appDir)) throw new SessionError(`No app/ directory found in ${this.rootDir}.`, "TX018");
  }

  private trackFetch(gen: number, delta: number): void {
    const n = (this.inflight.get(gen) ?? 0) + delta;
    if (n > 0) this.inflight.set(gen, n);
    else this.inflight.delete(gen);
    this.touch();
  }

  /**
   * The app's `fetch`: same-origin URLs (`"/api/health"`,
   * `"http://localhost:3000/api/x"`) run `app/**\/route.ts` handlers in-process
   * exactly like `text dev`; everything else goes to the network.
   */
  async handleFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const gen = this.generation;
    this.trackFetch(gen, 1);
    try {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = sameOriginUrl(raw, this.origin);
      if (!url) return await networkFetch()(input, init);
      const hit = matchApiRoute(toApiManifest(this.scan), url.pathname);
      if (!hit) return new Response("Not Found", { status: 404 });
      const mod = (await import(pathToFileURL(hit.file).href)) as RouteHandlerModule;
      const request = input instanceof Request ? new Request(url, init ? new Request(input, init) : input) : new Request(url, init);
      return await runRouteHandlerWithCache(mod, request, { params: hit.params, pattern: hit.pattern, pathname: url.pathname, cache: false });
    } finally {
      this.trackFetch(gen, -1);
    }
  }

  private recordError(source: "react", error: unknown, componentStack?: string | null): void {
    if (isNavigationError(error)) return;
    const args: unknown[] = [error];
    if (componentStack) args.push(`\nComponent stack:${componentStack}`);
    this.logs.push("error", source, args);
  }

  private async mount(): Promise<void> {
    attachFetch(this);
    const gen = ++this.generation;
    // `async function` components (e.g. `runtime = "server"` pages) render like in `text dev`.
    installServerJsxRuntime(this.rootDir);
    try {
      this.manifest = await loadRuntimeManifest(this.scan);
    } catch (error) {
      this.status = "failed";
      this.loadError = error;
      this.logs.push("error", "server", ["Failed to load app/ modules:", error]);
      return;
    }
    const scheduler = new TrackedScheduler(() => this.touch());
    this.scheduler = scheduler;
    const root = createConsoleRootSync({
      width: this.cols,
      height: this.rows,
      console: nullConsole,
      input: new InputEngine({ document: null }),
      registerGlobal: false,
      scheduler,
      minFrameInterval: 0,
      theme: this.theme,
      onFrame: (f) => {
        if (f.skipped) return;
        this.frameSeq++;
        this.touch();
      },
      onUncaughtError: (error) => {
        this.recordError("react", error);
        if (gen === this.generation) this.status = "crashed";
      },
      onCaughtError: (error, info) => this.recordError("react", error, info.componentStack),
      onRecoverableError: (error) => this.logs.push("warn", "react", [error]),
    });
    this.appRoot = root;
    void root.waitUntilExit().then(() => {
      if (gen === this.generation && !this.disposed && this.status === "running") this.status = "exited";
    });
    this.status = "running";
    this.loadError = null;
    const probeRef = (p: FiberProbe | null): void => {
      if (gen === this.generation) this.probe = p;
    };
    const tree = (
      createElement(
        ServerComponentsProvider,
        { cache: this.serverCache },
        createElement(
          FiberProbe,
          { ref: probeRef },
          createElement(AppRouter, { routes: prepareServerManifest(this.manifest), history: this.history, theme: this.theme, documentTitle: false, errorStore: null }),
        ),
      )
    );
    fetchScope.run(this, () => {
      root.render(tree);
      root.flushSyncRender();
    });
  }

  private unmountApp(): void {
    this.generation++;
    this.scheduler?.dispose();
    this.scheduler = null;
    this.serverCache.clear();
    const root = this.appRoot;
    this.appRoot = null;
    this.probe = null;
    if (root && !root.unmounted) {
      try {
        root.unmount();
      } catch (error) {
        this.logs.push("error", "server", ["Error while unmounting:", error]);
      }
    }
  }

  private requireRoot(): ConsoleRoot {
    if (this.disposed) throw new SessionError("The session is closed.");
    const root = this.appRoot;
    if (!root || this.status === "failed") {
      throw new SessionError(`The app failed to load: ${errorMessage(this.loadError)}\nFix the error and call \`reload\`.`, txCodeOf(this.loadError));
    }
    if (root.unmounted || this.status === "exited") throw new SessionError("The app exited (it called exit()). Call `reload` to start it again.");
    return root;
  }

  /** Throw a tool error unless the app is mounted and running (not exited, crashed or failed to load). */
  assertRunning(): void {
    this.requireRoot();
    if (this.status === "crashed") throw new SessionError("The app crashed with an uncaught error (see `logs`). Fix it and call `reload`.");
  }

  /** Whether the app is idle right now (see the module comment). */
  isIdle(quietMs = this.quietMs): boolean {
    if (!this.appRoot) return true;
    const pending = this.scheduler?.pending.size ?? 0;
    const now = Date.now();
    const server = this.serverCache.pending === 0 && now - this.serverCache.lastSettled >= SUSPENSE_REVEAL_MS;
    return pending === 0 && (this.inflight.get(this.generation) ?? 0) === 0 && server && now - this.lastActivity >= quietMs;
  }

  /**
   * Wait until the app is idle or `timeout` elapses. On timeout (a spinner or
   * live chart that never stops), the pending frame is flushed so reads still
   * see the latest committed tree.
   */
  async settle(options: { quietMs?: number; timeout?: number; signal?: AbortSignal } = {}): Promise<SettleResult> {
    const quietMs = options.quietMs ?? this.quietMs;
    const timeout = options.timeout ?? 1500;
    const start = Date.now();
    for (;;) {
      throwIfAborted(options.signal);
      if (this.isIdle(quietMs)) return { idle: true, waitedMs: Date.now() - start };
      if (Date.now() - start >= timeout) break;
      await sleep(Math.min(10, Math.max(1, quietMs / 4)));
    }
    const root = this.appRoot;
    if (root && !root.unmounted && (this.scheduler?.pending.size ?? 0) > 0) root.flushSyncRender();
    return { idle: false, waitedMs: Date.now() - start };
  }

  /**
   * Send events in order, letting each one's effects and follow-up commits
   * land before the next. Stops if the app exits or `signal` aborts (a timed
   * out tool call must not keep typing into the next call's frame).
   */
  private async dispatch(events: ReadonlyArray<{ kind: "key"; event: KeyInputEvent } | { kind: "paste"; text: string }>, signal?: AbortSignal): Promise<void> {
    const root = this.requireRoot();
    for (const e of events) {
      throwIfAborted(signal);
      if (root.unmounted || root !== this.appRoot) break;
      this.touch();
      fetchScope.run(this, () => {
        try {
          if (e.kind === "key") root.input.emit("key", e.event);
          else root.input.handlePaste(e.text);
        } catch (error) {
          this.logs.push("error", "react", ["Error in input handler:", error]);
        }
      });
      await sleep(0);
    }
  }

  async press(keys: string | readonly string[], signal?: AbortSignal): Promise<number> {
    const events = parseKeyInput(keys);
    await this.dispatch(
      events.map((event) => ({ kind: "key" as const, event })),
      signal,
    );
    return events.length;
  }

  async type(text: string, signal?: AbortSignal): Promise<number> {
    const events = textToKeyEvents(text);
    await this.dispatch(
      events.map((event) => ({ kind: "key" as const, event })),
      signal,
    );
    return events.length;
  }

  async paste(text: string, signal?: AbortSignal): Promise<void> {
    await this.dispatch([{ kind: "paste", text }], signal);
  }

  resize(cols: number, rows: number): { cols: number; rows: number } {
    const root = this.requireRoot();
    this.cols = clampCols(cols);
    this.rows = clampRows(rows);
    this.touch();
    root.renderer.resize(this.cols, this.rows);
    return { cols: this.cols, rows: this.rows };
  }

  navigate(target: { path: string; replace?: boolean } | "back" | "forward"): void {
    this.requireRoot();
    this.touch();
    if (target === "back") this.history.back();
    else if (target === "forward") this.history.forward();
    else if (target.replace) this.history.replace(target.path);
    else this.history.push(target.path);
  }

  get href(): string {
    return this.history.location.href;
  }

  routes(): { pages: FlatRoute[]; api: ApiRoute[]; current: string } {
    return {
      pages: listPages(this.scan),
      api: listApiRoutes(this.scan).map((r) => ({ pattern: r.pattern, file: toProjectPath(this.rootDir, r.file) })),
      current: this.href,
    };
  }

  /** Read the current frame. Errors logged since the previous read are counted in `newErrors`. */
  frame(options: { styles?: boolean; region?: Partial<Region>; /** Don't reset the `newErrors` counter. */ peek?: boolean } = {}): FrameSnapshot {
    const root = this.appRoot;
    const loc = this.history.location;
    let route = loc.pathname;
    let title: string | undefined;
    if (this.manifest) {
      const match = resolveRoute(this.manifest, loc.pathname);
      route = match.pattern;
      title = resolveMetadata(match, searchParamsToRecord(loc.search)).title;
    }
    const newErrors = this.logs.errorsSince(this.errorCursor);
    if (!options.peek) this.errorCursor = this.logs.cursor;
    const base = { href: loc.href, route, ...(title !== undefined ? { title } : {}), frame: this.frameSeq, newErrors, status: this.status };
    if (!root) return { ...base, text: "", cols: this.cols, rows: this.rows, idle: true, focus: null, cursor: null };
    const buffer = root.renderer.buffer;
    const focus = this.focusSummary();
    return {
      ...base,
      text: frameText(buffer, options.region),
      cols: buffer.width,
      rows: buffer.height,
      idle: this.isIdle(),
      focus,
      cursor: focus?.bounds ? findCursor(root, focus.bounds) : null,
      ...(options.styles ? { styles: styledRows(buffer, options.region) } : {}),
    };
  }

  contains(text: string): boolean {
    const root = this.appRoot;
    return root ? frameContains(root.renderer.buffer, text) : false;
  }

  get buffer(): ConsoleRoot["renderer"]["buffer"] | null {
    return this.appRoot?.renderer.buffer ?? null;
  }

  get fiberProbe(): FiberProbe | null {
    return this.probe;
  }

  /** The mounted scene and grid size, for paint-order hit testing. */
  get sceneGrid(): SceneGrid | null {
    const root = this.appRoot;
    if (!root || root.unmounted) return null;
    return { root: root.rootNode, cols: root.renderer.buffer.width, rows: root.renderer.buffer.height };
  }

  inspect(options: InspectOptions = {}): InspectResult {
    const root = this.requireRoot();
    return inspect(this.probe, root.focus, options);
  }

  private focusSummary(): FocusSummary | null {
    const root = this.appRoot;
    if (!root) return null;
    const id = root.focus.getActiveId();
    if (id === null) return null;
    const info = inspect(this.probe, root.focus, { hosts: false }).focusables.find((f) => f.id === id);
    return { id, ...(info?.component ? { component: info.component } : {}), ...(info?.bounds ? { bounds: info.bounds } : {}) };
  }

  /**
   * Call an `app/**\/route.ts` handler in-process. The body is read up to
   * `maxBytes` (then cancelled); event streams are read for `streamMs` and
   * cancelled, so an SSE route returns its first events instead of hanging.
   */
  async request(
    path: string,
    init: { method?: string; headers?: Record<string, string>; body?: string; maxBytes?: number; streamMs?: number } = {},
    signal?: AbortSignal,
  ): Promise<FetchResult> {
    const url = path.startsWith("/") ? sameOriginUrl(path, this.origin) : null;
    if (!url) throw new SessionError(`fetch only calls the app's own route handlers; pass a path like "/api/health" (got ${JSON.stringify(path)}).`);
    attachFetch(this);
    const hit = matchApiRoute(toApiManifest(this.scan), url.pathname);
    const method = (init.method ?? "GET").toUpperCase();
    const response = await abortable(
      fetchScope.run(this, () => this.handleFetch(url.href, { method, headers: init.headers, body: method === "GET" || method === "HEAD" ? undefined : init.body, signal })),
      signal,
    );
    const maxBytes = init.maxBytes ?? 64 * 1024;
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const type = response.headers.get("content-type") ?? "";
    const stream = /event-stream/i.test(type);
    const read = await readBody(response, maxBytes, stream ? (init.streamMs ?? 1000) : Number.POSITIVE_INFINITY, signal);
    const textual = type === "" || /^text\/|json|xml|javascript|ndjson|x-www-form-urlencoded|event-stream/i.test(type);
    const body = textual ? new TextDecoder().decode(read.bytes) : `<${read.bytes.length}${read.truncated ? "+" : ""} bytes of ${type}>`;
    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      truncated: read.truncated,
      ...(stream && read.open ? { streaming: true } : {}),
      route: hit ? hit.pattern : null,
    };
  }

  /**
   * Re-import the app after file changes: unmount, purge every module under
   * the project root from the module cache, re-scan `app/`, re-import and
   * remount at the current location (history is kept).
   */
  async reload(): Promise<{ purged: number }> {
    if (this.disposed) throw new SessionError("The session is closed.");
    this.unmountApp();
    const purged = purgeModuleCache(this.rootDir);
    try {
      await this.loadConfig();
    } catch (error) {
      this.status = "failed";
      this.loadError = error;
      this.logs.push("error", "server", ["Failed to load the app:", error]);
      throw new SessionError(`Reload failed: ${errorMessage(error)}\nFix the error and call \`reload\`.`, txCodeOf(error));
    }
    await this.mount();
    if (this.status === "failed") {
      throw new SessionError(`Reload failed: ${errorMessage(this.loadError)}`, txCodeOf(this.loadError));
    }
    this.touch();
    return { purged };
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.unmountApp();
    detachFetch(this);
    this.history.dispose?.();
  }
}

function clampCols(n: number): number {
  return Math.max(10, Math.min(1000, Math.floor(Number.isFinite(n) ? n : 100)));
}

function clampRows(n: number): number {
  return Math.max(3, Math.min(500, Math.floor(Number.isFinite(n) ? n : 32)));
}

function toProjectPath(root: string, file: string): string {
  return relative(root, file).split(sep).join("/");
}

/** A single inverse-video cell inside the focused component is the block cursor of an `<Input>` / `<Textarea>`. */
function findCursor(root: ConsoleRoot, b: Bounds): { x: number; y: number } | null {
  const buf = root.renderer.buffer;
  let hit: { x: number; y: number } | null = null;
  for (let y = b.y; y < b.y + b.height; y++) {
    for (let x = b.x; x < b.x + b.width; x++) {
      const c = buf.getCell(x, y);
      // The second cell of a wide grapheme under the cursor is the same cursor.
      if (!c || (c.attrs & ATTR_INVERSE) === 0 || (c.attrs & ATTR_WIDE_CONT) !== 0) continue;
      if (hit) return null;
      hit = { x, y };
    }
  }
  return hit;
}

function realpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/**
 * Delete every cached module under `root` (except dependencies and Text.js
 * itself) so the next `import()` re-evaluates it. Bun's `require.cache`
 * covers ES modules too.
 */
export function purgeModuleCache(root: string): number {
  const cache = (typeof require !== "undefined" ? require.cache : undefined) as Record<string, unknown> | undefined;
  if (!cache) return 0;
  const roots = [resolve(root), realpath(resolve(root))].map((r) => (r.endsWith(sep) ? r : r + sep));
  const pkg = [PACKAGE_DIR, realpath(PACKAGE_DIR)].map((r) => r + sep);
  let n = 0;
  for (const key of Object.keys(cache)) {
    const file = key.startsWith("file://") ? fileURLToPath(key) : key;
    if (!roots.some((r) => file.startsWith(r))) continue;
    if (file.includes(`${sep}node_modules${sep}`) || pkg.some((p) => file.startsWith(p))) continue;
    delete cache[key];
    n++;
  }
  return n;
}


/** Which session an app `fetch()` belongs to, when async context propagates (input dispatch, renders, `request`). */
const fetchScope = new AsyncLocalStorage<HeadlessSession>();
/** Sessions routing `globalThis.fetch`, oldest first (the newest handles calls without a scope). */
const fetchSessions: HeadlessSession[] = [];
let nativeFetch: typeof fetch | null = null;
let routedFetch: typeof fetch | null = null;

/** The `fetch` that existed before any session installed its router. */
function networkFetch(): typeof fetch {
  return nativeFetch ?? (globalThis as { fetch: typeof fetch }).fetch;
}

/**
 * Route `globalThis.fetch` through the session registry. One router serves
 * every in-process session, and the original `fetch` comes back only when
 * the last session detaches, whatever the dispose order.
 */
function attachFetch(session: HeadlessSession): void {
  const g = globalThis as { fetch: typeof fetch };
  if (!routedFetch || g.fetch !== routedFetch) {
    nativeFetch = g.fetch;
    const router = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const owner = fetchScope.getStore() ?? fetchSessions[fetchSessions.length - 1];
      return owner ? owner.handleFetch(input, init) : (nativeFetch as typeof fetch)(input, init);
    };
    routedFetch = Object.assign(router, { preconnect: () => undefined }) as unknown as typeof fetch;
    g.fetch = routedFetch;
  }
  if (!fetchSessions.includes(session)) fetchSessions.push(session);
}

function detachFetch(session: HeadlessSession): void {
  const i = fetchSessions.indexOf(session);
  if (i >= 0) fetchSessions.splice(i, 1);
  if (fetchSessions.length > 0) return;
  const g = globalThis as { fetch: typeof fetch };
  if (routedFetch && g.fetch === routedFetch && nativeFetch) g.fetch = nativeFetch;
  routedFetch = null;
  nativeFetch = null;
}

/**
 * `raw` as a URL on `origin`, or `null` when it targets anything else.
 * Paths like `//evil.com` and `/\evil.com` (a backslash is a slash in
 * special-scheme URLs) are protocol-relative, not same-origin.
 */
export function sameOriginUrl(raw: string, origin: string): URL | null {
  if (raw.startsWith("/") && /^\/[\\/]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  return url.origin === origin ? url : null;
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new SessionError("The operation was cancelled.");
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw abortReason(signal);
}

/** `promise`, rejecting as soon as `signal` aborts. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

/**
 * Read at most `maxBytes` of a response body, for at most `windowMs`, then
 * cancel it. `open` is set when the body was still streaming.
 */
export async function readBody(response: Response, maxBytes: number, windowMs: number, signal?: AbortSignal): Promise<{ bytes: Uint8Array; truncated: boolean; open: boolean }> {
  const body = response.body;
  if (!body) return { bytes: new Uint8Array(0), truncated: false, open: false };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  let open = true;
  const deadline = Date.now() + windowMs;
  const TIMEOUT = Symbol("timeout");
  try {
    while (total <= maxBytes) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const tick = Number.isFinite(remaining) ? new Promise<typeof TIMEOUT>((r) => (timer = setTimeout(() => r(TIMEOUT), remaining))) : null;
      const next = await abortable(tick ? Promise.race([reader.read(), tick]) : reader.read(), signal).finally(() => clearTimeout(timer));
      if (next === TIMEOUT) {
        truncated = true;
        break;
      }
      if (next.done) {
        open = false;
        break;
      }
      chunks.push(next.value);
      total += next.value.length;
    }
    if (total > maxBytes) truncated = true;
  } finally {
    if (open) await reader.cancel().catch(() => undefined);
  }
  const all = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const c of chunks) {
    if (offset >= all.length) break;
    const part = c.subarray(0, all.length - offset);
    all.set(part, offset);
    offset += part.length;
  }
  return { bytes: all, truncated, open: open && truncated };
}
