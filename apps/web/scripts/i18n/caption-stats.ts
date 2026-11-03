#!/usr/bin/env bun
/**
 * Reading speed of a locale's translated captions: characters per second per cue, against the locale's target
 * (`readingSpeed` in captions.ts), and the sentences furthest over their budget.
 *
 *   bun scripts/i18n/caption-stats.ts --locale ja
 */

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { assembleCaptions, captionBudget, captionGroups, captionLength, parseVtt, readingSpeed } from "./captions";
import { captionSources, readCaptions } from "./sources";

const { values } = parseArgs({ options: { locale: { type: "string" }, top: { type: "string" } } });
const locale = values.locale ?? "ja";
const secs = (t: string): number => t.split(":").reduce((n, p) => n * 60 + Number(p), 0);
const rates: number[] = [];
const over: { slug: string; id: string; len: number; budget: number; text: string }[] = [];
for (const { slug, file } of captionSources()) {
  const english = readFileSync(file, "utf8");
  const translations = readCaptions(locale, slug);
  for (const cue of parseVtt(assembleCaptions(english, translations, locale).vtt)) {
    rates.push(captionLength(cue.text) / Math.max(0.5, secs(cue.end) - secs(cue.start)));
  }
  for (const g of captionGroups(parseVtt(english))) {
    const text = translations[g.id];
    if (!text) continue;
    const budget = captionBudget(g, locale);
    const len = captionLength(text);
    if (len > budget) over.push({ slug, id: g.id, len, budget, text });
  }
}
rates.sort((a, b) => a - b);
const target = readingSpeed(locale);
console.log(`${locale}: ${rates.length} cues, median ${rates[Math.floor(rates.length / 2)]?.toFixed(1)} chars/s, p90 ${rates[Math.floor(rates.length * 0.9)]?.toFixed(1)}, ${rates.filter((r) => r > target * 2).length} above ${target * 2}/s (target ${target}/s)`);
console.log(`${over.length} sentences over budget`);
for (const o of over.sort((a, b) => b.len / b.budget - a.len / a.budget).slice(0, Number(values.top ?? 10))) console.log(`  ${o.slug} ${o.id} ${o.len}/${o.budget}: ${o.text}`);
