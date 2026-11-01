/**
 * Cloudflare Pages Function for `/` only (see public/_routes.json). curl, Wget, HTTPie and xh get the
 * console Home view as a truecolor ANSI frame (`/home.ansi`, rendered at build time). Every other
 * request, browsers included, goes straight to the prerendered page.
 */

const TERMINAL_UA = /^(?:curl|Wget|HTTPie|xh)\//;

export function wantsAnsi(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (!TERMINAL_UA.test(request.headers.get("User-Agent") ?? "")) return false;
  return !(request.headers.get("Accept") ?? "").toLowerCase().includes("text/html");
}

interface PagesContext {
  request: Request;
  env: { ASSETS: { fetch(input: string): Promise<Response> } };
  next(): Promise<Response>;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  if (!wantsAnsi(context.request)) return context.next();
  try {
    const frame = await context.env.ASSETS.fetch(new URL("/home.ansi", context.request.url).toString());
    if (!frame.ok) return context.next();
    return new Response(context.request.method === "HEAD" ? null : frame.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Vary: "User-Agent, Accept",
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Powered-By": "Text.js",
      },
    });
  } catch {
    return context.next();
  }
};
