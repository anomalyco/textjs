/**
 * Stands in for server-rendered pages (`export const runtime = "server"`) in
 * the browser bundle, so their modules (and whatever they import) never ship
 * to the client. Navigating to one from a client route loads it as a document,
 * which the server answers with the frame player.
 */

import { useEffect, type ReactNode } from "react";

export const runtime = "server";

const GUARD_KEY = "textjs:server-route";

export default function ServerRoute(): ReactNode {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const href = window.location.href;
    try {
      // Never loop if the document for this URL is (stale) client HTML.
      const last = window.sessionStorage.getItem(GUARD_KEY);
      if (last !== null) {
        const [at, url] = [Number(last.slice(0, last.indexOf(" "))), last.slice(last.indexOf(" ") + 1)];
        if (url === href && Date.now() - at < 3000) return;
      }
      window.sessionStorage.setItem(GUARD_KEY, `${Date.now()} ${href}`);
    } catch {
      // Storage blocked: reload anyway.
    }
    window.location.reload();
  }, []);
  return null;
}
