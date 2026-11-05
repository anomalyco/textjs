import { TX_ERRORS } from "@textjs/core";

/**
 * Error page titles by code, in this build's language, and the package of each code in `TX_ERRORS`. Every build
 * replaces this module with those alone (`scripts/i18n/vite-plugin.ts`), titles translated in a locale build like
 * `error-docs.ts`, so every page's router can title an error page, and search can list one, without loading every
 * cause and fix.
 */
export const ERROR_TITLES: Readonly<Record<string, string>> = Object.fromEntries(TX_ERRORS.map((e) => [e.code, e.title]));
export const ERROR_PACKAGES: Readonly<Record<string, string>> = Object.fromEntries(TX_ERRORS.map((e) => [e.code, e.package]));
