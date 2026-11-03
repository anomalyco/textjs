/**
 * Compiles one locale into the build. Catalog strings (`t`, `msg`, `rich`, `plural` with literal arguments) are
 * replaced by the locale's text, falling back to English; `t("x")` and `msg("x")` without parameters become plain
 * string literals, so no lookup or catalog ships. Markdown imported with `?raw` is answered with the assembled
 * locale document (`document.ts`).
 *
 * The console companion stays English: modules it imports from `src/docs` and `src/blog` resolve to separate
 * English copies (`?lang=en`).
 *
 * Client builds emit `.i18n/units.json`: translated and total units per output chunk and per document, which the
 * prerenderer turns into each page's coverage.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { assemble, blockId, parseTranslation } from "./document";
import { getLocale } from "../../src/i18n/locales";
import { CALL, documentForFile, errorPageDocs, LITERAL, parsePluralObject, PLURAL, readCatalog, readText, SRC_DIR, translationFile, USES_CATALOG, type Catalog } from "./sources";

export interface Units {
  translated: number;
  total: number;
}

export interface UnitsManifest {
  /** Catalog units by output chunk file (`assets/Docs-abc.js`). */
  chunks: Record<string, Units>;
  /** Document units by id (`docs/routing`). */
  documents: Record<string, Units>;
}

const COMPANION = join(SRC_DIR, "console-companion") + "/";
/** The error pages' translations, `{}` in source (`src/pages/error-docs.ts`). */
const ERROR_DOCS = join(SRC_DIR, "pages", "error-docs.ts");
const ENGLISH_ISLAND = [join(SRC_DIR, "docs") + "/", join(SRC_DIR, "blog") + "/", join(SRC_DIR, "learn") + "/"];
/** Modules with state the page and the console share; copying them would split it. */
const SHARED_STATE = /\/learn\/(progress|captions)\.ts$/;
const EN_QUERY = "lang=en";

const clean = (id: string): string => id.split("?")[0] as string;
const isEnglishCopy = (id: string): boolean => new RegExp(`[?&]${EN_QUERY}(&|$)`).test(id);

export function i18nPlugin(locale: string): Plugin {
  const source = locale === "en";
  const catalog: Catalog = source ? {} : readCatalog(locale);
  const moduleUnits = new Map<string, Units>();
  const documents: Record<string, Units> = {};

  const lookup = (key: string): string => {
    const v = catalog[key];
    return typeof v === "string" && v ? v : key;
  };

  return {
    name: "textjs-i18n",
    enforce: "pre",
    async resolveId(id, importer, options) {
      if (source || !importer) return null;
      const english = isEnglishCopy(importer) || clean(importer).startsWith(COMPANION);
      if (!english) return null;
      const resolved = await this.resolve(id, clean(importer), { ...options, skipSelf: true });
      if (!resolved || resolved.external) return null;
      const file = clean(resolved.id);
      if (!ENGLISH_ISLAND.some((d) => file.startsWith(d)) || SHARED_STATE.test(file) || isEnglishCopy(resolved.id)) return null;
      return `${resolved.id}${resolved.id.includes("?") ? "&" : "?"}${EN_QUERY}`;
    },
    load(id) {
      if (!source && clean(id) === ERROR_DOCS) {
        const translations = parseTranslation(readText(translationFile(locale, "errors")));
        const out: Record<string, { title: string; cause: string; fix: string }> = {};
        for (const e of errorPageDocs()) {
          const title = translations.get(blockId(e.title));
          const cause = assemble(e.cause, translations);
          const fix = assemble(e.fix, translations);
          documents[`errors/${e.code}`] = { total: 1 + cause.total + fix.total, translated: (title ? 1 : 0) + cause.translated + fix.translated };
          out[e.code] = { title: title ?? e.title, cause: cause.markdown, fix: fix.markdown };
        }
        return `export const ERROR_TRANSLATIONS = ${JSON.stringify(out)};`;
      }
      if (source || isEnglishCopy(id) || !/[?&]raw(&|$)/.test(id)) return null;
      const doc = documentForFile(clean(id));
      if (!doc) return null;
      const english = readFileSync(doc.file, "utf8");
      const { markdown, total, translated } = assemble(english, parseTranslation(readText(translationFile(locale, doc.id))));
      documents[doc.id] = { total, translated };
      return `export default ${JSON.stringify(markdown)};`;
    },
    transform(code, id) {
      const file = clean(id);
      if (!file.startsWith(SRC_DIR) || !/\.tsx?$/.test(file) || !USES_CATALOG.test(code)) return null;
      const english = source || isEnglishCopy(id);
      const units: Units = { translated: 0, total: 0 };
      const count = (key: string, plural = false): void => {
        units.total++;
        if (!english && (plural ? typeof catalog[key] === "object" : typeof catalog[key] === "string" && catalog[key] !== "")) units.translated++;
      };
      const rtl = !english && getLocale(locale)?.dir === "rtl";
      const missing = (key: string): boolean => !english && !(typeof catalog[key] === "string" && catalog[key]);
      // Untranslated text stays English. As a JSX child it's marked up as English; elsewhere (attributes, data)
      // a right-to-left page gets it in a left-to-right isolate, so its punctuation stays put.
      let out = code;
      if (!english && file.endsWith(".tsx")) {
        out = out.replace(new RegExp(String.raw`(?<![=$]\s*)\{\s*t\(\s*(${LITERAL})\s*\)\s*\}(?!\s*<\/(?:option|title|textarea)\b)`, "g"), (m, literal: string) => {
          const key = JSON.parse(literal) as string;
          if (!missing(key) || /\{\w+\}/.test(key)) return m;
          count(key);
          return `{<span lang="en" dir="ltr">{${JSON.stringify(key)}}</span>}`;
        });
      }
      out = out.replace(CALL, (_m, fn: string, literal: string, end: string) => {
        const key = JSON.parse(literal) as string;
        count(key);
        if (fn === "rich" && missing(key)) return `rich.en(${literal}${end}`;
        const value = english ? key : lookup(key);
        const text = JSON.stringify(rtl && missing(key) ? `\u2066${value}\u2069` : value);
        // A bare `t("x")` or `msg("x")` is just its text.
        if (end === ")" && (fn === "t" || fn === "msg") && !/\{\w+\}/.test(key)) return text;
        return `${fn}(${text}${end}`;
      });
      out = out.replace(PLURAL, (_m, count_: string, object: string) => {
        const forms = parsePluralObject(object);
        const key = forms.other as string;
        count(key, true);
        const value = !english && typeof catalog[key] === "object" ? catalog[key] : forms;
        return `plural(${count_}, ${JSON.stringify(value)}`;
      });
      if (!english) moduleUnits.set(id, units);
      return out === code ? null : { code: out, map: null };
    },
    generateBundle(options, bundle) {
      if (source || options.format !== "es" || this.environment?.config.build.ssr) return;
      const chunks: Record<string, Units> = {};
      for (const [fileName, out] of Object.entries(bundle)) {
        if (out.type !== "chunk") continue;
        const sum: Units = { translated: 0, total: 0 };
        for (const m of Object.keys(out.modules)) {
          const u = moduleUnits.get(m);
          if (u) {
            sum.translated += u.translated;
            sum.total += u.total;
          }
        }
        if (sum.total > 0) chunks[fileName] = sum;
      }
      const manifest: UnitsManifest = { chunks, documents };
      this.emitFile({ type: "asset", fileName: ".i18n/units.json", source: JSON.stringify(manifest, null, 2) });
    },
  };
}
