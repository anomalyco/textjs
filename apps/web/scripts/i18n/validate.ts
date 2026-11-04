/**
 * Checks one translated unit against its English source. Errors mean the translation would break the page
 * (a lost placeholder, tag or link, invented code, a broken table); warnings are worth a look.
 */

export interface Verdict {
  errors: string[];
  warnings: string[];
}

const multiset = (items: Iterable<string>): Map<string, number> => {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return m;
};

const sameMultiset = (a: Iterable<string>, b: Iterable<string>): boolean => {
  const x = multiset(a);
  const y = multiset(b);
  return x.size === y.size && [...x].every(([k, n]) => y.get(k) === n);
};

const all = (re: RegExp, s: string, group = 0): string[] => [...s.matchAll(re)].map((m) => m[group] as string);

/** Inline code, including double-backtick spans that contain a backtick (`` Ctrl+` ``). */
const CODE = /(`+)(?!`)(.+?)(?<!`)\1(?!`)/g;
const noCode = (s: string): string => s.replace(CODE, "");
const placeholders = (s: string): string[] => all(/\{(\w+)\}/g, noCode(s));
const tags = (s: string): string[] => all(/<\/?(\w+)>/g, noCode(s));
const hrefs = (s: string): string[] => all(/\]\(([^)\s]+)\)/g, s, 1);
const codeSpans = (s: string): string[] => all(CODE, s, 2).map((c) => c.trim());
const tableRows = (s: string): number => s.split("\n").filter((l) => /^\s*\|/.test(l)).length;
const listItems = (s: string): number => s.split("\n").filter((l) => /^\s*([-*+]|\d+[.)])\s/.test(l)).length;

/** Characters a translation into each script must contain (catches English copied through). */
const SCRIPT: Record<string, RegExp> = {
  ja: /[\u3040-\u30ff\u4e00-\u9fff]/,
  ko: /[\uac00-\ud7af]/,
  "zh-CN": /[\u4e00-\u9fff]/,
  "zh-TW": /[\u4e00-\u9fff]/,
  ru: /[\u0400-\u04ff]/,
  ar: /[\u0600-\u06ff]/,
  fa: /[\u0600-\u06ff]/,
  ur: /[\u0600-\u06ff]/,
  he: /[\u0590-\u05ff]/,
  hi: /[\u0900-\u097f]/,
  vi: /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
};

/** Arabic-script locales write the Arabic comma, semicolon and question mark (، ؛ ؟). */
const ARABIC_PUNCTUATION = new Set(["ar", "fa", "ur"]);
const ARABIC_LETTER = String.raw`[\u0600-\u06ff\u0750-\u077f]`;
/** Code spans, link targets, `{placeholders}`, `{#ids}`, tags and URLs: punctuation inside them is never touched. */
const LITERAL_SPANS = /(`+)(?!`)(.+?)(?<!`)\1(?!`)|\]\([^)]*\)|\{#?[\w-]+\}|<[^<>\n]+>|https?:\/\/\S+/g;
/**
 * Sentence punctuation in an Arabic-script unit: a , or ; before a space or the end (not `3,200`), and a ? after a
 * word. Code, link targets and URLs are skipped, so what's left is the unit's own prose, Latin names included
 * (React، Vite).
 */
const LATIN_PUNCTUATION = /[,;](?=\s|$)|(?<=\S|^)\?(?=[\s*_»”)\]]|$)/g;
const ARABIC_FORM: Record<string, string> = { ",": "،", ";": "؛", "?": "؟" };
/** Persian (and Urdu) write ی and ک; the Arabic ي and ك look alike but break search, sorting and spell-checking. */
const PERSIAN_LETTERS = new Set(["fa", "ur"]);
const ARABIC_LETTERS = /[\u064a\u0643]/g;
const PERSIAN_FORM: Record<string, string> = { "\u064a": "\u06cc", "\u0643": "\u06a9" };
/** Urdu ends a sentence with ۔: a period after a word (not a digit, so `1.` and `3.5` stay) before a space or the end. */
const SENTENCE_END = /(?<=[^\s\d.]|^)\.(?=\s|$)/g;

/** Applies `fn` to the text between literal spans (code, link targets, placeholders, tags, URLs). */
function outsideLiterals(text: string, fn: (s: string) => string): string {
  let out = "";
  let at = 0;
  for (const m of text.matchAll(LITERAL_SPANS)) {
    out += fn(text.slice(at, m.index)) + m[0];
    at = (m.index as number) + m[0].length;
  }
  return out + fn(text.slice(at));
}

/**
 * `ar`, `fa`, `ur`: Latin commas, semicolons and question marks in Arabic text become ، ؛ ؟, Persian and Urdu get
 * ی and ک for the Arabic ي and ك, and Urdu sentences end with ۔ (code and URLs untouched).
 */
export function normalizePunctuation(locale: string, text: string): string {
  if (!ARABIC_PUNCTUATION.has(locale) || !new RegExp(ARABIC_LETTER).test(text)) return text;
  return outsideLiterals(text, (s) => {
    let out = s.replace(LATIN_PUNCTUATION, (p) => ARABIC_FORM[p] as string);
    if (PERSIAN_LETTERS.has(locale)) out = out.replace(ARABIC_LETTERS, (c) => PERSIAN_FORM[c] as string);
    if (locale === "ur") out = out.replace(SENTENCE_END, "\u06d4");
    return out;
  });
}

export function validate(locale: string, source: string, target: string, keep: readonly string[] = []): Verdict {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!target.trim()) errors.push("empty translation");
  if (!sameMultiset(placeholders(source), placeholders(target))) errors.push(`placeholders differ: ${placeholders(source).join(" ")} → ${placeholders(target).join(" ")}`);
  if (!sameMultiset(tags(source), tags(target))) errors.push(`tags differ: ${tags(source).join(" ")} → ${tags(target).join(" ")}`);
  if (!sameMultiset(hrefs(source), hrefs(target))) errors.push(`links differ: ${hrefs(source).join(" ")} → ${hrefs(target).join(" ")}`);
  const sourceCode = new Set(codeSpans(source));
  const invented = codeSpans(target).filter((c) => !sourceCode.has(c));
  if (invented.length) errors.push(`code not in the source: ${invented.map((c) => `\`${c}\``).join(" ")}`);
  else if (!sameMultiset(codeSpans(source), codeSpans(target))) warnings.push("inline code count differs");
  if (tableRows(source) !== tableRows(target)) errors.push(`table rows differ: ${tableRows(source)} → ${tableRows(target)}`);
  if (listItems(source) !== listItems(target)) warnings.push(`list items differ: ${listItems(source)} → ${listItems(target)}`);
  for (const term of keep) {
    // German joins a multiword name into a compound with hyphens: VS-Code-Erweiterung.
    const n = (s: string): number => s.split(term).length - 1 + (term.includes(" ") ? s.split(term.replaceAll(" ", "-")).length - 1 : 0);
    if (n(source) !== n(target)) warnings.push(`"${term}" appears ${n(source)}× in English, ${n(target)}× here`);
  }
  const script = SCRIPT[locale];
  const prose = noCode(source).replace(/\]\([^)]*\)/g, "](");
  const keptOnly = keep.reduce((s, k) => s.split(k).join(""), prose);
  if (script && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(keptOnly) && !script.test(target)) warnings.push("no characters of the target script");
  if (normalizePunctuation(locale, target) !== target) errors.push(locale === "ur" ? "Latin . , ; or ? or Arabic ي ك in Urdu text (use ۔ ، ؛ ؟ and ی ک)" : PERSIAN_LETTERS.has(locale) ? "Latin , ; or ? or Arabic ي ك in Persian-script text (use ، ؛ ؟ and ی ک)" : "Latin , ; or ? in Arabic text (use ، ؛ ؟)");
  return { errors, warnings };
}

/** Up to four whole counts (and 1.5) per plural category of a locale: Polish `few` → 2, 3, 4, 22. */
export function pluralSamples(locale: string): Map<string, number[]> {
  const rules = new Intl.PluralRules(locale);
  const out = new Map<string, number[]>();
  for (const n of [...Array.from({ length: 200 }, (_, i) => i), 1.5]) {
    const list = out.get(rules.select(n)) ?? [];
    if (list.length < 4) list.push(n);
    out.set(rules.select(n), list);
  }
  return out;
}

/**
 * Plural forms must use the locale's categories, include `other`, and cover every category a whole count can
 * select (Polish and Russian `few` and `many`), so `plural()` never falls back to `other` for 3 or 5.
 */
export function validatePlural(locale: string, forms: Record<string, string>): string[] {
  const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories as string[];
  const errors: string[] = [];
  if (!forms.other) errors.push("plural forms need `other`");
  for (const k of Object.keys(forms)) if (!categories.includes(k)) errors.push(`"${k}" isn't a plural category in ${locale} (${categories.join(", ")})`);
  const whole = new Intl.PluralRules(locale);
  for (const c of new Set(Array.from({ length: 200 }, (_, n) => whole.select(n)))) if (!forms[c]) errors.push(`plural forms need \`${c}\` (${locale})`);
  return errors;
}
