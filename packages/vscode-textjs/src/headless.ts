/**
 * Extension-host side of the headless preview: forks `dist/runner.mjs` in the
 * project directory and decodes its frames. Pure Node (no `vscode`).
 */

import { fork, type ChildProcess } from "node:child_process";
import { FrameDecoder, parseWireFrame, type FrameMeta, type InputMessage } from "@textjs/next/frame-protocol";
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
}

export class HeadlessSession {
  private child: ChildProcess | null = null;
  private readonly decoder = new FrameDecoder();
  private disposed = false;
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
    if (this.child) return;
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
    child.on("message", (m: RunnerToHost) => this.onMessage(m));
    child.on("error", (e) => this.handlers.onError({ message: `Could not start the preview runner: ${e.message}` }));
    child.on("exit", (code) => {
      if (this.child === child) this.child = null;
      if (!this.disposed) this.handlers.onExit?.(code);
    });
    this.send({ type: "init", root: this.options.root, target, cols, rows, devUrl });
  }

  private onMessage(m: RunnerToHost): void {
    if (typeof m !== "object" || m === null) return;
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
        break;
    }
  }

  private send(msg: HostToRunner): void {
    if (this.child?.connected) this.child.send(msg);
  }

  current(): { frame: StyledFrame; meta: FrameMeta } | null {
    return this.decoder.frame ? { frame: this.decoder.frame, meta: this.decoder.meta } : null;
  }

  setTarget(target: RunnerTarget): void {
    this.send({ type: "target", target });
  }
  resize(cols: number, rows: number): void {
    this.send({ type: "resize", cols, rows });
  }
  input(msg: InputMessage): void {
    this.send({ type: "input", msg });
  }
  focus(focused: boolean): void {
    this.send({ type: "focus", focused });
  }
  reload(): void {
    this.send({ type: "reload" });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const child = this.child;
    this.child = null;
    if (!child) return;
    if (child.connected) child.send({ type: "dispose" } satisfies HostToRunner);
    const kill = setTimeout(() => child.kill(), 1500);
    child.once("exit", () => clearTimeout(kill));
  }
}
