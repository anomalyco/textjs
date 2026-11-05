/**
 * Where translatable English lives and where each locale's translations go. Shared by the Vite plugin and the
 * `i18n:*` scripts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { execFileSync } from "node:child_process";

export const WEB_DIR = join(import.meta.dirname, "..", "..");
export const SRC_DIR = join(WEB_DIR, "src");
/** Committed translations (`TEXTJS_LOCALES_DIR` points tests at a modified copy). */
export const LOCALES_DIR = process.env.TEXTJS_LOCALES_DIR ?? join(WEB_DIR, "locales");
export const REPO_DIR = join(WEB_DIR, "..", "..");

export interface DocumentSource {
  /** `docs/routing`, `blog/text-js-1-0`, `learn/layout`, `changelog`, `errors`, `readme`. */
  id: string;
  /** The English Markdown file (empty for a document generated from data). */
  file: string;
  /** English text generated from data, when there's no file. */
  text?: () => string;
}

export function englishText(doc: DocumentSource): string {
  return doc.text ? doc.text() : readFileSync(doc.file, "utf8");
}

/** Every error page's title, cause and fix (`@textjs/core` and the site's TX000), as one document. */
export function errorsMarkdown(): string {
  return errorPageDocs()
    .flatMap((e) => [e.title, e.cause, e.fix])
    .join("\n\n");
}

export interface ErrorDocSource {
  code: string;
  title: string;
  cause: string;
  fix: string;
  /** Codes in `TX_ERRORS` only. */
  package?: string;
}

let errorDocs: ErrorDocSource[] | null = null;

/** TX000 and `TX_ERRORS`, read in a Bun subprocess (`errors.ts`) because Vite loads its config in Node. */
export function errorPageDocs(): ErrorDocSource[] {
  errorDocs ??= JSON.parse(execFileSync("bun", [join(import.meta.dirname, "errors.ts")], { encoding: "utf8" })) as ErrorDocSource[];
  return errorDocs;
}

const md = (dir: string, area: string): DocumentSource[] =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => ({ id: `${area}/${basename(f, ".md")}`, file: join(dir, f) }));

export function documentSources(): DocumentSource[] {
  return [
    ...md(join(SRC_DIR, "docs", "content"), "docs"),
    ...md(join(SRC_DIR, "blog"), "blog"),
    ...md(join(SRC_DIR, "learn", "content"), "learn"),
    { id: "changelog", file: join(REPO_DIR, "CHANGELOG.md") },
    { id: "errors", file: "", text: errorsMarkdown },
    // Not on the site: `readme.ts` builds docs/readme/README.<code>.md from it.
    { id: "readme", file: join(REPO_DIR, "README.md") },
  ];
}

/** The document an English Markdown file is, or `undefined` for files that aren't translated. */
export function documentForFile(file: string): DocumentSource | undefined {
  return documentSources().find((d) => d.file !== "" && d.file === file);
}

export function translationFile(locale: string, id: string): string {
  return join(LOCALES_DIR, locale, `${id}.md`);
}

export function readText(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

// Captions --------------------------------------------------------------------------------------

/** Learn chapters' English captions (`src/learn/captions/<slug>.vtt`, copied from media/learn's output). */
export function captionSources(): { slug: string; file: string }[] {
  const dir = join(SRC_DIR, "learn", "captions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".vtt"))
    .sort()
    .map((f) => ({ slug: basename(f, ".vtt"), file: join(dir, f) }));
}

export function captionFile(locale: string, slug: string): string {
  return join(LOCALES_DIR, locale, "captions", `${slug}.json`);
}

export function readCaptions(locale: string, slug: string): Record<string, string> {
  const f = captionFile(locale, slug);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Record<string, string>) : {};
}

/** Chapters with translated captions in a locale (any sentence translated). */
export function translatedCaptions(locale: string): string[] {
  return captionSources()
    .map((c) => c.slug)
    .filter((slug) => Object.keys(readCaptions(locale, slug)).length > 0);
}

// Catalog -----------------------------------------------------------------------------------------

export type CatalogValue = string | Record<string, string>;
export type Catalog = Record<string, CatalogValue>;

/** Files that use the catalog import it; nothing else is scanned or rewritten. */
export const USES_CATALOG = /from\s+"[./]*(?:\.\.\/)*i18n\/(?:t|rich)"/;
export const LITERAL = String.raw`"(?:[^"\\\n]|\\.)*"`;
/** `t("…")` / `msg("…")` / `rich("…"` / `t("…",` — the first argument is the key. Not `x.t(` or `at(`. */
export const CALL = new RegExp(String.raw`(?<![.\w])(t|msg|rich)\(\s*(${LITERAL})\s*([,)])`, "g");
/** `plural(n, { one: "…", other: "…" })` — keyed by `other`. The count may contain one level of parentheses. */
export const PLURAL = new RegExp(String.raw`(?<![.\w])plural\(((?:[^,()]|\([^()]*\))+),\s*(\{(?:\s*(?:zero|one|two|few|many|other):\s*${LITERAL}\s*,?)+\s*\})`, "g");
/** Any catalog call, to catch the ones the patterns above can't read (single quotes, template literals, variables). */
export const ANY_CALL = /(?<![.\w])(t|msg|rich|plural)\(/g;

export function parsePluralObject(source: string): Record<string, string> {
  return JSON.parse(source.replace(/(zero|one|two|few|many|other):/g, '"$1":').replace(/,\s*\}$/, "}")) as Record<string, string>;
}

export interface Message {
  key: string;
  plural: boolean;
  files: string[];
}

/** Every catalog key in `src/`, from `t`, `msg`, `rich` and `plural` calls with literal arguments. */
export function extractMessages(dir = SRC_DIR): Map<string, Message> {
  const out = new Map<string, Message>();
  const add = (key: string, file: string, plural: boolean): void => {
    const m = out.get(key) ?? { key, plural, files: [] };
    if (!m.files.includes(file)) m.files.push(file);
    out.set(key, m);
  };
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const code = readFileSync(p, "utf8");
        if (!USES_CATALOG.test(code)) continue;
        const rel = relative(WEB_DIR, p);
        for (const m of code.matchAll(CALL)) add(JSON.parse(m[2] as string) as string, rel, false);
        for (const m of code.matchAll(PLURAL)) add(parsePluralObject(m[2] as string).other as string, rel, true);
      }
    }
  };
  walk(dir);
  return out;
}

export function catalogFile(locale: string): string {
  return join(LOCALES_DIR, locale, "messages.json");
}

export function readCatalog(locale: string): Catalog {
  const f = catalogFile(locale);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Catalog) : {};
}
