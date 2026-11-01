import { useState, type ReactNode } from "react";
import { Box } from "@textjs/react";
import { createEmbeddedShop, TerminalShop, type EmbeddedShop } from "@textjs/terminal-shop/embed";
import { safeEntryPath, signinErrorMessage } from "@textjs/terminal-shop/entry";
import { withRecordedFallback } from "./terminal-fallback";

/** The proxy (Pages Functions in `functions/`) that holds the Terminal session. */
export const TERMINAL_API_BASE = "/api/terminal";

export interface LaunchParams {
  /** In-app path to open (`?at=/cart` after signing in from the cart). */
  at: string;
  /** A failed sign in, reported by `/terminal/callback`. */
  error: string | null;
}

/**
 * Reads (and the caller strips) the one-shot params the OAuth callback adds to /coffee.
 * `at` may only name a browsing page (never checkout), and `signin_error` is a code mapped
 * to a fixed message, so a link can't put words on the sign in screen.
 */
export function launchParams(search: string): LaunchParams {
  const q = new URLSearchParams(search);
  return { at: safeEntryPath(q.get("at")), error: signinErrorMessage(q.get("signin_error")) };
}

let shop: EmbeddedShop | null = null;

/** One shop per page load, so leaving /coffee and coming back resumes where you were. */
export function getTerminalShop(): EmbeddedShop {
  if (shop) return shop;
  const params = typeof window === "undefined" ? launchParams("") : launchParams(window.location.search);
  if (typeof window !== "undefined" && /[?&](at|signin_error)=/.test(window.location.search)) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.hash}`);
  }
  shop = createEmbeddedShop({ bases: [TERMINAL_API_BASE], fetch: withRecordedFallback(TERMINAL_API_BASE), initialPath: params.at, initialError: params.error, confirmRealOrders: true });
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
