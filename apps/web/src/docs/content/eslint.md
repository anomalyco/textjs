`eslint-plugin-textjs` catches Text.js mistakes in the editor: DOM tags in console components, boxes inside text, glyphs Menlo doesn't have, stray `console.log` calls and App Router exports that are silently ignored.

## Setup

```bash
bun add -d eslint eslint-plugin-textjs typescript-eslint
```

```js@eslint.config.js
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import textjs from "eslint-plugin-textjs";

export default defineConfig(tseslint.configs.recommended, textjs.configs.recommended);
```

ESLint 9 and 10, flat config only. The rules are syntactic: no type information, no `parserOptions.project`, so linting stays fast. Any parser that understands TypeScript and JSX works.

## Configs

| Config | What it enables |
| :-- | :-- |
| `textjs.configs.recommended` | Every correctness rule as an error; console, timer and frame-pacing rules as warnings |
| `textjs.configs.strict` | Everything as an error, plus `prefer-use-keymap` as a warning |

Pick rules individually instead:

```js@eslint.config.js
import textjs from "eslint-plugin-textjs";

export default [
  {
    plugins: { textjs },
    rules: {
      "textjs/no-box-in-text": "error",
      "textjs/no-console-in-components": ["warn", { allow: ["error"], logger: "log" }],
    },
  },
];
```

## Console files

Most rules only apply to files that render into the console: files that import a component or hook (`Box`, `Text`, `useInput`, …) from `@textjs/next` or `@textjs/react`. Files that import `react-dom` or `@textjs/react/dom` are page code and are left alone, so a website can mix DOM pages and console apps in one project. Importing a utility like `tokenize` or `parseMarkdown` doesn't make a file a console file.

```js@eslint.config.js
import textjs from "eslint-plugin-textjs";

export default [
  textjs.configs.recommended,
  {
    settings: {
      textjs: {
        packages: ["@acme/console-ui"], // also re-exports Text.js components
        consoleFiles: "imports", // or "all"
      },
    },
  },
];
```

The App Router rules go by file name (`page.tsx`, `layout.tsx`, `route.ts`, …) inside any `app/` directory, including `src/app/`. If yours has another name, pass `{ appDir: "routes" }` to `valid-route-module`, `valid-metadata` and `route-handler-exports`.

## Rules

| Rule | Recommended | Fix |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | error | suggestion |
| [`no-box-in-text`](#no-box-in-text) | error | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | error | autofix, suggestion |
| [`no-console-in-components`](#no-console-in-components) | warn | suggestion |
| [`prefer-use-interval`](#prefer-use-interval) | warn | suggestion |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | warn | |
| [`prefer-use-keymap`](#prefer-use-keymap) | strict only | |
| [`valid-route-module`](#valid-route-module) | error | |
| [`valid-metadata`](#valid-metadata) | error | |
| [`route-handler-exports`](#route-handler-exports) | error | suggestion |

### `no-dom-elements`

`<div>`, `<span>`, custom elements and other DOM tags don't exist in the console. The reconciler only knows its own host nodes and throws `TX003` on anything else.

```tsx
<div className="flex-col">       // ✗
<Box className="flex-col">       // ✓
<strong>Deployed</strong>        // ✗
<Text bold>Deployed</Text>       // ✓
```

The suggestion swaps the tag for the closest component (`div` → `Box`, `span`/`p` → `Text`, `strong` → `Text bold`, `a` → `Link`, `input` → `Input`, `hr` → `Divider`, …) and adds the import.

### `no-box-in-text`

`<Text>` is a run of styled spans; it can't contain a box. Nesting `<Box>` or any box-rooted component (`<ScrollBox>`, `<Input>`, `<Code>`, `<ProgressBar>`, `<Divider>`, …) throws `TX004` at render time. This rule finds it in the editor instead, including inside `&&`, ternaries, fragments and `.map()`.

```tsx
<Text>Status <Box /></Text>                     // ✗
<Box className="flex-row gap-1"><Text>Status</Text><Box /></Box>  // ✓
<Text>Press <Kbd>⌘K</Kbd> <Spinner /></Text>     // ✓ inline components
```

### `no-unsupported-glyphs`

Text.js lays out every character in a fixed cell grid. Glyphs that Menlo, the DevTools console font on macOS, doesn't have render in a fallback font that is wider than a cell, so every cell after them drifts.

- **Braille** (U+2800–U+28FF, the classic terminal spinner frames): use block or quadrant characters (`▘▝▗▖`), `<Spinner variant="dots">` or `marker="quadrant"` on charts. Set `{ allowBraille: true }` for apps that only run with `text run` in a terminal.
- **Miscellaneous Symbols and Arrows** (U+2B00–U+2BFF, such as the small square U+2B1D): suggestions offer the Menlo equivalent (`·`, `●`, `←`).
- **Emoji presentation on one-cell symbols** (`▶` or `↩` followed by U+FE0F): the variation selector turns them into two-cell emoji while the grid reserves one. The autofix removes it.

Wide emoji (`🚀`, `✅`) are fine: Text.js measures them as two cells.

### `no-console-in-components`

Every frame is one `console.log`. Your own logs land between frames, get scrolled away by the next one and are hidden under the stick-to-bottom view. `console.clear()` wipes the app itself.

```js
"textjs/no-console-in-components": ["warn", { allow: ["error"], logger: "log" }]
```

Show messages in the UI with `useToast()` or a log `<ScrollBox>`, or inspect state in the `[▼]` DevTools (`` Ctrl+` ``). With `logger`, the suggestion rewrites `console.warn(…)` to `log.warn(…)`. Test files and `@textjs/next/testing` renders are skipped.

### `prefer-use-interval`

A raw `setInterval` in a component needs an effect, a cleanup and a ref to avoid stale state. `useInterval` does all three, and `null` stops it.

```tsx
useEffect(() => {
  if (paused) return;
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, [paused]);

useInterval(tick, paused ? null : 1000); // the suggestion
```

For animation, `useAnimationFrame` follows the renderer's frame pacing and stops while output is paused. See [Utility Hooks](/docs/utility-hooks).

### `no-sub-frame-timers`

DevTools paints at most one frame every ~66ms (about 15fps). A 16ms interval renders four times per painted frame; the extra frames are coalesced and only burn CPU. Reports `setInterval`/`useInterval` delays under `minInterval` (default `66`) and `useAnimationFrame` with `fps` above 15.

### `prefer-use-keymap`

Comparing `e.key` by hand works, but the shortcuts are invisible. `useKeymap` puts labeled bindings in `<KeyHelp>`, `<KeyHints auto>` and the command palette, handles sequences like `g g` and stops propagation for matched keys. Reports `useInput` handlers that compare two or more key literals (`minKeys`) and skips handlers that read `e.input` for typing.

```tsx
useKeymap({
  "up, k": { label: "Increment", run: inc, hint: true },
  "down, j": { label: "Decrement", run: dec, hint: true },
});
```

See [Keyboard Shortcuts](/docs/keyboard).

### `valid-route-module`

- `page`, `layout`, `loading`, `error` and `not-found` files must default-export a component (`TX015`).
- `export const dynamic` must be `"auto"`, `"force-static"` or `"force-dynamic"`, written as a plain string literal: `text build` reads it from the source without running the module. It's only read from pages and layouts.

### `valid-metadata`

Metadata is merged from layouts, then the page (or `not-found`). The rule reports what the router would silently ignore:

- `metadata` or `generateMetadata` in `loading` or `error` files
- both exports in one file
- `async generateMetadata`: it's called synchronously, so a Promise never sets the title
- `title` that isn't a string or `{ default, template?, absolute? }`, or a misspelled key
- `title.template` without `%s`, or in a page, where it has no effect
- a non-string `description`

### `route-handler-exports`

`route.ts` files only answer the HTTP methods they export: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` and `OPTIONS`. Lowercase `get` or `Post` is never called (requests get `405`); the suggestion renames it. Default exports, non-function handlers and other exports are reported; move shared code to `lib/`, or list extra names with `{ allow: [...] }`.

```ts@app/api/health/route.ts
export function get() { … }   // ✗ never called
export function GET() { … }   // ✓
```
