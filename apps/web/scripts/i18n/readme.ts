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
import { parseTranslation, segment, withAlt } from "./document";
import { readText, REPO_DIR, translationFile } from "./sources";

export const README = join(REPO_DIR, "README.md");
export const README_DIR = join(REPO_DIR, "docs", "readme");
const LANGUAGES = /<!-- i18n:languages -->[\s\S]*?<!-- \/i18n:languages -->/;
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const GENERATED = "<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->";

/**
 * Live locales have a README. Draft locales don't: a file in the repo is public and indexed, while draft pages on
 * the site are `noindex`.
 */
export function readmeLocales(): Locale[] {
  return LOCALES.filter((l) => l.status === "live");
}

export function readmeFile(code: string): string {
  return join(README_DIR, `README.${code}.md`);
}

/** English and the live locales, each linking to its README. The current README's language is plain text. */
export function languageLine(current: Locale): string {
  const href = (l: Locale): string => (l === SOURCE_LOCALE ? "../../README.md" : current === SOURCE_LOCALE ? `docs/readme/README.${l.code}.md` : `README.${l.code}.md`);
  return LOCALES.filter((l) => l === current || l.status === "source" || l.status === "live")
    .map((l) => {
      // A name written in the other direction gets its own `dir`, or neighbours like العربية · עברית swap places.
      const name = l.dir === current.dir ? l.name : `<span dir="${l.dir}">${l.name}</span>`;
      return l === current ? name : `[${name}](${href(l)})`;
    })
    .join(" · ");
}

const languages = (locale: Locale): string => `<!-- i18n:languages -->\n${languageLine(locale)}\n<!-- /i18n:languages -->`;

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
/** Bidi controls (marks, embeddings, isolates). GitHub flags a file that has any as "hidden or bidirectional Unicode text". */
const BIDI_CONTROLS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * A translated block in a right-to-left README, with no bidi control characters. Latin runs (`bidi.ts`) and code
 * spans go in `<span dir="ltr">`, or `%c` reads `c%` and `@textjs/app` reads `textjs/app@`. GitHub gives every
 * paragraph, heading and list `dir="auto"`, which skips elements with their own `dir`, so a block that opens with a
 * package name still reads right to left.
 */
function rtlBlock(text: string): string {
  return isolateLatin(text.replace(BIDI_CONTROLS, ""))
    .replace(/!\[[^\]]*\]/g, (alt) => alt.replace(BIDI_CONTROLS, ""))
    .replace(CODE, (code) => `\u2066${code}\u2069`)
    .replace(/\u2066([^\u2069]*)\u2069/g, '<span dir="ltr">$1</span>');
}

const links = (text: string, locale: Locale): string => text.replace(/(\]\(|\bsrc=")([^)"\s]+)/g, (_m, lead: string, target: string) => lead + readmeLink(target, locale));

/**
 * One locale's README. Code fences, HTML and the H1 come from English; prose without a current translation stays
 * English after an `<!-- i18n:en -->` line. GitHub renders Markdown left to right, so a right-to-left README wraps
 * everything but code fences in `<div dir="rtl">` (`rtlBlock`), and English fallback blocks in `<div dir="ltr">`.
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
    if (b.kind === "alt") {
      out.push(links(found ? withAlt(b, found.replace(BIDI_CONTROLS, "")) : (b.html as string), locale));
      continue;
    }
    if (!found) {
      // Nested rather than closing the wrapper, which may sit outside an open `<div align="center">`.
      out.push("<!-- i18n:en -->", rtl ? `<div dir="ltr">\n\n${links(b.text, locale)}\n\n</div>` : links(b.text, locale));
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
export function readmeOutputs(english = readFileSync(README, "utf8")): Map<string, string> {
  const out = new Map([[README, renderRoot(english)]]);
  for (const l of readmeLocales()) out.set(readmeFile(l.code), renderReadme(l, english));
  return out;
}

export interface ReadmeStatus {
  /** Fixable without an API key by `bun run i18n:readme`: README.md's language line, and files of no live locale. */
  errors: string[];
  /** Localized READMEs behind README.md or their translations; a Mac `i18n:translate` run refreshes them. */
  stale: string[];
}

/** `english` is README.md as committed; tests pass an edited copy. */
export function readmeStatus(english = readFileSync(README, "utf8")): ReadmeStatus {
  const outputs = readmeOutputs(english);
  const errors: string[] = [];
  if (renderRoot(english) !== english) errors.push("README.md: the language line is out of date (bun run i18n:readme)");
  if (existsSync(README_DIR)) for (const f of readdirSync(README_DIR)) if (!outputs.has(join(README_DIR, f))) errors.push(`docs/readme/${f} isn't a live locale's README (bun run i18n:readme)`);
  const stale = [...outputs].filter(([file, text]) => file !== README && readText(file) !== text).map(([file]) => relative(REPO_DIR, file));
  return { errors, stale };
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
