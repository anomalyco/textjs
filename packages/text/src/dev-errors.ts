/**
 * Development error store feeding the in-console Redbox and the `[▼ !]` pill.
 */

export type DevErrorKind = "runtime" | "build" | "unhandled";

export interface DevErrorLocation {
  file: string;
  line?: number;
  column?: number;
}

export interface DevError {
  id: number;
  kind: DevErrorKind;
  /** e.g. `TypeError`, `Build Error`. */
  name: string;
  message: string;
  stack: string[];
  location?: DevErrorLocation;
  /** Code frame snippet (Vite / esbuild / Babel format). */
  frame?: string;
  plugin?: string;
  componentStack?: string;
}

export interface DevErrorSnapshot {
  errors: readonly DevError[];
  /** Whether the Redbox is showing (Esc hides it until the next error). */
  visible: boolean;
  /** Bumped whenever errors are cleared (lets boundaries recover after a fix). */
  generation: number;
}

/** Minimal shape of Vite's `ErrorPayload["err"]`. */
export interface ViteErrorLike {
  message: string;
  stack?: string;
  id?: string;
  frame?: string;
  plugin?: string;
  loc?: { file?: string; line: number; column: number };
}

const STACK_LOCATION = /\(?((?:https?:\/\/[^/\s]+)?(\/[^\s()]*?|[A-Za-z]:\\[^\s()]*?)):(\d+):(\d+)\)?\s*$/;

/** Strip the dev server origin, `/@fs` and cache-busting queries from a stack URL. */
export function cleanSourcePath(file: string): string {
  let f = file.replace(/^https?:\/\/[^/]+/, "");
  f = f.replace(/^\/@fs/, "");
  f = f.replace(/\?[^:]*$/, "");
  const proc = (globalThis as { process?: { cwd?: () => string } }).process;
  const cwd = typeof proc?.cwd === "function" ? proc.cwd() : "";
  if (cwd && f.startsWith(`${cwd}/`)) f = f.slice(cwd.length + 1);
  return f.replace(/^\//, "");
}

export function parseStack(stack: string | undefined): string[] {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at ") || /@.+:\d+:\d+$/.test(l));
}

export function locationFromStack(lines: readonly string[]): DevErrorLocation | undefined {
  for (const line of lines) {
    if (/node_modules|react-dom|react-reconciler|scheduler|\/@textjs\/|packages\/(react|core)\/src/.test(line)) continue;
    const m = STACK_LOCATION.exec(line);
    if (m) return { file: cleanSourcePath(m[1] as string), line: Number(m[3]), column: Number(m[4]) };
  }
  return undefined;
}

export function toDevError(error: unknown, kind: DevErrorKind, id: number, componentStack?: string | null): DevError {
  if (error instanceof Error) {
    const stack = parseStack(error.stack);
    return {
      id,
      kind,
      name: error.name || "Error",
      message: error.message,
      stack,
      location: locationFromStack(stack),
      componentStack: componentStack ?? undefined,
    };
  }
  return { id, kind, name: "Error", message: typeof error === "string" ? error : safeString(error), stack: [], componentStack: componentStack ?? undefined };
}

function safeString(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

export class DevErrorStore {
  private snapshot: DevErrorSnapshot = { errors: [], visible: false, generation: 0 };
  private readonly listeners = new Set<() => void>();
  private nextId = 1;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): DevErrorSnapshot => this.snapshot;

  private set(next: DevErrorSnapshot): void {
    this.snapshot = next;
    for (const l of [...this.listeners]) l();
  }

  private push(entry: DevError): DevError {
    const errors = this.snapshot.errors;
    const dup = errors.find((e) => e.kind === entry.kind && e.message === entry.message && e.location?.file === entry.location?.file);
    if (dup) {
      if (!this.snapshot.visible) this.set({ ...this.snapshot, visible: true });
      return dup;
    }
    this.set({ ...this.snapshot, errors: [...errors, entry].slice(-20), visible: true });
    return entry;
  }

  /** Report a runtime render / event error. */
  reportRuntime(error: unknown, componentStack?: string | null, kind: DevErrorKind = "runtime"): DevError {
    return this.push(toDevError(error, kind, this.nextId++, componentStack));
  }

  /** Report a Vite build / transform error (`vite:error`). */
  reportBuild(err: ViteErrorLike): DevError {
    const stack = parseStack(err.stack);
    const file = err.loc?.file ?? err.id;
    const message = err.message.replace(/\x1b\[[0-9;]*m/g, "");
    return this.push({
      id: this.nextId++,
      kind: "build",
      name: "Build Error",
      message,
      stack,
      location: file ? { file: cleanSourcePath(file), line: err.loc?.line, column: err.loc?.column } : undefined,
      frame: err.frame?.replace(/\x1b\[[0-9;]*m/g, ""),
      plugin: err.plugin,
    });
  }

  /** Hide the Redbox (errors stay listed in DevTools until cleared). */
  dismiss(): void {
    if (this.snapshot.visible) this.set({ ...this.snapshot, visible: false });
  }

  show(): void {
    if (!this.snapshot.visible && this.snapshot.errors.length > 0) this.set({ ...this.snapshot, visible: true });
  }

  /** Clear errors (all, or one kind) — e.g. after a successful HMR update. */
  clear(kind?: DevErrorKind): void {
    const errors = kind ? this.snapshot.errors.filter((e) => e.kind !== kind) : [];
    if (errors.length === this.snapshot.errors.length) return;
    this.set({ errors, visible: this.snapshot.visible && errors.length > 0, generation: this.snapshot.generation + 1 });
  }
}

/** The process-wide store used by `text dev`. */
export const devErrors = new DevErrorStore();
