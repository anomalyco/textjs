import { useEffect, useRef, useState, type ReactNode } from "react";
import { extractStyledFrame, InputEngine, type ConsoleTarget, type FrameResult, type StyledFrame } from "@textjs/core";
import { createConsoleRoot, type ConsoleRoot, type ThemeName } from "@textjs/react";
import { useDocumentVisible } from "../site/useInView";

export interface CapturedLog {
  format: string;
  args: string[];
  /** Number of console.log calls captured so far. */
  calls: number;
}

/** A console target that records the exact `console.log(format, ...css)` call instead of writing to DevTools. */
export class CaptureConsole implements ConsoleTarget {
  last: CapturedLog | null = null;
  calls = 0;
  clears = 0;
  clear(): void {
    this.clears++;
  }
  log(...args: unknown[]): void {
    this.calls++;
    const [format, ...rest] = args;
    this.last = { format: String(format ?? ""), args: rest.map(String), calls: this.calls };
  }
}

export interface SandboxState {
  root: ConsoleRoot | null;
  engine: InputEngine;
  frame: StyledFrame | null;
  stats: FrameResult | null;
  log: CapturedLog | null;
}

export interface UseSandboxOptions {
  cols: number;
  rows: number;
  theme: ThemeName;
  wireframe?: boolean;
  /**
   * Mount once this first becomes `true` (e.g. scrolled into view). Afterwards
   * `false` pauses the renderer instead of unmounting, so offscreen previews idle at 0 CPU.
   */
  enabled?: boolean;
}

/**
 * A headless console root for in-page previews. Frames are captured instead
 * of logged, so sandboxes never fight the live companion for DevTools.
 */
export function useSandbox(app: ReactNode, { cols, rows, theme, wireframe = false, enabled = true }: UseSandboxOptions): SandboxState {
  const engineRef = useRef<InputEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new InputEngine({ document: null });
  const engine = engineRef.current;
  const [root, setRoot] = useState<ConsoleRoot | null>(null);
  const [frame, setFrame] = useState<StyledFrame | null>(null);
  const [stats, setStats] = useState<FrameResult | null>(null);
  const [log, setLog] = useState<CapturedLog | null>(null);
  const initial = useRef({ cols, rows, theme });
  const [mounted, setMounted] = useState(enabled);
  const visible = useDocumentVisible();
  const active = enabled && visible;
  if (enabled && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    let created: ConsoleRoot | null = null;
    let queued = false;
    const capture = new CaptureConsole();
    createConsoleRoot({
      width: initial.current.cols,
      height: initial.current.rows,
      theme: initial.current.theme,
      console: capture,
      input: engine,
      // `window.text` always belongs to the live console companion.
      registerGlobal: false,
      identifierPrefix: "txs",
    }).then(
      (r) => {
        if (cancelled) {
          r.unmount();
          return;
        }
        created = r;
        let latest: FrameResult | null = null;
        r.onFrame((f) => {
          if (f.skipped) return;
          latest = f;
          if (queued) return;
          // Microtask, not rAF: the mirror updates in the same task as the keypress.
          queued = true;
          queueMicrotask(() => {
            queued = false;
            if (cancelled || r.unmounted) return;
            setFrame(extractStyledFrame(r.renderer.buffer));
            setStats(latest);
            setLog(capture.last);
          });
        });
        setRoot(r);
      },
      (err: unknown) => console.error(err),
    );
    return () => {
      cancelled = true;
      created?.unmount();
      setRoot(null);
    };
  }, [mounted, engine]);

  useEffect(() => {
    if (!root || root.unmounted) return;
    if (active) root.renderer.resume();
    else root.renderer.pause();
  }, [root, active]);

  useEffect(() => {
    if (root && !root.unmounted) root.render(app);
  }, [root, app]);

  useEffect(() => {
    if (root && !root.unmounted) root.renderer.resize(cols, rows);
  }, [root, cols, rows]);

  useEffect(() => {
    if (root && !root.unmounted) root.setTheme(theme);
  }, [root, theme]);

  useEffect(() => {
    if (root && !root.unmounted) root.renderer.setWireframe(wireframe);
  }, [root, wireframe]);

  return { root, engine, frame, stats, log };
}
