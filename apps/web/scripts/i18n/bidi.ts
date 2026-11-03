/**
 * Latin inside right-to-left text. A Latin run with a version, a key chord or a trailing sign (`Node.js 22+`, `⌘⌥J`,
 * `Bun 1.2+`) is reordered by the bidi algorithm when it sits in Arabic or Hebrew: the `+` jumps to the other end
 * and `⌘⌥J` reads `J⌥⌘`. A run that starts a caption or a `<title>` also turns the whole line left-to-right. Each
 * such run is wrapped in a left-to-right isolate (U+2066 … U+2069), which keeps it whole and keeps the line's
 * direction from the text around it. Applied by the build to translated text on right-to-left pages only.
 */

const LRI = "\u2066";
const PDI = "\u2069";

/** Code spans, link targets, `{placeholders}`, `{#ids}`, tags, URLs and existing isolates: left as they are. */
const LITERAL = /(`+)(?!`)(.+?)(?<!`)\1(?!`)|\]\([^)]*\)|\{#?[\w-]+\}|<[^<>\n]+>|https?:\/\/[^\s)]+|\u2066[^\u2069]*\u2069/g;

/** Latin letters (accented too), digits and key symbols. */
const UNIT = "[A-Za-z0-9\u00c0-\u024f\u2318\u2325\u21e7\u2303]";
/**
 * A run: starts with a letter, `@` or a key symbol; words joined by spaces and `.-–_/+#&'’×`; may end in `+`. The en
 * dash keeps a range (`U+FB50–U+FDFF`) one run: two isolates with a dash between them would swap places.
 */
const RUN = new RegExp(`(?:@|[A-Za-z\u00c0-\u024f\u2318\u2325\u21e7\u2303])${UNIT}*(?:[ .\\-\u2013_/+#&'’×]+${UNIT}+)*\\+*`, "g");
/** One plain word or dotted name (`React`, `Text.js`) keeps its order without help. */
const PLAIN = /^[A-Za-z\u00c0-\u024f]+(?:\.[A-Za-z]+)*$/;

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
      const first = lead && !RTL_LETTER.test(s.slice(0, offset));
      return PLAIN.test(run) && !first ? run : `${LRI}${run}${PDI}`;
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
