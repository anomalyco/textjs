import { LOCALE, SOURCE_LOCALE, type Locale } from "../i18n/locales";

/** The Text.js repository. Every GitHub link on the site starts here. */
export const REPO_URL = "https://github.com/anomalyco/textjs";

/** The branch docs edits are proposed against. */
export const REPO_BRANCH = "dev";

/**
 * GitHub's editor for a docs page: the English Markdown at `src/docs/content/<slug>.md`, or a translation at
 * `locales/<code>/docs/<slug>.md`.
 */
export function docEditUrl(slug: string, locale: Locale = LOCALE): string {
  const file = locale === SOURCE_LOCALE ? `src/docs/content/${slug}.md` : `locales/${locale.code}/docs/${slug}.md`;
  return `${REPO_URL}/edit/${REPO_BRANCH}/apps/web/${file}`;
}
