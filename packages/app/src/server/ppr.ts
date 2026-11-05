/**
 * Partial Prerendering for the console: `text build` renders each static
 * route's first frame (the static shell, with `<Suspense>` fallbacks where
 * data is still loading) and inlines it into that route's HTML as a classic
 * `<script>` that replays the driver's exact `console.clear()` +
 * `console.log(format, ...css)`, before any module loads. The client (or the
 * frame player) then boots with `initialClear: false`, so its first frame is
 * appended below the shell and swaps in within one DevTools paint: the
 * console is cleared exactly once.
 *
 * The replay is portable: {@link compileShellCalls} packs the calls (one or
 * more frames) into a shared CSS table, and {@link createShellReplayCode}
 * turns that into a self-contained expression that also runs outside a
 * Text.js page (an embed script on someone else's site).
 */

import type { ShellCall } from "./live-app";
import { inlineJson } from "./live-routes";

/** The URL path a shell paints on (`basePath` + route pattern, percent-encoded like `location.pathname`). */
export function shellPath(basePath: string, pattern: string): string {
  const p = pattern === "/" ? basePath || "/" : `${basePath}${pattern}`;
  return encodeURI(p);
}

/** A `console.log`: its format string, then its CSS arguments (and Firefox's and Safari's, when they differ) as table indexes. */
export type ShellLog = [format: string, css: number[]] | [format: string, css: number[], inlineCss: number[]];

/** `0` is a `console.clear()`. */
export type ShellOp = 0 | ShellLog;

export interface CompiledShell {
  /** Every distinct CSS argument, shared by all frames. */
  table: string[];
  /** The calls in order. Each log is one frame. */
  ops: ShellOp[];
}

/** Pack shell calls into a CSS table plus ops. Frames share the table, so a loop costs little more than its first frame. */
export function compileShellCalls(calls: readonly ShellCall[]): CompiledShell {
  const table: string[] = [];
  const index = new Map<string, number>();
  const ops: ShellOp[] = [];
  const intern = (a: string): number => {
    let i = index.get(a);
    if (i === undefined) {
      i = table.length;
      table.push(a);
      index.set(a, i);
    }
    return i;
  };
  for (const c of calls) {
    if (c.method === "clear") {
      ops.push(0);
      continue;
    }
    const [format = "", ...args] = c.args;
    ops.push(c.inlineArgs ? [format, args.map(intern), c.inlineArgs.map(intern)] : [format, args.map(intern)]);
  }
  return { table, ops };
}

/**
 * Whether a shell shows right-to-left text: the console driver wraps every
 * span of it in LEFT-TO-RIGHT OVERRIDE (U+202D). The client then starts
 * loading the bidi engine at boot, so its first frame repaints the shell in
 * display order too.
 */
export function shellHasRtl(compiled: CompiledShell): boolean {
  return compiled.ops.some((o) => o !== 0 && o[0].includes("\u202D"));
}

export interface ShellReplayOptions {
  /**
   * Paint only when `location.pathname` (ignoring a trailing slash) is this
   * path, so an SPA-fallback copy of the document never paints the wrong
   * route. Omit to paint on any page.
   */
  path?: string;
  /**
   * Record the paint on `window.__TEXTJS_SHELL__` and `__TEXTJS_SHELL_AT__`,
   * where the client and the frame player on a Text.js page look for it, and
   * set `__TEXTJS_SHELL_RTL__` when it shows right-to-left text (`shellHasRtl`).
   * Otherwise the expression evaluates to the paint's `performance.now()`
   * (`undefined` when it didn't paint), for the frame player's `shellPaintedAt`.
   */
  globalFlag?: boolean;
  /**
   * Milliseconds between frames when the shell has more than one (default
   * 200). The frames loop while the page isn't hidden.
   */
  intervalMs?: number;
  /**
   * An identifier that holds `[table, ops]` (see {@link shellData}), read
   * instead of inlining them, so other code in the same script can use the
   * frames too. Only without `path`.
   */
  data?: string;
}

/** The `[table, ops]` a replay reads when given `data`, as a JavaScript expression. */
export function shellData(compiled: CompiledShell): string {
  return `[${inlineJson(compiled.table)},${inlineJson(compiled.ops)}]`;
}

const NOW = `typeof performance!=="undefined"?performance.now():void 0`;
// Firefox and Safari get the inline-console CSS, detected as in detectConsoleBrowser(): -moz-appearance first, then
// window.chrome or navigator.userAgentData (Chromium), then WebKit-only CSS.
const DETECT =
  `var n=1;try{if(typeof window!=="undefined"&&typeof CSS!=="undefined"&&CSS.supports)n=CSS.supports("-moz-appearance","none")||!window.chrome&&!(typeof navigator!=="undefined"&&navigator.userAgentData)&&(CSS.supports("-webkit-hyphens","auto")||CSS.supports("-webkit-backdrop-filter","none"))?2:1}catch(e){}`;
const LOG = `var x=o[n]||o[1],a=[o[0]];for(var j=0;j<x.length;j++)a.push(c[x[j]]);console.log.apply(console,a)`;
/** Frames logged before a loop clears the console, like `CssConsoleDriver`'s default `maxFrames`. */
const LOOP_MAX_FRAMES = 300;

/**
 * A self-contained JavaScript expression that replays a compiled shell. One
 * frame logs once. Several frames log the first, then cycle through all of
 * them every `intervalMs` while `document.visibilityState` isn't `"hidden"`
 * (focus doesn't matter: DevTools has it while the visitor watches the
 * console), clearing only on the first pass and then every 300 frames.
 */
export function createShellReplayCode(compiled: CompiledShell, options: ShellReplayOptions = {}): string {
  const { path, globalFlag = false } = options;
  const guard =
    path === undefined
      ? `if(typeof console==="undefined")return;`
      : `var l=location.pathname;if(l.length>1&&l.charAt(l.length-1)==="/")l=l.slice(0,-1);if(l!==p||typeof console==="undefined")return;`;
  let paint: string;
  if (compiled.ops.filter((o) => o !== 0).length > 1) {
    const ms = Math.max(1, Math.round(options.intervalMs ?? 200));
    if (!Number.isFinite(ms)) throw new Error(`intervalMs must be a finite number of milliseconds, got ${options.intervalMs}`);
    // g(q) logs the next frame (and on the first pass, q, the clears before it).
    paint =
      `var i=0,m=1,t=0,d=typeof document!=="undefined"?document:null;function g(q){for(;;){var o=s[i];i=(i+1)%s.length;if(o===0){if(q)console.clear();continue}${LOG};return}}g(1);` +
      `function k(){t=0;if(d.visibilityState==="hidden")return;if(m++>=${LOOP_MAX_FRAMES}){console.clear();m=1}g(0);t=setTimeout(k,${ms})}` +
      `function u(){if(d.visibilityState!=="hidden"){if(!t)t=setTimeout(k,${ms})}else if(t){clearTimeout(t);t=0}}` +
      `if(d){d.addEventListener("visibilitychange",u);u()}`;
  } else {
    paint = `for(var i=0;i<s.length;i++){var o=s[i];${compiled.ops.includes(0) ? "if(o===0){console.clear();continue}" : ""}${LOG}}`;
  }
  const done = globalFlag ? `window.__TEXTJS_SHELL__=1;${shellHasRtl(compiled) ? "window.__TEXTJS_SHELL_RTL__=1;" : ""}window.__TEXTJS_SHELL_AT__=${NOW}` : `return ${NOW}`;
  const params = path === undefined ? "c,s" : "p,c,s";
  if (options.data !== undefined && path !== undefined) throw new Error("createShellReplayCode: data needs no path");
  const args = options.data !== undefined ? `...${options.data}` : `${path === undefined ? "" : `${inlineJson(path)},`}${inlineJson(compiled.table)},${inlineJson(compiled.ops)}`;
  return `(function(${params}){${guard}${DETECT}${paint}${done}})(${args})`;
}

/**
 * A self-contained `<script>` replaying `calls` when `location.pathname`
 * matches `path` (so an SPA-fallback copy of the document never paints the
 * wrong route). CSS arguments are deduplicated into a table.
 */
export function shellScript(calls: readonly ShellCall[], path: string): string {
  return `<script data-textjs-shell>${createShellReplayCode(compileShellCalls(calls), { path, globalFlag: true })};</script>`;
}

/** Insert a shell script into an HTML document, ahead of every module script. */
export function injectShell(html: string, script: string): string {
  const at = html.search(/<script\b[^>]*type=["']module["']/i);
  if (at >= 0) return `${html.slice(0, at)}${script}\n    ${html.slice(at)}`;
  const body = html.lastIndexOf("</body>");
  return body >= 0 ? `${html.slice(0, body)}${script}\n${html.slice(body)}` : html + script;
}
