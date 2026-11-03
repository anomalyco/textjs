/**
 * `curl textjs.org` over plain http. Cloudflare Pages redirects http to https before its Functions run, and curl
 * doesn't follow redirects, so this Worker fetches the https home page for terminal clients and returns it as is.
 *
 * Its route is `http://textjs.org/` (wrangler.toml), so https requests, browsers included, never invoke it, and the
 * zone's Redirect Rule sends every other plain-http request to https before Workers run. What's left is curl, Wget,
 * HTTPie and xh asking for http://textjs.org/. Anything else that slips through is passed on untouched.
 *
 * Detection is the framework's own (`@textjs/app/ansi`), imported by path: it has no dependencies, wrangler bundles
 * it, and this Worker's deploy job doesn't install packages.
 */
import { wantsAnsi } from "../../../../packages/app/src/ansi";

export function isTerminalHttp(request: Request): boolean {
  const url = new URL(request.url);
  return url.protocol === "http:" && url.pathname === "/" && wantsAnsi(request);
}

export default {
  async fetch(request: Request, _env: unknown, ctx: { passThroughOnException(): void }): Promise<Response> {
    // A bug here must never take the home page down with it.
    ctx.passThroughOnException();
    if (!isTerminalHttp(request)) return fetch(request);
    return fetch(new Request(`https://${new URL(request.url).host}/`, { method: request.method, headers: request.headers }));
  },
};
