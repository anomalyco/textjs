/**
 * Imported first by main.tsx, before anything else runs: `console.log` as the page booted.
 * Extensions that patch the console at `document_start` are part of this baseline.
 */
export const NATIVE_LOG: unknown = typeof console !== "undefined" ? console.log : undefined;
