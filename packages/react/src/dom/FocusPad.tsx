import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { extractStyledFrame, type FrameResult, type StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "../root";
import type { ViewportState } from "../stores";
import { ConsoleMirror } from "./ConsoleMirror";

export interface ViewportPreset {
  label: string;
  cols: number;
  rows: number;
}

export const DEFAULT_PRESETS: readonly ViewportPreset[] = [
  { label: "80×24", cols: 80, rows: 24 },
  { label: "100×32", cols: 100, rows: 32 },
  { label: "120×38", cols: 120, rows: 38 },
];

export interface FocusPadProps {
  /** The mounted console root (or `null` while booting). */
  root: ConsoleRoot | null;
  title?: string;
  appearance?: "dark" | "light";
  presets?: readonly ViewportPreset[];
  /** Show the inline console preview initially. */
  showMirrorDefault?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const PALETTE = {
  dark: { bg: "#0a0a0a", card: "#111111", border: "#262626", text: "#ededed", muted: "#a1a1a1", subtle: "#6b6b6b", accent: "#0070f3", ok: "#45a557", button: "#1a1a1a", buttonHover: "#222" },
  light: { bg: "#fafafa", card: "#ffffff", border: "#eaeaea", text: "#171717", muted: "#666666", subtle: "#8f8f8f", accent: "#0070f3", ok: "#16a34a", button: "#ffffff", buttonHover: "#f2f2f2" },
} as const;

const FONT = 'Geist, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = 'Geist Mono, ui-monospace, "SF Mono", Menlo, monospace';

const KEYFRAMES = `@keyframes tx-pad-pulse{0%,100%{opacity:1}50%{opacity:.45}}@media (prefers-reduced-motion:reduce){.tx-pad-pulse{animation:none!important}}`;

const EMPTY_STATE: ViewportState = { cols: 0, rows: 0, responsive: false, focused: false, paused: false, dock: "fixed" };
const noopSubscribe = (): (() => void) => () => undefined;

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

interface Telemetry {
  cols: number;
  rows: number;
  spanCount: number;
  totalMs: number;
  frames: number;
  gated: number;
}

/**
 * The browser-side receiver for a console app: focus status, live telemetry,
 * viewport presets, pause / copy controls and an optional inline preview.
 * Telemetry is read from renderer frames into DOM state only, so it never
 * re-renders the console tree.
 */
export function FocusPad({ root, title, appearance = "dark", presets = DEFAULT_PRESETS, showMirrorDefault = false, className, style, children }: FocusPadProps): ReactNode {
  const c = PALETTE[appearance];
  const vp = useSyncExternalStore(
    root ? root.viewport.subscribe : noopSubscribe,
    root ? root.viewport.getSnapshot : () => EMPTY_STATE,
    () => EMPTY_STATE,
  );
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [showMirror, setShowMirror] = useState(showMirrorDefault);
  const [mirror, setMirror] = useState<StyledFrame | null>(null);
  const [copied, setCopied] = useState(false);
  const latest = useRef<FrameResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mirrorPending = useRef(false);
  const showMirrorRef = useRef(showMirror);
  showMirrorRef.current = showMirror;

  useEffect(() => {
    if (!root) return;
    const flushTelemetry = (): void => {
      timer.current = null;
      const f = latest.current;
      if (!f) return;
      setTelemetry({ cols: f.cols, rows: f.rows, spanCount: f.spanCount, totalMs: f.totalMs, frames: f.frameCount, gated: f.skippedFrames });
    };
    const off = root.onFrame((frame) => {
      latest.current = frame;
      if (timer.current === null) timer.current = setTimeout(flushTelemetry, 250);
      if (!frame.skipped && showMirrorRef.current && !mirrorPending.current) {
        mirrorPending.current = true;
        queueMicrotask(() => {
          mirrorPending.current = false;
          if (!root.unmounted) setMirror(extractStyledFrame(root.renderer.buffer));
        });
      }
    });
    const s = root.renderer.stats();
    setTelemetry({ cols: s.cols, rows: s.rows, spanCount: s.spanCount, totalMs: s.totalMs, frames: s.frameCount, gated: s.skippedFrames });
    return () => {
      off();
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [root]);

  useEffect(() => {
    if (showMirror && root && !root.unmounted) setMirror(extractStyledFrame(root.renderer.buffer));
  }, [showMirror, root]);

  const togglePause = useCallback(() => {
    if (!root) return;
    if (root.renderer.paused) root.renderer.resume();
    else root.renderer.pause();
  }, [root]);

  const copy = useCallback(() => {
    if (!root) return;
    root.renderer.copyText();
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [root]);

  const setPreset = useCallback(
    (p: ViewportPreset | null) => {
      if (!root) return;
      if (p === null) {
        root.renderer.viewport.setResponsive(true);
        root.viewport.refresh();
      } else root.renderer.resize(p.cols, p.rows);
      root.renderer.requestRender(true);
    },
    [root],
  );

  const devtoolsKeys = isMac() ? "⌘⌥J" : "Ctrl+Shift+J";
  const focused = root !== null && vp.focused;

  const button = (active: boolean): CSSProperties => ({
    fontFamily: FONT,
    fontSize: 12,
    height: 28,
    padding: "0 10px",
    borderRadius: 6,
    border: `1px solid ${active ? c.text : c.border}`,
    background: active ? c.text : c.button,
    color: active ? c.bg : c.text,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div
      className={className}
      data-textjs-focus-pad=""
      style={{
        fontFamily: FONT,
        color: c.text,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      <style>{KEYFRAMES}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>▼ Text.js</span>
        {title ? (
          <>
            <span style={{ color: c.subtle }}>/</span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: c.muted }}>{title}</span>
          </>
        ) : null}
        <span style={{ flex: 1 }} />
        <span
          className={focused ? undefined : "tx-pad-pulse"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 999,
            border: `1px solid ${focused ? c.ok : c.border}`,
            color: focused ? c.ok : c.muted,
            animation: focused ? undefined : "tx-pad-pulse 1.8s ease-in-out infinite",
          }}
        >
          {focused ? (
            <>● Capturing Keyboard → Rendering in DevTools Console</>
          ) : (
            <>
              Click anywhere to focus keyboard · Press {devtoolsKeys} to open DevTools Console
            </>
          )}
        </span>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 12, color: c.muted, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {telemetry ? (
          <>
            <span style={{ color: c.text }}>
              {telemetry.cols}×{telemetry.rows} cells
            </span>
            <span>·</span>
            <span>{telemetry.spanCount} %c spans</span>
            <span>·</span>
            <span>{telemetry.totalMs.toFixed(2)}ms frame</span>
            <span>·</span>
            <span>{telemetry.frames} frames</span>
            <span>·</span>
            <span>{telemetry.gated} idle frames gated</span>
            <span>·</span>
            <span>0 noop logs</span>
            {vp.paused ? <span style={{ color: c.accent }}>· paused</span> : null}
          </>
        ) : (
          <span>Booting Turbolog…</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {presets.map((p) => (
          <button key={p.label} type="button" style={button(!vp.responsive && vp.cols === p.cols && vp.rows === p.rows)} onClick={() => setPreset(p)}>
            {p.label}
          </button>
        ))}
        <button type="button" style={button(vp.responsive)} onClick={() => setPreset(null)}>
          Responsive
        </button>
        <span style={{ width: 1, height: 20, background: c.border, margin: "0 4px" }} />
        <button type="button" style={button(vp.paused)} onClick={togglePause}>
          {vp.paused ? "Resume" : "Pause"}
        </button>
        <button type="button" style={button(false)} onClick={copy}>
          {copied ? "Copied" : "Copy Plain Frame"}
        </button>
        <button type="button" style={button(showMirror)} onClick={() => setShowMirror((v) => !v)}>
          {showMirror ? "Hide Console Preview" : "Preview Console Inline"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: c.subtle }}>Pause or click into DevTools to select &amp; copy console text.</div>

      {showMirror ? <ConsoleMirror frame={mirror} chrome appearance={appearance} /> : null}
      {children}
    </div>
  );
}
