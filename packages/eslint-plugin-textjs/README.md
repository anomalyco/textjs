# ▼ eslint-plugin-textjs

ESLint rules for [Text.js](https://textjs.org) apps: console-safe JSX, cell-width glyphs, frame-paced timers, keymaps and App Router conventions.

```bash
bun add -d eslint eslint-plugin-textjs typescript-eslint
```

```js
// eslint.config.js
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import textjs from "eslint-plugin-textjs";

export default defineConfig(tseslint.configs.recommended, textjs.configs.recommended);
```

`configs.recommended` and `configs.strict` are flat configs (ESLint 9 and 10).

| Rule | Catches |
| :-- | :-- |
| `no-dom-elements` | `<div>`, `<span>`, … in console components (TX003) |
| `no-box-in-text` | `<Box>` and box-rooted components inside `<Text>` (TX004) |
| `no-unsupported-glyphs` | Braille, U+2B00–2BFF symbols and other glyphs Menlo lacks; one-cell symbols + U+FE0F |
| `no-console-in-components` | `console.*` calls that interleave with frames |
| `prefer-use-interval` | Raw `setInterval` in components |
| `no-sub-frame-timers` | Intervals faster than Text.js's 66ms frame pacing |
| `prefer-use-keymap` | Hand-rolled `useInput` key matching (strict) |
| `valid-route-module` | Missing default exports (TX015) and invalid `dynamic` (TX031) in route files |
| `valid-metadata` | Ignored or malformed `metadata` / `generateMetadata` |
| `route-handler-exports` | Non-method exports and miscased handlers in `route.ts` |

Docs: [textjs.org/docs/eslint](https://textjs.org/docs/eslint)

## Development

```bash
bun test                                                   # RuleTester suites
bun scripts/lint-repo.ts                                   # strict config over apps/, examples/, templates (read-only)
```
