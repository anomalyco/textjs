/**
 * Extension-host side of the headless preview: forks `dist/runner.mjs` in the
 * project directory and decodes its frames. Pure Node (no `vscode`).
 */

import { fork, type ChildProcess } from "node:child_process";
import { FrameDecoder, parseWireFrame, type FrameMeta, type InputMessage } from "@textjs/app/frame-protocol";
import type { StyledFrame } from "@textjs/core";
import type { HostToRunner, RunnerTarget, RunnerToHost } from "./runner/messages";

export interface HeadlessError {
  message: string;
  stack?: string;
  file?: string;
}

export interface HeadlessHandlers {
  onFrame(frame: StyledFrame, meta: FrameMeta): void;
  onError(error: HeadlessError | null): void;
  onExit?(code: number | null): void;
  onOutput?(text: string): void;
}

export interface HeadlessOptions {
  runnerPath: string;
  root: string;
  /** Node binary; defaults to the current runtime (VS Code's Electron in Node mode). */
  execPath?: string;
  /** A runner that doesn't answer a reload within this time is restarted (default 10 s). */
  reloadTimeoutMs?: number;
  /** Time a runner gets to exit after `dispose` before SIGTERM (default 1.5 s); SIGKILL follows 500 ms later. */
  exitGraceMs?: number;
}

const KILL_AFTER_TERM_MS = 500;

/** Ask a runner to exit, then SIGTERM, then SIGKILL if it still hasn't. */
function terminate(child: ChildProcess, graceMs: number): void {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  child.once("exit", () => timers.forEach(clearTimeout));
  const term = (): void => {
    child.kill("SIGTERM");
    timers.push(setTimeout(() => child.kill("SIGKILL"), KILL_AFTER_TERM_MS));
  };
  if (child.connected) {
    try {
      child.send({ type: "dispose" } satisfies HostToRunner);
    } catch {}
    timers.push(setTimeout(term, graceMs));
  } else term();
}

export class HeadlessSession {
  private child: ChildProcess | null = null;
  private readonly decoder = new FrameDecoder();
  private disposed = false;
  /** Everything needed to start an identical runner again. */
  private init: Extract<HostToRunner, { type: "init" }> | null = null;
  private focused: boolean | null = null;
  private reloadWatchdog: ReturnType<typeof setTimeout> | null = null;
  /** The current runner finished starting. */
  private ready = false;
  readonly root: string;

  constructor(
    private readonly options: HeadlessOptions,
    private readonly handlers: HeadlessHandlers,
  ) {
    this.root = options.root;
  }

  get running(): boolean {
    return this.child !== null && this.child.exitCode === null && !this.disposed;
  }

  start(target: RunnerTarget, cols: number, rows: number, devUrl?: string): void {
    if (this.child || this.disposed) return;
    this.init = { type: "init", root: this.options.root, target, cols, rows, devUrl };
    this.spawn();
  }

  private spawn(): void {
    const init = this.init;
    if (!init) return;
    const child = fork(this.options.runnerPath, [], {
      cwd: this.options.root,
      execPath: this.options.execPath || undefined,
      execArgv: [],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "development", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    this.child = child;
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (d: string) => this.handlers.onOutput?.(d));
    child.stderr?.on("data", (d: string) => this.handlers.onOutput?.(d));
    child.on("message", (m: RunnerToHost) => {
      if (this.child === child) this.onMessage(m);
    });
    child.on("error", (e) => {
      if (this.child === child) this.handlers.onError({ message: `Could not start the preview runner: ${e.message}` });
    });
    child.on("exit", (code) => {
      // A replaced (restarted or disposed) runner exits quietly.
      if (this.child !== child) return;
      this.child = null;
      this.clearWatchdog();
      if (!this.disposed) this.handlers.onExit?.(code);
    });
    this.decoder.reset();
    this.ready = false;
    this.send(init);
    if (this.focused !== null) this.send({ type: "focus", focused: this.focused });
  }

  private clearWatchdog(): void {
    if (this.reloadWatchdog !== null) clearTimeout(this.reloadWatchdog);
    this.reloadWatchdog = null;
  }

  /** Replace an unresponsive runner with a fresh one (same project, target and size). */
  private restart(): void {
    const old = this.child;
    this.child = null;
    this.clearWatchdog();
    if (old) terminate(old, 0);
    if (this.disposed) return;
    this.handlers.onOutput?.("▼ The preview runner stopped responding; restarting it.\n");
    this.spawn();
  }

  private onMessage(m: RunnerToHost): void {
    if (typeof m !== "object" || m === null) return;
    // Any answer means the runner is alive.
    this.clearWatchdog();
    switch (m.type) {
      case "frame": {
        const wire = parseWireFrame(m.frame);
        if (!wire) break;
        const f = this.decoder.apply(wire);
        if (f) this.handlers.onFrame(f, this.decoder.meta);
        break;
      }
      case "error":
        this.handlers.onError({
          message: String(m.message),
          stack: typeof m.stack === "string" ? m.stack : undefined,
          file: typeof m.file === "string" ? m.file : undefined,
        });
        break;
      case "clearError":
        this.handlers.onError(null);
        break;
      case "ready":
        this.ready = true;
        break;
    }
  }

  private send(msg: HostToRunner): void {
    if (!this.child?.connected) return;
    try {
      this.child.send(msg);
    } catch {
      // The channel closed under us: the exit handler reports it.
    }
  }

  current(): { frame: StyledFrame; meta: FrameMeta } | null {
    return this.decoder.frame ? { frame: this.decoder.frame, meta: this.decoder.meta } : null;
  }

  setTarget(target: RunnerTarget): void {
    if (this.init) this.init = { ...this.init, target };
    this.send({ type: "target", target });
  }
  resize(cols: number, rows: number): void {
    if (this.init) this.init = { ...this.init, cols, rows };
    this.send({ type: "resize", cols, rows });
  }
  input(msg: InputMessage): void {
    this.send({ type: "input", msg });
  }
  focus(focused: boolean): void {
    this.focused = focused;
    this.send({ type: "focus", focused });
  }
  /** Re-render after a change. A runner stuck in the project's code (no answer in time) is restarted. */
  reload(): void {
    if (!this.child) return;
    this.send({ type: "reload" });
    // Before `ready` the reload just queues behind the (possibly slow) first build.
    if (this.ready && this.reloadWatchdog === null) this.reloadWatchdog = setTimeout(() => this.restart(), this.options.reloadTimeoutMs ?? 10_000);
  }

  /** The runner's process id (tests and diagnostics). */
  get pid(): number | undefined {
    return this.child?.pid;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearWatchdog();
    const child = this.child;
    this.child = null;
    if (child) terminate(child, this.options.exitGraceMs ?? 1500);
  }
}
