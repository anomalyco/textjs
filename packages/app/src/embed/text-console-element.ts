/**
 * @experimental `<text-console>`: an embedded app's place on the host page.
 * `embed.js` defines the tag and loads this file when one connects. No React:
 * Shadow DOM, one constructed stylesheet and CSSOM, so the host page's CSS
 * stays out and a `style-src 'self'` policy needs nothing added.
 *
 * - No attributes: a bar that says what to do next, as `<FocusPad>` does:
 *   open the console (`open`), click here (`click`), then the app's keys
 *   (`live`), lit as they arrive.
 * - `mirror`: the app's frame instead, from `embed.js`'s first frame until the
 *   app runs and then live. Pressing it starts the app with keys routed to it.
 * - `chrome`: a DevTools window around either one.
 * - `title`, `hints` (`"← →:switch region, Enter:open"`) and `action` default
 *   to `text.config.ts`.
 *
 * Touch screens have no console: a mirror stays a picture, and a bar hides.
 * Theme it with `color-scheme: light`, `--text-console-bg` and
 * `--text-console-fg`, or `::part(frame)`.
 */

import { embedHub, type EmbedApp } from "./hub";

/** The `text.config.ts` values the element falls back to. */
export interface TextConsoleConfig {
  title?: string;
  hints?: Array<{ keys: string; label: string }>;
  action?: string;
  /** The first frame's grid, for the blank screen a mirror shows when `embed.js` has none. */
  cols: number;
  rows: number;
}

/** `embed.js`'s prerendered frames: a CSS table and ops (see `compileShellCalls`). */
export type ShellData = [table: string[], ops: Array<0 | [format: string, css: number[], inlineCss?: number[]]>];

export type TextConsoleState = "open" | "click" | "live";

/** `<FocusPad>`'s states (see `focusPadState`): live once keys reach the app and DevTools is probably open. */
export function textConsoleState(focused: boolean, engaged: boolean, devtools: boolean, keySeen: boolean): TextConsoleState {
  if (focused && engaged && (devtools || keySeen)) return "live";
  return !focused || devtools ? "click" : "open";
}

/** `"← →:switch region, Enter:open"` as hints. A key can be `:` itself. */
export function parseHints(s: string): Array<{ keys: string; label: string }> {
  return s
    .split(",")
    .map((h) => {
      h = h.trim();
      const at = h.indexOf(":", 1);
      return { keys: (at < 0 ? h : h.slice(0, at)).trim(), label: at < 0 ? "" : h.slice(at + 1).trim() };
    })
    .filter((h) => h.keys);
}

/** The DevTools shortcut, as keycaps: ⌘⌥J in Chrome and Edge, ⌘⌥K in Firefox, ⌘⌥C in Safari (Ctrl+Shift off a Mac). */
export function shortcutKeys(mac: boolean, browser: "chromium" | "firefox" | "safari"): string[] {
  const key = browser === "firefox" ? "K" : browser === "safari" ? "C" : "J";
  return mac ? ["⌘", "⌥", key] : ["Ctrl", "Shift", key];
}

/** `KeyboardEvent.key` as a hint keycap shows it. */
const KEYCAP: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", " ": "Space", Escape: "Esc" };

/** Whether a keycap (`←`, `Enter`, `W/A/S/D`) is the key pressed. */
export function keycapMatches(cap: string, key: string): boolean {
  const k = (KEYCAP[key] ?? key).toLowerCase();
  return cap
    .toLowerCase()
    .split("/")
    .some((c) => c === k);
}

/**
 * A `console.log` format string and its CSS as runs of `[text, css]`: `%%` is
 * a literal `%`, and a leading 100vh curtain (`embed.js`'s first frame) is dropped.
 */
export function consoleRuns(format: string, css: string[]): Array<[string, string]> {
  if (format.startsWith("%c\u200b%c\n")) {
    format = format.slice(6);
    css = css.slice(2);
  }
  const runs: Array<[string, string]> = [];
  let k = -1;
  let text = "";
  for (const t of format.split(/(%[c%])/)) {
    if (t !== "%c") {
      text += t === "%%" ? "%" : t;
      continue;
    }
    if (text) runs.push([text, css[k] ?? ""]);
    text = "";
    k++;
  }
  if (text) runs.push([text, css[k] ?? ""]);
  return runs;
}

const MONO = '"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace';
const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
/** As textjs.org's mirrors: fonts whose box-drawing and block glyphs fill the whole cell, so borders don't break between rows. */
const MIRROR_FONT = 'Menlo,"Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace';
/** A shade between the text and background colors. */
const mix = (pct: number): string => `color-mix(in srgb,var(--fg) ${pct}%,var(--bg))`;

/*
 * Two colors theme it, `--text-console-bg` and `--text-console-fg`, and every other shade is mixed
 * from them. The defaults follow `color-scheme` (dark unless the page sets `text-console {
 * color-scheme: light }`); `chrome` uses DevTools' own. `all: initial` keeps inherited page styles out.
 */
const STYLE = `:host{display:block;color-scheme:dark}
:host([hidden]){display:none}
.f{all:initial;color-scheme:inherit;display:block;position:relative;--bg:var(--text-console-bg,light-dark(#fff,#0a0a0a));--fg:var(--text-console-fg,light-dark(#171717,#ededed));--mu:${mix(64)};--bd:${mix(13)};--ac:light-dark(#0070f3,#3291ff);background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:12px;overflow:hidden;font:14px/20px ${SANS};cursor:pointer;user-select:none;transition:border-color .2s}
.c{--bg:light-dark(#fff,#202124);--ac:light-dark(#1a73e8,#8ab4f8);border-radius:10px}
.m{width:fit-content;max-width:100%}
:host(:hover) .f:not([data-state=live]){border-color:${mix(26)}}
:host(:focus-visible){outline:0}
:host(:focus-visible) .f{outline:2px solid var(--ac);outline-offset:2px}
.f[data-state=live]{cursor:auto}
.m[data-state=live]{border-color:var(--ac)}
.t{display:flex;contain:inline-size;background:${mix(5)};border-bottom:1px solid var(--bd);color:var(--mu);font-size:12px;line-height:28px;white-space:nowrap;overflow:hidden}
.t>*{padding:0 10px}
.a{color:var(--fg);box-shadow:inset 0 -2px var(--ac)}
.p{padding:3px 10px 5px;color:var(--ac);font:12px/14px ${MONO}}
.b{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 24px;min-height:32px;padding:12px 16px}
.m .b{display:block;min-height:0;padding:8px}
.c .b{padding:6px 8px 2px 12px}
.n{flex:1 1 auto;color:var(--mu);font:13px/20px ${MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g,.g>*,.q{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px 20px;font-weight:500;white-space:nowrap}
.g:only-child{margin:auto}
.g>*{gap:8px}
.q{gap:4px}
.h{color:var(--mu);font-weight:400}
.k{display:inline-flex;align-items:center;justify-content:center;height:22px;min-width:10px;padding:0 6px;border-radius:6px;border:1px solid ${mix(20)};background:${mix(6)};color:var(--fg);font:500 12px/1 ${SANS};transition:.15s}
.k[data-lit]{background:var(--fg);color:var(--bg);transition:none}
.d{margin-inline-end:-8px;width:8px;height:8px;border-radius:50%;background:#45a557}
.z{overflow:hidden}
.s{width:max-content;transform-origin:0 0;direction:ltr;white-space:pre;font:12px/14px ${MONO};color:#ededed}
.s,.s *{font-family:${MIRROR_FONT}!important}
.o{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0008;opacity:0;transition:opacity .2s;pointer-events:none}
.o>*{padding:8px 14px;border-radius:99px;background:#fff;color:#000;font:500 13px/16px ${SANS}}
:host(:hover) .o,:host(:focus-visible) .o{opacity:1}
[data-state=live] .o{display:none}
@media (hover:none) and (pointer:coarse){:host(:not([mirror],[chrome])){display:none}.f{cursor:auto}.o{display:none}}`;

/** The element's CSS, then the mirror's for each distinct span style, shared by every element on the page. */
let sheets: [CSSStyleSheet, CSSStyleSheet] | null = null;
const spanClass = new Map<string, string>();

function classFor(css: string): string {
  const spans = (sheets as [CSSStyleSheet, CSSStyleSheet])[1];
  let c = spanClass.get(css);
  if (c === undefined) {
    // An app whose colors never repeat: start over (the frame being drawn re-adds its own).
    if (spanClass.size >= 4096) {
      spanClass.clear();
      spans.replaceSync("");
    }
    c = `x${spanClass.size}`;
    try {
      spans.insertRule(`.${c}{${css}}`, spans.cssRules.length);
    } catch {
      // Not a declaration list: the run draws unstyled.
    }
    spanClass.set(css, c);
  }
  return c;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, ...children: Array<Node | string>): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.append(...children);
  return e;
}

interface View {
  host: HTMLElement;
  frame: HTMLDivElement;
  body: HTMLDivElement;
  /** The mirror's screen and the box that holds its scaled size. */
  screen: HTMLDivElement | null;
  box: HTMLDivElement | null;
  /** The attributes the shadow tree was built for. */
  built: string;
  state: TextConsoleState | null;
  /** The frame on screen, and its unscaled size. */
  shown: [string, string[]] | null;
  /** The element names itself (the page set no `aria-label`). */
  label: boolean;
  chrome: boolean;
}

const views = new Set<View>();
const byHost = new WeakMap<HTMLElement, View>();
let shell: [string, string[]] | null = null;
let blurred = false;
let keySeen = false;
let listening = false;

const coarse = (): boolean => matchMedia("(hover: none) and (pointer: coarse)").matches;

function browser(): "chromium" | "firefox" | "safari" {
  // As `detectConsoleBrowser` in @textjs/core.
  if (CSS.supports("-moz-appearance", "none")) return "firefox";
  const w = window as { chrome?: unknown; navigator: { userAgentData?: unknown } };
  return !w.chrome && !w.navigator.userAgentData && CSS.supports("-webkit-hyphens", "auto") ? "safari" : "chromium";
}

export function createMount(config: TextConsoleConfig): (host: HTMLElement, data?: ShellData) => void {
  const hub = embedHub();
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const shortcut = shortcutKeys(mac, browser());

  const keys = (s: string): HTMLElement =>
    el(
      "span",
      "q",
      ...s
        .split(/\s+/)
        .filter(Boolean)
        .map((k) => el("kbd", "k", k)),
    );

  const settings = (v: View) => {
    const a = (name: string): string | null => v.host.getAttribute(name);
    const hints = a("hints");
    const chrome = a("chrome") !== null;
    return {
      // A DevTools window shows the console: `chrome` implies `mirror`.
      mirror: chrome || a("mirror") !== null,
      chrome,
      title: a("title") ?? config.title ?? "",
      hints: hints === null ? (config.hints ?? []) : parseHints(hints),
      action: a("action") ?? config.action ?? "",
    };
  };

  /** What the pad says in a state. */
  const message = (state: TextConsoleState, s: ReturnType<typeof settings>): Array<Node | string> => {
    if (state === "open") return ["Open the console", keys(shortcut.join(" "))];
    if (state === "click") {
      if (s.action) return [`Click here and ${s.action}`];
      const first = s.hints[0];
      return first ? ["Click here and press", keys(first.keys)] : ["Click to focus"];
    }
    if (s.hints.length === 0) return [el("span", "d"), "Live in your console"];
    return [el("span", "d"), ...s.hints.map((h) => el("span", "", keys(h.keys), el("span", "h", h.label)))];
  };

  const build = (v: View, s: ReturnType<typeof settings>): void => {
    const f = el("div", `f${s.mirror ? " m" : ""}${s.chrome ? " c" : ""}`);
    f.part.add("frame");
    // An empty title: the page's `title` attribute names the app here, and isn't repeated as a tooltip.
    f.title = "";
    const body = el("div", "b");
    v.screen = v.box = null;
    v.shown = null;
    if (s.chrome) {
      const tabs = ["Elements", "Console", "Sources", "Network", "Performance"].map((t) => el("span", t === "Console" ? "a" : "", t));
      f.append(el("div", "t", ...tabs));
    }
    f.append(body);
    if (s.mirror) {
      v.screen = el("div", "s");
      v.box = el("div", "z", v.screen);
      body.append(v.box);
      f.append(el("div", "o", el("span", "", "Click to focus")));
    }
    if (s.chrome) f.append(el("div", "p", "›"));
    v.frame = f;
    v.body = body;
    v.chrome = s.chrome;
    v.state = null;
    (v.host.shadowRoot as ShadowRoot).replaceChildren(f);
  };

  const draw = (v: View): void => {
    if (!v.screen || !v.box) return;
    const next = hub.app?.frame() ?? shell;
    if (next === v.shown && v.shown !== null) return;
    v.shown = next;
    let bg = "";
    if (next) {
      const nodes: Node[] = [];
      for (const [text, css] of consoleRuns(next[0], next[1])) {
        if (!css) {
          nodes.push(document.createTextNode(text));
          continue;
        }
        if (!bg) bg = /background-color:([^;]+)/.exec(css)?.[1] ?? "";
        nodes.push(el("span", classFor(css), text));
      }
      v.screen.replaceChildren(...nodes);
    } else {
      // No first frame (`ppr: false`): a blank grid of the app's size.
      v.screen.textContent = `${" ".repeat(config.cols)}\n`.repeat(config.rows).slice(0, -1);
    }
    // The app's background fills the space around the frame, as it fills the console.
    (v.chrome ? v.box : v.frame).style.background = bg;
    fit(v);
  };

  /** Scale the screen down (never up) to fit the page. */
  const fit = (v: View): void => {
    const { screen, box, host, frame } = v;
    if (!screen || !box || !host.isConnected) return;
    const w = screen.offsetWidth;
    const h = screen.offsetHeight;
    // What the frame adds around the screen: its border and padding.
    const pad = getComputedStyle(v.body);
    const extra = frame.offsetWidth - frame.clientWidth + parseFloat(pad.paddingLeft) + parseFloat(pad.paddingRight);
    const k = Math.min(1, (host.clientWidth - extra) / w);
    if (!(k > 0)) return;
    box.style.width = `${w * k}px`;
    box.style.height = `${h * k}px`;
    screen.style.transform = k < 1 ? `scale(${k})` : "";
  };

  const update = (v: View): void => {
    if (!v.host.isConnected) {
      views.delete(v);
      return;
    }
    const s = settings(v);
    const built = JSON.stringify(s);
    if (built !== v.built) {
      v.built = built;
      build(v, s);
      draw(v);
    }
    const app = hub.app;
    // A mirror is a console the visitor can already see.
    const state = textConsoleState(document.hasFocus(), app?.engaged() ?? false, s.mirror || blurred || (app?.docked() ?? false), keySeen);
    if (state === v.state) return;
    v.state = state;
    v.frame.dataset.state = state;
    let said = state === "live" ? "Live in your console" : "Click to focus";
    if (!s.mirror) {
      const msg = el("span", "g", ...message(state, s));
      const title = s.title ? el("span", "n", s.title) : null;
      v.body.replaceChildren(...(title ? [title] : []), msg);
      said = msg.textContent ?? "";
    }
    if (v.label) v.host.setAttribute("aria-label", s.title ? `${s.title}: ${said}` : said);
  };

  const all = (): void => {
    for (const v of views) update(v);
  };
  /** After the press or focus change settles (the app focuses its input once the click is over). */
  const soon = (): void => void setTimeout(all, 0);

  const listen = (): void => {
    if (listening) return;
    listening = true;
    hub.listeners.add(() => {
      for (const v of views) {
        draw(v);
        update(v);
      }
    });
    window.addEventListener("blur", () => {
      // Focus left for DevTools (or another window).
      if (document.visibilityState === "visible") blurred = true;
      all();
    });
    window.addEventListener("focus", all);
    window.addEventListener("resize", () => {
      for (const v of views) fit(v);
      all();
    });
    for (const type of ["click", "focusin", "focusout"]) document.addEventListener(type, soon, true);
    const lit = new Set<HTMLElement>();
    document.addEventListener(
      "keydown",
      (e) => {
        if (!hub.app?.engaged()) return;
        if (!keySeen) {
          keySeen = true;
          soon();
        }
        for (const v of views) {
          if (v.state !== "live") continue;
          for (const k of v.body.querySelectorAll<HTMLElement>("kbd")) {
            if (!keycapMatches(k.textContent ?? "", e.key)) continue;
            k.dataset.lit = "";
            lit.add(k);
          }
        }
        if (lit.size)
          setTimeout(() => {
            for (const k of lit) delete k.dataset.lit;
            lit.clear();
          }, 180);
      },
      { capture: true, passive: true },
    );
  };

  return (host, data) => {
    if (data && shell === null) {
      // The first frame, with the inline consoles' CSS: inline spans with 14px lines, as a page draws them.
      const op = data[1].find((o) => o !== 0);
      if (op) shell = [op[0], (op[2] ?? op[1]).map((i) => data[0][i] ?? "")];
    }
    let v = byHost.get(host);
    if (!v) {
      const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      if (!sheets) {
        sheets = [new CSSStyleSheet(), new CSSStyleSheet()];
        sheets[0].replaceSync(STYLE);
      }
      root.adoptedStyleSheets = sheets;
      v = { host, frame: el("div"), body: el("div"), screen: null, box: null, built: "", state: null, shown: null, label: !host.hasAttribute("aria-label"), chrome: false };
      byHost.set(host, v);
      const view = v;
      new MutationObserver(() => update(view)).observe(host, { attributes: true });
      new ResizeObserver(() => fit(view)).observe(host);
      if (!coarse()) {
        if (!host.hasAttribute("tabindex")) host.tabIndex = 0;
        if (!host.hasAttribute("role")) host.setAttribute("role", "button");
        // Enter or Space: a click, which `embed.js` and the app's input count as pressing the surface.
        host.addEventListener("keydown", (e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === host && view.state !== "live") {
            e.preventDefault();
            host.click();
          }
        });
      }
    }
    views.add(v);
    listen();
    update(v);
  };
}
