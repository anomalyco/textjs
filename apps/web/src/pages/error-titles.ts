/**
 * Translated error page titles, `{}` in source. A locale build fills this from the `errors` document
 * (`scripts/i18n/vite-plugin.ts`), like `error-docs.ts`. Kept apart from those so every page's router can title an
 * error page without loading every cause and fix.
 */
export const ERROR_TITLES: Readonly<Record<string, string>> = {};
