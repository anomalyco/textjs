/**
 * Latin inside right-to-left text. A Latin run with a version, a key chord or a trailing sign (`Node.js 22+`, `⌘⌥J`,
 * `Bun 1.2+`), a format token (`%c`) or a number with a sign (`100×32`, `70–81%`, `22+`) is reordered by the bidi
 * algorithm when it sits in Arabic or Hebrew: the `+` jumps to the other end, `⌘⌥J` reads `J⌥⌘`, `%c` reads `c%`
 * and `100×32` reads `32×100`. A run that starts a caption or a `<title>` also turns the whole line left-to-right. Each
 * such run is wrapped in a left-to-right isolate (U+2066 … U+2069), which keeps it whole and keeps the line's
 * direction from the text around it. Applied by the build to translated text on right-to-left pages only.
 */

const LRI = "\u2066";
const PDI = "\u2069";

/** Code spans, link targets, `{placeholders}`, `{#ids}`, tags, URLs and existing isolates: left as they are. */
const LITERAL = /(`+)(?!`)(.+?)(?<!`)\1(?!`)|\]\([^)]*\)|\{#?[\w-]+\}|<[^<>\n]+>|https?:\/\/[^\s)]+|\u2066[^\u2069]*\u2069/g;

/** Latin letters (accented too), digits, key symbols, and format tokens (`%c`, `%s`, `%%`) as one unit. */
const UNIT = "(?:%[a-z%]|[A-Za-z0-9\u00c0-\u024f\u2318\u2325\u21e7\u2303])";
/**
 * A run: units joined by spaces and `.-–_/+#&'’×`, optionally led by `@` or `/` and ending in `+`, `%` or `/`
 * (`Node.js 22+`, `100×32`, `70–81%`, `/coffee`, `app/`). The en dash keeps a range (`U+FB50–U+FDFF`) one run: two isolates with a dash between them
 * would swap places.
 */
const RUN = new RegExp(`[@/]?${UNIT}+(?:[ .\\-\u2013_/+#&'’×]+${UNIT}+)*[+%/]*`, "g");
/** One plain word or dotted name (`React`, `Text.js`), or a plain number (`300`, `3,200`, `1.4.1`), keeps its order. */
const PLAIN = /^(?:[A-Za-z\u00c0-\u024f]+(?:\.[A-Za-z]+)*|\d+(?:[.,]\d+)*)$/;
/** What makes a run worth isolating: a Latin letter, key symbol or format token, or a sign the bidi algorithm moves. */
const LATIN = /[A-Za-z\u00c0-\u024f\u2318\u2325\u21e7\u2303]/;
const SIGN = /[×\u2013+%]/;

const RTL_LETTER = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;

/**
 * Wraps the Latin runs of a translated string or Markdown block that need it in isolates. A plain word is wrapped
 * too when it comes before the first right-to-left letter, so a caption or title that starts with `Text.js` stays a
 * right-to-left line.
 */
export function isolateLatin(text: string): string {
  if (!RTL_LETTER.test(text)) return text;
  let out = "";
  let at = 0;
  let lead = true;
  const isolate = (s: string): string => {
    const result = s.replace(RUN, (run, offset: number) => {
      const latin = LATIN.test(run);
      const first = lead && latin && !RTL_LETTER.test(s.slice(0, offset));
      const wrap = first || (!PLAIN.test(run) && (latin || SIGN.test(run)));
      return wrap ? `${LRI}${run}${PDI}` : run;
    });
    if (RTL_LETTER.test(s)) lead = false;
    return result;
  };
  for (const m of text.matchAll(LITERAL)) {
    out += isolate(text.slice(at, m.index)) + m[0];
    at = (m.index as number) + m[0].length;
  }
  return out + isolate(text.slice(at));
}

/**
 * A translated UI string on a right-to-left page. One kept entirely in Latin (`%c spans`, `OpenCode`) is isolated
 * whole, like an untranslated one, so its own neutrals stay put; anything else gets `isolateLatin`. Not for Markdown,
 * where a whole-block isolate would hide list markers and table pipes.
 */
export function isolateString(text: string): string {
  if (RTL_LETTER.test(text)) return isolateLatin(text);
  return LATIN.test(text) || SIGN.test(text) ? `${LRI}${text}${PDI}` : text;
}
