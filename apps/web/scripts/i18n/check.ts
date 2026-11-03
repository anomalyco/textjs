#!/usr/bin/env bun
/**
 * `bun run i18n:check`: validates every committed translation against its English source (no API key needed)
 * and reports what's missing or stale per locale. Errors fail the run; staleness never does, so English copy
 * changes don't wait on translations. In CI the report goes to the job summary.
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { LOCALES } from "../../src/i18n/locales";
import { parseTranslation, segment } from "./document";
import { documentSources, extractMessages, LOCALES_DIR, readCatalog, readText, translationFile } from "./sources";
import { validate, validatePlural } from "./validate";
import { join } from "node:path";

export interface LocaleReport {
  locale: string;
  errors: string[];
  warnings: string[];
  messages: { total: number; translated: number };
  documents: { total: number; translated: number; stale: number };
}

const keep = (JSON.parse(readFileSync(join(LOCALES_DIR, "glossary.json"), "utf8")) as { keep: string[] }).keep;

export function checkLocale(locale: string): LocaleReport {
  const report: LocaleReport = { locale, errors: [], warnings: [], messages: { total: 0, translated: 0 }, documents: { total: 0, translated: 0, stale: 0 } };
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
    const blocks = segment(readFileSync(doc.file, "utf8")).filter((b) => b.kind !== "verbatim");
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
  return report;
}

if (import.meta.main) {
  const reports = LOCALES.filter((l) => l.status === "live" || l.status === "draft").map((l) => checkLocale(l.code));
  const pct = (a: number, b: number): string => (b === 0 ? "–" : `${Math.round((100 * a) / b)}%`);
  const lines = [
    "| Locale | UI strings | Document blocks | Stale blocks | Errors | Warnings |",
    "| --- | --- | --- | --- | --- | --- |",
    ...reports.map((r) => `| ${r.locale} | ${r.messages.translated}/${r.messages.total} (${pct(r.messages.translated, r.messages.total)}) | ${r.documents.translated}/${r.documents.total} (${pct(r.documents.translated, r.documents.total)}) | ${r.documents.stale} | ${r.errors.length} | ${r.warnings.length} |`),
  ];
  console.log(lines.join("\n"));
  for (const r of reports) {
    for (const e of r.errors) console.log(`error ${r.locale} ${e}`);
    if (process.argv.includes("--warnings")) for (const w of r.warnings) console.log(`warning ${r.locale} ${w}`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Translations\n\n${lines.join("\n")}\n\nStale or missing text shows in English until \`bun run i18n:translate\` runs on a Mac.\n`);
  if (reports.some((r) => r.errors.length)) process.exit(1);
}
