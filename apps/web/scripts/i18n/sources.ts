/**
 * Where translatable English lives and where each locale's translations go. Shared by the Vite plugin and the
 * `i18n:*` scripts.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";

export const WEB_DIR = join(import.meta.dirname, "..", "..");
export const SRC_DIR = join(WEB_DIR, "src");
export const LOCALES_DIR = join(WEB_DIR, "locales");
const REPO_DIR = join(WEB_DIR, "..", "..");

export interface DocumentSource {
  /** `docs/routing`, `blog/text-js-1-0`, `learn/layout`, `changelog`. */
  id: string;
  file: string;
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
  ];
}

/** The document an English Markdown file is, or `undefined` for files that aren't translated. */
export function documentForFile(file: string): DocumentSource | undefined {
  return documentSources().find((d) => d.file === file);
}

export function translationFile(locale: string, id: string): string {
  return join(LOCALES_DIR, locale, `${id}.md`);
}

export function readText(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
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
