/**
 * `curl textjs.org` over plain http. Cloudflare Pages redirects http to https before its Functions run, and curl
 * doesn't follow redirects, so this Worker (route `textjs.org/` only) fetches the https home page for terminal
 * clients and returns it as is. Every other request passes through untouched.
 */
const TERMINAL_UA = /^(curl|Wget|HTTPie|xh)\//i;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const accept = request.headers.get("accept") ?? "";
    const terminal = url.protocol === "http:" && url.pathname === "/" && TERMINAL_UA.test(request.headers.get("user-agent") ?? "") && !accept.includes("text/html");
    if (!terminal || (request.method !== "GET" && request.method !== "HEAD")) return fetch(request);
    return fetch(new Request(`https://${url.host}/`, { method: request.method, headers: request.headers }));
  },
};
