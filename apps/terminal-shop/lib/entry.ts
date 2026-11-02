/**
 * What a link may open, shared by the shop, textjs.org's page and its Pages Functions.
 *
 * A link (or a sign in round trip) may land on browsing pages only: the shop, the cart,
 * the account and the menu. Checkout (`/shipping`, `/payment`, `/confirm`, `/subscribe`,
 * `/order/*`) and address/card forms are never entry points, so nobody can be dropped onto
 * a confirm screen they didn't walk to.
 */

const ENTRY = /^\/(shop|cart|account|menu)(\?[A-Za-z0-9_=&%.-]{1,120})?$/;

/** `value` if it's an allowed entry path, else `/shop`. */
export function safeEntryPath(value: string | null | undefined): string {
  return typeof value === "string" && ENTRY.test(value) ? value : "/shop";
}

export function isEntryPath(value: string): boolean {
  return ENTRY.test(value);
}

/**
 * Why a sign in failed. `/terminal/callback` passes only these codes back to the page
 * (`?signin_error=<code>`), and the page shows the fixed message, never free text.
 */
export const SIGNIN_ERRORS = {
  cancelled: "sign in was cancelled",
  expired: "that sign in expired, try again",
  state_mismatch: "sign in state didn't match, try again",
  unconfigured: "sign in isn't set up here",
  unauthorized_client: "terminal doesn't accept sign in from this site yet (its oauth app isn't registered for this address)",
  exchange_failed: "terminal couldn't finish signing you in, try again",
  unreachable: "couldn't reach terminal's sign in server, try again",
  session_too_large: "terminal's sign in response was too large to keep, try again",
} as const;

export type SigninError = keyof typeof SIGNIN_ERRORS;

export function signinErrorMessage(code: string | null | undefined): string | null {
  return code && Object.hasOwn(SIGNIN_ERRORS, code) ? SIGNIN_ERRORS[code as SigninError] : null;
}

/** Links the shop opens or prints (Terminal's hosted card page): https only. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
