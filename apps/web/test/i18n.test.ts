import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { assemble, formatTranslation, parseTranslation, segment } from "../scripts/i18n/document";
import { checkLocale } from "../scripts/i18n/check";
import { extractMessages } from "../scripts/i18n/sources";
import { validate, validatePlural } from "../scripts/i18n/validate";
import { headingsOf, toConsoleMarkdown } from "../src/docs/registry";
import { LOCALES, localePath, splitLocale } from "../src/i18n/locales";
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
    expect(splitLocale("/pt-br/blog").locale.code).toBe("pt-BR");
    expect(localePath(ja, "/")).toBe("/ja");
    expect(localePath(ja, "/docs")).toBe("/ja/docs");
    expect(localePath(LOCALES[0]!, "/docs")).toBe("/docs");
    expect(matchRoute("/ja/docs/routing")).toEqual({ name: "docs", slug: "routing" });
  });

  test("no route's first segment collides with a locale path", () => {
    for (const l of LOCALES) if (l.path) expect(matchRoute(`/${l.path}`).name).toBe("home");
    expect(new Set(LOCALES.map((l) => l.path)).size).toBe(LOCALES.length);
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
