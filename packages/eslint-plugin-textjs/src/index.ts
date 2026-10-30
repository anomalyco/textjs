/**
 * ▼ eslint-plugin-textjs: lint rules for Text.js console apps.
 *
 * ```js
 * // eslint.config.js
 * import textjs from "eslint-plugin-textjs";
 * export default [textjs.configs.recommended];
 * ```
 */

import type { TSESLint } from "@typescript-eslint/utils";
import noBoxInText from "./rules/no-box-in-text.ts";
import noConsoleInComponents from "./rules/no-console-in-components.ts";
import noDomElements from "./rules/no-dom-elements.ts";
import noSubFrameTimers from "./rules/no-sub-frame-timers.ts";
import noUnsupportedGlyphs from "./rules/no-unsupported-glyphs.ts";
import preferUseInterval from "./rules/prefer-use-interval.ts";
import preferUseKeymap from "./rules/prefer-use-keymap.ts";
import routeHandlerExports from "./rules/route-handler-exports.ts";
import validMetadata from "./rules/valid-metadata.ts";
import validRouteModule from "./rules/valid-route-module.ts";

export const rules = {
  "no-dom-elements": noDomElements,
  "no-box-in-text": noBoxInText,
  "no-unsupported-glyphs": noUnsupportedGlyphs,
  "no-console-in-components": noConsoleInComponents,
  "prefer-use-interval": preferUseInterval,
  "no-sub-frame-timers": noSubFrameTimers,
  "prefer-use-keymap": preferUseKeymap,
  "valid-route-module": validRouteModule,
  "valid-metadata": validMetadata,
  "route-handler-exports": routeHandlerExports,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

export type RuleName = keyof typeof rules;

type Severity = "off" | "warn" | "error";

const RECOMMENDED: Readonly<Record<RuleName, Severity>> = {
  "no-dom-elements": "error",
  "no-box-in-text": "error",
  "no-unsupported-glyphs": "error",
  "no-console-in-components": "warn",
  "prefer-use-interval": "warn",
  "no-sub-frame-timers": "warn",
  "prefer-use-keymap": "off",
  "valid-route-module": "error",
  "valid-metadata": "error",
  "route-handler-exports": "error",
};

const STRICT: Readonly<Record<RuleName, Severity>> = {
  ...RECOMMENDED,
  "no-console-in-components": "error",
  "prefer-use-interval": "error",
  "no-sub-frame-timers": "error",
  "prefer-use-keymap": "warn",
};

/** Mirrors package.json (bumped by `scripts/release-version.ts`). */
export const VERSION = "0.4.0";

const pkg = { name: "eslint-plugin-textjs", version: VERSION };

/** Files the configs apply to. */
export const FILES = ["**/*.{js,jsx,mjs,ts,tsx,mts}"];

const prefixed = (levels: Readonly<Record<RuleName, Severity>>): Record<string, Severity> =>
  Object.fromEntries(Object.entries(levels).flatMap(([name, level]) => (level === "off" ? [] : [[`textjs/${name}`, level]])));

interface FlatConfig {
  name: string;
  files: string[];
  plugins: Record<string, unknown>;
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: boolean } } };
  rules: Record<string, Severity>;
}

interface Plugin {
  meta: typeof pkg;
  rules: typeof rules;
  configs: { recommended: FlatConfig; strict: FlatConfig };
}

const plugin: Plugin = {
  meta: pkg,
  rules,
  configs: {} as Plugin["configs"],
};

function config(name: string, levels: Readonly<Record<RuleName, Severity>>): FlatConfig {
  return {
    name: `textjs/${name}`,
    files: FILES,
    plugins: { textjs: plugin },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: prefixed(levels),
  };
}

plugin.configs.recommended = config("recommended", RECOMMENDED);
plugin.configs.strict = config("strict", STRICT);

export const configs = plugin.configs;
export const meta = pkg;
export default plugin;
