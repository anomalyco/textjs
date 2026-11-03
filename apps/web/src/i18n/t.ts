/**
 * UI strings. The English text is the key: `t("Docs")`, `msg("Getting Started")`. Each build compiles the
 * locale's text in place of the literal (`scripts/i18n/vite-plugin.ts`), so no catalog ships to the browser
 * and English keeps its plain strings. A string without a translation stays English.
 */

import { datePatterns, formatWith, intlTag, type DatePatterns, type DateStyle } from "./intl";
import { LOCALE } from "./locales";

export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
export type PluralForms = Partial<Record<PluralCategory, string>> & { other: string };
export type Params = Readonly<Record<string, string | number>>;

/** `{name}` → `params.name`; unknown names stay as written. */
export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** A translated UI string. Literal first argument only, so the build can find and replace it. */
export function t(text: string, params?: Params): string {
  return interpolate(text, params);
}

/** Marks a string in a data module for translation and returns it (the build swaps in the locale's text). */
export function msg(text: string): string {
  return text;
}

let rules: Intl.PluralRules | null = null;

/** `plural(n, { one: "{count} frame", other: "{count} frames" })`, with `{count}` set to `n`. */
export function plural(count: number, forms: PluralForms, params?: Params): string {
  rules ??= new Intl.PluralRules(LOCALE.code);
  const text = forms[rules.select(count) as PluralCategory] ?? forms.other;
  return interpolate(text, { count, ...params });
}

// Dates and numbers: always UTC and Latin digits, so prerendered and hydrated text agree in every browser
// and numbers match the code samples and benchmarks.

declare const __TEXTJS_LOCALE__: string | undefined;
declare const __TEXTJS_DATES__: DatePatterns;

const TAG = intlTag(LOCALE.code);
/**
 * The build's date patterns (`intl.ts`, defined next to `__TEXTJS_LOCALE__` in `vite.config.ts`); `bun test` and
 * other unbuilt runs make their own. Testing the string lets the build drop `datePatterns` from the bundle.
 */
const DATES: DatePatterns = typeof __TEXTJS_LOCALE__ === "string" ? __TEXTJS_DATES__ : datePatterns(TAG);

/** `2026-10-31` or an ISO timestamp → `October 31, 2026` (English) / `2026年10月31日` (Japanese), the same in every browser. */
export function formatDate(iso: string, style: DateStyle = "long"): string {
  return formatWith(DATES, iso, style);
}

/**
 * `3200` → `3,200`; `0.9999, { style: "percent", maximumFractionDigits: 2 }` → `99.99%` (`99,99 %` in German).
 * Calls with literal arguments are formatted by the build (`scripts/i18n/vite-plugin.ts`), so only numbers measured
 * in the browser are formatted at runtime.
 */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(TAG, options);
}
