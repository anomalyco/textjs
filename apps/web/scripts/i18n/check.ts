#!/usr/bin/env bun
/**
 * `bun run i18n:check`: validates every committed translation against its English source (no API key needed)
 * and reports what's missing or stale per locale. Errors fail the run; staleness never does, so English copy
 * changes don't wait on translations. In CI the report goes to the job summary.
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { LOCALES } from "../../src/i18n/locales";
import { captionGroups, parseVtt } from "./captions";
import { parseTranslation, segment } from "./document";
import { ANY_CALL, CALL, captionSources, documentSources, englishText, extractMessages, LOCALES_DIR, PLURAL, readCaptions, readCatalog, readText, SRC_DIR, translationFile, USES_CATALOG } from "./sources";
import { validate, validatePlural } from "./validate";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

/** Catalog calls the extractor can't read (not one double-quoted literal), which would never be translated. */
export function unreadableCalls(dir = SRC_DIR): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const code = readFileSync(p, "utf8");
        if (!USES_CATALOG.test(code)) continue;
        const read = new Set([...code.matchAll(CALL), ...code.matchAll(PLURAL)].map((m) => m.index));
        for (const m of code.matchAll(ANY_CALL)) {
          if (read.has(m.index)) continue;
          const line = code.slice(0, m.index).split("\n").length;
          out.push(`${relative(join(SRC_DIR, ".."), p)}:${line}: ${code.slice(m.index, m.index + 50).split("\n")[0]}`);
        }
      }
    }
  };
  walk(dir);
  return out;
}

export interface LocaleReport {
  locale: string;
  errors: string[];
  warnings: string[];
  messages: { total: number; translated: number };
  documents: { total: number; translated: number; stale: number };
  captions: { total: number; translated: number };
}

const keep = (JSON.parse(readFileSync(join(LOCALES_DIR, "glossary.json"), "utf8")) as { keep: string[] }).keep;

export function checkLocale(locale: string): LocaleReport {
  const report: LocaleReport = { locale, errors: [], warnings: [], messages: { total: 0, translated: 0 }, documents: { total: 0, translated: 0, stale: 0 }, captions: { total: 0, translated: 0 } };
  const messages = extractMessages();
  const catalog = readCatalog(locale);
  for (const m of messages.values()) {
    report.messages.total++;
    const v = catalog[m.key];
    if (v === undefined) continue;
    report.messages.translated++;
    if (typeof v === "object") {
      if (!m.plural) report.errors.push(`messages: "${m.key}" isn't a plural but has plural forms`);
      for (const e of validatePlural(locale, v)) report.errors.push(`messages: "${m.key}": ${e}`);
      continue;
    }
    const verdict = validate(locale, m.key, v, keep);
    for (const e of verdict.errors) report.errors.push(`messages: "${m.key}": ${e}`);
    for (const w of verdict.warnings) report.warnings.push(`messages: "${m.key}": ${w}`);
  }
  for (const doc of documentSources()) {
    const file = translationFile(locale, doc.id);
    const blocks = segment(englishText(doc)).filter((b) => b.kind !== "verbatim");
    report.documents.total += blocks.length;
    if (!existsSync(file)) continue;
    const translations = parseTranslation(readText(file));
    const ids = new Set(blocks.map((b) => b.id));
    for (const b of blocks) {
      const target = translations.get(b.id);
      if (target === undefined) continue;
      report.documents.translated++;
      const verdict = validate(locale, b.text.replace(/^\s{0,3}#{1,6}\s+/, ""), target, keep);
      for (const e of verdict.errors) report.errors.push(`${doc.id} ${b.id}: ${e}`);
      for (const w of verdict.warnings) report.warnings.push(`${doc.id} ${b.id}: ${w}`);
    }
    report.documents.stale += [...translations.keys()].filter((id) => !ids.has(id)).length;
  }
  for (const { slug, file } of captionSources()) {
    const groups = captionGroups(parseVtt(readFileSync(file, "utf8")));
    const translations = readCaptions(locale, slug);
    report.captions.total += groups.length;
    for (const g of groups) {
      const target = translations[g.id];
      if (target === undefined) continue;
      report.captions.translated++;
      const verdict = validate(locale, g.text, target, keep);
      for (const e of verdict.errors) report.errors.push(`captions/${slug} ${g.id}: ${e}`);
      for (const w of verdict.warnings) report.warnings.push(`captions/${slug} ${g.id}: ${w}`);
    }
  }
  return report;
}

if (import.meta.main) {
  const reports = LOCALES.filter((l) => l.status === "live" || l.status === "draft").map((l) => checkLocale(l.code));
  const unreadable = unreadableCalls();
  for (const u of unreadable) console.log(`error ${u}: the first argument must be one double-quoted string`);
  const pct = (a: number, b: number): string => (b === 0 ? "–" : `${Math.round((100 * a) / b)}%`);
  const lines = [
    "| Locale | UI strings | Document blocks | Stale blocks | Caption sentences | Errors | Warnings |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...reports.map((r) => `| ${r.locale} | ${r.messages.translated}/${r.messages.total} (${pct(r.messages.translated, r.messages.total)}) | ${r.documents.translated}/${r.documents.total} (${pct(r.documents.translated, r.documents.total)}) | ${r.documents.stale} | ${r.captions.translated}/${r.captions.total} (${pct(r.captions.translated, r.captions.total)}) | ${r.errors.length} | ${r.warnings.length} |`),
  ];
  console.log(lines.join("\n"));
  for (const r of reports) {
    for (const e of r.errors) console.log(`error ${r.locale} ${e}`);
    if (process.argv.includes("--warnings")) for (const w of r.warnings) console.log(`warning ${r.locale} ${w}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Translations\n\n${lines.join("\n")}\n\nStale or missing text shows in English until \`bun run i18n:translate\` runs on a Mac.\n`);
  if (unreadable.length || reports.some((r) => r.errors.length)) process.exit(1);
}
