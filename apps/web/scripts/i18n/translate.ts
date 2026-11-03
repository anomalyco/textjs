#!/usr/bin/env bun
/**
 * Translates what's missing or stale for one or more locales and writes it to locales/<code>/. Runs on a Mac
 * with `~/.config/textjs/openai.env` (OPENAI_API_KEY, OPENAI_BASE_URL); never in CI.
 *
 *   bun run i18n:translate --locale ja                          everything
 *   bun run i18n:translate --locale ja --only messages,docs/routing
 *   bun run i18n:translate --locale ja --dry-run                list what would be translated
 *   bun run i18n:translate --locale ja --force docs/routing     retranslate a document (or a message key)
 *
 * Only the areas selected with --only are pruned of keys and blocks that no longer exist in English.
 * Responses are cached in .cache/i18n/ by model and prompt, so a rerun after a failure costs nothing.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { getLocale } from "../../src/i18n/locales";
import { formatTranslation, parseTranslation, segment } from "./document";
import { captionGroups, parseVtt } from "./captions";
import { captionFile, captionSources, catalogFile, documentSources, extractMessages, LOCALES_DIR, readCaptions, readCatalog, readText, translationFile, WEB_DIR, type Catalog, type CatalogValue } from "./sources";
import { validate, validatePlural } from "./validate";

const { values } = parseArgs({
  options: {
    locale: { type: "string", multiple: true },
    only: { type: "string" },
    force: { type: "string", multiple: true },
    "dry-run": { type: "boolean" },
    concurrency: { type: "string" },
  },
});

/** Docs, blog, Learn, changelog and captions. */
const TEXT_MODEL = "gpt-6.1-sol";
/** Marketing and parody copy: the home page, Enterprise, Status, the store and the OpenCode page. */
const FRONTIER_MODEL = "gpt-6-astra";
const MARKETING = /src\/(pages\/(Home|home\/|Enterprise|Status|OpenCode)|merch\/)/;

const CACHE = join(WEB_DIR, ".cache", "i18n");
const LEDGER = join(CACHE, "spend.jsonl");

function env(): { key: string; base: string } {
  const file = join(homedir(), ".config", "textjs", "openai.env");
  const vars: Record<string, string> = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z_]+)=(.*)$/.exec(line);
      if (m) vars[m[1] as string] = (m[2] as string).trim().replace(/^["']|["']$/g, "");
    }
  }
  const key = process.env.OPENAI_API_KEY ?? vars.OPENAI_API_KEY;
  const base = process.env.OPENAI_BASE_URL ?? vars.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  if (!key) throw new Error("OPENAI_API_KEY isn't set (~/.config/textjs/openai.env)");
  return { key, base };
}

interface Glossary {
  keep: string[];
  terms: Record<string, Record<string, string>>;
}
const glossary = JSON.parse(readFileSync(join(LOCALES_DIR, "glossary.json"), "utf8")) as Glossary;
/** The site's copy rules: apps/web/STYLE.md and "Writing docs and copy" in CONTRIBUTING.md. */
const siteStyle = [
  readFileSync(join(WEB_DIR, "STYLE.md"), "utf8"),
  /## Writing docs and copy\n([\s\S]*?)\n## /.exec(readFileSync(join(WEB_DIR, "..", "..", "CONTRIBUTING.md"), "utf8"))?.[1] ?? "",
].join("\n\n");

/** Component, hook and API names exported by the packages, kept as written. */
function apiNames(): string[] {
  const names = new Set<string>();
  for (const pkg of ["react", "app", "core"]) {
    const file = join(WEB_DIR, "..", "..", "packages", pkg, "src", "index.ts");
    if (!existsSync(file)) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) for (const n of (m[1] as string).split(",")) {
      const name = n.replace(/\btype\b/, "").split(/\bas\b/).pop()?.trim();
      if (name && /^[A-Za-z_]\w{2,}$/.test(name)) names.add(name);
    }
    for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)) names.add(m[1] as string);
  }
  return [...names];
}
const API = apiNames();

interface Item {
  id: string;
  text: string;
}

interface Job {
  locale: string;
  model: string;
  /** What the strings are, for the prompt. */
  kind: "ui" | "document" | "captions";
  title: string;
  context?: string;
  items: Item[];
}

function systemPrompt(locale: string, job: Job): string {
  const lang = getLocale(locale);
  const style = readText(join(LOCALES_DIR, locale, "STYLE.md"));
  const text = job.items.map((i) => i.text).join("\n") + (job.context ?? "");
  const keep = [...glossary.keep, ...API].filter((k) => text.includes(k));
  const terms = Object.entries(glossary.terms)
    .filter(([en, t]) => t[locale] && new RegExp(`\\b${en}`, "i").test(text))
    .map(([en, t]) => `- ${en} → ${t[locale]}`);
  return [
    `You translate the website of Text.js, a React framework for apps that render in the browser DevTools console, from English into ${lang?.name ?? locale} (${locale}).`,
    "Rules:",
    "- Translate every item's text. Return exactly one item per input id, with the same id.",
    "- Keep Markdown structure: list markers, table pipes and row count, emphasis, heading text only (no # marks).",
    "- Never translate or change inline code (`…`), URLs and link targets in (…), `{placeholders}`, `<tag>…</tag>` names, file paths, CLI commands, keyboard shortcuts (⌘⌥J, Ctrl+Shift+J) or numbers.",
    "- Link text inside […] is translated; the (target) is kept exactly.",
    "- Don't add, drop or reorder sentences. Don't explain jokes; keep the deadpan tone.",
    keep.length ? `- Keep these names exactly as written: ${keep.join(", ")}.` : "",
    terms.length ? `- Preferred terms:\n${terms.join("\n")}` : "",
    job.kind === "ui" ? "- These are interface strings (buttons, labels, titles, short descriptions). Keep them as short as the English." : "",
    job.kind === "captions" ? "- These are subtitles for a narrated video. Translate each sentence naturally and concisely, so it can be read while it's spoken. Write words the narrator spells out (\"app folder\", \"page dot tsx\") as they'd be read in the target language, keeping code names as written." : "",
    "",
    "The site's English copy rules. Apply their intent to the translation (register, no filler, facts kept exact):",
    siteStyle,
    "",
    style ? `Locale style guide:\n${style}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"], additionalProperties: false },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

let spent = 0;

async function call(job: Job, feedback?: string): Promise<Map<string, string>> {
  const { key, base } = env();
  const user = [
    `Page: ${job.title}`,
    job.context ? `The whole English page, for context only (don't translate it):\n<<<\n${job.context}\n>>>` : "",
    feedback ? `Your previous answer had problems; fix them:\n${feedback}` : "",
    `Translate these items:\n${JSON.stringify({ items: job.items })}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const body = {
    model: job.model,
    reasoning: { effort: "low" },
    input: [
      { role: "system", content: systemPrompt(job.locale, job) },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_schema", name: "translations", strict: true, schema: SCHEMA } },
  };
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 24);
  const cached = join(CACHE, "responses", `${hash}.json`);
  let json: { output?: { content?: { text?: string }[] }[]; usage?: { cost?: number; input_tokens?: number; output_tokens?: number }; error?: { message: string } };
  if (existsSync(cached)) json = JSON.parse(readFileSync(cached, "utf8"));
  else {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${base}/responses`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      json = await res.json();
      if (res.ok && !json.error) break;
      if (attempt >= 2 || (res.status < 500 && res.status !== 429)) throw new Error(`${job.title}: ${res.status} ${json.error?.message ?? ""}`);
      await Bun.sleep(2000 * (attempt + 1));
    }
    mkdirSync(dirname(cached), { recursive: true });
    writeFileSync(cached, JSON.stringify(json));
    const cost = json.usage?.cost ?? 0;
    spent += cost;
    appendFileSync(LEDGER, `${JSON.stringify({ at: new Date().toISOString(), locale: job.locale, model: job.model, title: job.title, input: json.usage?.input_tokens, output: json.usage?.output_tokens, cost })}\n`);
  }
  const text = (json.output ?? []).flatMap((o) => o.content ?? []).map((c) => c.text ?? "").join("");
  const parsed = JSON.parse(text) as { items: Item[] };
  return new Map(parsed.items.map((i) => [i.id, i.text]));
}

/** Translates a job, validating each item and retrying the failures once with the errors. */
async function translate(job: Job): Promise<{ ok: Map<string, string>; failed: string[] }> {
  const keep = [...glossary.keep, ...API];
  const ok = new Map<string, string>();
  let pending = job.items;
  let feedback: string | undefined;
  for (let round = 0; round < 2 && pending.length; round++) {
    const out = await call({ ...job, items: pending }, feedback);
    const problems: string[] = [];
    const retry: Item[] = [];
    for (const item of pending) {
      const target = out.get(item.id);
      const verdict = target === undefined ? { errors: ["missing"], warnings: [] } : validate(job.locale, item.text, target, keep);
      if (verdict.errors.length === 0 && target !== undefined) ok.set(item.id, target);
      else {
        retry.push(item);
        problems.push(`- ${item.id}: ${verdict.errors.join("; ")}`);
      }
    }
    pending = retry;
    feedback = problems.join("\n");
  }
  return { ok, failed: pending.map((p) => p.id) };
}

async function pool<T>(tasks: (() => Promise<T>)[], size: number): Promise<T[]> {
  const out: T[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, tasks.length) }, async () => {
      for (let i = next++; i < tasks.length; i = next++) out[i] = await (tasks[i] as () => Promise<T>)();
    }),
  );
  return out;
}

const locales = values.locale ?? [];
if (locales.length === 0) throw new Error("pass --locale <code> (repeatable)");
const only = values.only?.split(",").map((s) => s.trim());
const force = new Set(values.force ?? []);
const selected = (area: string): boolean => !only || only.includes(area) || only.some((o) => area.startsWith(`${o}/`));
const concurrency = Number(values.concurrency ?? 8);
mkdirSync(CACHE, { recursive: true });

for (const locale of locales) {
  if (!getLocale(locale)) throw new Error(`unknown locale ${locale}`);
  const tasks: (() => Promise<void>)[] = [];
  const writers: (() => void)[] = [];
  const failures: string[] = [];
  let planned = 0;

  // Catalog -------------------------------------------------------------------------------------
  if (selected("messages")) {
    const messages = extractMessages();
    const catalog = readCatalog(locale);
    const next: Catalog = {};
    for (const [k, v] of Object.entries(catalog)) if (messages.has(k)) next[k] = v;
    const missing = [...messages.values()].filter((m) => force.has(m.key) || force.has("messages") || next[m.key] === undefined);
    const groups = new Map<string, typeof missing>();
    for (const m of missing) {
      const model = m.files.some((f) => MARKETING.test(f)) ? FRONTIER_MODEL : TEXT_MODEL;
      groups.set(model, [...(groups.get(model) ?? []), m]);
    }
    planned += missing.length;
    for (const [model, list] of groups) {
      for (let i = 0; i < list.length; i += 50) {
        const batch = list.slice(i, i + 50);
        tasks.push(async () => {
          const plural = batch.filter((m) => m.plural);
          const items = batch.filter((m) => !m.plural).map((m, j) => ({ id: `m${i + j}`, text: m.key }));
          const byId = new Map(items.map((it, j) => [it.id, batch.filter((m) => !m.plural)[j]!.key]));
          const { ok, failed } = await translate({ locale, model, kind: "ui", title: `UI strings (${batch[0]?.files[0]})`, items });
          for (const [id, text] of ok) next[byId.get(id) as string] = text;
          failures.push(...failed.map((f) => `messages: ${byId.get(f)}`));
          // Plurals: one item per category the locale uses.
          for (const m of plural) {
            const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories as string[];
            const forms = await translate({ locale, model, kind: "ui", title: `Plural forms of "${m.key}" (categories: ${categories.join(", ")})`, items: categories.map((c) => ({ id: c, text: m.key })) });
            const value = Object.fromEntries(forms.ok);
            if (validatePlural(locale, value).length === 0) next[m.key] = value;
            else failures.push(`messages (plural): ${m.key}`);
          }
        });
      }
    }
    // Written once every batch has run.
    writers.push(() => {
      const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b))) as Record<string, CatalogValue>;
      mkdirSync(dirname(catalogFile(locale)), { recursive: true });
      writeFileSync(catalogFile(locale), `${JSON.stringify(sorted, null, 2)}\n`);
    });
  }

  // Documents ------------------------------------------------------------------------------------
  for (const doc of documentSources()) {
    if (!selected(doc.id)) continue;
    const english = readFileSync(doc.file, "utf8");
    const blocks = segment(english).filter((b) => b.kind !== "verbatim");
    const file = translationFile(locale, doc.id);
    const existing = parseTranslation(readText(file));
    const todo = blocks.filter((b) => force.has(doc.id) || !existing.has(b.id));
    const unique = [...new Map(todo.map((b) => [b.id, b])).values()];
    planned += unique.length;
    if (unique.length === 0 && [...existing.keys()].every((id) => blocks.some((b) => b.id === id))) continue;
    const model = TEXT_MODEL;
    tasks.push(async () => {
      const result = new Map(existing);
      for (let i = 0; i < unique.length; i += 40) {
        const batch = unique.slice(i, i + 40);
        const items = batch.map((b) => ({ id: b.id, text: b.kind === "heading" ? b.text.replace(/^\s{0,3}#{1,6}\s+/, "") : b.text }));
        const { ok, failed } = await translate({ locale, model, kind: "document", title: doc.id, context: english.length < 40_000 ? english : undefined, items });
        for (const [id, text] of ok) result.set(id, text);
        failures.push(...failed.map((f) => `${doc.id}: block ${f}`));
      }
      // English order, current blocks only (this document is selected, so stale blocks are pruned).
      const entries = [...new Set(blocks.map((b) => b.id))].filter((id) => result.has(id)).map((id) => [id, result.get(id) as string] as [string, string]);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, formatTranslation(entries));
    });
  }

  // Captions --------------------------------------------------------------------------------------
  for (const { slug, file } of captionSources()) {
    const id = `captions/${slug}`;
    if (!selected(id)) continue;
    const groups = captionGroups(parseVtt(readFileSync(file, "utf8")));
    const existing = readCaptions(locale, slug);
    const todo = [...new Map(groups.filter((g) => force.has(id) || !existing[g.id]).map((g) => [g.id, g])).values()];
    planned += todo.length;
    if (todo.length === 0 && Object.keys(existing).every((k) => groups.some((g) => g.id === k))) continue;
    const transcript = groups.map((g) => g.text).join("\n");
    tasks.push(async () => {
      const result: Record<string, string> = { ...existing };
      for (let i = 0; i < todo.length; i += 40) {
        const items = todo.slice(i, i + 40).map((g) => ({ id: g.id, text: g.text }));
        const { ok, failed } = await translate({ locale, model: TEXT_MODEL, kind: "captions", title: `Captions of the Learn Text.js video "${slug}" (narration, one sentence per item)`, context: transcript, items });
        for (const [k, text] of ok) result[k] = text;
        failures.push(...failed.map((f) => `${id}: ${f}`));
      }
      const out = Object.fromEntries(groups.filter((g) => result[g.id]).map((g) => [g.id, result[g.id] as string]));
      mkdirSync(dirname(captionFile(locale, slug)), { recursive: true });
      writeFileSync(captionFile(locale, slug), `${JSON.stringify(out, null, 2)}\n`);
    });
  }

  if (values["dry-run"]) {
    console.log(`${locale}: ${planned} units to translate`);
    continue;
  }
  await pool(tasks, concurrency);
  for (const w of writers) w();
  console.log(`${locale}: ${planned} units, ${failures.length} left in English${failures.length ? `:\n  ${failures.join("\n  ")}` : ""}`);
}
console.log(`spent $${spent.toFixed(4)} this run (ledger: ${LEDGER})`);
