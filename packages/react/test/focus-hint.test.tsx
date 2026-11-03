import { describe, expect, test } from "bun:test";
import { InputEngine, parseColor } from "@textjs/core";
import { Box, FocusHint, focusHintLabel, Text, usePageFocus, resolveTheme } from "../src/index";
import { createTestRoot } from "./helpers";

/** Just enough of a DOM for `InputEngine.attach()` to create its sink. */
function fakeDocument(hasFocus: boolean): Document {
  const node = () => ({ style: {}, value: "", setAttribute() {}, addEventListener() {}, removeEventListener() {}, focus() {}, remove() {} });
  return {
    body: { appendChild() {} },
    defaultView: null,
    createElement: node,
    addEventListener() {},
    removeEventListener() {},
    hasFocus: () => hasFocus,
  } as unknown as Document;
}

function App() {
  return (
    <Box flexDirection="column" height="100%" justifyContent="space-between">
      <Text>header</Text>
      <Text>keys</Text>
    </Box>
  );
}

describe("usePageFocus", () => {
  test("follows the input engine's page focus and re-renders only when it changes", async () => {
    const t = await createTestRoot({ width: 20, height: 2 });
    let renders = 0;
    function Status() {
      renders++;
      return <Text>{usePageFocus() ? "focused" : "blurred"}</Text>;
    }
    await t.render(<Status />);
    expect(t.frame()).toBe("focused");
    await t.act(() => t.engine.setFocused(false));
    expect(t.frame()).toBe("blurred");
    const before = renders;
    await t.act(() => t.root.renderer.resize(30, 3));
    expect(renders).toBe(before);
    await t.act(() => t.engine.setFocused(true));
    expect(t.frame()).toBe("focused");
    await t.unmount();
  });
});

describe("FocusHint", () => {
  test("covers the bottom row while the page is blurred, without moving the app", async () => {
    const t = await createTestRoot({ width: 40, height: 2, focusHint: false });
    await t.render(
      <>
        <App />
        <FocusHint active />
      </>,
    );
    expect(t.lines()).toEqual(["header", "keys"]);
    await t.act(() => t.engine.setFocused(false));
    const lines = t.lines();
    expect(lines[0]).toBe("header");
    expect(lines[1]?.trim()).toBe("Click the page to use the keyboard");
    // Reverse video: the theme's foreground is the bar, across the whole row.
    const theme = resolveTheme(undefined);
    for (const x of [0, 39]) expect(t.root.renderer.buffer.getCell(x, 1).bg).toBe(parseColor(theme.fg));
    await t.act(() => t.engine.setFocused(true));
    expect(t.lines()).toEqual(["header", "keys"]);
    await t.unmount();
  });

  test("points up at the page when DevTools is docked at the bottom", () => {
    expect(focusHintLabel("bottom")).toBe("▲ Click the page to use the keyboard");
    for (const dock of ["side", "undocked", "fixed"] as const) expect(focusHintLabel(dock)).toBe("Click the page to use the keyboard");
  });

  test("active={false} hides it", async () => {
    const t = await createTestRoot({ width: 40, height: 2, focusHint: false });
    await t.render(<FocusHint active={false} />);
    await t.act(() => t.engine.setFocused(false));
    expect(t.frame()).toBe("");
    await t.unmount();
  });

  test("roots draw it by default only when the input engine reads keys from a page", async () => {
    const headless = await createTestRoot({ width: 40, height: 2 });
    await headless.render(<App />);
    await headless.act(() => headless.engine.setFocused(false));
    expect(headless.lines()).toEqual(["header", "keys"]);
    await headless.unmount();

    const engine = new InputEngine({ document: fakeDocument(true) }).attach();
    const page = await createTestRoot({ width: 40, height: 2, input: engine });
    await page.render(<App />);
    expect(page.lines()).toEqual(["header", "keys"]);
    await page.act(() => engine.setFocused(false));
    expect(page.lines()[1]?.trim()).toBe("Click the page to use the keyboard");
    await page.act(() => engine.setFocused(true));
    expect(page.lines()).toEqual(["header", "keys"]);
    await page.unmount();
    engine.detach();
  });

  test("shows from the first frame when the page loads without focus (reloaded from DevTools)", async () => {
    const engine = new InputEngine({ document: fakeDocument(false) }).attach();
    const t = await createTestRoot({ width: 40, height: 2, input: engine });
    await t.render(<App />);
    expect(t.lines()[1]?.trim()).toBe("Click the page to use the keyboard");
    await t.unmount();
    engine.detach();
  });

  test("focusHint: false turns the default off", async () => {
    const engine = new InputEngine({ document: fakeDocument(false) }).attach();
    const t = await createTestRoot({ width: 40, height: 2, input: engine, focusHint: false });
    await t.render(<App />);
    expect(t.lines()).toEqual(["header", "keys"]);
    await t.unmount();
    engine.detach();
  });
});
