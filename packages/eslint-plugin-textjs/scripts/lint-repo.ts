/**
 * Run the strict config over the repo's apps, examples and create-text-app
 * templates and print every finding. Read-only: never applies fixes.
 *
 *   bun packages/eslint-plugin-textjs/scripts/lint-repo.ts [--recommended] [globs…]
 */

import { join } from "node:path";
import tsParser from "@typescript-eslint/parser";
import { ESLint } from "eslint";
import textjs from "../src/index.ts";

const root = join(import.meta.dir, "../../..");
const args = process.argv.slice(2);
const preset = args.includes("--recommended") ? textjs.configs.recommended : textjs.configs.strict;
const patterns = args.filter((a) => !a.startsWith("--"));

const eslint = new ESLint({
  cwd: root,
  overrideConfigFile: true,
  overrideConfig: [
    { ignores: ["**/node_modules/**", "**/dist/**", "**/.cache/**", "apps/web/cls-out/**"] },
    { files: ["**/*.{ts,tsx,mts}"], languageOptions: { parser: tsParser } },
    preset as never,
  ],
});

const results = await eslint.lintFiles(patterns.length > 0 ? patterns : ["apps", "examples", "packages/create-text-app/templates"]);
const formatter = await eslint.loadFormatter("stylish");
const text = await formatter.format(results);
const count = results.reduce((n, r) => n + r.errorCount + r.warningCount, 0);
console.log(text || "No findings.");
console.log(`${results.length} files, ${count} findings (${preset.name})`);
