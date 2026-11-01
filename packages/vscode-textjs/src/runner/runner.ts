/**
 * Headless preview runner (a child process of the extension host).
 *
 * Loads the project's own Vite and `@textjs/app` from the workspace, imports
 * route files through Vite's SSR module loader (TypeScript, JSX, aliases) and
 * renders the App Router — or a single component — into an offscreen console
 * root. Frames go back to the extension as protocol row deltas.
 */

import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { extractStyledFrame, type CellBuffer } from "@textjs/core";
import { FrameEncoder, type InputMessage } from "@textjs/app/frame-protocol";
import type { HostToRunner, RunnerTarget, RunnerToHost } from "./messages";

type AnyModule = Record<string, any>;

const send = (msg: RunnerToHost): void => {
  process.send?.(msg);
};

function pickExport(entry: unknown): string | null {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    for (const k of ["import", "node", "default"]) {
      const v = pickExport(e[k]);
      if (v) return v;
    }
  }
  return null;
}

/** Resolve a package's ESM entry (`exports["."].import`) as seen from `fromDir`. */
export function resolveEsmPackage(name: string, fromDir: string): string | null {
  const req = createRequire(join(fromDir, "noop.js"));
  let pkgFile: string;
  try {
    pkgFile = req.resolve(`${name}/package.json`);
  } catch {
    return null;
  }
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as { exports?: Record<string, unknown> | string; module?: string; main?: string };
  const exp = typeof pkg.exports === "string" ? pkg.exports : pkg.exports?.["."] ?? null;
  const rel = pickExport(exp) ?? pkg.module ?? pkg.main ?? "index.js";
  return join(dirname(pkgFile), rel);
}

function findTextPackageDir(root: string): string | null {
  try {
    return dirname(createRequire(join(root, "noop.js")).resolve("@textjs/app/package.json"));
  } catch {
    return null;
  }
}

const RUNTIME_ID = "virtual:textjs-preview/runtime";
const ROUTES_ID = "virtual:textjs/routes";
const RUNTIME_SOURCE = `export { AppRouter, createMemoryHistory } from "@textjs/app/router";
export { createConsoleRoot, Box, Text } from "@textjs/app";
export { Component, createElement } from "react";
`;

const CONFIG_FILES = ["text.config.ts", "text.config.mts", "text.config.js", "text.config.mjs"];

interface ViteLike {
  createServer(config: AnyModule): Promise<ViteServerLike>;
  mergeConfig(a: AnyModule, b: AnyModule): AnyModule;
}

interface ViteServerLike {
  ssrLoadModule(id: string): Promise<AnyModule>;
  ssrFixStacktrace(e: Error): void;
  moduleGraph: { invalidateAll(): void };
  close(): Promise<void>;
}

class Runner {
  private vite!: ViteLike;
  private server!: ViteServerLike;
  private rt!: AnyModule;
  private root!: string;
  private appDir = "app";
  private consoleRoot: AnyModule | null = null;
  private history: AnyModule | null = null;
  private target!: RunnerTarget;
  private theme: unknown;
  private readonly encoder = new FrameEncoder();
  private cols = 80;
  private rows = 24;
  private generation = 0;

  async init(msg: Extract<HostToRunner, { type: "init" }>): Promise<void> {
    this.root = msg.root;
    this.cols = msg.cols;
    this.rows = msg.rows;
    this.target = msg.target;
    const textDir = findTextPackageDir(this.root);
    if (!textDir) throw new Error("Could not find @textjs/app in this project. Run your package manager's install first.");
    const vitePath = resolveEsmPackage("vite", textDir) ?? resolveEsmPackage("vite", this.root);
    if (!vitePath) throw new Error("Could not find Vite (a dependency of @textjs/app).");
    this.vite = (await import(pathToFileURL(vitePath).href)) as ViteLike;
    await this.createServer(null);
    const config = await this.loadConfig();
    if (config) {
      this.theme = (config.viewport as AnyModule | undefined)?.theme;
      if (typeof config.appDir === "string") this.appDir = config.appDir;
      if (config.vite) {
        await this.server.close();
        await this.createServer(config.vite as AnyModule);
      }
    }
    this.rt = await this.server.ssrLoadModule(RUNTIME_ID);
    this.installLocalFetch(msg.devUrl);
    await this.mount();
  }

  /**
   * Same-origin `fetch("/api/...")` runs the app's route handlers in-process
   * (or goes to the dev server when one is running), like `text run`.
   */
  private installLocalFetch(devUrl: string | undefined): void {
    const original = globalThis.fetch;
    const origin = devUrl ?? "http://localhost:3000";
    const local = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!raw.startsWith("/") || raw.startsWith("//")) return original(input, init);
      const url = new URL(raw, origin);
      if (devUrl) return original(url, init);
      const plugin = await this.server.ssrLoadModule("@textjs/app/vite");
      const routes = plugin.listApiRoutes(plugin.scanApp(this.root, this.appDir)) as Array<{ pattern: string; file: string }>;
      for (const r of routes) {
        const params = matchPattern(r.pattern, url.pathname);
        if (!params) continue;
        const mod = await this.server.ssrLoadModule(r.file);
        const request = new Request(url, init);
        const method = request.method.toUpperCase();
        const handler = mod[method] ?? (method === "HEAD" ? mod.GET : undefined);
        if (typeof handler !== "function") return new Response(null, { status: 405 });
        return (await handler(request, { params })) as Response;
      }
      return new Response("Not Found", { status: 404 });
    };
    globalThis.fetch = Object.assign(local, { preconnect: () => undefined }) as unknown as typeof fetch;
  }

  private async createServer(userVite: AnyModule | null): Promise<void> {
    const self = this;
    const inline: AnyModule = {
      root: this.root,
      configFile: false,
      logLevel: "silent",
      appType: "custom",
      mode: "development",
      clearScreen: false,
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
      esbuild: { jsx: "automatic" },
      resolve: { dedupe: ["react", "react-dom"] },
      plugins: [
        {
          name: "textjs-preview",
          enforce: "pre",
          resolveId(id: string) {
            if (id === RUNTIME_ID || id === ROUTES_ID) return `\0${id}`;
            return null;
          },
          async load(id: string) {
            if (id === `\0${RUNTIME_ID}`) return RUNTIME_SOURCE;
            if (id === `\0${ROUTES_ID}`) {
              const plugin = await self.server.ssrLoadModule("@textjs/app/vite");
              return plugin.generateRoutesModule(plugin.scanApp(self.root, self.appDir)) as string;
            }
            return null;
          },
        },
      ],
    };
    const config = userVite ? this.vite.mergeConfig(inline, { resolve: userVite.resolve ?? {}, define: userVite.define ?? {} }) : inline;
    this.server = await this.vite.createServer(config);
  }

  private async loadConfig(): Promise<AnyModule | null> {
    const file = CONFIG_FILES.map((f) => join(this.root, f)).find((f) => existsSync(f));
    if (!file) return null;
    try {
      const mod = await this.server.ssrLoadModule(file);
      const cfg = mod.default;
      return (typeof cfg === "function" ? await cfg({ command: "serve", mode: "development" }) : cfg) ?? null;
    } catch {
      return null;
    }
  }

  private reportError(error: unknown, kind: "uncaught" | "caught" = "uncaught"): void {
    const e = error instanceof Error ? error : new Error(String(error));
    try {
      this.server.ssrFixStacktrace(e);
    } catch {}
    const viteFrame = (e as { frame?: string }).frame;
    const file = (e as { id?: string; loc?: { file?: string } }).loc?.file ?? (e as { id?: string }).id;
    send({ type: "error", message: `${kind === "caught" ? "Caught by an error boundary: " : ""}${e.message}`, stack: [viteFrame, e.stack].filter(Boolean).join("\n\n"), file });
  }

  private async buildElement(): Promise<unknown> {
    const { createElement, AppRouter, createMemoryHistory } = this.rt;
    if (this.target.kind === "route") {
      const routes = (await this.server.ssrLoadModule(ROUTES_ID)).routes;
      this.history ??= createMemoryHistory(this.target.path);
      return createElement(AppRouter, { routes, history: this.history, theme: this.theme, documentTitle: false, errorStore: null });
    }
    const mod = await this.server.ssrLoadModule(this.target.file);
    const comp = pickComponent(mod);
    if (!comp) throw new Error("This file has no component to preview. Export a component as default (or a PascalCase named export).");
    return createElement(this.boundary(), null, createElement(comp));
  }

  private boundaryClass: unknown = null;

  /** An error boundary built on the project's own React. */
  private boundary(): unknown {
    if (this.boundaryClass) return this.boundaryClass;
    const { Component } = this.rt;
    const report = (e: unknown): void => this.reportError(e);
    class PreviewBoundary extends (Component as new (props: AnyModule) => AnyModule) {
      state = { failed: false };
      static getDerivedStateFromError(): AnyModule {
        return { failed: true };
      }
      componentDidCatch(error: unknown): void {
        report(error);
      }
      render(): unknown {
        return this.state.failed ? null : this.props.children;
      }
    }
    this.boundaryClass = PreviewBoundary;
    return PreviewBoundary;
  }

  private async mount(): Promise<void> {
    const gen = ++this.generation;
    let element: unknown;
    try {
      element = await this.buildElement();
    } catch (e) {
      this.reportError(e);
      return;
    }
    if (gen !== this.generation) return;
    send({ type: "clearError" });
    if (!this.consoleRoot) {
      this.consoleRoot = await this.rt.createConsoleRoot({
        width: this.cols,
        height: this.rows,
        responsive: false,
        registerGlobal: false,
        minFrameInterval: 33,
        theme: this.theme,
        console: { log() {}, clear() {} },
        onUncaughtError: (e: unknown) => this.reportError(e),
        onCaughtError: (e: unknown) => this.reportError(e, "caught"),
        onRecoverableError: () => undefined,
      });
      const r = this.consoleRoot as AnyModule;
      r.renderer.setFocused(true);
      r.onFrame((f: { skipped: boolean }) => {
        if (!f.skipped) this.emit();
      });
    }
    (this.consoleRoot as AnyModule).render(element);
    setTimeout(() => this.emit(), 50);
  }

  private emit(): void {
    const r = this.consoleRoot;
    if (!r) return;
    const frame = this.encoder.encode(extractStyledFrame(r.renderer.buffer as CellBuffer), {
      source: "headless",
      meta: { path: this.history?.getLocation().pathname, focused: r.renderer.focused },
    });
    if (frame) send({ type: "frame", frame });
  }

  async handle(msg: HostToRunner): Promise<void> {
    switch (msg.type) {
      case "init":
        await this.init(msg);
        send({ type: "ready", version: "1" });
        break;
      case "target":
        this.target = msg.target;
        this.history = null;
        await this.mount();
        break;
      case "reload":
        this.server.moduleGraph.invalidateAll();
        await this.mount();
        break;
      case "resize":
        this.cols = msg.cols;
        this.rows = msg.rows;
        (this.consoleRoot as AnyModule | null)?.renderer.resize(msg.cols, msg.rows);
        break;
      case "input":
        this.input(msg.msg);
        break;
      case "focus":
        (this.consoleRoot as AnyModule | null)?.renderer.setFocused(msg.focused);
        break;
      case "dispose":
        (this.consoleRoot as AnyModule | null)?.unmount();
        await this.server?.close();
        process.exit(0);
    }
  }

  private input(msg: InputMessage): void {
    const r = this.consoleRoot as AnyModule | null;
    if (!r) return;
    switch (msg.type) {
      case "key":
        r.input.handleKeyDown({ ...msg, preventDefault() {} });
        break;
      case "paste":
        r.input.handlePaste(msg.text);
        break;
      case "wheel":
        r.input.handleWheel({ ...msg, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false });
        break;
      case "navigate":
        this.history?.push(msg.href);
        break;
    }
  }
}

/** Match `/api/echo/[name]`, `[...slug]` and `[[...slug]]` patterns against a pathname. */
export function matchPattern(pattern: string, pathname: string): Record<string, string | string[]> | null {
  const pp = pattern.split("/").filter((s) => s !== "" && !/^\(.+\)$/.test(s));
  const sp = pathname.split("/").filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const params: Record<string, string | string[]> = {};
  for (let i = 0; i < pp.length; i++) {
    const p = pp[i] as string;
    let m: RegExpExecArray | null;
    if ((m = /^\[\[?\.\.\.(.+?)\]\]?$/.exec(p))) {
      const rest = sp.slice(i);
      if (rest.length === 0 && !p.startsWith("[[")) return null;
      if (rest.length > 0) params[m[1] as string] = rest;
      return params;
    }
    const s = sp[i];
    if (s === undefined) return null;
    if ((m = /^\[(.+)\]$/.exec(p))) params[m[1] as string] = s;
    else if (p !== s) return null;
  }
  return pp.length === sp.length ? params : null;
}

/** The component to preview: the default export, else the first PascalCase function export. */
export function pickComponent(mod: AnyModule): unknown {
  const isComponent = (v: unknown): boolean => typeof v === "function" || (typeof v === "object" && v !== null && "$$typeof" in v);
  if (isComponent(mod.default)) return mod.default;
  for (const [name, value] of Object.entries(mod)) if (/^[A-Z]/.test(name) && isComponent(value)) return value;
  return null;
}

if (process.send) {
  const runner = new Runner();
  let chain: Promise<void> = Promise.resolve();
  process.on("message", (msg: HostToRunner) => {
    chain = chain.then(() =>
      runner.handle(msg).catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e));
        send({ type: "error", message: err.message, stack: err.stack });
      }),
    );
  });
  process.on("disconnect", () => process.exit(0));
  process.on("uncaughtException", (e) => send({ type: "error", message: e.message, stack: e.stack }));
  process.on("unhandledRejection", (e) => send({ type: "error", message: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined }));
}
