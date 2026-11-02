/**
 * Partial Prerendering for the console: `text build` renders each static
 * route's first frame (the static shell, with `<Suspense>` fallbacks where
 * data is still loading) and inlines it into that route's HTML as a classic
 * `<script>` that replays the driver's exact `console.clear()` +
 * `console.log(format, ...css)`, before any module loads. The client (or the
 * frame player) then boots with `initialClear: false`, so its first frame is
 * appended below the shell and swaps in within one DevTools paint: the
 * console is cleared exactly once.
 */

import type { ShellCall } from "./live-app";
import { inlineJson } from "./live-routes";

/** The URL path a shell paints on (`basePath` + route pattern, percent-encoded like `location.pathname`). */
export function shellPath(basePath: string, pattern: string): string {
  const p = pattern === "/" ? basePath || "/" : `${basePath}${pattern}`;
  return encodeURI(p);
}

/**
 * A self-contained `<script>` replaying `calls` when `location.pathname`
 * matches `path` (so an SPA-fallback copy of the document never paints the
 * wrong route). CSS arguments are deduplicated into a table.
 */
export function shellScript(calls: readonly ShellCall[], path: string): string {
  const table: string[] = [];
  const index = new Map<string, number>();
  const ops: Array<0 | [string, number[]] | [string, number[], number[]]> = [];
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
  // Firefox and Safari get the inline-console CSS, detected as in detectConsoleBrowser(): -moz-appearance first, then
  // window.chrome or navigator.userAgentData (Chromium), then WebKit-only CSS.
  const body =
    `(function(p,c,s){var l=location.pathname;if(l.length>1&&l.charAt(l.length-1)==="/")l=l.slice(0,-1);if(l!==p||typeof console==="undefined")return;` +
    `var n=1;try{if(typeof window!=="undefined"&&typeof CSS!=="undefined"&&CSS.supports)n=CSS.supports("-moz-appearance","none")||!window.chrome&&!(typeof navigator!=="undefined"&&navigator.userAgentData)&&(CSS.supports("-webkit-hyphens","auto")||CSS.supports("-webkit-backdrop-filter","none"))?2:1}catch(e){}` +
    `for(var i=0;i<s.length;i++){var o=s[i];if(o===0){console.clear();continue}var x=o[n]||o[1],a=[o[0]];for(var j=0;j<x.length;j++)a.push(c[x[j]]);console.log.apply(console,a)}` +
    `window.__TEXTJS_SHELL__=1;window.__TEXTJS_SHELL_AT__=typeof performance!=="undefined"?performance.now():void 0})(${inlineJson(path)},${inlineJson(table)},${inlineJson(ops)});`;
  return `<script data-textjs-shell>${body}</script>`;
}

/** Insert a shell script into an HTML document, ahead of every module script. */
export function injectShell(html: string, script: string): string {
  const at = html.search(/<script\b[^>]*type=["']module["']/i);
  if (at >= 0) return `${html.slice(0, at)}${script}\n    ${html.slice(at)}`;
  const body = html.lastIndexOf("</body>");
  return body >= 0 ? `${html.slice(0, body)}${script}\n${html.slice(body)}` : html + script;
}
