import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { CHROME_STORAGE_KEY, detectConsoleBrowser, estimateDockedConsoleSize, extractStyledFrame, type ConsoleBrowser, type KeyInputEvent, type StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "../root";
import { ConsoleMirror } from "./ConsoleMirror";
import { defaultFocusPadMessages, resolveFocusPadMessages, type FocusPadMessages } from "./messages";
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
  /** The first row of the message, above the steps (e.g. the app's wordmark). Also shown above the touch notice. */
  banner?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Content below the message. */
  children?: ReactNode;
  /** Show a quiet console size picker ("Fit console" or a fixed grid) in the corner. */
  sizeControl?: boolean | Omit<ViewportControlProps, "root">;
  /** Replace any of the pad's built-in strings, e.g. with translations (see `defaultFocusPadMessages`). */
  messages?: Partial<FocusPadMessages>;
}

const PALETTE = {
  dark: {
    bg: "#0a0a0a",
    border: "#1f1f1f",
    borderHover: "#333333",
    text: "#ededed",
    muted: "#a1a1a1",
    subtle: "#7c7c7c",
    track: "rgba(255,255,255,0.12)",
    key: "linear-gradient(180deg, #1a1a1a, #131313)",
    keyEdge: "#2e2e2e",
    keyShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 0 rgba(0,0,0,0.6)",
    live: "#45a557",
    flash: "#ededed",
    flashText: "#0a0a0a",
    focus: "#3291ff",
  },
  light: {
    bg: "#ffffff",
    border: "#eaeaea",
    borderHover: "#d4d4d4",
    text: "#171717",
    muted: "#666666",
    subtle: "#737373",
    track: "rgba(0,0,0,0.1)",
    key: "linear-gradient(180deg, #ffffff, #f7f7f7)",
    keyEdge: "#e0e0e0",
    keyShadow: "inset 0 -1px 0 rgba(0,0,0,0.05), 0 1px 1px rgba(0,0,0,0.04)",
    live: "#15803d",
    flash: "#171717",
    flashText: "#ffffff",
    focus: "#0070f3",
  },
} as const;

const FONT = 'Geist, "Geist Fallback", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"Geist Mono", "Geist Mono Fallback", ui-monospace, "SF Mono", Menlo, monospace';
const EASE = "cubic-bezier(.2,.8,.2,1)";

/*
 * The message is one column on an 8px grid: progress, headline, hero (the keys to press, or the
 * click target), and one supporting line. Every state renders the same four rows, so switching
 * state swaps their contents in place. Sizes are CSS custom properties a host page can override.
 */
const CSS = `
.tx-pad{cursor:pointer;transition:border-color .2s ease}
.tx-pad:hover{border-color:var(--tx-pad-hover)!important}
.tx-pad[data-state=live]{cursor:default}
.tx-pad-desk{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--tx-pad-gap,32px);width:100%;min-height:280px}
.tx-pad-steps{display:flex;align-items:center;gap:4px;height:8px;margin-bottom:-8px}
.tx-pad-seg{position:relative;width:24px;height:4px;border-radius:2px;background:var(--tx-track);overflow:hidden}
.tx-pad-seg>i{position:absolute;inset:0;border-radius:inherit;transition:transform .5s ${EASE},opacity .3s ease}
.tx-pad-seg>i:first-child{background:var(--tx-text);transform-origin:left center;transform:scaleX(0)}
[dir=rtl] .tx-pad-seg>i:first-child{transform-origin:right center}
.tx-pad-seg[data-step=done]>i:first-child{transform:none;opacity:.4}
.tx-pad-seg[data-step=current]>i:first-child{transform:none}
.tx-pad-seg>i:last-child{background:var(--tx-live);opacity:0}
.tx-pad[data-state=live] .tx-pad-seg>i:last-child{opacity:1}
.tx-pad-headline{margin:0;font-size:var(--tx-pad-headline,32px);line-height:var(--tx-pad-headline-lh,40px);font-weight:600;letter-spacing:-.032em;color:var(--tx-text);text-align:center;text-wrap:balance}
.tx-pad-headline,.tx-pad-hero,.tx-pad-sub{width:100%}
.tx-pad-headline.tx-pad-live{display:flex;align-items:center;justify-content:center;gap:14px}
.tx-pad-dot{position:relative;flex:none;width:10px;height:10px;border-radius:50%;background:var(--tx-live)}
.tx-pad-dot::after{content:"";position:absolute;inset:-5px;border-radius:50%;background:var(--tx-live);opacity:0;animation:tx-pad-halo 2s ${EASE} infinite}
.tx-pad-hero{display:flex;align-items:center;justify-content:center;min-height:var(--tx-pad-hero,72px)}
.tx-pad-keys{display:flex;gap:8px}
.tx-pad-hints{display:flex;flex-wrap:wrap;justify-content:center;column-gap:32px;row-gap:16px}
.tx-pad-hint{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;line-height:24px;color:var(--tx-muted);white-space:nowrap}
.tx-pad-hint>span{display:flex;gap:6px}
.tx-pad-click{position:relative;display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;border:1px solid var(--tx-key-edge);background:var(--tx-key);box-shadow:var(--tx-key-shadow);color:var(--tx-text)}
.tx-pad-click::after{content:"";position:absolute;inset:-1px;border-radius:50%;border:1px solid var(--tx-text);opacity:0;animation:tx-pad-ripple 2.4s ${EASE} infinite}
.tx-pad-sub{margin:0;max-width:560px;min-height:24px;font-size:15px;line-height:24px;color:var(--tx-muted);text-align:center;text-wrap:balance}
.tx-pad-line{display:inline-block}
.tx-pad-line kbd{display:inline-block;box-sizing:border-box;height:22px;margin:0 2px;padding:0 6px;border-radius:6px;border:1px solid var(--tx-key-edge);background:var(--tx-key);box-shadow:var(--tx-key-shadow);font:500 12px/20px ${FONT};letter-spacing:.06em;color:var(--tx-text);vertical-align:1px}
.tx-key{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:24px;min-width:24px;padding:0 7px;border-radius:6px;border:1px solid var(--tx-key-edge);background:var(--tx-key);box-shadow:var(--tx-key-shadow);color:var(--tx-text);font:500 12px/1 ${FONT};letter-spacing:0;transition:background .15s ease,color .15s ease,border-color .15s ease}
.tx-key-md{height:40px;min-width:40px;padding:0 12px;border-radius:9px;font-size:15px}
.tx-key-lg{height:56px;min-width:56px;padding:0 16px;border-radius:12px;font-size:20px}
.tx-key[data-lit]{background:var(--tx-flash);border-color:var(--tx-flash);color:var(--tx-flash-text);transition:none}
.tx-key svg{display:block}
.tx-pad-echo{display:inline-flex;vertical-align:top;animation:tx-pad-pop 1.4s ${EASE} forwards}
.tx-pad-in{animation:tx-pad-in .32s ${EASE} both}
.tx-pad-ring{position:absolute;inset:-1px;border-radius:inherit;border:1px solid var(--tx-live);pointer-events:none;opacity:0;animation:tx-pad-ring .6s ease-out}
.tx-pad-touch{display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:240px;padding:0 8px}
.tx-pad-touch h2{margin:0;font-size:28px;line-height:36px;font-weight:600;letter-spacing:-.028em;color:var(--tx-text);text-align:center}
.tx-pad-touch p{margin:0;max-width:400px;font-size:15px;line-height:24px;color:var(--tx-muted);text-align:center;text-wrap:balance}
.tx-pad-size{position:absolute;inset-inline-end:24px;bottom:24px}
.tx-pad-size:has(select:focus-visible){outline:2px solid var(--tx-focus);outline-offset:4px;border-radius:4px}
@media (min-width:901px){.tx-pad[data-size-corner] .tx-pad-desk{padding-bottom:32px}}
@media (max-width:900px){.tx-pad-size{position:static}}
html[data-browser=safari] .tx-pad .tx-pad-sub,.tx-pad[data-console=safari] .tx-pad-sub{min-height:48px}
@media (max-width:640px){
html[data-browser=safari] .tx-pad .tx-pad-sub,.tx-pad[data-console=safari] .tx-pad-sub{min-height:72px}
.tx-pad{--tx-pad-gap:24px;--tx-pad-headline:28px;--tx-pad-headline-lh:36px;--tx-pad-hero:64px}
.tx-pad-hints{column-gap:24px}
.tx-pad-click{width:48px;height:48px}
.tx-key-md{height:32px;min-width:32px;padding:0 9px;border-radius:7px;font-size:13px}
.tx-key-lg{height:48px;min-width:48px;padding:0 14px;border-radius:10px;font-size:18px}
}
@media (max-width:359px){.tx-pad{--tx-pad-headline:24px;--tx-pad-headline-lh:32px}}
@media (hover:none) and (pointer:coarse){.tx-pad{cursor:default}.tx-pad-touch{display:flex}.tx-pad-desk,.tx-pad-size{display:none!important}}
@keyframes tx-pad-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes tx-pad-halo{0%{opacity:.35;transform:scale(.6)}80%,100%{opacity:0;transform:scale(1.4)}}
@keyframes tx-pad-ripple{0%{opacity:.3;transform:scale(1)}70%,100%{opacity:0;transform:scale(1.45)}}
@keyframes tx-pad-ring{0%{opacity:.6}100%{opacity:0}}
@keyframes tx-pad-pop{0%{opacity:0;transform:translateY(4px)}12%{opacity:1;transform:none}70%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.tx-pad *{animation:none!important;transition:none!important}.tx-pad-ring,.tx-pad-dot::after,.tx-pad-click::after{display:none}}
.tx-pad-keys,.tx-pad-hint>span,.tx-pad-echo,.tx-pad-line kbd{direction:ltr;unicode-bidi:isolate}
.tx-pad:is(:lang(ja),:lang(zh),:lang(ko)) .tx-pad-gap{display:none}
.tx-pad:is(:lang(ar),:lang(fa),:lang(ur),:lang(he),:lang(hi),:lang(ja),:lang(ko),:lang(zh)) :is(.tx-pad-headline,.tx-pad-touch h2){letter-spacing:0}
html:not([data-os=mac]) .tx-pad .tx-os-mac,html[data-os=mac] .tx-pad .tx-os-other,html:not([data-browser=firefox]) .tx-pad .tx-br-firefox,html:not([data-browser=safari]) .tx-pad .tx-br-safari,html[data-browser=firefox] .tx-pad .tx-br-chromium,html[data-browser=safari] .tx-pad .tx-br-chromium,html[data-browser=safari] .tx-pad .tx-not-safari{display:none!important}
`;

const INTERACTIVE = "a,button,input,textarea,select,label,summary,[contenteditable],[data-focus-pad-ignore]";

function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** The parts of a mousedown `activateFocusPad` reads. */
export interface FocusPadPress {
  button: number;
  ctrlKey: boolean;
  target: EventTarget | null;
  preventDefault(): void;
}

/**
 * Route keys to the console on a primary press on the pad. Returns whether it did.
 *
 * Only then is mousedown's default prevented: otherwise it blurs the input sink we
 * focus, and IMEs only compose into a focused editable element. Middle and right
 * presses, ⌃-click on macOS, touch screens (where focusing would open the soft
 * keyboard) and the pad's own controls keep their defaults.
 */
export function activateFocusPad(e: FocusPadPress, o: { root: ConsoleRoot | null; onActivate?: () => void; mac?: boolean; coarsePointer?: boolean }): boolean {
  if (e.button !== 0 || (e.ctrlKey && (o.mac ?? isMac()))) return false;
  if (o.coarsePointer ?? (typeof matchMedia === "function" && matchMedia("(hover: none) and (pointer: coarse)").matches)) return false;
  const t = e.target as Element | null;
  if (t && typeof t.closest === "function" && t.closest(INTERACTIVE) !== null) return false;
  if (!o.onActivate && !o.root) return false;
  e.preventDefault();
  if (o.onActivate) o.onActivate();
  else o.root?.input.focus();
  return true;
}

/**
 * The console the pad gives directions for: the browser (see `ConsoleBrowser`) and, where the
 * shortcut differs, the platform. Safari only runs on macOS.
 */
export type FocusPadConsole = "chromium-mac" | "chromium-other" | "firefox-mac" | "firefox-other" | "safari";

const CONSOLES: readonly FocusPadConsole[] = ["chromium-mac", "chromium-other", "firefox-mac", "firefox-other", "safari"];

/** Chrome and Edge open the console with ⌘⌥J, Firefox with ⌘⌥K, Safari with ⌘⌥C. */
const SHORTCUT_KEYS: Record<FocusPadConsole, string[]> = {
  "chromium-mac": ["⌘", "⌥", "J"],
  "chromium-other": ["Ctrl", "Shift", "J"],
  "firefox-mac": ["⌘", "⌥", "K"],
  "firefox-other": ["Ctrl", "Shift", "K"],
  safari: ["⌘", "⌥", "C"],
};

/** The console for a browser and platform (exported for tests). */
export function focusPadConsole(browser: ConsoleBrowser | null, mac: boolean): FocusPadConsole {
  if (browser === "safari") return "safari";
  return `${browser === "firefox" ? "firefox" : "chromium"}-${mac ? "mac" : "other"}`;
}

function currentConsole(): FocusPadConsole {
  return focusPadConsole(detectConsoleBrowser(), isMac());
}

/** The DevTools console shortcut for this browser and platform, as keycaps. */
export function devtoolsShortcutKeys(): string[] {
  return SHORTCUT_KEYS[currentConsole()];
}

/**
 * Classes that let a host page pick a prerendered variant before hydration with `html[data-os=mac]`
 * and `html[data-browser=firefox|safari]` (no attribute: Chromium on Windows or Linux).
 */
function variantClass(c: FocusPadConsole): string {
  if (c === "safari") return "tx-br-safari";
  const [browser, os] = c.split("-");
  return `tx-br-${browser} tx-os-${os}`;
}

const noSubscribe = (): (() => void) => () => undefined;

/**
 * `null` while server rendering and hydrating: every variant is then rendered and CSS
 * (`html[data-os]`, `html[data-browser]`) shows one, so prerendered pages hydrate without swapping text.
 */
function useConsole(): FocusPadConsole | null {
  return useSyncExternalStore(noSubscribe, currentConsole, () => null);
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

/** The browser chrome height the viewport learned while DevTools was closed (see `ViewportController`). */
function storedChromeHeight(): number | undefined {
  try {
    const v = Number(localStorage.getItem(CHROME_STORAGE_KEY) ?? Number.NaN);
    return Number.isFinite(v) && v >= 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function devtoolsDocked(): boolean {
  if (typeof window === "undefined") return false;
  return estimateDockedConsoleSize(window, 7, 14, { browserChromeHeight: storedChromeHeight() }).dock !== "undocked";
}

const ARROWS: Record<string, string> = {
  "←": "M12.5 8h-9M7 4.5 3.5 8 7 11.5",
  "→": "M3.5 8h9M9 4.5 12.5 8 9 11.5",
  "↑": "M8 12.5v-9M4.5 7 8 3.5 11.5 7",
  "↓": "M8 3.5v9M4.5 9 8 12.5 11.5 9",
};

type KeySize = "sm" | "md" | "lg";

/** A keycap. Arrows are drawn as icons: font arrows sit on the text baseline and look low in a cap. */
function Keycap({ k, size = "sm", lit = false }: { k: string; size?: KeySize; lit?: boolean }): ReactNode {
  const arrow = ARROWS[k];
  const icon = size === "lg" ? 20 : size === "md" ? 16 : 12;
  return (
    <kbd className={size === "sm" ? "tx-key" : `tx-key tx-key-${size}`} data-lit={lit ? "" : undefined} aria-label={arrow ? k : undefined}>
      {arrow ? (
        <svg width={icon} height={icon} viewBox="0 0 16 16" aria-hidden="true">
          <path d={arrow} fill="none" stroke="currentColor" strokeWidth={size === "sm" ? 1.6 : 1.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : k.length === 1 ? (
        k.toUpperCase()
      ) : (
        k
      )}
    </kbd>
  );
}

const POINTER = "M5 3.5v13.2l3.6-3.4 2.3 5.2 2.2-1-2.3-5.1h5Z";

export interface FocusPadMessageProps {
  state: FocusPadState;
  hints: readonly FocusPadHint[];
  /** What to do once focused, e.g. `"press ← →"`. */
  doThis: string;
  /** `null` while prerendering: every console's directions are rendered and CSS shows one. */
  devtools: FocusPadConsole | null;
  /** The key that just reached the app, lit on its keycap and echoed below. */
  lit?: string | null;
  last?: { label: string; n: number } | null;
  /** Animate rows in (after the first state change only, so the first paint never fades). */
  animate?: boolean;
  messages?: FocusPadMessages;
}

/**
 * The pad's message for one state (exported for tests). Four rows in every state, so a state change
 * swaps their contents without moving anything:
 * - `open`: the DevTools shortcut as large keycaps, and what to do after.
 * - `click`: a click target.
 * - `live`: the app's keys, lit as they arrive, with the last key echoed below.
 */
export function FocusPadMessage({ state, hints, doThis, devtools, lit = null, last = null, animate = false, messages: m = defaultFocusPadMessages }: FocusPadMessageProps): ReactNode {
  const step = state === "open" ? 1 : state === "click" ? 2 : 3;
  const enter = animate ? "tx-pad-in" : undefined;
  const cls = (name: string): string => (enter ? `${name} ${enter}` : name);
  const segment = (n: number): ReactNode => (
    <span key={n} className="tx-pad-seg" data-step={n < step || state === "live" ? "done" : n === step ? "current" : "todo"}>
      <i />
      <i />
    </span>
  );

  return (
    <>
      <div className="tx-pad-steps" role="img" aria-label={state === "live" ? m.stepLive : m.step(step, 3)}>
        {[1, 2, 3].map(segment)}
      </div>

      {state === "open" ? (
        <>
          <h2 key="open" className={cls("tx-pad-headline")}>
            {m.openConsole}
          </h2>
          <div key="open-hero" className={cls("tx-pad-hero")}>
            {(devtools ? [devtools] : CONSOLES).map((c) => (
              <div key={c} className={devtools ? "tx-pad-keys" : `tx-pad-keys ${variantClass(c)}`} aria-label={m.pressShortcut(SHORTCUT_KEYS[c].join(" "))}>
                {SHORTCUT_KEYS[c].map((k) => (
                  <Keycap key={k} k={k} size="lg" />
                ))}
              </div>
            ))}
          </div>
          {/* Keyed by the action: switching demos replaces the line rather than reflowing it (no layout shift). */}
          <p key={`open-${doThis}`} className={cls("tx-pad-sub")}>
            {/* Safari hides Web Inspector until its developer features are turned on. */}
            {devtools !== "safari" ? (
              <span key="devtools" className={devtools ? "tx-pad-line" : "tx-pad-line tx-not-safari"}>
                {m.rendersInDevtools}
              </span>
            ) : null}
            {devtools === null || devtools === "safari" ? (
              <span key="safari" className={devtools ? "tx-pad-line" : "tx-pad-line tx-br-safari"}>
                {m.safariDeveloperFeatures}
              </span>
            ) : null}
            <span className="tx-pad-gap"> </span>
            <span className="tx-pad-line">{m.then(doThis)}</span>
          </p>
        </>
      ) : state === "click" ? (
        <>
          <h2 key="click" className={cls("tx-pad-headline")}>
            {m.clickHere}
          </h2>
          <div key="click-hero" className={cls("tx-pad-hero")} aria-hidden="true">
            <span className="tx-pad-click">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <path d={POINTER} fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
          <p key="click-sub" className={cls("tx-pad-sub")}>
            <span className="tx-pad-line">{m.readsKeys}</span>
            <span className="tx-pad-gap"> </span>
            <span className="tx-pad-line">
              {m.shortcutOpens(
                (devtools ? [devtools] : CONSOLES).map((c) => (
                  <kbd key={c} className={devtools ? undefined : variantClass(c)}>
                    {SHORTCUT_KEYS[c].join(c.endsWith("-other") ? "+" : "")}
                  </kbd>
                )),
              )}
            </span>
          </p>
        </>
      ) : (
        <>
          <h2 key="live" className={cls("tx-pad-headline tx-pad-live")}>
            <span className="tx-pad-dot" aria-hidden="true" />
            {m.liveInConsole}
          </h2>
          <div key={`live-${hints.map((h) => `${h.keys} ${h.label}`).join("|")}`} className={cls("tx-pad-hero")}>
            {hints.length > 0 ? (
              <div className="tx-pad-hints">
                {hints.map((h) => (
                  <span key={h.keys + h.label} className="tx-pad-hint">
                    <span>
                      {h.keys.split(/\s+/).map((k) => (
                        <Keycap key={k} k={k} size="md" lit={lit !== null && keycapMatches(k, lit)} />
                      ))}
                    </span>
                    {h.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <p key="live-sub" className={cls("tx-pad-sub")} aria-live="polite">
            {last && !hints.some((h) => h.keys.split(/\s+/).some((k) => keycapMatches(k, last.label))) ? (
              <span key={last.n} className="tx-pad-echo">
                <Keycap k={last.label} />
              </span>
            ) : hints.length > 0 ? null : (
              m.startTyping
            )}
          </p>
        </>
      )}
    </>
  );
}

/**
 * The page-side receiver for a console app: one large click target that tells
 * visitors to open the DevTools console, click the page so it owns the
 * keyboard, and which keys to press. It lights up as keystrokes arrive.
 * Frames are never mirrored into the page unless `showMirrorDefault` is set.
 */
export function FocusPad({ root, title, hints = [], action, capturing, onActivate, appearance = "dark", showMirrorDefault = false, top, banner, className, style, children, sizeControl = false, messages }: FocusPadProps): ReactNode {
  const c = PALETTE[appearance];
  const m = useMemo(() => resolveFocusPadMessages(messages), [messages]);
  const sizeOverrides = typeof sizeControl === "object" ? sizeControl.messages : undefined;
  const sizeMessages = useMemo(() => resolveFocusPadMessages(sizeOverrides, m), [sizeOverrides, m]);
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
    if (!activateFocusPad(e, { root, onActivate })) return;
    // Clicking moves focus off DevTools; reflect it immediately.
    setPageFocused(true);
    setEngineCapturing(root !== null && !root.unmounted && root.input.enabled);
  };

  // Rows fade in on state changes, never on the first paint (prerendered pages would flash).
  const firstState = useRef(state);
  const changed = useRef(false);
  if (state !== firstState.current) changed.current = true;

  const first = hints[0];
  const doThis = action ?? m.defaultAction(first ? first.keys : null);
  const devtools = useConsole();
  const live = state === "live";

  return (
    <div
      className={`tx-pad${className ? ` ${className}` : ""}`}
      data-textjs-focus-pad=""
      data-state={state}
      // Safari's open-state line wraps to two lines (three when narrow); every state reserves them.
      data-console={devtools === "safari" ? "safari" : undefined}
      // The size control sits in the corner on wide screens; without content below, the message keeps clear of it.
      data-size-corner={sizeControl && children == null ? "" : undefined}
      onMouseDown={activate}
      style={
        {
          "--tx-pad-hover": live ? c.border : c.borderHover,
          "--tx-text": c.text,
          "--tx-muted": c.muted,
          "--tx-subtle": c.subtle,
          "--tx-track": c.track,
          "--tx-key": c.key,
          "--tx-key-edge": c.keyEdge,
          "--tx-key-shadow": c.keyShadow,
          "--tx-live": c.live,
          "--tx-flash": c.flash,
          "--tx-flash-text": c.flashText,
          "--tx-focus": c.focus,
          position: "relative",
          fontFamily: FONT,
          color: c.text,
          background: c.bg,
          borderStyle: "solid",
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 24,
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
      {last && live ? <span key={last.n} className="tx-pad-ring" aria-hidden="true" /> : null}
      {title || top ? (
        <div className="tx-pad-top" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {title ? <span style={{ fontSize: 13, lineHeight: "20px", color: c.subtle, fontFamily: MONO }}>{title.startsWith("▼") ? title : `▼ ${title}`}</span> : null}
          {top}
        </div>
      ) : null}

      <div className="tx-pad-desk">
        {banner ? <div className="tx-pad-banner">{banner}</div> : null}
        <FocusPadMessage state={state} hints={hints} doThis={doThis} devtools={devtools} lit={live ? lit : null} last={live ? last : null} animate={changed.current} messages={m} />
      </div>

      <div className="tx-pad-touch">
        {banner ? <div className="tx-pad-banner">{banner}</div> : null}
        <h2>{m.openOnDesktop}</h2>
        <p>{m.needsDesktop}</p>
      </div>

      {children}
      {sizeControl ? (
        <div className="tx-pad-size">
          <ViewportControl
            root={root}
            color={c.subtle}
            activeColor={c.text}
            {...(typeof sizeControl === "object" ? sizeControl : {})}
            messages={sizeMessages}
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
