/** `<text-console>`'s size, as CSS a page can add before the element loads. No DOM, no Node.js. */

/**
 * The CSS that sizes `<text-console>` for a `cols`×`rows` app before its file
 * loads: a 58px bar, hidden on touch screens, or a mirror with the grid's
 * aspect ratio at a 7.2×14px cell (12px text), at most its natural width, and
 * 43px taller with `chrome`. It doesn't depend on fonts, so it's exact.
 * `text build --embed` prints it for host pages, and the element uses the same
 * rules, with `host` mapping the selectors to `:host`.
 */
export function reserveCss(cols: number, rows: number, host: (attrs: string) => string = (a) => `text-console${a}`): string {
  const w = Math.round(cols * 7.2) + 18;
  const h = rows * 14 + 18;
  return (
    `${host("")}{display:block;min-height:58px}` +
    `${host(":is([mirror],[chrome])")}{position:relative;box-sizing:content-box;min-height:0;max-width:${w}px;aspect-ratio:${w}/${h}}` +
    `${host("[chrome]")}{padding-top:43px}` +
    `@media (hover:none) and (pointer:coarse){${host(":not([mirror],[chrome])")}{display:none}}`
  );
}
