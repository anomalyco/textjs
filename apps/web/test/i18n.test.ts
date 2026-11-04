import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { assembleCaptions, captionGroups, parseVtt, segments } from "../scripts/i18n/captions";
import { assemble, formatTranslation, parseTranslation, segment } from "../scripts/i18n/document";
import { checkLocale, unreadableCalls } from "../scripts/i18n/check";
import { CALL, extractMessages, PLURAL } from "../scripts/i18n/sources";
import { withGeistSubsets } from "../scripts/i18n/fonts";
import { i18nPlugin } from "../scripts/i18n/vite-plugin";
import { normalizePunctuation, validate, validatePlural } from "../scripts/i18n/validate";
import { isolateLatin, isolateString } from "../scripts/i18n/bidi";
import { fuzzyScore, searchFold } from "../src/docs/search";
import { headingsOf, toConsoleMarkdown } from "../src/docs/registry";
import { DOC_HEADINGS, type Heading } from "../src/docs/search-index";
import { getLocale, LOCALES, localePath, parseLocaleSet, splitLocale, type Locale } from "../src/i18n/locales";
import { rich } from "../src/i18n/rich";
import { DATE_STYLES, datePatterns, formatWith, intlTag, type DateStyle } from "../src/i18n/intl";
import { formatDate, interpolate, plural } from "../src/i18n/t";
import { localizeHref, matchRoute } from "../src/router";
import { suggestedLocale } from "../src/site/LocaleMenu";
import { MarkdownDoc } from "../src/site/Markdown";

const ja = LOCALES.find((l) => l.code === "ja")!;

describe("locales", () => {
  test("paths split into locale and route path, and English stays at the root", () => {
    expect(splitLocale("/ja/docs/routing")).toEqual({ locale: ja, path: "/docs/routing" });
    expect(splitLocale("/ja")).toEqual({ locale: ja, path: "/" });
    expect(splitLocale("/docs").locale.code).toBe("en");
    // Only locales are prefixes; other two-letter segments are ordinary (unknown) paths.
    expect(splitLocale("/xx/blog").locale.code).toBe("en");
    expect(localePath(ja, "/")).toBe("/ja");
    expect(localePath(ja, "/docs")).toBe("/ja/docs");
    expect(localePath(LOCALES[0]!, "/docs")).toBe("/docs");
    expect(matchRoute("/ja/docs/routing")).toEqual({ name: "docs", slug: "routing" });
  });

  test("no route's first segment collides with a locale path", () => {
    for (const l of LOCALES) if (l.path) expect(["home", "not-found"]).toContain(matchRoute(`/${l.path}`).name);
    expect(new Set(LOCALES.map((l) => l.path)).size).toBe(LOCALES.length);
  });

  test("a deploy's locale set comes from TEXTJS_LOCALES, with optional status overrides", () => {
    expect(parseLocaleSet("en").map((l) => l.code)).toEqual(["en"]);
    expect(parseLocaleSet("ja:live").map((l) => `${l.code}:${l.status}`)).toEqual(["en:source", "ja:live"]);
    expect(parseLocaleSet("ar").find((l) => l.code === "ar")?.status).toBe("draft");
    expect(() => parseLocaleSet("xx")).toThrow();
    // Listed in any order, built in LOCALES order.
    expect(parseLocaleSet("zh-TW,ja,de:live").map((l) => l.code)).toEqual(["en", "de", "ja", "zh-TW"]);
  });

  test("LOCALES is ordered English, Latin by native name, Cyrillic, Devanagari, CJK, then right-to-left", () => {
    const script = (l: (typeof LOCALES)[number]): number =>
      l.code === "en" ? 0 : l.dir === "rtl" ? 5 : /\p{Script=Cyrillic}/u.test(l.name) ? 2 : /\p{Script=Devanagari}/u.test(l.name) ? 3 : /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}]/u.test(l.name) ? 4 : 1;
    const groups = LOCALES.map(script);
    expect(groups).toEqual([...groups].sort((a, b) => a - b));
    const latin = LOCALES.filter((l) => script(l) === 1).map((l) => l.name);
    expect(latin).toEqual([...latin].sort(new Intl.Collator("und").compare));
    expect(LOCALES.filter((l) => l.status === "live" || l.status === "source").map((l) => l.name)).toEqual(["English", "Bahasa Indonesia", "Deutsch", "Español", "Français", "Italiano", "Polski", "Português (Brasil)", "Tiếng Việt", "Türkçe", "Русский", "हिन्दी", "日本語", "한국어", "简体中文", "繁體中文"]);
  });

  test("production builds the fifteen reviewed locales live", () => {
    // The deploy sets no TEXTJS_LOCALES, so these are the locales textjs.org indexes and offers in the picker and banner.
    const built = parseLocaleSet(undefined);
    expect(built.filter((l) => l.status === "live").map((l) => l.code)).toEqual(["id", "de", "es", "fr", "it", "pl", "pt-BR", "vi", "tr", "ru", "hi", "ja", "ko", "zh-CN", "zh-TW"]);
    expect(built.every((l) => ["source", "live", "draft"].includes(l.status))).toBe(true);
  });

  test("the English build leaves links alone", () => {
    expect(localizeHref("/docs#x")).toBe("/docs#x");
  });

  test("the banner suggests the closest offered language", () => {
    const offered = [LOCALES[0]!, ja];
    expect(suggestedLocale(["ja-JP", "en"], offered)?.code).toBe("ja");
    expect(suggestedLocale(["en-GB"], offered)?.code).toBe("en");
    expect(suggestedLocale(["fr"], offered)).toBeNull();
  });

  test("the banner reads the retired codes old Android WebViews report (iw for Hebrew, in for Indonesian)", () => {
    const he = getLocale("he") as Locale;
    const id = getLocale("id") as Locale;
    const offered = [LOCALES[0]!, he, id];
    expect(suggestedLocale(["iw-IL", "en"], offered)?.code).toBe("he");
    expect(suggestedLocale(["iw"], offered)?.code).toBe("he");
    expect(suggestedLocale(["in-ID"], offered)?.code).toBe("id");
    expect(suggestedLocale(["in"], offered)?.code).toBe("id");
    expect(suggestedLocale(["inh", "iwx"], offered)).toBeNull();
  });

  test("the banner's match doesn't depend on the order locales are listed in", () => {
    const offered = LOCALES.filter((l) => l.status !== "planned");
    for (const langs of [["de-AT", "en"], ["zh-Hans"], ["zh-HK"], ["zh-Hant-TW"], ["ko-KR"], ["pt-PT"], ["es-MX"], ["it", "fr"], ["en-GB", "de"], ["ru"]]) {
      expect(suggestedLocale(langs, [...offered].reverse())?.code, langs.join()).toBe(suggestedLocale(langs, offered)?.code as string);
    }
  });
});

describe("right-to-left text", () => {
  const shown = (s: string): string => s.replace(/\u2066/g, "⟨").replace(/\u2069/g, "⟩");

  test("Latin runs that the bidi algorithm would reorder are isolated; plain names, code and links are left alone", () => {
    expect(shown(isolateLatin("يتطلب Node.js 22+ أو Bun 1.2+."))).toBe("يتطلب ⟨Node.js 22+⟩ أو ⟨Bun 1.2+⟩.");
    expect(shown(isolateLatin("اضغط ⌘⌥J لفتح وحدة التحكم"))).toBe("اضغط ⟨⌘⌥J⟩ لفتح وحدة التحكم");
    expect(shown(isolateLatin("الحروف من U+FB50–U+FDFF"))).toBe("الحروف من ⟨U+FB50–U+FDFF⟩");
    // Numbers with a sign read "32 × 100", "81% – 70" and "+22" unless isolated; format tokens read "c%".
    expect(shown(isolateLatin("حجم 100×32 خلية"))).toBe("حجم ⟨100×32⟩ خلية");
    expect(shown(isolateLatin("حجم 10 × 32 خلية"))).toBe("حجم ⟨10 × 32⟩ خلية");
    expect(shown(isolateLatin("بين 70–81% من"))).toBe("بين ⟨70–81%⟩ من");
    expect(shown(isolateLatin("يتطلب 22+ إطارًا"))).toBe("يتطلب ⟨22+⟩ إطارًا");
    expect(shown(isolateLatin("يطبّق %c تنسيق CSS"))).toBe("يطبّق ⟨%c⟩ تنسيق CSS");
    expect(shown(isolateLatin("עם %s ו-%% כאן"))).toBe("עם ⟨%s⟩ ו-⟨%%⟩ כאן");
    expect(shown(isolateLatin("خلال 0.163 ms فقط"))).toBe("خلال ⟨0.163 ms⟩ فقط");
    expect(shown(isolateLatin("الطلبات على /coffee والمجلد app/ هنا"))).toBe("الطلبات على ⟨/coffee⟩ والمجلد ⟨app/⟩ هنا");
    // A UI string kept entirely in Latin is isolated whole; plain words are left alone.
    expect(shown(isolateString("%c spans"))).toBe("⟨%c spans⟩");
    expect(shown(isolateString("عناصر %c"))).toBe("عناصر ⟨%c⟩");
    expect(isolateString("3,200")).toBe("3,200");
    // Plain numbers, versions and list markers keep their order and stay unwrapped.
    expect(isolateLatin("حتى 300 إطار و 3,200 خلية")).toBe("حتى 300 إطار و 3,200 خلية");
    expect(isolateLatin("1. الإصدار 1.4.1 متاح")).toBe("1. الإصدار 1.4.1 متاح");
    expect(shown(isolateLatin("يعرض React و Vite"))).toBe("يعرض React و Vite");
    expect(shown(isolateLatin("شغّل `bun dev 1+` ثم [Learn Text.js](/learn?x=1 2) {count}"))).toBe("شغّل `bun dev 1+` ثم [⟨Learn Text.js⟩](/learn?x=1 2) {count}");
    expect(shown(isolateLatin("## التثبيت على Bun 1.2+ {#install-it}"))).toBe("## التثبيت على ⟨Bun 1.2+⟩ {#install-it}");
    // A line that starts with a name stays right-to-left (captions and titles take their direction from it).
    expect(shown(isolateLatin("Text.js يعرض"))).toBe("⟨Text.js⟩ يعرض");
    // Text without right-to-left letters, and text already isolated, is unchanged.
    expect(isolateLatin("Node.js 22+")).toBe("Node.js 22+");
    expect(isolateLatin(isolateLatin("يتطلب Node.js 22+"))).toBe(isolateLatin("يتطلب Node.js 22+"));
  });

  test("Arabic-script translations get ، ؛ ؟ outside code, links and numbers", () => {
    expect(normalizePunctuation("ar", "افتحه, ثم شغّل React, Vite; هل يعمل?")).toBe("افتحه، ثم شغّل React، Vite؛ هل يعمل؟");
    expect(normalizePunctuation("ar", "استدعِ `a, b` في [الرابط](/x?a=1, b) لـ 3,200 خلية")).toBe("استدعِ `a, b` في [الرابط](/x?a=1, b) لـ 3,200 خلية");
    expect(normalizePunctuation("he", "שלום, עולם?")).toBe("שלום, עולם?");
    // Persian and Urdu: ی and ک, never the Arabic ي and ك (Arabic itself keeps them).
    expect(normalizePunctuation("fa", "كامپوننت يك فايل")).toBe("کامپوننت یک فایل");
    expect(normalizePunctuation("ar", "يك")).toBe("يك");
    // Urdu sentences end with ۔, after a name or code too; numbers, versions and list markers keep their period.
    expect(normalizePunctuation("ur", "کونسول کھولیں. پھر Text.js چلائیں.")).toBe("کونسول کھولیں۔ پھر Text.js چلائیں۔");
    expect(normalizePunctuation("ur", "1. ورژن 1.4.1 اور 3.5 ms دیکھیں `a.b`.")).toBe("1. ورژن 1.4.1 اور 3.5 ms دیکھیں `a.b`۔");
    expect(validate("ar", "Open it, then go.", "افتحه, ثم اذهب.").errors).toEqual(["Latin , ; or ? in Arabic text (use ، ؛ ؟)"]);
  });

  test("search ignores tashkeel, tatweel, niqqud, hamza on alef and bidi isolates", () => {
    expect(searchFold("مُكَوِّن")).toBe(searchFold("مكون"));
    expect(searchFold("الـمسار")).toBe("المسار");
    expect(searchFold("אֶפְלִיקַצְיָה")).toBe("אפליקציה");
    expect(searchFold("إطار")).toBe("اطار");
    expect(fuzzyScore("كامپوننت", "کامپوننت‌ها")).toBeGreaterThan(900);
    expect(fuzzyScore("bun 1.2", "يتطلب \u2066Bun 1.2+\u2069")).toBeGreaterThan(900);
    expect(fuzzyScore("مكوّن", "المكونات")).toBeGreaterThan(900);
  });
});

describe("dates", () => {
  test("the build's date patterns reproduce Intl for every locale, style and month", () => {
    const dates = ["2026-01-01", "2026-02-28", "2025-03-25", "2024-04-09", "2026-05-31", "2026-06-15", "2026-07-04", "2026-08-10", "2026-09-30", "2026-10-31", "2026-11-03", "2026-12-25", "2027-10-27T23:42:00Z"];
    for (const l of LOCALES) {
      const tag = intlTag(l.code);
      const patterns = datePatterns(tag);
      for (const [style, options] of Object.entries(DATE_STYLES) as [DateStyle, Intl.DateTimeFormatOptions][]) {
        for (const iso of dates) {
          const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
          expect(formatWith(patterns, iso, style), `${l.code} ${style} ${iso}`).toBe(date.toLocaleDateString(tag, { ...options, timeZone: "UTC" }));
        }
      }
    }
  });

  test("a build ships its date patterns, so the page and the browser never call Intl for a date", () => {
    const config = readFileSync(join(import.meta.dir, "..", "vite.config.ts"), "utf8");
    expect(config).toContain("__TEXTJS_DATES__: JSON.stringify(datePatterns(intlTag(LOCALE)))");
    expect(formatDate("2026-10-31")).toBe("October 31, 2026");
    expect(formatDate("2026-10-27T15:42:00Z", "short")).toBe("Oct 27, 2026");
    expect(formatDate("2026-10-27", "shortDay")).toBe("Oct 27");
    expect(formatDate("2026-10-27", "month")).toBe("October 2026");
    expect(formatDate("2025-03-25", "shortMonth")).toBe("Mar 2025");
  });
});

describe("catalog", () => {
  test("interpolation, plurals and rich text", () => {
    expect(interpolate("{title} | Docs", { title: "Routing" })).toBe("Routing | Docs");
    expect(plural(1, { one: "{count} frame", other: "{count} frames" })).toBe("1 frame");
    expect(plural(3, { one: "{count} frame", other: "{count} frames" })).toBe("3 frames");
    const html = renderToStaticMarkup(createElement("p", null, rich("Read the <link>docs</link>.", { link: (c) => createElement("a", { href: "/docs" }, c) })));
    expect(html).toBe('<p>Read the <a href="/docs">docs</a>.</p>');
  });

  test("rich text nests, and an untranslated rich string is marked as English", () => {
    const tags = { safari: (c: unknown) => createElement("span", { className: "br-safari" }, c as string), link: (c: unknown) => createElement("a", { href: "/x" }, c as string) };
    expect(renderToStaticMarkup(createElement("p", null, rich("Open it<safari> (<link>turn on</link> first)</safari>.", tags)))).toBe('<p>Open it<span class="br-safari"> (<a href="/x">turn on</a> first)</span>.</p>');
    expect(renderToStaticMarkup(createElement("p", null, rich.en("Hi <link>there</link>", tags)))).toBe('<p><span lang="en" dir="ltr">Hi <a href="/x">there</a></span></p>');
  });

  test("extraction reads only literal calls, and the check reports the rest", () => {
    const code = 'x.t("no"); at("no"); t("yes"); msg("yes2"); plural(Math.max(a, b), { one: "{count} item", other: "{count} items" });';
    expect([...code.matchAll(CALL)].map((m) => JSON.parse(m[2] as string))).toEqual(["yes", "yes2"]);
    expect([...code.matchAll(PLURAL)]).toHaveLength(1);
    expect(unreadableCalls()).toEqual([]);
  });

  test("a locale build compiles strings in, and marks untranslated ones as English", () => {
    const plugin = i18nPlugin("ja") as { transform: (code: string, id: string) => { code: string } | null };
    const file = join(import.meta.dir, "..", "src", "site", "Example.tsx");
    const out = plugin.transform.call({}, 'import { t } from "../i18n/t";\nconst a = <p>{t("Docs")}</p>;\nconst b = <p>{t("Not in the catalog")}</p>;\nconst c = <i title={t("Not in the catalog")} />;', file)!.code;
    expect(out).toContain('<p>{"ドキュメント"}</p>');
    expect(out).toContain('<p>{<span lang="en" dir="ltr">{"Not in the catalog"}</span>}</p>');
    expect(out).toContain('title={"Not in the catalog"}');
    const unwrapped = plugin.transform.call({}, 'import { t } from "../i18n/t";\nconst d = `${t("Not in the catalog")}`;\nconst e = <option>{t("Not in the catalog")}</option>;', file)!.code;
    expect(unwrapped).not.toContain("<span");
    const en = i18nPlugin("en") as typeof plugin;
    expect(en.transform.call({}, 'import { t } from "../i18n/t";\nconst a = <p>{t("Docs")}</p>;', file)!.code).toContain('<p>{"Docs"}</p>');
  });

  test("numbers known at build time ship formatted; measured ones stay runtime calls", () => {
    const file = join(import.meta.dir, "..", "src", "pages", "Example.tsx");
    const code = 'import { formatNumber } from "../i18n/t";\nconst a = formatNumber(3200);\nconst b = formatNumber(0.9999, { style: "percent", maximumFractionDigits: 2 });\nconst c = formatNumber(frames);';
    const out = (code_: string): string => (i18nPlugin("de") as { transform: (c: string, id: string) => { code: string } | null }).transform.call({}, code_, file)!.code;
    expect(out(code)).toContain('const a = "3.200";');
    expect(out(code)).toContain('const b = "99,99\u00a0%";');
    expect(out(code)).toContain("const c = formatNumber(frames);");
    const en = (i18nPlugin("en") as { transform: (c: string, id: string) => { code: string } | null }).transform.call({}, code, file)!.code;
    expect(en).toContain('const a = "3,200";');
    expect(en).toContain('const b = "99.99%";');
  });

  test("a locale build's search index and error titles come from its translations", () => {
    const plugin = i18nPlugin("ja") as { load: (id: string) => string | null };
    const src = join(import.meta.dir, "..", "src");
    const module = (code: string): Record<string, unknown> => JSON.parse(code.replace(/^export const \w+ = /, "").replace(/;$/, "")) as Record<string, unknown>;
    const index = module(plugin.load.call({}, join(src, "docs", "search-index.ts"))!) as Record<string, Heading[]>;
    expect(Object.keys(index).sort()).toEqual(Object.keys(DOC_HEADINGS).sort());
    // Translated text, English ids: results link to the same anchors.
    expect(index.installation).toContainEqual({ depth: 2, text: "コンソールを開く", id: "open-the-console" });
    for (const slug of Object.keys(index)) expect(index[slug]!.map((h) => h.id)).toEqual(DOC_HEADINGS[slug]!.map((h) => h.id));
    // The console's English copy and English builds keep the checked-in index.
    expect(plugin.load.call({}, `${join(src, "docs", "search-index.ts")}?lang=en`)).toBeNull();
    expect((i18nPlugin("en") as typeof plugin).load.call({}, join(src, "docs", "search-index.ts"))).toBeNull();
    const titles = module(plugin.load.call({}, join(src, "pages", "error-titles.ts"))!) as Record<string, string>;
    const docs = module(plugin.load.call({}, join(src, "pages", "error-docs.ts"))!) as Record<string, { title: string }>;
    expect(Object.keys(titles).length).toBeGreaterThan(0);
    for (const [code, title] of Object.entries(titles)) expect(docs[code]?.title).toBe(title);
  });

  test("keys are literal strings found in the source", () => {
    const keys = extractMessages();
    expect(keys.has("Edit this page on GitHub")).toBe(true);
    expect(keys.has("{title} | Text.js Docs")).toBe(true);
  });

  test("validation: lost placeholders, tags, links and invented code are errors", () => {
    expect(validate("ja", "Hi {name}", "こんにちは").errors.length).toBe(1);
    expect(validate("ja", "<link>Docs</link>", "ドキュメント").errors.length).toBe(1);
    expect(validate("ja", "See [routing](/docs/routing).", "[ルーティング](/docs/x)を参照。").errors.length).toBe(1);
    expect(validate("ja", "Call `render()`.", "`render()` と `exit()` を呼びます。").errors.length).toBe(1);
    expect(validate("ja", "Call `render()` twice.", "呼び出します。").errors).toEqual([]);
    expect(validatePlural("ja", { other: "{count}" })).toEqual([]);
    expect(validatePlural("ja", { one: "x", other: "y" }).length).toBe(1);
    // Polish and Russian need few and many, or 3 and 5 would read as the fraction form.
    expect(validatePlural("pl", { one: "{count} pytanie", other: "{count} pytania" })).toEqual(["plural forms need `many` (pl)", "plural forms need `few` (pl)"]);
    expect(validatePlural("ru", { one: "{count} вопрос", few: "{count} вопроса", many: "{count} вопросов", other: "{count} вопроса" })).toEqual([]);
  });

  test("Firefox holds the page for Geist, Geist Mono and the page's Latin Extended or Cyrillic subset", () => {
    const html = readFileSync(join(import.meta.dir, "..", "index.html"), "utf8");
    const script = /<script>\s*\(function \(\) \{[\s\S]*?\}\)\(\);\s*<\/script>/.exec(html)?.[0].replace(/^<script>|<\/script>$/g, "") ?? "";
    expect(script).toContain('root.dataset.browser = "firefox"');
    const loads = (lang: string): string[][] => {
      const calls: string[][] = [];
      const root = { lang, dataset: {} as Record<string, string>, style: { visibility: "", removeProperty() {} } };
      const env = {
        document: { documentElement: root, fonts: { load: (font: string, text?: string) => (calls.push([font, text ?? ""]), Promise.resolve([])) } },
        navigator: { platform: "MacIntel", userAgent: "Firefox" },
        window: { CSS: { supports: (p: string) => p === "-moz-appearance" } },
        CSS: { supports: (p: string) => p === "-moz-appearance" },
        Promise,
        setTimeout: () => 0,
        requestAnimationFrame: () => 0,
      };
      new Function(...Object.keys(env), script)(...Object.values(env));
      return calls;
    };
    expect(loads("en")).toEqual([["16px Geist", "a"], ['12px "Geist Mono"', " \u2588"], ['16px "Geist Fallback"', ""], ['12px "Geist Mono Fallback"', ""]]);
    expect(loads("ja").slice(0, 2)).toEqual([["16px Geist", "a"], ['12px "Geist Mono"', " \u2588"]]);
    for (const [lang, ch] of [["pl", "ą"], ["tr", "ğ"], ["vi", "ạ"], ["ru", "ж"]]) expect(loads(lang as string).slice(0, 2)).toEqual([["16px Geist", `a${ch}`], ['12px "Geist Mono"', ` \u2588${ch}`]]);
  });

  test("Polish, Turkish, Vietnamese and Russian pages preload their Geist subsets; others don't", () => {
    const html = readFileSync(join(import.meta.dir, "..", "index.html"), "utf8");
    expect(withGeistSubsets(html, "en")).toBe(html);
    expect(withGeistSubsets(html, "ja")).toBe(html);
    const pl = withGeistSubsets(html, "pl");
    expect(pl).toContain('<link rel="preload" href="/fonts/geist-latin-ext.woff2" as="font" type="font/woff2" crossorigin />');
    expect(pl).toContain('src: url(/fonts/geist-mono-latin-ext.woff2) format("woff2"); unicode-range: U+0100-0130');
    expect(pl).not.toContain("cyrillic");
    expect(withGeistSubsets(html, "ru")).toContain("/fonts/geist-cyrillic.woff2");
  });

  test("committed translations pass validation", () => {
    for (const l of LOCALES) if (l.status === "draft" || l.status === "live") expect(checkLocale(l.code).errors).toEqual([]);
  });
});

describe("documents", () => {
  const english = "---\ntitle: X\n---\n\n# Title\n\nIntro with `code`.\n\n## Open the console\n\n```ts\nconst a = 1;\n```\n\n> **Warning:** careful.\n\n## [1.0.0] - 2026-01-01\n";

  test("fences, frontmatter, titles and release headers are verbatim; prose and headings are translated", () => {
    expect(segment(english).map((b) => b.kind)).toEqual(["verbatim", "verbatim", "prose", "heading", "verbatim", "prose", "verbatim"]);
  });

  test("assembly keeps English anchors and code, and marks what isn't translated", () => {
    const [, , intro, heading] = segment(english);
    const translations = parseTranslation(formatTranslation([[intro!.id, "`code` のある紹介。"], [heading!.id, "コンソールを開く"]]));
    const out = assemble(english, translations);
    expect(out.translated).toBe(2);
    expect(out.total).toBe(3);
    expect(out.markdown).toContain("## コンソールを開く {#open-the-console}");
    expect(out.markdown).toContain("```ts\nconst a = 1;\n```");
    expect(out.markdown).toContain("<!-- i18n:en -->\n\n<!-- i18n:warning -->\n\n> **Warning:** careful.");
    expect(out.markdown.startsWith("---\ntitle: X\n---")).toBe(true);
  });

  test("the site renders the markup, and the console and TOC drop it", () => {
    const md = "## コンソールを開く {#open-the-console}\n\n<!-- i18n:en -->\n\nStill English.\n\n<!-- i18n:warning -->\n\n> **注意:** 気をつけて。\n";
    const html = renderToStaticMarkup(createElement(MarkdownDoc, { source: md }));
    expect(html).toContain('<h2 id="open-the-console">');
    expect(html).not.toContain("{#");
    expect(html).toContain('<p lang="en" dir="ltr">Still English.</p>');
    expect(html).toContain('class="callout warning"');
    expect(html).not.toContain("i18n:");
    expect(headingsOf(md)).toEqual([{ depth: 2, text: "コンソールを開く", id: "open-the-console" }]);
    expect(toConsoleMarkdown(md)).not.toMatch(/\{#|i18n:/);
  });
});

describe("captions", () => {
  const vtt = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nIn this chapter, you'll split Acme\nDeploys into routes\n\n2\n00:00:03.100 --> 00:00:05.000\nthat share one layout.\n\n3\n00:00:05.100 --> 00:00:07.000\nPress Enter.\n";

  test("cues group into sentences, keyed like document blocks", () => {
    const groups = captionGroups(parseVtt(vtt));
    expect(groups.map((g) => g.cues.length)).toEqual([2, 1]);
    expect(groups[0]!.text).toBe("In this chapter, you'll split Acme Deploys into routes that share one layout.");
  });

  test("a translated sentence keeps the English timings and spreads over its cues", () => {
    const [first] = captionGroups(parseVtt(vtt));
    const out = assembleCaptions(vtt, { [first!.id]: "この章では、Acme Deploysを1つのレイアウトを共有するルートに分割します。" }, "ja");
    expect(out.translated).toBe(1);
    expect(out.total).toBe(2);
    const cues = parseVtt(out.vtt);
    expect(cues.map((c) => c.start)).toEqual(["00:00:01.000", "00:00:03.100", "00:00:05.100"]);
    expect(cues.slice(0, 2).map((c) => c.text.replace(/\s+/g, "")).join("")).toBe("この章では、AcmeDeploysを1つのレイアウトを共有するルートに分割します。");
    // Lines and cues break between phrases: never before 、。」ー or small kana, never inside a Latin or katakana word.
    for (const c of cues) for (const line of c.text.split("\n")) expect(line).not.toMatch(/^[、。」）ーゃゅょっャュョッ]/);
    expect(segments("デプロイカードのスタイルを設定し、console.logを呼びます。", "ja")).toEqual(["デプロイカードの", "スタイルを", "設定し、", "console.logを", "呼びます。"]);
    expect(cues[2]!.text).toBe("Press Enter.");
  });
});
