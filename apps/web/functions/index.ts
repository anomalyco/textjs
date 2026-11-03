/**
 * Cloudflare Pages Function for `/` only (see public/_routes.json). curl, Wget, HTTPie and xh get the
 * console Home view as a truecolor ANSI frame (`/home.ansi`, rendered at build time). Every other
 * request, browsers included, goes straight to the prerendered page.
 *
 * textjs.org isn't built with `text build`, so it wires up the framework's helpers itself
 * (https://textjs.org/docs/curl#custom-servers).
 */

import { ansiResponse, wantsAnsi } from "@textjs/app/ansi";

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
    return ansiResponse(await frame.text(), context.request.method);
  } catch {
    return context.next();
  }
};
