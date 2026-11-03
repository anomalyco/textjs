import { describe, expect, test } from "bun:test";
import {
  CellBuffer,
  ConsoleRenderer,
  CssConsoleDriver,
  drawPixels,
  extractStyledFrame,
  initYoga,
  renderToAnsi,
  createNode,
} from "../src/index";
import { FakeConsole } from "./fixtures";

const RED = 0xff0000ff;
const BLUE = 0x0000ffff;
const GREEN = 0x00ff00ff;
const DARK_BG = 0x09090bff;

describe("drawPixels & CssConsoleDriver sprites", () => {
  test("clean horizontal sprite band compiles to a single %c span on Chromium and Firefox", () => {
    const src = { width: 4, height: 4, data: new Uint32Array(16).fill(RED) };
    const buf = new CellBuffer(20, 6);
    buf.clear(DARK_BG);
    buf.drawText(0, 0, "HEADER", GREEN, DARK_BG);
    drawPixels(buf, { x: 2, y: 1, width: 16, height: 4, source: src });
    buf.drawText(0, 5, "FOOTER", GREEN, DARK_BG);

    // Chromium: 1 curtain + reset, header, 1 sprite span (spanning all 4 rows!), footer
    const chromeCon = new FakeConsole();
    const chromeDriver = new CssConsoleDriver({ console: chromeCon, curtain: true, browser: "chromium" });
    const rChrome = chromeDriver.render(buf);
    expect(rChrome.skipped).toBe(false);
    const spriteArgs = chromeCon.last.args.filter((a) => a.includes('background-image:url("data:image/svg+xml,'));
    expect(spriteArgs.length).toBe(1);
    expect(spriteArgs[0]).toContain("line-height:58px;"); // 4 * 14 + 2px padding
    expect(spriteArgs[0]).toContain("background-color:#09090b;");
    expect(spriteArgs[0]).toContain("background-position:center ");
    // Only 3 content lines in format (header, 4-row sprite band, footer) plus leading curtain break
    expect(chromeCon.last.format.split("\n").length).toBe(4);

    // Firefox: gets display:inline-block and 56px line-height (no vertical margins)
    const ffCon = new FakeConsole();
    const ffDriver = new CssConsoleDriver({ console: ffCon, curtain: true, browser: "firefox" });
    ffDriver.render(buf);
    const ffSprite = ffCon.last.args.find((a) => a.includes('background-image:url("data:image/svg+xml,')) ?? "";
    expect(ffSprite).toContain("display:inline-block;");
    expect(ffSprite).toContain("line-height:56px;");

    // Unchanged second render makes zero console calls
    expect(chromeDriver.render(buf).skipped).toBe(true);
    expect(chromeCon.logs.length).toBe(1);
  });

  test("Safari automatically falls back to half-block cells without emitting url(...)", () => {
    const data = new Uint32Array([RED, RED, BLUE, BLUE]);
    const buf = new CellBuffer(4, 2);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 2, height: 1, source: { width: 2, height: 2, data }, fit: "fill" });

    const safCon = new FakeConsole();
    const safDriver = new CssConsoleDriver({ console: safCon, curtain: true, browser: "safari" });
    safDriver.render(buf);
    expect(safCon.last.args.some((a) => a.includes("url("))).toBe(false);
    expect(safCon.last.format).toContain("▀");
  });

  test("side borders slice the sprite cleanly per row without breaking adjacent cells", () => {
    const src = { width: 4, height: 4, data: new Uint32Array(16).fill(BLUE) };
    const buf = new CellBuffer(10, 4);
    buf.clear(DARK_BG);
    buf.drawBox({ x: 0, y: 0, width: 10, height: 4, style: "single", fg: GREEN, bg: DARK_BG });
    drawPixels(buf, { x: 1, y: 1, width: 8, height: 2, source: src, fit: "fill" });

    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium" });
    driver.render(buf);
    const sliceArgs = con.last.args.filter((a) => a.includes("background-image:url("));
    expect(sliceArgs.length).toBe(2); // rows 1 and 2 inside the box border
    expect(con.last.format).toContain("┌");
    expect(con.last.format).toContain("┘");
  });

  test("plain text, ANSI, getCell, extractStyledFrame, and overlapping writes materialize half-blocks seamlessly", () => {
    const data = new Uint32Array([RED, GREEN, BLUE, RED]);
    const buf = new CellBuffer(4, 2);
    drawPixels(buf, { x: 0, y: 0, width: 2, height: 1, source: { width: 2, height: 2, data }, fit: "fill" });

    // Non-destructive reads keep the sprite active while populating half-blocks
    expect(buf.getCell(0, 0)).toMatchObject({ char: "▀", fg: RED, bg: BLUE });
    expect(buf.toPlainLines(true)[0]).toBe("▀▀");
    expect(renderToAnsi(buf)).toContain("▀");
    const snap = extractStyledFrame(buf);
    expect(snap.sprites?.length).toBe(1);
    expect(buf.sprites.length).toBe(1);

    // An overlay write (e.g. wireframe or modal dim) materializes and replaces the sprite with cells
    buf.dimRect(0, 0, 4, 2, 0x00000080);
    expect(buf.sprites.length).toBe(0);
    expect(buf.getCell(0, 0)?.char).toBe("▀");
  });

  test("stageKeyframe batches temporal frames into a multi-keyframe CSS @keyframes SVG", () => {
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium" });
    const buf = new CellBuffer(10, 4);
    const data = new Uint32Array(16).fill(RED);
    const src = { width: 4, height: 4, data };

    // Initial frame
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    driver.render(buf);

    // Stage frame 1 at t=100ms
    data.fill(GREEN);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    expect(driver.stageKeyframe(buf, 100)).toBe(true);
    expect(driver.hasStagedKeyframes).toBe(true);

    // Emit frame 2 at t=128ms -> single console.log carrying 2 visual frames!
    data.fill(BLUE);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    const res = driver.render(buf);
    expect(res.visualFrames).toBe(2);
    expect(driver.hasStagedKeyframes).toBe(false);
    expect(con.last.args[0]).toContain("@keyframes s");
  });

  test("maxBytes compacts accumulated console messages when byte budget is exceeded", () => {
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, maxFrames: 300, maxBytes: 500 });
    const buf = new CellBuffer(40, 4);
    for (let i = 0; i < 6; i++) {
      buf.drawText(0, 0, `frame payload ${i} `.repeat(3), GREEN, DARK_BG);
      driver.render(buf);
    }
    expect(con.clears).toBeGreaterThan(1);
  });

  test("ConsoleRenderer stages intermediate sprite frames and flushes cleanly", async () => {
    await initYoga();
    const con = new FakeConsole();
    const px = new Uint32Array([RED, RED, RED, RED]);
    const root = createNode("box", {
      width: 10,
      height: 4,
      customPaint: (b, r) => drawPixels(b, { x: r.x, y: r.y, width: r.width, height: r.height, source: { width: 2, height: 2, data: px } }),
    });
    const renderer = new ConsoleRenderer({ root, console: con, viewport: { width: 10, height: 4 }, input: false, registerGlobal: false });
    try {
      renderer.renderNow(true);
      expect(con.logs.length).toBe(1);
      px.fill(BLUE);
      root._fullDamage = true;
      const stagedRes = renderer.renderNow(false);
      // Within postClearInterval (110ms), frame is staged rather than dropped!
      expect(stagedRes.skipped).toBe(false);
      expect(renderer.driver.hasStagedKeyframes).toBe(true);
      await new Promise((r) => setTimeout(r, 130));
      expect(renderer.driver.hasStagedKeyframes).toBe(false);
      expect(con.logs.length).toBe(2);
    } finally {
      renderer.dispose();
      root.destroy();
    }
  });
});
