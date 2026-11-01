import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { estimateDockedConsoleSize, extractStyledFrame, type KeyInputEvent, type StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "../root";
import { ConsoleMirror } from "./ConsoleMirror";
import { ViewportControl, type ViewportControlProps } from "./ViewportControl";

/** One key hint, e.g. `{ keys: "↑ ↓", label: "count" }`. Space-separated keys render as separate keycaps. */
export interface FocusPadHint {
  keys: string;
  label: string;
}

/**
 * - `open`: the console is probably closed — show the shortcut.
 * - `click`: the page doesn't have the keyboard (focus is in DevTools, or input is paused).
 * - `live`: keystrokes are reaching the console app.
 */
export type FocusPadState = "open" | "click" | "live";

export interface FocusPadSignals {
  /** `document.hasFocus()`. */
  pageFocused: boolean;
  /** Whether the input engine is routing page keystrokes into the app. */
  capturing: boolean;
  /** Heuristic: a docked DevTools panel was detected, or the window lost focus since load. */
  devtoolsLikelyOpen: boolean;
  /** At least one keystroke reached the app. */
  keySeen: boolean;
}

/** Pure state machine behind the pad (exported for tests). Never blocks on DevTools detection. */
export function focusPadState(s: FocusPadSignals): FocusPadState {
  if (s.pageFocused && s.capturing && (s.devtoolsLikelyOpen || s.keySeen)) return "live";
  if (!s.pageFocused || s.devtoolsLikelyOpen) return "click";
  return "open";
}

export interface FocusPadProps {
  /** The mounted console root (or `null` while booting). */
  root: ConsoleRoot | null;
  title?: string;
  /** The two or three keys worth pressing in this app. */
  hints?: readonly FocusPadHint[];
  /** What to do once focused, e.g. `"type a prompt"` (default: `press <first hint>`). */
  action?: string;
  /** Override whether keystrokes are routed into the app (default: `root.input.enabled`). */
  capturing?: boolean;
  /** Called when the pad is clicked (default: focus the root's input sink). */
  onActivate?: () => void;
  appearance?: "dark" | "light";
  /** Render an inline console preview below the pad. */
  showMirrorDefault?: boolean;
  /** Content above the message (e.g. a demo picker). Clicks on controls here don't count as activation. */
  top?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Content below the message. */
  children?: ReactNode;
  /** Show a quiet console size picker ("Fit console" or a fixed grid) in the corner. */
  sizeControl?: boolean | Omit<ViewportControlProps, "root">;
}

const PALETTE = {
  dark: { bg: "#0a0a0a", border: "#1f1f1f", borderHover: "#333333", text: "#ededed", muted: "#a1a1a1", subtle: "#707070", faint: "#2e2e2e", key: "#141414", keyEdge: "#2a2a2a", live: "#45a557", flash: "#ededed", flashText: "#0a0a0a" },
  light: { bg: "#ffffff", border: "#eaeaea", borderHover: "#d4d4d4", text: "#171717", muted: "#666666", subtle: "#8f8f8f", faint: "#e5e5e5", key: "#fafafa", keyEdge: "#d9d9d9", live: "#16a34a", flash: "#171717", flashText: "#ffffff" },
} as const;

const FONT = 'Geist, "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace';

const CSS = `
.tx-pad{cursor:pointer;transition:border-color .2s ease}
.tx-pad:hover{border-color:var(--tx-pad-hover)!important}
.tx-pad[data-state=live]{cursor:default}
.tx-pad-touch{display:none}
.tx-pad-size{position:absolute;right:24px;bottom:24px}
@media (max-width:900px){.tx-pad-size{position:static}}
@media (hover:none) and (pointer:coarse){.tx-pad{cursor:default}.tx-pad-touch{display:flex}.tx-pad-desk,.tx-pad-size{display:none!important}}
@keyframes tx-pad-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes tx-pad-ring{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(1.015)}}
@keyframes tx-pad-pop{0%{transform:translateY(2px);opacity:0}15%{transform:none;opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.tx-pad *{animation:none!important}}
html:not([data-os=mac]) .tx-pad .tx-os-mac,html[data-os=mac] .tx-pad .tx-os-other{display:none!important}
`;

const INTERACTIVE = "a,button,input,textarea,select,label,summary,[contenteditable],[data-focus-pad-ignore]";

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** The DevTools console shortcut for this platform, as keycaps. */
export function devtoolsShortcutKeys(): string[] {
  return isMac() ? ["⌘", "⌥", "J"] : ["Ctrl", "Shift", "J"];
}

type Platform = "mac" | "other";
const SHORTCUT_KEYS: Record<Platform, string[]> = { mac: ["⌘", "⌥", "J"], other: ["Ctrl", "Shift", "J"] };
const noSubscribe = (): (() => void) => () => undefined;

/**
 * `null` while server rendering and hydrating: both shortcuts are then rendered and CSS
 * (`html[data-os=mac]`) shows one, so prerendered pages hydrate without swapping text.
 */
function usePlatform(): Platform | null {
  return useSyncExternalStore(noSubscribe, () => (isMac() ? "mac" : "other"), () => null);
}

const KEY_LABEL: Record<string, string> = { up: "↑", down: "↓", left: "←", right: "→", return: "Enter", escape: "Esc", space: "Space", tab: "Tab", backspace: "⌫", delete: "Del", pageup: "PgUp", pagedown: "PgDn" };

/** The label shown when a key reaches the app, e.g. `↑`, `Enter`, `Ctrl P`. */
export function keyLabel(e: Pick<KeyInputEvent, "key" | "input" | "ctrl" | "meta" | "alt">): string {
  const base = KEY_LABEL[e.key] ?? (e.input && e.input !== " " ? e.input : e.key.length === 1 ? e.key.toUpperCase() : e.key);
  const mods = `${e.ctrl ? "Ctrl " : ""}${e.alt ? "Alt " : ""}${e.meta ? "⌘ " : ""}`;
  return mods + (mods && base.length === 1 ? base.toUpperCase() : base);
}

/** Whether a keycap (e.g. `↑`, `Enter`, `W/A/S/D`) is part of the pressed key label. */
function keycapMatches(cap: string, pressed: string): boolean {
  const parts = pressed.toLowerCase().split(" ");
  return cap
    .toLowerCase()
    .split("/")
    .some((k) => parts.includes(k));
}

function devtoolsDocked(): boolean {
  if (typeof window === "undefined") return false;
  return estimateDockedConsoleSize(window, 7, 14).dock !== "undocked";
}

function Keycap({ children, size, c, lit = false }: { children: ReactNode; size: "lg" | "sm"; c: (typeof PALETTE)["dark" | "light"]; lit?: boolean }): ReactNode {
  const lg = size === "lg";
  return (
    <kbd
      style={{
        fontFamily: FONT,
        fontSize: lg ? 22 : 13,
        fontWeight: 500,
        lineHeight: 1,
        minWidth: lg ? 56 : 28,
        height: lg ? 56 : 28,
        padding: lg ? "0 14px" : "0 8px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: lg ? 12 : 7,
        border: `1px solid ${lit ? c.flash : c.keyEdge}`,
        borderBottomWidth: lg ? 3 : 2,
        background: lit ? c.flash : c.key,
        color: lit ? c.flashText : c.text,
        transition: "background .12s ease, color .12s ease, border-color .12s ease",
        boxSizing: "border-box",
      }}
    >
      {typeof children === "string" && children.length === 1 ? children.toUpperCase() : children}
    </kbd>
  );
}

/**
 * The page-side receiver for a console app: one large click target that tells
 * visitors to open the DevTools console, click the page so it owns the
 * keyboard, and which keys to press. It lights up as keystrokes arrive.
 * Frames are never mirrored into the page unless `showMirrorDefault` is set.
 */
export function FocusPad({ root, title, hints = [], action, capturing, onActivate, appearance = "dark", showMirrorDefault = false, top, className, style, children, sizeControl = false }: FocusPadProps): ReactNode {
  const c = PALETTE[appearance];
  const [pageFocused, setPageFocused] = useState(true);
  const [docked, setDocked] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [engineCapturing, setEngineCapturing] = useState(false);
  const [last, setLast] = useState<{ label: string; n: number } | null>(null);
  const [mirror, setMirror] = useState<StyledFrame | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lit, setLit] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = (): void => {
      setPageFocused(document.hasFocus());
      setDocked(devtoolsDocked());
      setEngineCapturing(root !== null && !root.unmounted && root.input.enabled);
    };
    const onBlur = (): void => {
      if (document.visibilityState === "visible") setBlurred(true);
      sync();
    };
    sync();
    const events: Array<[EventTarget, string, () => void]> = [
      [window, "focus", sync],
      [window, "blur", onBlur],
      [window, "resize", sync],
      [document, "visibilitychange", sync],
      [document, "focusin", sync],
      [document, "focusout", sync],
    ];
    for (const [t, type, fn] of events) t.addEventListener(type, fn);
    // Fallback for undetectable changes (undocked DevTools, focus moving between DevTools and the page).
    const poll = setInterval(sync, 1000);
    return () => {
      for (const [t, type, fn] of events) t.removeEventListener(type, fn);
      clearInterval(poll);
    };
  }, [root]);

  useEffect(() => {
    if (!root) return;
    return root.input.on("key", (e) => {
      const label = keyLabel(e);
      setLast((prev) => ({ label, n: (prev?.n ?? 0) + 1 }));
      setLit(label);
      setPageFocused(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setLit(null), 180);
    });
  }, [root]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  useEffect(() => {
    if (!root || !showMirrorDefault) return;
    let pending = false;
    if (!root.unmounted) setMirror(extractStyledFrame(root.renderer.buffer));
    return root.onFrame((frame) => {
      if (frame.skipped || pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        if (!root.unmounted) setMirror(extractStyledFrame(root.renderer.buffer));
      });
    });
  }, [root, showMirrorDefault]);

  const state = focusPadState({
    pageFocused,
    capturing: capturing ?? engineCapturing,
    devtoolsLikelyOpen: docked || blurred,
    keySeen: last !== null,
  });

  const activate = (e: MouseEvent<HTMLDivElement>): void => {
    const t = e.target as Element | null;
    if (t && typeof t.closest === "function" && t.closest(INTERACTIVE) !== null) return;
    if (onActivate) onActivate();
    else root?.input.focus();
    // Clicking moves focus off DevTools; reflect it immediately.
    setPageFocused(true);
    setEngineCapturing(root !== null && !root.unmounted && root.input.enabled);
  };

  const first = hints[0];
  const doThis = action ?? (first ? `press ${first.keys}` : "type");
  const platform = usePlatform();
  const shortcut = SHORTCUT_KEYS[platform ?? "other"];

  const step = (n: number, label: string, done: boolean, current: boolean): ReactNode => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: current ? c.text : done ? c.muted : c.subtle, whiteSpace: "nowrap" }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontFamily: MONO,
          border: `1px solid ${current ? c.text : c.faint}`,
          background: done ? c.faint : "transparent",
          color: done ? c.muted : "inherit",
        }}
      >
        {done ? "✓" : n}
      </span>
      {label}
    </span>
  );

  const headline: CSSProperties = { margin: 0, fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 600, letterSpacing: "-0.045em", lineHeight: 1.05, color: c.text, textAlign: "center" };
  const sub: CSSProperties = { margin: 0, fontSize: 16, lineHeight: 1.5, color: c.muted, textAlign: "center", maxWidth: 600, textWrap: "balance" } as CSSProperties;

  return (
    <div
      className={`tx-pad${className ? ` ${className}` : ""}`}
      data-textjs-focus-pad=""
      data-state={state}
      onMouseDown={activate}
      style={
        {
          "--tx-pad-hover": state === "live" ? c.border : c.borderHover,
          position: "relative",
          fontFamily: FONT,
          color: c.text,
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          padding: "24px 24px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          userSelect: "none",
          WebkitUserSelect: "none",
          ...style,
        } as CSSProperties
      }
    >
      <style>{CSS}</style>
      {last && state === "live" ? (
        <span
          key={last.n}
          aria-hidden="true"
          style={{ position: "absolute", inset: -1, borderRadius: 16, border: `1px solid ${c.live}`, pointerEvents: "none", animation: "tx-pad-ring .6s ease-out forwards" }}
        />
      ) : null}
      {title || top ? (
        <div className="tx-pad-top" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {title ? <span style={{ fontSize: 13, color: c.subtle, fontFamily: MONO }}>{title.startsWith("▼") ? title : `▼ ${title}`}</span> : null}
          {top}
        </div>
      ) : null}

      <div className="tx-pad-desk" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, width: "100%", minHeight: 280 }}>
        {/* Rows whose copy comes from props are keyed by it: switching demos replaces them rather than moving them (no layout shift). */}
        <div key={doThis} className="tx-pad-steps" style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", fontSize: 13 }} aria-hidden="true">
          {step(1, "Open the console", state !== "open", state === "open")}
          <span style={{ color: c.faint }}>—</span>
          {step(2, "Click here", state === "live", state === "click")}
          <span style={{ color: c.faint }}>—</span>
          {step(3, capitalize(doThis), last !== null && state === "live", state === "live")}
        </div>

        {state === "open" ? (
          <>
            <h2 className="tx-pad-headline" style={headline}>Open the console</h2>
            {(platform ? [platform] : (["mac", "other"] as const)).map((p) => (
              <div key={p} className={platform ? "tx-pad-keys" : `tx-pad-keys tx-os-${p}`} style={{ display: "flex", gap: 10 }} aria-label={`Press ${SHORTCUT_KEYS[p].join(" ")}`}>
                {SHORTCUT_KEYS[p].map((k) => (
                  <Keycap key={k} size="lg" c={c}>
                    {k}
                  </Keycap>
                ))}
              </div>
            ))}
            <p key={doThis} className="tx-pad-sub" style={sub}>{`The app renders in DevTools. Then click here and ${doThis}.`}</p>
          </>
        ) : state === "click" ? (
          <>
            <h2 className="tx-pad-headline" style={headline}>Click here, then type</h2>
            <p className="tx-pad-sub" style={sub}>The app reads keys from this page.</p>
            <p style={{ ...sub, fontSize: 13, color: c.subtle }}>
              {"Console closed? "}
              <span style={{ fontFamily: MONO, color: c.muted }}>{shortcut.join("")}</span>
            </p>
          </>
        ) : (
          <>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: c.live }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: c.live, animation: "tx-pad-pulse 1.6s ease-in-out infinite" }} />
              Live in your console
            </span>
            <h2 key={doThis} className="tx-pad-headline" style={headline}>{hints.length > 0 ? capitalize(doThis) : "Start typing"}</h2>
            <p className="tx-pad-sub" style={sub}>Watch the console.</p>
          </>
        )}

        {hints.length > 0 ? (
          <div key={hints.map((h) => `${h.keys} ${h.label}`).join("|")} className="tx-pad-hints" style={{ display: "flex", gap: 28, flexWrap: "wrap", justifyContent: "center", paddingTop: 4 }}>
            {hints.map((h) => (
              <span key={h.keys + h.label} style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: c.muted }}>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  {h.keys.split(/\s+/).map((k) => (
                    <Keycap key={k} size="sm" c={c} lit={lit !== null && state === "live" && keycapMatches(k, lit)}>
                      {k}
                    </Keycap>
                  ))}
                </span>
                {h.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="tx-pad-echo" style={{ height: 20, fontFamily: MONO, fontSize: 12, color: c.subtle }} aria-live="polite">
          {last && state === "live" ? (
            <span key={last.n} style={{ display: "inline-block", animation: "tx-pad-pop 1.4s ease-out forwards" }}>{`→ ${last.label}`}</span>
          ) : null}
        </div>
      </div>

      <div className="tx-pad-touch" style={{ flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 240, padding: "0 8px" }}>
        <h2 style={{ ...headline, fontSize: 32 }}>Open on a desktop</h2>
        <p style={sub}>This demo renders in the Chrome DevTools console, which needs a desktop browser.</p>
      </div>

      {children}
      {sizeControl ? (
        <div className="tx-pad-size">
          <ViewportControl
            root={root}
            color={c.subtle}
            activeColor={c.text}
            {...(typeof sizeControl === "object" ? sizeControl : {})}
            onChange={(choice) => {
              if (typeof sizeControl === "object") sizeControl.onChange?.(choice);
              if (onActivate) onActivate();
              else root?.input.focus();
            }}
          />
        </div>
      ) : null}
      {showMirrorDefault ? <ConsoleMirror frame={mirror} chrome appearance={appearance} /> : null}
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s[0]?.toUpperCase() + s.slice(1) : s;
}
