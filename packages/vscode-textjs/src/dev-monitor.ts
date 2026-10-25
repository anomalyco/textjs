/**
 * Keeps track of the project's `text dev` server: polls `/__textjs/status`
 * while idle (cheap, no frames) and subscribes to the frame stream only while
 * a preview is open. Pure Node (no `vscode`).
 */

import type { DevStatus } from "@textjs/next/frame-protocol";
import { connectFrameStream, discover, probe, type FrameStreamConnection, type LiveFrame } from "./dev-server";

export interface MonitorSnapshot {
  url: string | null;
  status: DevStatus | null;
  /** Streaming frames (a preview is watching). */
  streaming: boolean;
}

type Listener<T> = (value: T) => void;

export class DevServerMonitor {
  private roots: string[] = [];
  private configuredUrl = "";
  private url: string | null = null;
  private status: DevStatus | null = null;
  private stream: FrameStreamConnection | null = null;
  private wantFrames = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private polling = false;
  private disposed = false;
  private readonly changeListeners = new Set<Listener<MonitorSnapshot>>();
  private readonly frameListeners = new Set<Listener<LiveFrame>>();
  private readonly goneListeners = new Set<Listener<string>>();

  constructor(private readonly intervalMs = 2500) {}

  configure(roots: readonly string[], url: string): void {
    const changed = url !== this.configuredUrl || roots.join("\0") !== this.roots.join("\0");
    this.roots = [...roots];
    this.configuredUrl = url;
    if (changed) {
      this.disconnect();
      this.poke();
    }
  }

  snapshot(): MonitorSnapshot {
    return { url: this.url, status: this.status, streaming: this.stream !== null };
  }

  live(): LiveFrame | null {
    return this.stream?.current() ?? null;
  }

  get activeSource(): string | null {
    return this.stream?.activeSource ?? null;
  }

  onChange(l: Listener<MonitorSnapshot>): () => void {
    this.changeListeners.add(l);
    return () => this.changeListeners.delete(l);
  }
  onFrame(l: Listener<LiveFrame>): () => void {
    this.frameListeners.add(l);
    return () => this.frameListeners.delete(l);
  }
  onSourceGone(l: Listener<string>): () => void {
    this.goneListeners.add(l);
    return () => this.goneListeners.delete(l);
  }

  /** Subscribe to frames while a preview is visible. */
  setWatching(watching: boolean): void {
    if (this.wantFrames === watching) return;
    this.wantFrames = watching;
    if (watching) this.ensureStream();
    else if (this.stream) {
      const s = this.stream;
      this.stream = null;
      s.close();
      this.emit();
      this.schedule();
    }
  }

  /** Probe now (after starting a server, or a save). */
  poke(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    void this.tick();
  }

  start(): void {
    this.poke();
  }

  private emit(): void {
    const s = this.snapshot();
    for (const l of this.changeListeners) l(s);
  }

  private schedule(): void {
    if (this.disposed) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), this.intervalMs);
    (this.timer as { unref?: () => void }).unref?.();
  }

  private async tick(): Promise<void> {
    if (this.disposed || this.polling) return;
    this.polling = true;
    try {
      if (this.stream) return;
      if (this.url) {
        const s = await probe(this.url);
        if (s) this.setStatus(this.url, s);
        else this.setStatus(null, null);
      }
      if (!this.url && (this.roots.length > 0 || this.configuredUrl)) {
        const found = await discover(this.roots, { url: this.configuredUrl || undefined });
        if (found) this.setStatus(found.url, found.status);
      }
      if (this.url && this.wantFrames) this.ensureStream();
    } finally {
      this.polling = false;
      if (!this.stream) this.schedule();
    }
  }

  private setStatus(url: string | null, status: DevStatus | null): void {
    const changed = url !== this.url || JSON.stringify(status) !== JSON.stringify(this.status);
    this.url = url;
    this.status = status;
    if (changed) this.emit();
  }

  private ensureStream(): void {
    if (this.stream || !this.url || this.disposed) return;
    const url = this.url;
    const conn = connectFrameStream(url, {
      onFrame: (f) => {
        for (const l of this.frameListeners) l(f);
      },
      onStatus: (s) => this.setStatus(url, s),
      onSourceGone: (id) => {
        for (const l of this.goneListeners) l(id);
      },
      onClose: () => {
        if (this.stream !== conn) return;
        this.stream = null;
        this.emit();
        this.poke();
      },
    });
    this.stream = conn;
    this.emit();
  }

  private disconnect(): void {
    this.stream?.close();
    this.stream = null;
    this.url = null;
    this.status = null;
    this.emit();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.stream?.close();
    this.stream = null;
    this.changeListeners.clear();
    this.frameListeners.clear();
    this.goneListeners.clear();
  }
}
