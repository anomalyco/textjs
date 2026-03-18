import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { CellBuffer, extractStyledFrame, initYoga } from "@textjs/core";
import { ConsoleMirror, devtoolsShortcutKeys, FocusPad, focusPadState, keyLabel, TextCanvas } from "../src/dom/index";
import { Box, Text } from "../src/index";
import { createTestRoot } from "./helpers";

describe("DOM companion", () => {
  test("ConsoleMirror renders a styled frame with optional DevTools chrome", () => {
    const buf = new CellBuffer(12, 2);
    buf.drawText(0, 0, "▼ Text.js", 0xff0000ff, 0x000000ff, 1);
    buf.drawText(0, 1, "100% <ok>", 0, 0);
    const frame = extractStyledFrame(buf);
    const html = renderToStaticMarkup(<ConsoleMirror frame={frame} chrome />);
    expect(html).toContain("Elements");
    expect(html).toContain("Console");
    expect(html).toContain("Sources");
    expect(html).toContain("Network");
    expect(html).toContain("text://viewport:1");
    expect(html).toContain("▼ Text.js");
    expect(html).toContain("font-weight:700");
    expect(html).toContain("100% &lt;ok&gt;");
    const plain = renderToStaticMarkup(<ConsoleMirror frame={null} />);
    expect(plain).toContain("Waiting for the first frame");
  });

  test("ConsoleMirror locks its geometry so no glyph can shift a row", () => {
    const buf = new CellBuffer(10, 3);
    buf.drawText(0, 1, "→ ✱ ┃ ▀", 0, 0);
    const html = renderToStaticMarkup(<ConsoleMirror frame={extractStyledFrame(buf)} lineHeight={14} />);
    expect(html).toContain("height:42px");
    expect(html).toContain("contain:layout paint style");
    expect(html).toContain("font-variant-ligatures:none");
    expect(html.match(/height:14px;line-height:14px;overflow:hidden;white-space:pre/g)?.length).toBe(3);
  });

  test("ConsoleMirror rows tile edge to edge (no horizontal scanline gaps)", () => {
    const buf = new CellBuffer(8, 3);
    for (let y = 0; y < 3; y++) buf.drawText(0, y, "████████", 0xffffffff, 0x0a0a0aff, 0);
    const html = renderToStaticMarkup(<ConsoleMirror frame={extractStyledFrame(buf)} lineHeight={15} />);
    // Rows are clipped to exactly one line box; spans fill the whole box.
    expect(html.match(/height:15px;line-height:15px;overflow:hidden/g)?.length).toBe(3);
    expect(html).toContain("display:inline-block;height:15px;line-height:15px;vertical-align:top");
    // The container is filled with the frame's dominant background, not a contrasting DevTools grey.
    expect(html).toMatch(/data-textjs-mirror="" style="[^"]*background:(#0a0a0a|rgb\(10, ?10, ?10\))/);
  });

  test("FocusPad: one calm click target with the DevTools shortcut and the app's keys", async () => {
    const pad = renderToStaticMarkup(<FocusPad root={null} title="my-app" hints={[{ keys: "↑ ↓", label: "count" }, { keys: "r", label: "reset" }]} />);
    expect(pad).toContain("my-app");
    expect(pad).toContain("Open the console");
    expect(pad).toContain("Then click here and press ↑ ↓.");
    expect(pad).toContain("count");
    expect(pad).toContain(">R</kbd>");
    expect(pad).toContain("Open on a desktop");
    // No viewport presets, pause toggles or on-page preview by default.
    for (const gone of ["80×24", "Pause", "Preview", "data-textjs-mirror"]) expect(pad).not.toContain(gone);
    const typed = renderToStaticMarkup(<FocusPad root={null} action="type a prompt" />);
    expect(typed).toContain("Then click here and type a prompt.");
    const canvas = renderToStaticMarkup(<TextCanvas app={<Text>hi</Text>} title="demo" theme="geistLight" />);
    expect(canvas).toContain("demo");
    expect(canvas).toContain("Open the console");
  });

  test("FocusPad state: never blocks on DevTools detection", () => {
    const s = (o: Partial<Parameters<typeof focusPadState>[0]>) => focusPadState({ pageFocused: true, capturing: false, devtoolsLikelyOpen: false, keySeen: false, ...o });
    expect(s({})).toBe("open");
    // Focus moved into DevTools (or another window): ask for a click.
    expect(s({ pageFocused: false })).toBe("click");
    expect(s({ pageFocused: false, devtoolsLikelyOpen: true, capturing: true })).toBe("click");
    // DevTools docked but the page isn't routing keys yet.
    expect(s({ devtoolsLikelyOpen: true })).toBe("click");
    expect(s({ devtoolsLikelyOpen: true, capturing: true })).toBe("live");
    // Undocked DevTools can't be detected: the first keystroke proves it.
    expect(s({ capturing: true })).toBe("open");
    expect(s({ capturing: true, keySeen: true })).toBe("live");
  });

  test("keyLabel echoes keystrokes the way the hints spell them", () => {
    const k = (key: string, input = "", mods: { ctrl?: boolean } = {}) => keyLabel({ key, input, ctrl: mods.ctrl ?? false, meta: false, alt: false });
    expect(k("up")).toBe("↑");
    expect(k("return")).toBe("Enter");
    expect(k("space", " ")).toBe("Space");
    expect(k("r", "r")).toBe("r");
    expect(k("p", "", { ctrl: true })).toBe("Ctrl P");
    expect(devtoolsShortcutKeys()).toHaveLength(3);
  });

  test("FocusPad telemetry reads frames without re-rendering the console tree", async () => {
    await initYoga();
    const t = await createTestRoot({ width: 20, height: 2 });
    let renders = 0;
    function App() {
      renders++;
      return (
        <Box>
          <Text>console app</Text>
        </Box>
      );
    }
    await t.render(<App />);
    const seen: number[] = [];
    const off = t.root.onFrame((f) => seen.push(f.frameCount));
    const html = renderToStaticMarkup(<FocusPad root={t.root} title="x" showMirrorDefault />);
    expect(html).toContain("▼ x");
    await t.act(() => t.root.renderer.requestRender(true));
    t.frame();
    expect(seen.length).toBe(1);
    expect(renders).toBe(1);
    off();
    await t.unmount();
  });

  test("host intrinsics stay private: no global JSX.IntrinsicElements augmentation", () => {
    const src = fileURLToPath(new URL("../src", import.meta.url));
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else files.push(p);
      }
    };
    walk(src);
    for (const f of files) {
      const code = readFileSync(f, "utf8");
      expect(code).not.toMatch(/interface\s+IntrinsicElements/);
      expect(code).not.toMatch(/namespace\s+JSX/);
      expect(code).not.toMatch(/declare\s+global/);
    }
  });
});
