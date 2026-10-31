import { useState, type ReactNode } from "react";
import { Box } from "@textjs/react";
import { createEmbeddedShop, TerminalShop, type EmbeddedShop } from "@textjs/terminal-shop/embed";

/** The proxy (Pages Functions in `functions/`) that holds the Terminal session. */
export const TERMINAL_API_BASE = "/api/terminal";

export interface LaunchParams {
  /** In-app path to open (`?at=/cart` after signing in from the cart). */
  at: string;
  /** A failed sign in, reported by `/terminal/callback`. */
  error: string | null;
}

/** Reads (and the caller strips) the one-shot params the OAuth callback adds to /terminal. */
export function launchParams(search: string): LaunchParams {
  const q = new URLSearchParams(search);
  const at = q.get("at");
  const error = q.get("signin_error");
  return { at: at && at.startsWith("/") && !at.startsWith("//") ? at : "/shop", error: error ? error.slice(0, 200) : null };
}

let shop: EmbeddedShop | null = null;

/** One shop per page load, so leaving /terminal and coming back resumes where you were. */
export function getTerminalShop(): EmbeddedShop {
  if (shop) return shop;
  const params = typeof window === "undefined" ? launchParams("") : launchParams(window.location.search);
  if (typeof window !== "undefined" && /[?&](at|signin_error)=/.test(window.location.search)) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.hash}`);
  }
  shop = createEmbeddedShop({ bases: [TERMINAL_API_BASE], initialPath: params.at, initialError: params.error, confirmRealOrders: true });
  return shop;
}

/** terminal.shop's ssh storefront (apps/terminal-shop), running in the console companion. */
export function TerminalConsole(): ReactNode {
  const [s] = useState(getTerminalShop);
  return (
    <Box className="flex-col grow">
      <TerminalShop shop={s} />
    </Box>
  );
}
