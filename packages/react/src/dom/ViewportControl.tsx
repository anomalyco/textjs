import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { ConsoleRoot } from "../root";
import { defaultFocusPadMessages, resolveFocusPadMessages, type ViewportControlMessages } from "./messages";

/** `"fit"` follows the docked DevTools console; a size pins the grid. */
export type ViewportChoice = "fit" | { cols: number; rows: number };

export const VIEWPORT_CHOICE_KEY = "textjs:viewport";
export const VIEWPORT_PRESETS: ReadonlyArray<{ cols: number; rows: number }> = [
  { cols: 80, rows: 24 },
  { cols: 120, rows: 36 },
  { cols: 160, rows: 48 },
];

const MIN = { cols: 20, rows: 6 };
const MAX = { cols: 400, rows: 150 };

export function formatViewportChoice(choice: ViewportChoice): string {
  return choice === "fit" ? "fit" : `${choice.cols}x${choice.rows}`;
}

/** Parse `"fit"` or `"120x36"` (`×` also accepted); `null` when invalid. */
export function parseViewportChoice(value: string | null | undefined): ViewportChoice | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "fit" || v === "auto") return "fit";
  const m = /^(\d{1,3})\s*[x×]\s*(\d{1,3})$/.exec(v);
  if (!m) return null;
  const cols = Number(m[1]);
  const rows = Number(m[2]);
  if (cols < MIN.cols || rows < MIN.rows || cols > MAX.cols || rows > MAX.rows) return null;
  return { cols, rows };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadViewportChoice(key: string = VIEWPORT_CHOICE_KEY): ViewportChoice | null {
  try {
    return parseViewportChoice(storage()?.getItem(key));
  } catch {
    return null;
  }
}

export function saveViewportChoice(choice: ViewportChoice, key: string = VIEWPORT_CHOICE_KEY): void {
  try {
    storage()?.setItem(key, formatViewportChoice(choice));
  } catch {
    // Storage may be blocked.
  }
}

export function applyViewportChoice(root: ConsoleRoot, choice: ViewportChoice): void {
  if (root.unmounted) return;
  if (choice === "fit") root.renderer.viewport.setResponsive(true);
  else root.renderer.resize(choice.cols, choice.rows);
  root.viewport.refresh();
}

/** The size "Fit console" would use right now, following window resizes. */
function useFitSize(root: ConsoleRoot | null): { cols: number; rows: number; measurable: boolean } | null {
  const [size, setSize] = useState<{ cols: number; rows: number; measurable: boolean } | null>(null);
  useEffect(() => {
    if (!root || typeof window === "undefined") return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const read = (): void => {
      if (root.unmounted) return;
      const m = root.renderer.viewport.measure();
      setSize((prev) => (prev && prev.cols === m.cols && prev.rows === m.rows && prev.measurable === (m.dock !== "undocked") ? prev : { cols: m.cols, rows: m.rows, measurable: m.dock !== "undocked" }));
    };
    const onResize = (): void => {
      if (t) clearTimeout(t);
      t = setTimeout(read, 120);
    };
    read();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (t) clearTimeout(t);
    };
  }, [root]);
  return size;
}

const NOOP_SUBSCRIBE = (): (() => void) => () => undefined;

export interface ViewportControlProps {
  root: ConsoleRoot | null;
  /** localStorage key for the choice (default `"textjs:viewport"`, `null` to not persist). */
  storageKey?: string | null;
  presets?: ReadonlyArray<{ cols: number; rows: number }>;
  /**
   * Called after the size changes (e.g. hand the keyboard back to the app). With `onChange`, the control
   * also works while `root` is `null`: it saves the choice and applies it once `root` arrives, so
   * `onChange` can boot the console.
   */
  onChange?: (choice: ViewportChoice) => void;
  className?: string;
  style?: CSSProperties;
  /** Text colors: resting and hover/active. */
  color?: string;
  activeColor?: string;
  /** Replace any of the control's strings (see `defaultFocusPadMessages`). */
  messages?: Partial<ViewportControlMessages>;
}

/** `120×36`, isolated left to right so a right-to-left page doesn't show it as `36×120`. */
function gridSize({ cols, rows }: { cols: number; rows: number }): string {
  return `\u2066${cols}×${rows}\u2069`;
}

/** The host page's `--mono` when it sets one, so its script fonts (Arabic, Hebrew) apply to translated labels. */
const MONO = 'var(--mono, "Geist Mono", "Geist Mono Fallback", ui-monospace, "SF Mono", Menlo, monospace)';

/**
 * A one-line console size picker: "Fit console" (follow docked DevTools) or a
 * fixed grid. Renders as quiet text over a native `<select>`.
 */
export function ViewportControl({ root, storageKey = VIEWPORT_CHOICE_KEY, presets = VIEWPORT_PRESETS, onChange, className, style, color = "#707070", activeColor = "#ededed", messages }: ViewportControlProps): ReactNode {
  const m = useMemo(() => resolveFocusPadMessages<ViewportControlMessages>(messages, defaultFocusPadMessages), [messages]);
  const live = useSyncExternalStore(root?.viewport.subscribe ?? NOOP_SUBSCRIBE, () => root?.viewport.getSnapshot() ?? null, () => null);
  const fit = useFitSize(root);
  // A size picked before the console boots shows here and applies once `root` arrives.
  const [pending, setPending] = useState<ViewportChoice | null>(null);
  const state = live ?? (pending !== null && pending !== "fit" ? { responsive: false, ...pending } : null);
  const [custom, setCustom] = useState(false);
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState({ cols: "", rows: "" });
  const colsRef = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (custom) colsRef.current?.select();
  }, [custom]);

  useEffect(() => {
    if (!root || pending === null) return;
    applyViewportChoice(root, pending);
    setPending(null);
  }, [root, pending]);

  const responsive = state?.responsive ?? true;
  const current = state ? `${state.cols}x${state.rows}` : "";
  const isPreset = presets.some((p) => `${p.cols}x${p.rows}` === current);
  const value = responsive ? "fit" : isPreset ? current : "custom";

  const choose = (choice: ViewportChoice): void => {
    if (root) applyViewportChoice(root, choice);
    else if (onChange) setPending(choice);
    else return;
    if (storageKey !== null) saveViewportChoice(choice, storageKey);
    onChange?.(choice);
  };

  const commitCustom = (): void => {
    const choice = parseViewportChoice(`${draft.cols}x${draft.rows}`);
    setCustom(false);
    if (choice) choose(choice);
  };

  const fitLabel = fit ? `${m.fitConsole} · ${gridSize(fit)}` : m.fitConsole;
  const label = responsive ? fitLabel : state ? gridSize(state) : "";
  const title = responsive && fit && !fit.measurable ? m.consoleSizeUndocked : m.consoleSize;

  const text: CSSProperties = { fontFamily: MONO, fontSize: 12, lineHeight: "20px", color: hover ? activeColor : color, transition: "color .15s ease", whiteSpace: "nowrap" };

  if (custom) {
    const field: CSSProperties = {
      width: "4ch",
      padding: "0 2px",
      font: "inherit",
      color: activeColor,
      background: "transparent",
      borderStyle: "solid",
      borderColor: color,
      borderWidth: "0 0 1px",
      outline: "none",
      textAlign: "center",
      MozAppearance: "textfield",
    } as CSSProperties;
    const onKey = (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") commitCustom();
      else if (e.key === "Escape") setCustom(false);
    };
    return (
      <span
        className={className}
        style={{ ...text, color, display: "inline-flex", alignItems: "center", gap: 4, ...style }}
        data-console-bypass=""
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) commitCustom();
        }}
      >
        <input ref={colsRef} id={`${id}-cols`} name="textjs-console-cols" aria-label={m.columns} inputMode="numeric" value={draft.cols} onChange={(e) => setDraft((d) => ({ ...d, cols: e.target.value.replace(/\D/g, "") }))} onKeyDown={onKey} style={field} />
        ×
        <input id={`${id}-rows`} name="textjs-console-rows" aria-label={m.rows} inputMode="numeric" value={draft.rows} onChange={(e) => setDraft((d) => ({ ...d, rows: e.target.value.replace(/\D/g, "") }))} onKeyDown={onKey} style={field} />
      </span>
    );
  }

  return (
    <span
      className={className}
      title={title}
      style={{ ...text, position: "relative", display: "inline-flex", alignItems: "center", gap: 6, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Room for the longest label ("Fit console · 200×60") so the size arriving never shifts layout.
          While fitting, it is start-aligned so the measured size is appended without moving "Fit console";
          a fixed size gets a fresh node (a new node is not a layout shift) end-aligned next to the chevron. */}
      <span key={responsive ? "fit" : "fixed"} aria-hidden="true" style={{ minWidth: 146, textAlign: responsive ? "start" : "end" }}>
        {label}
      </span>
      <svg aria-hidden="true" width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.8 }}>
        <path d="M1.5 3 4 5.5 6.5 3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        id={id}
        name="textjs-console-size"
        aria-label={m.consoleSize}
        value={value}
        disabled={!root && !onChange}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") {
            setDraft({ cols: String(state?.cols ?? 120), rows: String(state?.rows ?? 36) });
            setCustom(true);
            return;
          }
          const choice = parseViewportChoice(v);
          if (choice) choose(choice);
        }}
        style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", font: "inherit" }}
      >
        <option value="fit">{fitLabel}</option>
        {presets.map((p) => (
          <option key={`${p.cols}x${p.rows}`} value={`${p.cols}x${p.rows}`}>{gridSize(p)}</option>
        ))}
        <option value="custom">{value === "custom" && state ? `${m.custom} · ${gridSize(state)}` : `${m.custom}…`}</option>
      </select>
    </span>
  );
}
