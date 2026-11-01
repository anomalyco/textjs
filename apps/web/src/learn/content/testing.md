`@textjs/react/testing` renders your app offscreen, presses keys and returns the frame as plain text. Tests run without a browser or DevTools.

## Your first test

```diff-tsx@app/deployments/page.test.tsx
+import { afterEach, expect, test } from "bun:test";
+import { cleanup, render } from "@textjs/react/testing";
+import DeploymentsPage from "./page";
+
+afterEach(cleanup);
+
+test("lists every deployment", async () => {
+  const app = await render(<DeploymentsPage />, { cols: 80, rows: 12 });
+  await app.waitForText("feat: stream cells downward");
+  expect(app.lines()).toHaveLength(12);
+});
```

`render` defaults to an 80×24 grid. `lastFrame()` returns the whole frame as text, `lines()` returns it row by row, and `cell(x, y)` gives you a single cell's character and colors.

## Pressing keys

`press` takes the same key strings as `useKeymap`. Each call runs inside `act()` and flushes the resulting frames, so the next assertion sees the update.

```diff-tsx@app/deployments/page.test.tsx
+test("↓ moves the highlight", async () => {
+  const app = await render(<DeploymentsPage />);
+  await app.waitForText("feat: stream cells downward");
+  await app.press("down");
+  expect(app.lastFrame()).toContain("› perf: merge spans across rows");
+});
+
+test("s sorts by build time", async () => {
+  const app = await render(<DeploymentsPage />);
+  await app.waitForText("Build");
+  await app.press("4"); // sort by the 4th column
+  expect(app.locate("12s")?.y).toBeLessThan(app.locate("52s")?.y ?? 0);
+});
```

Pages that `fetch` from route handlers can stub `globalThis.fetch` in a `beforeEach`, or take their data as props.

## Run it

```bash
bun test
```

It works with any runner that supports `async` tests: Bun, Vitest or Jest. In the console, press `Enter` to run the suite and `f` to break a test and see what a failure looks like.

## Snapshots

`toAnsi()` returns the frame as truecolor ANSI, which makes snapshots that catch color regressions too:

```tsx
expect(app.toAnsi()).toMatchSnapshot();
```
