/** Webfont subsets per locale, for the site (vite-plugin.ts) and its share cards (scripts/og/template.ts). */

/**
 * Geist subsets beyond `geist-latin` (index.html) that a locale's pages preload: Polish, Turkish and Vietnamese
 * letters are in Latin Extended, Russian in Cyrillic. `unicode-range` keeps any other page from fetching them.
 */
export const GEIST_SUBSETS: Readonly<Record<string, readonly ("latin-ext" | "cyrillic")[]>> = { pl: ["latin-ext"], tr: ["latin-ext"], vi: ["latin-ext"], ru: ["cyrillic"] };
export const GEIST_RANGES = {
  "latin-ext": "U+0100-0130, U+0132-0151, U+0154-024F, U+0259, U+0300-0303, U+0305-0307, U+0309-0328, U+032A-036F, U+1E00-1EFF, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  cyrillic: "U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
} as const;

/** The locale's extra Geist and Geist Mono faces and their preloads, next to the ones in index.html. */
export function withGeistSubsets(html: string, locale: string): string {
  const subsets = GEIST_SUBSETS[locale] ?? [];
  if (!subsets.length) return html;
  const files = subsets.flatMap((s) => [`geist-${s}`, `geist-mono-${s}`]);
  const preloads = files.map((f) => `<link rel="preload" href="/fonts/${f}.woff2" as="font" type="font/woff2" crossorigin />`).join("\n    ");
  const faces = subsets
    .flatMap((s) => [
      `@font-face { font-family: "Geist"; font-style: normal; font-weight: 100 900; font-display: optional; src: url(/fonts/geist-${s}.woff2) format("woff2"); unicode-range: ${GEIST_RANGES[s]}; }`,
      `@font-face { font-family: "Geist Mono"; font-style: normal; font-weight: 100 900; font-display: optional; src: url(/fonts/geist-mono-${s}.woff2) format("woff2"); unicode-range: ${GEIST_RANGES[s]}; }`,
    ])
    .join("\n      ");
  const out = html
    .replace(/(<link rel="preload" href="\/fonts\/geist-mono-symbols\.woff2"[^>]*>)/, `$1\n    ${preloads}`)
    .replace(/(@font-face \{ font-family: "Geist Mono"; [^\n]*geist-mono-symbols\.woff2[^\n]*\})/, `$1\n      ${faces}`);
  if (out.split("/fonts/geist-").length !== html.split("/fonts/geist-").length + files.length * 2) throw new Error(`${locale}: index.html's Geist preloads or @font-face rules moved; update withGeistSubsets`);
  return out;
}
