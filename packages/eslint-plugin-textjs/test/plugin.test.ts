import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import tsParser from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import plugin, { configs, rules } from "../src/index.ts";

/** Absolute on every platform (`C:\\repo` on Windows). */
const REPO = resolve("/repo");
const DOCS = join(import.meta.dir, "../../../apps/web/src/docs/content/eslint.md");

/** Same slug algorithm as the docs site (`apps/web/src/docs/registry.ts`). */
const slug = (text: string): string =>
  text
    .replace(/`([^`]*)`/g, "$1")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

describe("plugin", () => {
  test("every rule is documented, linked and tested", () => {
    const md = existsSync(DOCS) ? readFileSync(DOCS, "utf8") : "";
    const anchors = new Set([...md.matchAll(/^#{2,3}\s+(.*)$/gm)].map((m) => slug(m[1] as string)));
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule.meta.docs?.url).toBe(`https://textjs.org/docs/eslint#${name}`);
      expect(rule.meta.docs?.description.length).toBeGreaterThan(20);
      if (md) expect(anchors).toContain(name);
      const tested = existsSync(join(import.meta.dir, `${name}.test.ts`)) || readFileSync(join(import.meta.dir, "route-rules.test.ts"), "utf8").includes(`"${name}"`);
      expect(tested).toBe(true);
    }
  });

  test("configs reference real rules; strict is a superset of recommended", () => {
    for (const config of [configs.recommended, configs.strict]) {
      expect(config.plugins.textjs).toBe(plugin);
      for (const key of Object.keys(config.rules)) expect(rules).toHaveProperty(key.replace(/^textjs\//, ""));
    }
    for (const key of Object.keys(configs.recommended.rules)) expect(configs.strict.rules).toHaveProperty(key);
    expect(configs.recommended.rules).not.toHaveProperty("textjs/prefer-use-keymap");
    expect(configs.strict.rules["textjs/prefer-use-keymap"]).toBe("warn");
    for (const [name, rule] of Object.entries(rules)) {
      expect(Boolean(rule.meta.docs?.recommended)).toBe(`textjs/${name}` in configs.recommended.rules);
    }
  });

  test("runs end to end through the ESLint API with a flat config", async () => {
    const eslint = new ESLint({
      cwd: REPO,
      overrideConfigFile: true,
      overrideConfig: [{ files: ["**/*.tsx", "**/*.ts"], languageOptions: { parser: tsParser } }, configs.recommended as never],
    });
    const page = `import { Box, Text } from "@textjs/app";
export const metadata = { title: { default: "Home", template: "%s" } };
export default function Page() {
  return <Text>⠋ loading ▶\uFE0F <Box /></Text>;
}
`;
    const [result] = await eslint.lintText(page, { filePath: join(REPO, "app/page.tsx") });
    expect(result?.messages.map((m) => m.ruleId).sort()).toEqual([
      "textjs/no-box-in-text",
      "textjs/no-unsupported-glyphs",
      "textjs/no-unsupported-glyphs",
      "textjs/valid-metadata",
    ]);
    const [fixed] = await new ESLint({
      cwd: REPO,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: [{ files: ["**/*.tsx"], languageOptions: { parser: tsParser } }, configs.recommended as never],
    }).lintText(page, { filePath: join(REPO, "app/page.tsx") });
    expect(fixed?.output).toContain("⠋ loading ▶ <Box />");

    const [route] = await eslint.lintText(`export function get() { return new Response(); }\n`, { filePath: join(REPO, "app/api/x/route.ts") });
    expect(route?.messages.map((m) => m.ruleId)).toEqual(["textjs/route-handler-exports"]);
  });
});

describe("first-run code", () => {
  test("create-text-app templates, examples and the runnable apps are clean under the recommended config", async () => {
    // A new project that adds the plugin as its README shows must start with zero findings.
    const repo = join(import.meta.dir, "../../..");
    const eslint = new ESLint({
      cwd: repo,
      overrideConfigFile: true,
      overrideConfig: [{ ignores: ["**/node_modules/**", "**/dist/**"] }, { files: ["**/*.{ts,tsx}"], languageOptions: { parser: tsParser } }, configs.recommended as never],
    });
    const results = await eslint.lintFiles(["packages/create-text-app/templates", "examples", "apps/opencode-console", "apps/terminal-shop"]);
    const findings = results.flatMap((r) => r.messages.map((m) => `${r.filePath.slice(repo.length)}:${m.line} ${m.ruleId}`));
    expect(findings).toEqual([]);
  }, 60_000);
});
