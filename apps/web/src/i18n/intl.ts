/**
 * Dates and numbers, formatted by the build. Bun, Chrome, Safari and Firefox ship different `Intl` data (Vietnamese
 * "ngày 31 tháng 10, 2026" in one, "31 tháng 10, 2026" in another), so a date formatted on the server and again in
 * the browser can differ and break hydration. Each build formats every month of every date style once
 * (`vite.config.ts`, `__TEXTJS_DATES__`) and ships the result; at runtime a date only fills in its day and year.
 */

/**
 * The `Intl` tag for a locale: the Gregorian calendar and Latin digits everywhere (Persian would otherwise default to
 * the Solar Hijri calendar), `en-US` for English.
 */
export function intlTag(code: string): string {
  return `${code === "en" ? "en-US" : code}-u-ca-gregory-nu-latn`;
}

export const DATE_STYLES = {
  /** October 31, 2026 */
  long: { year: "numeric", month: "long", day: "numeric" },
  /** Oct 31, 2026 */
  short: { year: "numeric", month: "short", day: "numeric" },
  /** Oct 31 */
  shortDay: { month: "short", day: "numeric" },
  /** October 2026 */
  month: { year: "numeric", month: "long" },
  /** Oct 2026 */
  shortMonth: { year: "numeric", month: "short" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

/** For each style, one pattern per month (January first), with `{d}` for the day and `{y}` for the year. */
export type DatePatterns = Record<DateStyle, string[]>;

const DAYS = [1, 2, 9, 10, 28];
const YEARS = [2001, 2026, 2030];

/**
 * Formats each month of each style with `Intl` and turns it into a pattern. Throws if a locale's output depends on
 * the day or year in any way other than their digits, which the patterns couldn't reproduce.
 */
export function datePatterns(tag: string): DatePatterns {
  const out = {} as DatePatterns;
  for (const [style, options] of Object.entries(DATE_STYLES) as [DateStyle, Intl.DateTimeFormatOptions][]) {
    const format = new Intl.DateTimeFormat(tag, { ...options, timeZone: "UTC" });
    out[style] = Array.from({ length: 12 }, (_, month) => {
      const patterns = new Set<string>();
      for (const year of YEARS) {
        for (const day of DAYS) {
          const parts = format.formatToParts(new Date(Date.UTC(year, month, day)));
          patterns.add(
            parts
              .map((p) => {
                if (p.type === "day" && p.value === String(day)) return "{d}";
                if (p.type === "year" && p.value === String(year)) return "{y}";
                if (p.type === "day" || p.type === "year") throw new Error(`${tag} ${style}: ${p.type} "${p.value}" isn't plain digits`);
                return p.value;
              })
              .join(""),
          );
        }
      }
      if (patterns.size !== 1) throw new Error(`${tag} ${style}: month ${month + 1} varies by day or year: ${[...patterns].join(" | ")}`);
      return [...patterns][0] as string;
    });
  }
  return out;
}

/** `2026-10-31` or an ISO timestamp, as a UTC date in one of the patterns. */
export function formatWith(patterns: DatePatterns, iso: string, style: DateStyle): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00Z` : iso);
  const pattern = patterns[style][date.getUTCMonth()] as string;
  return pattern.replace("{d}", String(date.getUTCDate())).replace("{y}", String(date.getUTCFullYear()));
}
