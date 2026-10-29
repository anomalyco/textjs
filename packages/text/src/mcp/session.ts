/**
 * A headless Text.js app session for `text mcp`: the `app/` directory mounted
 * in-process (same route manifest and in-process route handlers as `text run`,
 * memory history), rendered into an offscreen cell grid and driven with keys.
 *
 * Frame pacing is deterministic for agents: every input waits for the app to
 * go idle — no scheduled frame, no in-flight `fetch`, and no commit or frame
 * for `quietMs` — before the frame is read.
 */

import { existsSync, realpathSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { ATTR_INVERSE, initYoga, InputEngine, type ConsoleTarget, type KeyInputEvent, type RendererScheduler } from "@textjs/core";
import { createConsoleRootSync, type ConsoleRoot, type ThemeName } from "@textjs/react";
import { createMemoryHistory, type MemoryHistory } from "../history";
import { isNavigationError } from "../navigation-errors";
import { AppRouter } from "../router";
import { resolveMetadata, resolveRoute, searchParamsToRecord, type FlatRoute, type RouteManifest } from "../routing";
import { listApiRoutes, listPages, matchApiRoute, scanApp, toApiManifest, type ApiRoute, type AppScan } from "../server/scan";
import { runRouteHandler, type RouteHandlerModule } from "../server/http";
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
  /** Body was cut at `maxBytes`. */
  truncated: boolean;
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
  private inflight = 0;
  private errorCursor = 0;
  private originalFetch: typeof fetch | null = null;
  private localFetch: typeof fetch | null = null;
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

  private installFetch(): void {
    if (this.originalFetch) return;
    const g = globalThis as { fetch: typeof fetch };
    const base = g.fetch;
    this.originalFetch = base;
    const origin = this.options.origin ?? "http://localhost:3000";
    const local = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      this.inflight++;
      this.touch();
      try {
        const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const sameOrigin = raw.startsWith(origin + "/") || raw === origin;
        if ((!raw.startsWith("/") || raw.startsWith("//")) && !sameOrigin) return await base(input, init);
        const url = new URL(raw, origin);
        const hit = matchApiRoute(toApiManifest(this.scan), url.pathname);
        if (!hit) return new Response("Not Found", { status: 404 });
        const mod = (await import(pathToFileURL(hit.file).href)) as RouteHandlerModule;
        const request = input instanceof Request ? new Request(url, input) : new Request(url, init);
        return await runRouteHandler(mod, request, hit.params);
      } finally {
        this.inflight--;
        this.touch();
      }
    };
    this.localFetch = Object.assign(local, { preconnect: () => undefined }) as unknown as typeof fetch;
    g.fetch = this.localFetch;
  }

  private restoreFetch(): void {
    const g = globalThis as { fetch: typeof fetch };
    if (this.originalFetch && g.fetch === this.localFetch) g.fetch = this.originalFetch;
    this.originalFetch = null;
    this.localFetch = null;
  }

  private recordError(source: "react", error: unknown, componentStack?: string | null): void {
    if (isNavigationError(error)) return;
    const args: unknown[] = [error];
    if (componentStack) args.push(`\nComponent stack:${componentStack}`);
    this.logs.push("error", source, args);
  }

  private async mount(): Promise<void> {
    this.installFetch();
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
    root.render(
      createElement(
        ServerComponentsProvider,
        { cache: this.serverCache },
        createElement(
          FiberProbe,
          { ref: probeRef },
          createElement(AppRouter, { routes: prepareServerManifest(this.manifest), history: this.history, theme: this.theme, documentTitle: false, errorStore: null }),
        ),
      ),
    );
    root.flushSyncRender();
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

  /** Whether the app is idle right now (see the module comment). */
  isIdle(quietMs = this.quietMs): boolean {
    if (!this.appRoot) return true;
    const pending = this.scheduler?.pending.size ?? 0;
    const now = Date.now();
    const server = this.serverCache.pending === 0 && now - this.serverCache.lastSettled >= SUSPENSE_REVEAL_MS;
    return pending === 0 && this.inflight === 0 && server && now - this.lastActivity >= quietMs;
  }

  /**
   * Wait until the app is idle or `timeout` elapses. On timeout (a spinner or
   * live chart that never stops), the pending frame is flushed so reads still
   * see the latest committed tree.
   */
  async settle(options: { quietMs?: number; timeout?: number } = {}): Promise<SettleResult> {
    const quietMs = options.quietMs ?? this.quietMs;
    const timeout = options.timeout ?? 1500;
    const start = Date.now();
    for (;;) {
      if (this.isIdle(quietMs)) return { idle: true, waitedMs: Date.now() - start };
      if (Date.now() - start >= timeout) break;
      await sleep(Math.min(10, Math.max(1, quietMs / 4)));
    }
    const root = this.appRoot;
    if (root && !root.unmounted && (this.scheduler?.pending.size ?? 0) > 0) root.flushSyncRender();
    return { idle: false, waitedMs: Date.now() - start };
  }

  /** Send events in order, letting each one's effects and follow-up commits land before the next. Stops if the app exits. */
  private async dispatch(events: ReadonlyArray<{ kind: "key"; event: KeyInputEvent } | { kind: "paste"; text: string }>): Promise<void> {
    const root = this.requireRoot();
    for (const e of events) {
      if (root.unmounted || root !== this.appRoot) break;
      this.touch();
      try {
        if (e.kind === "key") root.input.emit("key", e.event);
        else root.input.handlePaste(e.text);
      } catch (error) {
        this.logs.push("error", "react", ["Error in input handler:", error]);
      }
      await sleep(0);
    }
  }

  async press(keys: string | readonly string[]): Promise<number> {
    const events = parseKeyInput(keys);
    await this.dispatch(events.map((event) => ({ kind: "key" as const, event })));
    return events.length;
  }

  async type(text: string): Promise<number> {
    const events = textToKeyEvents(text);
    await this.dispatch(events.map((event) => ({ kind: "key" as const, event })));
    return events.length;
  }

  async paste(text: string): Promise<void> {
    await this.dispatch([{ kind: "paste", text }]);
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

  /** Call an `app/**\/route.ts` handler in-process. */
  async request(path: string, init: { method?: string; headers?: Record<string, string>; body?: string; maxBytes?: number } = {}): Promise<FetchResult> {
    if (!path.startsWith("/") || path.startsWith("//")) throw new SessionError(`fetch only calls the app's own route handlers; pass a path like "/api/health" (got ${JSON.stringify(path)}).`);
    this.installFetch();
    const url = new URL(path, "http://text.local");
    const hit = matchApiRoute(toApiManifest(this.scan), url.pathname);
    const method = (init.method ?? "GET").toUpperCase();
    const local = this.localFetch as typeof fetch;
    const response = await local(path, { method, headers: init.headers, body: method === "GET" || method === "HEAD" ? undefined : init.body });
    const maxBytes = init.maxBytes ?? 64 * 1024;
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const type = response.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await response.arrayBuffer());
    const textual = type === "" || /^text\/|json|xml|javascript|ndjson|x-www-form-urlencoded|event-stream/i.test(type);
    let body: string;
    let truncated = false;
    if (!textual) body = `<${bytes.length} bytes of ${type}>`;
    else {
      truncated = bytes.length > maxBytes;
      body = new TextDecoder().decode(truncated ? bytes.subarray(0, maxBytes) : bytes);
    }
    return { status: response.status, statusText: response.statusText, headers, body, truncated, route: hit ? hit.pattern : null };
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
    await this.loadConfig();
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
    this.restoreFetch();
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
      if (!c || (c.attrs & ATTR_INVERSE) === 0) continue;
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

