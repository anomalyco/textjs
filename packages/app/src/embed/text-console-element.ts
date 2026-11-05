/**
 * @experimental `<text-console>`: an embedded app's place on the host page.
 * `embed.js` defines the tag and loads this file when one connects. It uses
 * Shadow DOM, two constructed stylesheets and CSSOM instead of React, so the
 * host page's CSS stays out and a `style-src 'self'` policy needs nothing added.
 *
 * - No attributes: a one-line bar that says what to do next, as `<FocusPad>`
 *   does: open the console (`open`), click here (`click`), then the app's keys
 *   (`live`), lit as they arrive.
 * - `mirror`: the app's frame instead, from `embed.js`'s first frame until the
 *   app runs and then live. Pressing it starts the app with keys routed to it.
 * - `chrome`: a DevTools window around the mirror. It implies `mirror`.
 * - `title`, `hints` (`"← →:switch region, Enter:open"`) and `action` default
 *   to `text.config.ts`.
 *
 * Its size never depends on fonts or content: the bar is 58px tall and a
 * mirror keeps the app grid's aspect ratio (see `reserveCss`), so a host
 * page can reserve the space before this file loads.
 *
 * On touch screens a mirror shows the first frame and never starts the app,
 * and a bar is hidden. Theme it with `color-scheme: light`,
 * `--text-console-bg` and `--text-console-fg`, or `::part(frame)`.
 */

import { embedHub, type EmbedApp } from "./hub";

/** The `text.config.ts` values the element falls back to. */
export interface TextConsoleConfig {
  title?: string;
  hints?: Array<{ keys: string; label: string }>;
  action?: string;
  /** The `:host` rules that size the element: `reserveCss` for the app's grid, as the page would write them. */
  css: string;
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

/** The DevTools console shortcut, as keycaps: ⌘⌥J in Chrome and Edge, ⌘⌥K in Firefox, ⌘⌥C in Safari (Ctrl Shift off a Mac). */
export function shortcutKeys(mac: boolean, browser: "chromium" | "firefox" | "safari"): string {
  return `${mac ? "⌘ ⌥" : "Ctrl Shift"} ${browser === "firefox" ? "K" : browser === "safari" ? "C" : "J"}`;
}

/** `KeyboardEvent.key` as a hint keycap shows it. */
const KEYCAP: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", " ": "Space", Escape: "Esc" };

/** Whether a keycap (`←`, `Enter`, `W/A/S/D`) is the key pressed (`KeyboardEvent.key`). */
export function keycapMatches(cap: string, key: string): boolean {
  return cap
    .toLowerCase()
    .split("/")
    .includes((KEYCAP[key] ?? key).toLowerCase());
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

/** One stack for the title and the mirror, Menlo first as textjs.org's mirrors: its box-drawing glyphs fill the cell, so borders don't break between rows. */
const MONO = 'Menlo,"Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace';
const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
/** A shade between the text and background colors. */
const mix = (pct: number): string => `color-mix(in srgb,var(--fg) ${pct}%,var(--bg))`;
/** As `<FocusPad>` says it: Safari hides Web Inspector until its developer features are on. */
const SAFARI = "First turn on “Show features for web developers” in Safari Settings → Advanced.";

/*
 * Two colors theme it, `--text-console-bg` and `--text-console-fg`, and every other shade is mixed
 * from them. The defaults follow `color-scheme` (dark unless the page sets `text-console {
 * color-scheme: light }`); `chrome` uses DevTools' own. `all: initial` keeps inherited page styles out.
 * A mirror fills its host (sized by `reserveCss`) and scales the frame's text to fit, in whole-pixel lines.
 */
const STYLE =
  ":host{color-scheme:dark}:host([hidden]){display:none}" +
  `.f{all:initial;color-scheme:inherit;display:block;position:relative;--bg:var(--text-console-bg,light-dark(#fff,#0a0a0a));--fg:var(--text-console-fg,light-dark(#171717,#ededed));--mu:${mix(64)};--bd:${mix(13)};--ac:light-dark(#0070f3,#3291ff);background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:12px;overflow:hidden;font:14px/20px ${SANS};cursor:pointer;user-select:none}` +
  ".m{position:absolute;inset:0;display:flex;flex-direction:column}" +
  ".c{--bg:light-dark(#fff,#202124);--ac:light-dark(#1a73e8,#8ab4f8)}" +
  `:host(:hover) .f:not([data-state=live]){border-color:${mix(26)}}` +
  ":host(:focus-visible){outline:0}:host(:focus-visible) .f{outline:2px solid var(--ac);outline-offset:2px}" +
  ".f[data-state=live]{cursor:auto}.m[data-state=live]{border-color:var(--ac)}" +
  `.t{display:flex;flex-wrap:wrap;height:28px;overflow:hidden;background:${mix(5)};border-bottom:1px solid var(--bd);color:var(--mu);font-size:12px;line-height:28px}` +
  ".t>*{padding:0 10px}.a{color:var(--fg);box-shadow:inset 0 -2px var(--ac)}" +
  `.p{padding:0 10px;color:var(--ac);font:12px/22px ${MONO}}` +
  ".b{display:flex;align-items:center;justify-content:space-between;gap:24px;height:32px;padding:12px 16px;container-type:inline-size}" +
  ".m .b{display:block;flex:1;min-height:0;height:auto;padding:8px}.c .b{padding-bottom:0}" +
  `.n{flex:1;min-width:0;color:var(--mu);font:13px/20px ${MONO};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}` +
  `.w{font:12px/16px ${SANS};white-space:normal;max-height:32px}` +
  ".g,.g>*,.q{display:flex;align-items:center;gap:20px;font-weight:500;white-space:nowrap}.g{flex:none}.g:only-child{margin:auto}.g>*{gap:8px}.q{gap:4px}" +
  ".h{color:var(--mu);font-weight:400}@container (width<420px){.n{display:none}}@container (width<360px){.h{display:none}}" +
  `.k{height:20px;padding:0 6px;border-radius:6px;border:1px solid ${mix(20)};background:${mix(6)};color:var(--fg);font:500 12px/20px ${SANS};transition:.15s}` +
  ".k[data-lit]{background:var(--fg);color:var(--bg);transition:none}" +
  ".d{margin-right:-8px;width:8px;height:8px;border-radius:50%;background:#45a557}" +
  ".z{height:100%;overflow:hidden}" +
  `.s{width:max-content;direction:ltr;white-space:pre;font:12px/14px ${MONO}}` +
  ".s *{font-family:inherit!important}" +
  ".o{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0004;opacity:0;transition:opacity .2s;pointer-events:none}" +
  ".o>*{padding:6px 14px;border-radius:99px;background:#fff;color:#000;font-weight:500}" +
  ":host(:hover) .o,:host(:focus-visible) .o{opacity:1}[data-state=live] .o{display:none}" +
  "@media (hover:none) and (pointer:coarse){.f{cursor:auto}.o{display:none}}";

/** The element's CSS, then the mirror's for each distinct span style, shared by every element on the page. */
let sheets: CSSStyleSheet[] | null = null;
const spanClass = new Map<string, string>();

function classFor(css: string): string {
  let c = spanClass.get(css);
  if (c === undefined) {
    c = `x${spanClass.size}`;
    try {
      (sheets as CSSStyleSheet[])[1]!.insertRule(`.${c}{${css}}`);
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

type Frame = [format: string, css: string[], cols: number, rows: number];

/** Fields end in `_` so the build can shorten them (`mangleProps`); nothing outside this file reads them. */
interface View {
  host_: HTMLElement;
  frame_: HTMLDivElement;
  body_: HTMLDivElement;
  /** The mirror's screen and the box it's scaled to fit. */
  screen_: HTMLDivElement | null;
  box_: HTMLDivElement | null;
  /** The attributes the shadow tree was built for. */
  built_: string;
  state_: TextConsoleState | null;
  /** The frame on screen and its grid size. */
  shown_: Frame | null;
  size_: string;
  /** The element names itself: the page set no `aria-label`, and it's not a touch screen. */
  label_: boolean;
  chrome_: boolean;
}

const views = new Set<View>();
const byHost = new WeakMap<HTMLElement, View>();
let shell: Frame | null = null;
let blurred = false;
let keySeen = false;
let listening = false;

const coarse = (): boolean => matchMedia("(hover:none) and (pointer:coarse)").matches;

function browser(): "chromium" | "firefox" | "safari" {
  // As `detectConsoleBrowser` in @textjs/core.
  if (CSS.supports("-moz-appearance", "none")) return "firefox";
  const w = window as { chrome?: unknown; navigator: { userAgentData?: unknown } };
  return !w.chrome && !w.navigator.userAgentData && CSS.supports("-webkit-hyphens", "auto") ? "safari" : "chromium";
}

export function createMount(config: TextConsoleConfig): (host: HTMLElement, data?: ShellData) => void {
  const hub = embedHub();
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const kind = browser();
  const shortcut = shortcutKeys(mac, kind);

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
    const a = (name: string): string | null => v.host_.getAttribute(name);
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

  /** What the bar shows in a state, and how it's read out. */
  const message = (state: TextConsoleState, s: ReturnType<typeof settings>): [Array<Node | string>, string] => {
    if (state === "open") return [["Open the console", keys(shortcut)], `Open the console, press ${shortcut}`];
    if (state === "click") {
      const first = s.hints[0];
      const said = s.action ? `Click here and ${s.action}` : first ? `Click here and press ${first.keys}` : "Click to focus";
      return [s.action || !first ? [said] : ["Click here and press", keys(first.keys)], said];
    }
    const dot = el("span", "d");
    if (s.hints.length === 0) return [[dot, "Live in your console"], "Live in your console"];
    return [[dot, ...s.hints.map((h) => el("span", "", keys(h.keys), el("span", "h", h.label)))], s.hints.map((h) => `${h.keys} ${h.label}`.trim()).join(", ")];
  };

  const build = (v: View, s: ReturnType<typeof settings>): void => {
    const f = el("div", `f${s.mirror ? " m" : ""}${s.chrome ? " c" : ""}`);
    f.part.add("frame");
    // An empty title: the page's `title` attribute names the app here, and isn't repeated as a tooltip.
    f.title = "";
    const body = el("div", "b");
    v.screen_ = v.box_ = v.shown_ = null;
    v.size_ = "";
    if (s.chrome) f.append(el("div", "t", ...["Elements", "Console", "Sources"].map((t) => el("span", t === "Console" ? "a" : "", t))));
    f.append(body);
    if (s.mirror) {
      v.screen_ = el("div", "s");
      v.box_ = el("div", "z", v.screen_);
      body.append(v.box_);
      f.append(el("div", "o", el("span", "", "Click to focus")));
    }
    if (s.chrome) f.append(el("div", "p", "›"));
    v.frame_ = f;
    v.body_ = body;
    v.chrome_ = s.chrome;
    v.state_ = null;
    (v.host_.shadowRoot as ShadowRoot).replaceChildren(f);
  };

  /**
   * Scale the frame to fit the box with `zoom`, which redraws the text at the new size (a transform
   * would blur it), to whole-pixel 14px lines so box-drawing has no seams.
   */
  const fit = (v: View): void => {
    const { screen_: s, box_: box } = v;
    if (!s || !box) return;
    s.style.zoom = "";
    const w = s.offsetWidth;
    if (w) s.style.zoom = `${Math.max(1, Math.floor(14 * Math.min(1, box.clientWidth / w, box.clientHeight / s.offsetHeight))) / 14}`;
  };

  const draw = (v: View): void => {
    const { screen_: screen, box_: box } = v;
    if (!screen || !box) return;
    const next = (hub.app?.frame() as Frame | null | undefined) ?? shell;
    // With `ppr: false` there's no first frame: the box stays blank until the app paints.
    if (!next || next === v.shown_) return;
    v.shown_ = next;
    let bg = "";
    const nodes: Array<Node | string> = [];
    for (const [text, css] of consoleRuns(next[0], next[1])) {
      if (css && !bg) bg = /background-color:([^;]+)/.exec(css)?.[1] ?? "";
      nodes.push(css ? el("span", classFor(css), text) : text);
    }
    screen.replaceChildren(...nodes);
    // The app's background fills the space around the frame, as it fills the console.
    (v.chrome_ ? box : v.frame_).style.background = bg;
    // Measured only when the grid changes size, not on every frame.
    const size = `${next[2]}x${next[3]}`;
    if (size !== v.size_) {
      v.size_ = size;
      fit(v);
    }
  };

  const update = (v: View): void => {
    if (!v.host_.isConnected) {
      views.delete(v);
      return;
    }
    const s = settings(v);
    const built = JSON.stringify(s);
    if (built !== v.built_) {
      v.built_ = built;
      build(v, s);
      draw(v);
    }
    const app = hub.app;
    // A mirror is a console the visitor can already see.
    const state = textConsoleState(document.hasFocus(), app?.engaged() ?? false, s.mirror || blurred || (app?.docked() ?? false), keySeen);
    if (state === v.state_) return;
    v.state_ = state;
    v.frame_.dataset.state = state;
    let said = state === "live" ? "Live" : "Click to focus";
    if (!s.mirror) {
      const [parts, label] = message(state, s);
      // Safari's first step needs its developer features on: that line takes the title's place.
      const safari = kind === "safari" && state === "open";
      const side = safari ? el("span", "n w", SAFARI) : s.title ? el("span", "n", s.title) : null;
      v.body_.replaceChildren(...(side ? [side] : []), el("span", "g", ...parts));
      said = safari ? `${label}. ${SAFARI}` : label;
    }
    if (v.label_) v.host_.setAttribute("aria-label", s.title ? `${s.title}: ${said}` : said);
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
      // An app whose colors never repeat: start the span styles over before drawing, never partway through.
      if (spanClass.size >= 4096) {
        spanClass.clear();
        (sheets as CSSStyleSheet[])[1]!.replaceSync("");
        for (const v of views) v.shown_ = null;
      }
      for (const v of views) {
        draw(v);
        update(v);
      }
    });
    addEventListener("blur", () => {
      // Focus left for DevTools (or another window).
      if (document.visibilityState === "visible") blurred = true;
      all();
    });
    addEventListener("focus", all);
    addEventListener("resize", all);
    for (const type of ["click", "focusin", "focusout"]) document.addEventListener(type, soon, true);
    document.addEventListener(
      "keydown",
      (e) => {
        if (!hub.app?.engaged()) return;
        if (!keySeen) {
          keySeen = true;
          soon();
        }
        // The key lights up on its keycap for a moment.
        for (const v of views)
          if (v.state_ === "live")
            for (const k of v.body_.querySelectorAll("kbd"))
              if (keycapMatches(k.textContent as string, e.key)) {
                k.dataset.lit = "";
                setTimeout(() => delete k.dataset.lit, 180);
              }
      },
      { capture: true, passive: true },
    );
  };

  return (host, data) => {
    if (data && !shell) {
      // The first frame, with the inline consoles' CSS: inline spans with 14px lines, as a page draws them.
      const op = data[1].find((o) => o !== 0);
      if (op) shell = [op[0], (op[2] ?? op[1]).map((i) => data[0][i] ?? ""), 0, 0];
    }
    let v = byHost.get(host);
    if (!v) {
      const root = host.attachShadow({ mode: "open" });
      if (!sheets) {
        sheets = [new CSSStyleSheet(), new CSSStyleSheet()];
        sheets[0]!.replaceSync(STYLE + config.css);
      }
      root.adoptedStyleSheets = sheets;
      const touch = coarse();
      v = { host_: host, frame_: null!, body_: null!, screen_: null, box_: null, built_: "", state_: null, shown_: null, size_: "", label_: !touch && !host.hasAttribute("aria-label"), chrome_: false };
      byHost.set(host, v);
      const view = v;
      new MutationObserver(() => update(view)).observe(host, { attributes: true });
      new ResizeObserver(() => fit(view)).observe(host);
      if (!touch) {
        if (!host.hasAttribute("tabindex")) host.tabIndex = 0;
        if (!host.hasAttribute("role")) host.setAttribute("role", "button");
        // Enter or Space: a click, which `embed.js` and the app's input count as pressing the surface.
        host.addEventListener("keydown", (e) => {
          if ((e.key === "Enter" || e.key === " ") && e.target === host && view.state_ !== "live") {
            e.preventDefault();
            host.click();
          }
        });
      }
    }
    views.add(v);
    listen();
    // Reconnected: whatever the app painted while it was out of the page (or with styles since started over).
    v.shown_ = null;
    draw(v);
    update(v);
  };
}
