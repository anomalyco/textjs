import { afterAll, describe, it } from "bun:test";
import { RuleTester } from "@typescript-eslint/rule-tester";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
// Read `it.only` lazily: Bun throws on access when CI is set, and no rule test uses `only`.
RuleTester.itOnly = ((...args: Parameters<typeof it>) => it.only(...args)) as typeof it;

export function tester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
}

/** A console component file: imports from Text.js, so rules treat it as rendering into the console. */
export const CONSOLE = `import { Box, Text, Link, useInput, useKeymap, useInterval, useAnimationFrame } from "@textjs/next";\n`;

export const PAGE = "/repo/app/page.tsx";
export const FILE = "/repo/components/Panel.tsx";
