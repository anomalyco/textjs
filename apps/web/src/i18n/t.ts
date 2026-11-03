/**
 * UI strings. The English text is the key: `t("Docs")`, `msg("Getting Started")`. Each build compiles the
 * locale's text in place of the literal (`scripts/i18n/vite-plugin.ts`), so no catalog ships to the browser
 * and English keeps its plain strings. A string without a translation stays English.
 */

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

const TAG = `${LOCALE.code === "en" ? "en-US" : LOCALE.code}-u-nu-latn`;

/** `2026-10-31` or an ISO timestamp → `October 31, 2026` (English) / `2026年10月31日` (Japanese). */
export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  return date.toLocaleDateString(TAG, { ...options, timeZone: "UTC" });
}

/** `3200` → `3,200`; `0.9999, { style: "percent", maximumFractionDigits: 2 }` → `99.99%` (`99,99 %` in German). */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(TAG, options);
}
