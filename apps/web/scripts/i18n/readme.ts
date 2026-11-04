#!/usr/bin/env bun
/**
 * READMEs for GitHub: `docs/readme/README.<code>.md`, assembled from README.md and each locale's translated blocks
 * (`locales/<code>/readme.md`, written by `i18n:translate` like any other document), and the language line between
 * the `<!-- i18n:languages -->` markers in README.md. Needs no API key; `i18n:translate` runs it after translating.
 *
 *   bun run i18n:readme
 *
 * `i18n:check` fails when a README is missing translations or differs from what this writes.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { LOCALES, localePath, SOURCE_LOCALE, type Locale } from "../../src/i18n/locales";
import { matchRoute } from "../../src/router";
import { isolateLatin } from "./bidi";
import { parseTranslation, segment } from "./document";
import { readText, REPO_DIR, translationFile } from "./sources";

export const README = join(REPO_DIR, "README.md");
export const README_DIR = join(REPO_DIR, "docs", "readme");
const LANGUAGES = /<!-- i18n:languages -->[\s\S]*?<!-- \/i18n:languages -->/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const GENERATED = "<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->";

/** Every live and draft locale has a README. */
export function readmeLocales(): Locale[] {
  return LOCALES.filter((l) => l.status === "live" || l.status === "draft");
}

export function readmeFile(code: string): string {
  return join(README_DIR, `README.${code}.md`);
}

/**
 * English and the live locales, each linking to its README. The current README's language is plain text, and is
 * listed even while it's a draft.
 */
export function languageLine(current: Locale): string {
  const href = (l: Locale): string => (l === SOURCE_LOCALE ? "../../README.md" : current === SOURCE_LOCALE ? `docs/readme/README.${l.code}.md` : `README.${l.code}.md`);
  return LOCALES.filter((l) => l === current || l.status === "source" || l.status === "live")
    .map((l) => {
      // A name written in the other direction is isolated, or neighbours like العربية · עברית swap places.
      const name = l.dir === current.dir ? l.name : `\u2068${l.name}\u2069`;
      return l === current ? name : `[${name}](${href(l)})`;
    })
    .join(" · ");
}

const languages = (locale: Locale): string => `<!-- i18n:languages -->\n${locale.dir === "rtl" ? "\u200f" : ""}${languageLine(locale)}\n<!-- /i18n:languages -->`;

const SITE = /^https:\/\/textjs\.org(\/[^?#]*)?([?#].*)?$/;

/**
 * A link target in README.md as seen from `docs/readme/`: relative paths climb back to the repo root, and textjs.org
 * pages point at the locale's own pages once it's live.
 */
export function readmeLink(target: string, locale: Locale): string {
  const site = SITE.exec(target);
  if (site) {
    const path = site[1] || "/";
    if (locale.status !== "live" || matchRoute(path).name === "not-found") return target;
    return `https://textjs.org${localePath(locale, path)}${site[2] ?? ""}`;
  }
  if (/^([a-z][a-z\d+.-]*:|[#/])/i.test(target)) return target;
  return `../../${target}`;
}

const CODE = /(`+)(?!`)(.+?)(?<!`)\1(?!`)/g;
const LIST_ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$/gm;
const RTL_LETTER = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/;
/** A right-to-left mark for text whose first letter isn't right-to-left (link targets aside). */
const mark = (text: string): string => (RTL_LETTER.test(/\p{L}/u.exec(text.replace(/\]\([^)]*\)/g, "]"))?.[0] ?? "") ? "" : "\u200f");

/**
 * A translated block in a right-to-left README. GitHub gives every paragraph, heading and list `dir="auto"`, which
 * follows the first strong letter, so a block that opens with Latin (`@textjs/app`, `MIT`) starts with a
 * right-to-left mark. Latin runs and code spans are isolated, or `%c` reads `c%` and `@textjs/app` reads
 * `textjs/app@`.
 */
function rtlBlock(text: string): string {
  const isolated = isolateLatin(text).replace(CODE, (code) => `\u2066${code}\u2069`);
  if (/^\s*\|/.test(isolated)) return isolated;
  if (/^\s*([-*+]|\d+[.)])\s/.test(isolated)) return isolated.replace(LIST_ITEM, (_m, marker: string, item: string) => marker + mark(item) + item);
  return mark(isolated) + isolated;
}

const links = (text: string, locale: Locale): string => text.replace(/(\]\(|\bsrc=")([^)"\s]+)/g, (_m, lead: string, target: string) => lead + readmeLink(target, locale));

/**
 * One locale's README. Code fences, HTML and the H1 come from English; prose without a current translation stays
 * English after an `<!-- i18n:en -->` line. GitHub renders Markdown left to right, so a right-to-left README wraps
 * everything but code fences in `<div dir="rtl">` (`rtlBlock`).
 */
export function renderReadme(locale: Locale, english = readFileSync(README, "utf8")): string {
  const translations = parseTranslation(readText(translationFile(locale.code, "readme")));
  const rtl = locale.dir === "rtl";
  const out = [GENERATED];
  let open = false;
  for (const b of segment(english.replace(LANGUAGES, languages(locale)))) {
    const code = b.kind === "verbatim" && FENCE.test(b.text);
    if (rtl && open === code) {
      out.push(code ? "</div>" : '<div dir="rtl">');
      open = !code;
    }
    if (b.kind === "verbatim") {
      out.push(code || LANGUAGES.test(b.text) ? b.text : links(b.text, locale));
      continue;
    }
    const found = translations.get(b.id);
    if (!found) {
      out.push("<!-- i18n:en -->", links(b.text, locale));
      continue;
    }
    const hashes = b.kind === "heading" ? `${/^\s{0,3}(#{1,6})/.exec(b.text)?.[1]} ` : "";
    out.push(hashes + links(rtl ? rtlBlock(found) : found, locale));
  }
  if (open) out.push("</div>");
  return `${out.join("\n\n")}\n`;
}

/** README.md with a current language line. */
export function renderRoot(english = readFileSync(README, "utf8")): string {
  if (!LANGUAGES.test(english)) throw new Error("README.md needs <!-- i18n:languages --> and <!-- /i18n:languages --> markers");
  return english.replace(LANGUAGES, languages(SOURCE_LOCALE));
}

/** Every README this writes, by path. */
export function readmeOutputs(): Map<string, string> {
  const english = readFileSync(README, "utf8");
  const out = new Map([[README, renderRoot(english)]]);
  for (const l of readmeLocales()) out.set(readmeFile(l.code), renderReadme(l, english));
  return out;
}

/** READMEs that differ from what `i18n:readme` writes, are missing, or belong to no locale (repo-relative). */
export function staleReadmes(): string[] {
  const outputs = readmeOutputs();
  const stale = [...outputs].filter(([file, text]) => readText(file) !== text).map(([file]) => file);
  const extra = existsSync(README_DIR) ? readdirSync(README_DIR).map((f) => join(README_DIR, f)).filter((f) => !outputs.has(f)) : [];
  return [...stale, ...extra].map((f) => relative(REPO_DIR, f));
}

export function writeReadmes(): void {
  const outputs = readmeOutputs();
  mkdirSync(README_DIR, { recursive: true });
  for (const f of readdirSync(README_DIR)) if (!outputs.has(join(README_DIR, f))) rmSync(join(README_DIR, f));
  for (const [file, text] of outputs) if (readText(file) !== text) writeFileSync(file, text);
}

if (import.meta.main) {
  writeReadmes();
  console.log(`wrote README.md's language line and ${readmeLocales().length} READMEs in ${relative(REPO_DIR, README_DIR)}/`);
}
