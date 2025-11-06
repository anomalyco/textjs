import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { extractStyledFrame, type StyledFrame } from "@textjs/core";
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

/**
 * The browser-side receiver for a console app: focus status, viewport presets,
 * pause and an optional inline preview. Frames are read into DOM state only,
 * so the pad never re-renders the console tree.
 */
export function FocusPad({ root, title, appearance = "dark", presets = DEFAULT_PRESETS, showMirrorDefault = false, className, style, children }: FocusPadProps): ReactNode {
  const c = PALETTE[appearance];
  const vp = useSyncExternalStore(
    root ? root.viewport.subscribe : noopSubscribe,
    root ? root.viewport.getSnapshot : () => EMPTY_STATE,
    () => EMPTY_STATE,
  );
  const [showMirror, setShowMirror] = useState(showMirrorDefault);
  const [mirror, setMirror] = useState<StyledFrame | null>(null);
  const mirrorPending = useRef(false);
  const showMirrorRef = useRef(showMirror);
  showMirrorRef.current = showMirror;

  useEffect(() => {
    if (!root) return;
    return root.onFrame((frame) => {
      if (!frame.skipped && showMirrorRef.current && !mirrorPending.current) {
        mirrorPending.current = true;
        queueMicrotask(() => {
          mirrorPending.current = false;
          if (!root.unmounted) setMirror(extractStyledFrame(root.renderer.buffer));
        });
      }
    });
  }, [root]);

  useEffect(() => {
    if (showMirror && root && !root.unmounted) setMirror(extractStyledFrame(root.renderer.buffer));
  }, [showMirror, root]);

  const togglePause = useCallback(() => {
    if (!root) return;
    if (root.renderer.paused) root.renderer.resume();
    else root.renderer.pause();
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
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
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
        {vp.cols > 0 ? <span style={{ fontFamily: MONO, fontSize: 12, color: c.subtle }}>{`${vp.cols}×${vp.rows}`}</span> : null}
        <span
          className={focused ? undefined : "tx-pad-pulse"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "3px 10px",
            borderRadius: 999,
            border: `1px solid ${focused ? c.ok : c.border}`,
            color: focused ? c.ok : c.muted,
            animation: focused ? undefined : "tx-pad-pulse 1.8s ease-in-out infinite",
          }}
        >
          {focused ? "● Focused" : "Click to focus"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {presets.map((p) => (
          <button key={p.label} type="button" style={button(!vp.responsive && vp.cols === p.cols && vp.rows === p.rows)} onClick={() => setPreset(p)}>
            {p.label}
          </button>
        ))}
        <button type="button" style={button(vp.responsive)} onClick={() => setPreset(null)}>
          Auto
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" style={button(vp.paused)} onClick={togglePause}>
          {vp.paused ? "Resume" : "Pause"}
        </button>
        <button type="button" style={button(showMirror)} onClick={() => setShowMirror((v) => !v)}>
          Preview
        </button>
      </div>
      <div style={{ fontSize: 12, color: c.subtle }}>Open DevTools Console ({devtoolsKeys})</div>

      {showMirror ? <ConsoleMirror frame={mirror} chrome appearance={appearance} /> : null}
      {children}
    </div>
  );
}
