import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { join } from "node:path";
import { createElement } from "react";
import { assembleCaptions, captionGroups, parseVtt, segments } from "../scripts/i18n/captions";
import { assemble, formatTranslation, parseTranslation, segment } from "../scripts/i18n/document";
import { checkLocale, unreadableCalls } from "../scripts/i18n/check";
import { CALL, extractMessages, PLURAL } from "../scripts/i18n/sources";
import { i18nPlugin } from "../scripts/i18n/vite-plugin";
import { validate, validatePlural } from "../scripts/i18n/validate";
import { headingsOf, toConsoleMarkdown } from "../src/docs/registry";
import { LOCALES, localePath, parseLocaleSet, splitLocale } from "../src/i18n/locales";
import { rich } from "../src/i18n/rich";
import { interpolate, plural } from "../src/i18n/t";
import { localizeHref, matchRoute } from "../src/router";
import { suggestedLocale } from "../src/site/LocaleMenu";
import { MarkdownDoc } from "../src/site/Markdown";

const ja = LOCALES.find((l) => l.code === "ja")!;

describe("locales", () => {
  test("paths split into locale and route path, and English stays at the root", () => {
    expect(splitLocale("/ja/docs/routing")).toEqual({ locale: ja, path: "/docs/routing" });
    expect(splitLocale("/ja")).toEqual({ locale: ja, path: "/" });
    expect(splitLocale("/docs").locale.code).toBe("en");
    // Only built locales are prefixes; others are ordinary (unknown) paths.
    expect(splitLocale("/pt-br/blog").locale.code).toBe("en");
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
