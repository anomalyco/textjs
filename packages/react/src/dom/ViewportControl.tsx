import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { ConsoleRoot } from "../root";
import { defaultFocusPadMessages, resolveFocusPadMessages, type ViewportControlMessages } from "./messages";
import { applyViewportChoice, parseViewportChoice, saveViewportChoice, VIEWPORT_CHOICE_KEY, VIEWPORT_PRESETS, type ViewportChoice } from "./viewport-choice";

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
  /** Called after the size changes (e.g. hand the keyboard back to the app). */
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
 *
 * It works before `root` exists: a picked size is saved and shown, applies once
 * `root` is set, and bubbles a `textjs:engage` event that `onConsoleIntent`
 * reports as `"engage"`.
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
  const wrapRef = useRef<HTMLSpanElement>(null);
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
    else {
      setPending(choice);
      // Picking a size before boot starts the console (`onConsoleIntent` reports it as "engage").
      wrapRef.current?.dispatchEvent(new Event("textjs:engage", { bubbles: true }));
    }
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
        ref={wrapRef}
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
      ref={wrapRef}
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
