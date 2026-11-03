/**
 * Translated error pages. The error docs live in `@textjs/core` and stay English there; a locale build replaces
 * this module's `{}` with that locale's titles, causes and fixes (`scripts/i18n/vite-plugin.ts`, translated as the
 * `errors` document). A block without a translation stays English.
 */

export interface ErrorDocText {
  title: string;
  cause: string;
  fix: string;
}

export const ERROR_TRANSLATIONS: Readonly<Record<string, ErrorDocText>> = {};
