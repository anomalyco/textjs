`@textjs/next/testing` (or `@textjs/react/testing`) renders your app offscreen, presses keys and hands you the frame as text. No browser, no DevTools, no `console.log`.

```tsx@counter.test.tsx
import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@textjs/next/testing";
import { Counter } from "./counter";

afterEach(cleanup);

test("counts up", async () => {
  const app = await render(<Counter />, { cols: 40, rows: 6 });
  await app.press("up up");
  expect(app.lastFrame()).toContain("count = 2");
});
```

It works with any runner that supports `async` tests: Bun, Vitest, Jest.

## Rendering

| Method | Description |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Mount offscreen (default 80×24) |
| `lastFrame()` | The frame as plain text |
| `lines()` | The frame as an array of rows |
| `frames` | Every distinct frame so far |
| `toAnsi()` | Truecolor ANSI, for snapshots |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` of the first match |
| `rerender(el)` / `unmount()` | Update or tear down |

`renderToString(el, options)` renders once and returns the text.

## Input

```tsx
await app.press("down");
await app.press("ctrl+k");      // modifiers
await app.press("g g");         // a sequence
await app.press("G");           // Shift+G
await app.type("hello\n");      // one key per character, \n is Enter
await app.paste("multi\nline");
await app.wheel(3);
await app.resize(120, 36);
```

Every call runs inside `act()` and flushes the resulting frames, so the next assertion sees the update.

## Time

```tsx
await app.wait(300);                    // real time passes, then frames flush
await app.waitForText("Deployed");      // poll until the frame contains it
await app.waitFor(() => expect(saved).toBe(true), { timeout: 2000 });
```

Animations, spinners and toasts use real timers, so `wait` and `waitFor` are the reliable way to observe them.

## Snapshots

```tsx
expect(app.lastFrame()).toMatchSnapshot();
expect(app.toAnsi()).toMatchSnapshot(); // colors too
```

Frames are trimmed on the right and at the bottom, so snapshots don't churn on whitespace.
