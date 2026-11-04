/**
 * The site's languages. English is the source and lives at the root; every other locale is a separate
 * build (`scripts/build.ts`) served under `/<path>/…`, with its strings and Markdown compiled in.
 *
 * `status`: `live` locales are indexed and offered in the picker and banner; `draft` locales are built and
 * reachable by URL but `noindex`; `planned` locales aren't built.
 */

declare const __TEXTJS_LOCALE__: string | undefined;
/** The locales this deploy builds, with their status (`scripts/build.ts`, `TEXTJS_LOCALES`): `ja:draft,ar:live`. */
declare const __TEXTJS_LOCALES__: string | undefined;

export type LocaleStatus = "source" | "live" | "draft" | "planned";

export interface Locale {
  /** BCP 47 tag for `lang` and `hreflang`: `pt-BR`. */
  code: string;
  /** URL segment, lowercase: `pt-br` (`""` for English). */
  path: string;
  /** Native name for the picker: `Português (Brasil)`. */
  name: string;
  dir: "ltr" | "rtl";
  status: LocaleStatus;
}

/**
 * The order here is the order everywhere (the picker, hreflang, sitemaps, builds): English, then Latin-script names
 * alphabetized by their native spelling, then Cyrillic, Devanagari and CJK, then right-to-left scripts.
 */
export const LOCALES: readonly Locale[] = [
  { code: "en", path: "", name: "English", dir: "ltr", status: "source" },
  { code: "id", path: "id", name: "Bahasa Indonesia", dir: "ltr", status: "live" },
  { code: "de", path: "de", name: "Deutsch", dir: "ltr", status: "live" },
  { code: "es", path: "es", name: "Español", dir: "ltr", status: "live" },
  { code: "fr", path: "fr", name: "Français", dir: "ltr", status: "live" },
  { code: "it", path: "it", name: "Italiano", dir: "ltr", status: "live" },
  { code: "pl", path: "pl", name: "Polski", dir: "ltr", status: "live" },
  { code: "pt-BR", path: "pt-br", name: "Português (Brasil)", dir: "ltr", status: "live" },
  { code: "vi", path: "vi", name: "Tiếng Việt", dir: "ltr", status: "live" },
  { code: "tr", path: "tr", name: "Türkçe", dir: "ltr", status: "live" },
  { code: "ru", path: "ru", name: "Русский", dir: "ltr", status: "live" },
  { code: "hi", path: "hi", name: "हिन्दी", dir: "ltr", status: "live" },
  { code: "ja", path: "ja", name: "日本語", dir: "ltr", status: "live" },
  { code: "ko", path: "ko", name: "한국어", dir: "ltr", status: "live" },
  { code: "zh-CN", path: "zh-cn", name: "简体中文", dir: "ltr", status: "live" },
  { code: "zh-TW", path: "zh-tw", name: "繁體中文", dir: "ltr", status: "live" },
  { code: "ar", path: "ar", name: "العربية", dir: "rtl", status: "draft" },
  { code: "he", path: "he", name: "עברית", dir: "rtl", status: "draft" },
  { code: "fa", path: "fa", name: "فارسی", dir: "rtl", status: "draft" },
  { code: "ur", path: "ur", name: "اردو", dir: "rtl", status: "planned" },
];

export const SOURCE_LOCALE = LOCALES[0] as Locale;

export function getLocale(code: string): Locale | undefined {
  return LOCALES.find((l) => l.code === code);
}

/**
 * `ja,ar:live` → those locales (English always first, then in `LOCALES` order), each with its status or an
 * override. With no list, every locale that isn't planned.
 */
export function parseLocaleSet(spec: string | undefined): Locale[] {
  if (!spec) return LOCALES.filter((l) => l.status !== "planned");
  const picked = new Map<string, Locale>([[SOURCE_LOCALE.code, SOURCE_LOCALE]]);
  for (const item of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [code = "", status] = item.split(":");
    const locale = getLocale(code);
    if (!locale) throw new Error(`unknown locale "${code}"`);
    if (locale === SOURCE_LOCALE) continue;
    if (status && !["live", "draft"].includes(status)) throw new Error(`${code}: status must be live or draft`);
    const resolved = status ? { ...locale, status: status as LocaleStatus } : locale;
    // A planned locale named on the command line is built as a draft.
    picked.set(code, resolved.status === "planned" ? { ...resolved, status: "draft" } : resolved);
  }
  return LOCALES.flatMap((l) => picked.get(l.code) ?? []);
}

/** The locales built into this deploy. Links, the picker and the banner only know these. */
export const BUILT_LOCALES: readonly Locale[] = parseLocaleSet(typeof __TEXTJS_LOCALES__ === "string" ? __TEXTJS_LOCALES__ : undefined);

/** The locale this bundle was built for (English under `bun test` and the default build). */
export const LOCALE: Locale = BUILT_LOCALES.find((l) => l.code === (typeof __TEXTJS_LOCALE__ === "string" ? __TEXTJS_LOCALE__ : "en")) ?? SOURCE_LOCALE;

/** Locales offered to visitors: the picker and the suggestion banner. */
export function offeredLocales(): Locale[] {
  return BUILT_LOCALES.filter((l) => l.status === "source" || l.status === "live" || l === LOCALE);
}

/** `/ja/docs/routing` → ja and `/docs/routing`; any other path belongs to English. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const m = /^\/([a-z]{2}(?:-[a-z]{2})?)(?=\/|$)(.*)$/.exec(pathname);
  if (m) {
    const locale = BUILT_LOCALES.find((l) => l.path === m[1] && l !== SOURCE_LOCALE);
    if (locale) return { locale, path: m[2] || "/" };
  }
  return { locale: SOURCE_LOCALE, path: pathname };
}

/** `ja` + `/docs/routing` → `/ja/docs/routing`; English stays at the root. */
export function localePath(locale: Locale, path: string): string {
  if (!locale.path) return path;
  return path === "/" ? `/${locale.path}` : `/${locale.path}${path}`;
}
