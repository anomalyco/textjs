import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { CellBuffer, extractStyledFrame, initYoga } from "@textjs/core";
import { ConsoleMirror, FocusPad, TextCanvas } from "../src/dom/index";
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

  test("FocusPad and TextCanvas render their receiver shell", async () => {
    const pad = renderToStaticMarkup(<FocusPad root={null} title="my-app" />);
    expect(pad).toContain("▼ Text.js");
    expect(pad).toContain("my-app");
    expect(pad).toContain("Click anywhere to focus keyboard");
    expect(pad).toContain("80×24");
    expect(pad).toContain("100×32");
    expect(pad).toContain("120×38");
    expect(pad).toContain("Responsive");
    expect(pad).toContain("Copy Plain Frame");
    expect(pad).toContain("Preview Console Inline");
    expect(pad).toContain("Pause or click into DevTools to select &amp; copy console text");
    const canvas = renderToStaticMarkup(<TextCanvas app={<Text>hi</Text>} title="demo" theme="geistLight" />);
    expect(canvas).toContain("demo");
    expect(canvas).toContain("Booting Turbolog");
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
    expect(html).toContain("▼ Text.js");
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
