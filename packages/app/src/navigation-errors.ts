/**
 * `notFound()` and `redirect()` throw tagged errors that the App Router's
 * boundaries intercept (they never reach `error.tsx`).
 */

export const NOT_FOUND_DIGEST = "TEXTJS_NOT_FOUND";
export const REDIRECT_DIGEST = "TEXTJS_REDIRECT";

export type RedirectType = "push" | "replace";

export interface NotFoundError extends Error {
  digest: typeof NOT_FOUND_DIGEST;
}

export interface RedirectError extends Error {
  digest: `${typeof REDIRECT_DIGEST};${RedirectType};${string}`;
}

/** Render the nearest `not-found.tsx` for the current segment. */
export function notFound(): never {
  const error = new Error(NOT_FOUND_DIGEST) as NotFoundError;
  error.digest = NOT_FOUND_DIGEST;
  throw error;
}

/** Navigate to `href` (replacing the current history entry by default). */
export function redirect(href: string, type: RedirectType = "replace"): never {
  const error = new Error(REDIRECT_DIGEST) as RedirectError;
  error.digest = `${REDIRECT_DIGEST};${type};${href}`;
  throw error;
}

/** A permanent redirect: replaces the current history entry. */
export function permanentRedirect(href: string): never {
  return redirect(href, "replace");
}

function digestOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const d = (error as { digest?: unknown }).digest;
  return typeof d === "string" ? d : undefined;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return digestOf(error) === NOT_FOUND_DIGEST;
}

export function isRedirectError(error: unknown): error is RedirectError {
  return digestOf(error)?.startsWith(`${REDIRECT_DIGEST};`) ?? false;
}

/** `true` for `notFound()` / `redirect()` control-flow errors. */
export function isNavigationError(error: unknown): boolean {
  return isNotFoundError(error) || isRedirectError(error);
}

export function getRedirectTarget(error: RedirectError): { href: string; type: RedirectType } {
  const [, type, ...rest] = error.digest.split(";");
  return { href: rest.join(";"), type: type === "push" ? "push" : "replace" };
}
