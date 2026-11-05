import { TX_ERRORS } from "@textjs/core";

/**
 * Error page titles by code, in this build's language. Every build replaces this module with the titles alone
 * (`scripts/i18n/vite-plugin.ts`), translated in a locale build like `error-docs.ts`, so every page's router can title
 * an error page without loading every cause and fix.
 */
export const ERROR_TITLES: Readonly<Record<string, string>> = Object.fromEntries(TX_ERRORS.map((e) => [e.code, e.title]));
