import { describe, expect, jest, test } from "bun:test";
import * as coreTopLevel from "../src/index";
import {
  CellBuffer,
  ConsoleRenderer,
  CssConsoleDriver,
  createDefaultScheduler,
  createNode,
  extractStyledFrame,
  initYoga,
  paintScene,
  renderToAnsi,
} from "../src/index";
import * as coreExperimental from "../src/experimental";
import { drawPixels } from "../src/experimental";
import { FakeConsole } from "./fixtures";

const RED = 0xff0000ff;
const BLUE = 0x0000ffff;
const GREEN = 0x00ff00ff;
const DARK_BG = 0x09090bff;

describe("drawPixels & CssConsoleDriver sprites", () => {
  test("experimental subpath exports only the pixel primitives and leaves @textjs/core top-level clean", () => {
    expect(typeof coreExperimental.drawPixels).toBe("function");
    expect("drawPixels" in coreTopLevel).toBe(false);
    expect("paintHalfBlocks" in coreTopLevel).toBe(false);
    expect("quantizer" in coreTopLevel).toBe(false);
    expect("encodeIndexedPng" in coreTopLevel).toBe(false);
    expect("deflateZlib" in coreTopLevel).toBe(false);
    expect("parseBannerColor" in coreTopLevel).toBe(false);
    expect("paintHalfBlocks" in coreExperimental).toBe(false);
    expect("quantizer" in coreExperimental).toBe(false);
  });

  test("clean horizontal sprite band compiles to a single %c span on Chromium and Firefox", () => {
    const src = { width: 4, height: 4, data: new Uint32Array(16).fill(RED) };
    const buf = new CellBuffer(20, 6);
    buf.clear(DARK_BG);
    buf.drawText(0, 0, "HEADER", GREEN, DARK_BG);
    drawPixels(buf, { x: 2, y: 1, width: 16, height: 4, source: src });
    buf.drawText(0, 5, "FOOTER", GREEN, DARK_BG);

    const chromeCon = new FakeConsole();
    const chromeDriver = new CssConsoleDriver({ console: chromeCon, curtain: true, browser: "chromium" });
    const rChrome = chromeDriver.render(buf);
    expect(rChrome.skipped).toBe(false);
    const spriteArgs = chromeCon.last.args.filter((a) => a.includes('background-image:url("data:image/svg+xml,'));
    expect(spriteArgs.length).toBe(1);
    expect(spriteArgs[0]).toContain("line-height:58px;");
    expect(spriteArgs[0]).toContain("background-color:#09090b;");
    expect(spriteArgs[0]).toContain("background-position:center ");
    expect(chromeCon.last.format.split("\n").length).toBe(4);

    // Firefox emits single-frame sprite URLs, with temporal batching disabled (Item 4)
    const ffCon = new FakeConsole();
    const ffDriver = new CssConsoleDriver({ console: ffCon, curtain: true, browser: "firefox" });
    expect(ffDriver._supportsTemporalSprites).toBe(false);
    expect(chromeDriver._supportsTemporalSprites).toBe(true);
    ffDriver.render(buf);
    const ffSprite = ffCon.last.args.find((a) => a.includes('background-image:url("data:image/svg+xml,')) ?? "";
    expect(ffSprite).toContain("display:inline-block;");
    expect(ffSprite).toContain("line-height:56px;");

    expect(chromeDriver.render(buf).skipped).toBe(true);
    expect(chromeCon.logs.length).toBe(1);
  });

  test("Safari disables sprite URLs and temporal batching, falling back to half-block cells", () => {
    const data = new Uint32Array([RED, RED, BLUE, BLUE]);
    const buf = new CellBuffer(4, 2);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 2, height: 1, source: { width: 2, height: 2, data }, fit: "fill" });

    const safCon = new FakeConsole();
    const safDriver = new CssConsoleDriver({ console: safCon, curtain: true, browser: "safari" });
    expect(safDriver._supportsTemporalSprites).toBe(false);
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
    expect(sliceArgs.length).toBe(2);
    expect(con.last.format).toContain("┌");
    expect(con.last.format).toContain("┘");
  });

  test("readCells, getCell, plain text, ANSI, and extractStyledFrame materialize half-blocks without dirtying _writeVersion or row hashes", () => {
    const data = new Uint32Array([0x00000000, GREEN, BLUE, RED]);
    const buf = new CellBuffer(8, 2);
    buf.clear(DARK_BG);
    buf.drawText(4, 0, "ok", GREEN, DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 2, height: 1, source: { width: 2, height: 2, data }, fit: "fill" });

    const hashesBefore = buf.getRowHashes().slice();
    const wvBefore = buf._writeVersion;

    // Transparent top pixel + opaque bottom pixel uses "▄" lower half-block
    expect(buf.getCell(0, 0)).toMatchObject({ char: "▄", fg: BLUE, bg: DARK_BG });
    expect(buf.getCell(1, 0)).toMatchObject({ char: "▀", fg: GREEN, bg: RED });
    const cells = buf.readCells();
    expect(String.fromCodePoint(cells.chars[0]!)).toBe("▄");
    expect(String.fromCodePoint(cells.chars[1]!)).toBe("▀");
    expect(buf.toPlainLines(true)[0]).toBe("▄▀  ok");
    expect(renderToAnsi(buf)).toContain("▄");
    const snap = extractStyledFrame(buf);
    expect(snap._sprites?.length).toBe(1);
    expect(buf._sprites.length).toBe(1);

    // Item 11: Non-destructive reads never bump _writeVersion or alter row hashes
    expect(buf._writeVersion).toBe(wvBefore);
    expect(Array.from(buf.getRowHashes())).toEqual(Array.from(hashesBefore));

    // Destructive overlay write converts sprite to cells and bumps _writeVersion
    buf.dimRect(0, 0, 8, 2, 0x00000080);
    expect(buf._sprites.length).toBe(0);
    expect(buf._writeVersion).not.toBe(wvBefore);
  });

  test("partial-row band repaints preserve sprites that fit the unclipped buffer, while partial fillRect overlays materialize and remove", () => {
    const b = new CellBuffer(20, 8);
    const source = { width: 4, height: 4, data: new Uint32Array(16).fill(RED) };
    b.fillRect(0, 0, 20, 8, DARK_BG);
    drawPixels(b, { x: 0, y: 0, width: 4, height: 3, source, fit: "fill" });
    expect(b._sprites.length).toBe(1);

    // Emulate Painter.runBands for row 1 only
    b.resetScissor();
    b._pushBandScissor(1, 1);
    b.fillRect(0, 1, 20, 1, DARK_BG, 0x20, 0, 0);
    expect(b._sprites.length).toBe(0); // fillRect removed old sprite
    drawPixels(b, { x: 0, y: 0, width: 4, height: 3, source, fit: "fill" });
    b.resetScissor();
    expect(b._sprites.length).toBe(1); // _putSprite re-registered across band scissor

    // Modal / box fill partly overlapping a sprite materializes & removes the sprite so modal bg stays intact
    b.fillRect(0, 0, 20, 8, 0x000000ff);
    drawPixels(b, { x: 0, y: 0, width: 12, height: 6, source, fit: "fill" });
    const MODAL = 0x222222ff;
    const FG = 0xffffffff;
    b.fillRect(4, 2, 10, 3, MODAL, 0x20, FG, 0);
    b.drawText(6, 3, "hi", FG, MODAL);
    expect(b._sprites.length).toBe(0);
    expect(b.getCell(5, 2)?.bg).toBe(MODAL);
    expect(b.getCell(10, 4)?.bg).toBe(MODAL);
    expect(b.getCell(13, 4)?.bg).toBe(MODAL);
    expect(b.getCell(1, 1)?.bg).toBe(RED);
    const d = new CssConsoleDriver({ console: new FakeConsole(), browser: "chromium", measureText: false });
    const r = d.render(b);
    expect(r.frame!.args.some((a) => a.includes("background-image"))).toBe(false);
  });

  test("parent clip honors scissor and falls back to cell rendering when cut, and two sprites sharing rows fall back to cells", () => {
    // 1. Parent clip (3-cell clip over 8-cell sprite)
    const clipped = new CellBuffer(10, 4);
    clipped.clear(DARK_BG);
    clipped.pushScissor(0, 0, 3, 3);
    drawPixels(clipped, { x: 0, y: 0, width: 8, height: 3, source: { width: 4, height: 4, data: new Uint32Array(16).fill(RED) }, fit: "fill" });
    clipped.popScissor();
    expect(clipped._sprites.length).toBe(0);
    expect(clipped.getCell(2, 0)?.fg).toBe(RED);
    expect(clipped.getCell(3, 0)?.fg).toBe(0);

    // 2. Two sprites sharing rows 1..2 fall back to cell rendering without overwriting each other, while solo sprite on rows 4..5 stays a sprite
    const shared = new CellBuffer(20, 6);
    shared.clear(DARK_BG);
    drawPixels(shared, { x: 0, y: 0, width: 6, height: 3, source: { width: 2, height: 2, data: new Uint32Array(4).fill(RED) }, fit: "fill" });
    drawPixels(shared, { x: 10, y: 1, width: 6, height: 2, source: { width: 2, height: 2, data: new Uint32Array(4).fill(BLUE) }, fit: "fill" });
    drawPixels(shared, { x: 2, y: 4, width: 8, height: 2, source: { width: 2, height: 2, data: new Uint32Array(4).fill(GREEN) }, fit: "fill" });

    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium", measureText: false });
    driver.render(shared);
    // Rows 0..2 emit half-block cells for both RED and BLUE sprites; rows 4..5 emit 1 sprite span
    const spriteSpans = con.last.args.filter((a) => a.includes("background-image:url("));
    expect(spriteSpans.length).toBe(1);
    expect(shared.getCell(1, 1)?.fg).toBe(RED);
    expect(shared.getCell(11, 1)?.fg).toBe(BLUE);
  });

  test("sprite hash includes palette, sample, and underBg, and extractStyledFrame exposes underBg as bgCss", () => {
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium", measureText: false });
    const src = { width: 2, height: 2, data: new Uint32Array([0x00000000, RED, BLUE, GREEN]) };
    const buf = new CellBuffer(8, 2);

    buf.clear(0x223344ff);
    drawPixels(buf, { x: 0, y: 0, width: 4, height: 2, source: src, fit: "fill" });
    expect(extractStyledFrame(buf)._sprites?.[0]?.bgCss).toBe("#223344");
    expect(driver.render(buf).skipped).toBe(false);
    expect(driver.render(buf).skipped).toBe(true);

    // Changing underBg triggers repaint
    buf.clear(0x556677ff);
    drawPixels(buf, { x: 0, y: 0, width: 4, height: 2, source: src, fit: "fill" });
    expect(extractStyledFrame(buf)._sprites?.[0]?.bgCss).toBe("#556677");
    expect(driver.render(buf).skipped).toBe(false);

    // Changing palette triggers repaint
    buf.clear(0x556677ff);
    drawPixels(buf, { x: 0, y: 0, width: 4, height: 2, source: src, fit: "fill", palette: [RED, BLUE] });
    expect(driver.render(buf).skipped).toBe(false);

    // Changing sample triggers repaint
    buf.clear(0x556677ff);
    drawPixels(buf, { x: 0, y: 0, width: 4, height: 2, source: src, fit: "fill", palette: [RED, BLUE], sample: "average" });
    expect(driver.render(buf).skipped).toBe(false);
  });

  test("IDLE_COMPACT_FRAMES stays 100 for idle console compaction", () => {
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium", measureText: false });
    const buf = new CellBuffer(20, 2);
    const origNow = performance.now;
    let fakeNow = 1000;
    performance.now = () => fakeNow;
    try {
      for (let i = 0; i < 50; i++) {
        buf.drawText(0, 0, `f${i}`, GREEN, DARK_BG);
        driver.render(buf);
        fakeNow += 20;
      }
      expect(con.clears).toBe(1); // initial clear only
      // Idle > 1s after 50 frames (< 100): must NOT clear
      fakeNow += 1500;
      buf.drawText(0, 0, "f50", GREEN, DARK_BG);
      driver.render(buf);
      expect(con.clears).toBe(1);

      // Advance to 100 appended frames, then idle > 1s -> compacts
      for (let i = 51; i < 100; i++) {
        fakeNow += 20;
        buf.drawText(0, 0, `f${i}`, GREEN, DARK_BG);
        driver.render(buf);
      }
      expect(con.clears).toBe(1);
      fakeNow += 1500;
      buf.drawText(0, 0, "f100", GREEN, DARK_BG);
      driver.render(buf);
      expect(con.clears).toBe(2);
    } finally {
      performance.now = origNow;
    }
  });

  test("large 240x64 dense text frames stay unlimited by sprite byte budget, while sprites compact at 4 MB", () => {
    const textCon = new FakeConsole();
    const textDriver = new CssConsoleDriver({ console: textCon, browser: "chromium", measureText: false, maxFrames: 300 });
    let seed = 7;
    const r = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const buf = new CellBuffer(240, 64);
    buf.clear(DARK_BG);
    for (let k = 0; k < 400; k++) {
      const x = Math.floor(r() * 230);
      const y = Math.floor(r() * 64);
      const fg = ((Math.floor(r() * 0xffffff) << 8) | 255) >>> 0;
      const bg = r() < 0.5 ? DARK_BG : (((Math.floor(r() * 0xffffff) << 8) | 255) >>> 0);
      buf.drawText(x, y, `metric ${k}`, fg, bg);
    }
    let totalTextBytes = 0;
    for (let f = 0; f < 200; f++) {
      buf.drawText(0, f & 63, `tick ${f} `, GREEN, DARK_BG);
      const res = textDriver.render(buf);
      if (res.frame) {
        totalTextBytes += res.frame.format.length;
        for (const a of res.frame.args) totalTextBytes += a.length;
      }
    }
    expect(totalTextBytes).toBeGreaterThan(4 * 1024 * 1024);
    expect(textCon.clears).toBe(1); // only frame 0 cleared!

    // With noisy 256-color sprites exceeding 4 MB before 300 frames, sprite byte budget compacts
    const spCon = new FakeConsole();
    const spDriver = new CssConsoleDriver({ console: spCon, browser: "chromium", measureText: false, maxFrames: 300 });
    const pal256 = Uint32Array.from({ length: 256 }, (_, i) => ((((i * 73) & 255) << 24) | (((i * 151) & 255) << 16) | (((i * 211) & 255) << 8) | 255) >>> 0);
    const px = new Uint32Array(320 * 200);
    const spBuf = new CellBuffer(80, 25);
    let ns = 1234567;
    for (let f = 0; f < 60; f++) {
      for (let i = 0; i < px.length; i++) {
        ns = (Math.imul(ns, 1664525) + 1013904223) >>> 0;
        px[i] = pal256[ns >>> 24]!;
      }
      spBuf.clear(DARK_BG);
      drawPixels(spBuf, { x: 0, y: 0, width: 80, height: 25, source: { width: 320, height: 200, data: px }, fit: "fill" });
      spDriver.render(spBuf);
    }
    expect(spCon.clears).toBeGreaterThan(1);
  });

  test("temporal staging handles A->B->A without double-releasing pooled buffers and discards stale moved/resized entries", () => {
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium" });
    const buf = new CellBuffer(12, 4);
    const data = new Uint32Array(16).fill(RED);
    const src = { width: 4, height: 4, data };

    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    driver.render(buf);

    // Stage A -> B -> A in one batch (Item 7: previously double-released A's buffer into stagePixelPool)
    data.fill(GREEN);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    expect(driver._stageKeyframe(buf, 100)).toBe(true);

    data.fill(BLUE);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    expect(driver._stageKeyframe(buf, 116)).toBe(true);

    data.fill(GREEN);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    expect(driver._stageKeyframe(buf, 132)).toBe(true);

    const res = driver.render(buf);
    expect(res._visualFrames).toBe(2);
    expect(con.last.args[0]).toContain("@keyframes s");
    const pool = (driver as unknown as { stagePixelPool: Uint32Array[] }).stagePixelPool;
    expect(new Set(pool).size).toBe(pool.length);

    // Item 6: Stage at old rect (width=10), then emit at new rect (width=12) -> stale staged map entry must be discarded
    data.fill(RED);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    expect(driver._stageKeyframe(buf, 200)).toBe(true);
    expect(driver._hasStagedKeyframes).toBe(true);

    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 12, height: 4, source: src, fit: "fill" });
    driver.render(buf);
    expect(driver._hasStagedKeyframes).toBe(false);
    expect(new Set(pool).size).toBe(pool.length);
  });

  test("a custom fallback paints every cell fallback, and RGBA sprites never batch", () => {
    const calls: string[] = [];
    const fallback = (b: CellBuffer, r: { x: number; y: number; width: number; height: number }) => {
      calls.push(`${r.x},${r.y},${r.width}x${r.height}`);
      for (let y = r.y; y < r.y + r.height; y++) for (let x = r.x; x < r.x + r.width; x++) b.setCell(x, y, "#", GREEN, 0);
    };
    const src = { width: 4, height: 4, data: new Uint32Array(16).fill(RED) };

    // Pinned half-block mode, and a clip that cuts the sprite, both paint the fallback right away.
    const buf = new CellBuffer(10, 4);
    drawPixels(buf, { x: 1, y: 0, width: 4, height: 2, source: src, renderMode: "halfblock", fallback });
    expect(calls).toEqual(["1,0,4x2"]);
    expect(buf._sprites.length).toBe(0);
    buf.clear(DARK_BG);
    buf.pushScissor(0, 0, 3, 4);
    drawPixels(buf, { x: 1, y: 0, width: 4, height: 2, source: src, fallback });
    buf.popScissor();
    expect(calls.length).toBe(2);
    expect(buf.rowText(0)).toBe(" ##       ");

    // A registered sprite materializes through the fallback for plain text, ANSI and Safari.
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 2, y: 1, width: 3, height: 2, source: src, fallback, encoding: "rgba" });
    expect(buf._sprites[0]).toMatchObject({ encoding: "rgba", batchable: false });
    expect(buf.rowText(1)).toBe("  ###     ");
    expect(calls.at(-1)).toBe("2,1,3x2");
    expect(renderToAnsi(buf)).toContain("###");

    // RGBA sprites encode as RGBA PNGs and don't stage keyframes even when opaque and changing.
    const driver = new CssConsoleDriver({ console: new FakeConsole(), browser: "chromium" });
    driver.render(buf);
    src.data.fill(BLUE);
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 2, y: 1, width: 3, height: 2, source: src, fallback, encoding: "rgba" });
    expect(driver._stageKeyframe(buf, 100)).toBe(false);
    expect(extractStyledFrame(buf)._sprites?.[0]?.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  test("sprites with transparent pixels skip temporal staging and multi-keyframe SVG stacking", () => {
    const con = new FakeConsole();
    const driver = new CssConsoleDriver({ console: con, browser: "chromium" });
    const buf = new CellBuffer(10, 4);
    const data = new Uint32Array(16).fill(RED);
    data[0] = 0x00000000;
    const src = { width: 4, height: 4, data };

    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    driver.render(buf);

    data.fill(BLUE);
    data[0] = 0x00000000;
    buf.clear(DARK_BG);
    drawPixels(buf, { x: 0, y: 0, width: 10, height: 4, source: src, fit: "fill" });
    expect(driver._stageKeyframe(buf, 100)).toBe(false);
    expect(driver._hasStagedKeyframes).toBe(false);
  });

  test("ConsoleRenderer uses sprite pacing only while animating, counts visualFrames only at emit, and cleans up on visibilitychange", async () => {
    await initYoga();
    const con = new FakeConsole();
    const px = new Uint32Array([RED, RED, RED, RED]);
    let label = "v0";
    const root = createNode("box", { width: 12, height: 4, flexDirection: "column" });
    const pixNode = createNode("box", {
      width: 12,
      height: 3,
      customPaint: (b, r) => drawPixels(b, { x: r.x, y: r.y, width: r.width, height: r.height, source: { width: 2, height: 2, data: px }, fit: "fill" }),
    });
    const txtNode = createNode("box", {
      width: 12,
      height: 1,
      customPaint: (b, r) => b.drawText(r.x, r.y, label, GREEN, DARK_BG),
    });
    root.appendChild(pixNode);
    root.appendChild(txtNode);

    // Fake visibility target
    const listeners = new Map<string, Set<() => void>>();
    const fakeDoc = {
      visibilityState: "visible",
      addEventListener: (t: string, fn: () => void) => {
        let s = listeners.get(t);
        if (!s) listeners.set(t, (s = new Set()));
        s.add(fn);
      },
      removeEventListener: (t: string, fn: () => void) => listeners.get(t)?.delete(fn),
    };
    const prevDoc = (globalThis as { document?: unknown }).document;
    (globalThis as { document?: unknown }).document = fakeDoc;

    let renderer: ConsoleRenderer | null = null;
    // Fake timers drive both the renderer's clock and its pacing timers, so each step lands exactly.
    jest.useFakeTimers();
    try {
      renderer = new ConsoleRenderer({ root, console: con, viewport: { width: 12, height: 4 }, input: false, registerGlobal: false });
      renderer.renderNow(true);
      expect(con.logs.length).toBe(1);
      expect(renderer.stats().frameCount).toBe(1);
      expect(renderer.stats().fps).toBe(1);

      // Static sprite + text update -> does NOT enter temporal sprite staging (emits immediately!)
      jest.advanceTimersByTime(120);
      label = "v1";
      txtNode._fullDamage = true;
      root._sceneDirty = true;
      root._damageLo = 1 << 3;
      const staticUpdate = renderer.renderNow(false);
      expect(staticUpdate.skipped).toBe(false);
      expect(renderer.driver._hasStagedKeyframes).toBe(false);
      expect(con.last.format).toContain("v1");
      expect(renderer.stats().frameCount).toBe(2);

      // Now mutate sprite pixels within 51ms -> activates 250ms sprite pacing window and stages keyframe WITHOUT counting fps yet
      px.fill(BLUE);
      root._fullDamage = true;
      const stagedRes = renderer.renderNow(false);
      expect(stagedRes.skipped).toBe(true);
      expect(renderer.driver._hasStagedKeyframes).toBe(true);
      // Item 3: fps / frameCount must NOT increment at staging!
      expect(renderer.stats().frameCount).toBe(2);
      expect(renderer.stats().fps).toBe(2);

      // Wait for scheduled flush -> emits batched 2-keyframe SVG and increments frameCount & fps by delivered visualFrames
      px.fill(GREEN);
      root._fullDamage = true;
      jest.advanceTimersByTime(70);
      expect(renderer.driver._hasStagedKeyframes).toBe(false);
      expect(renderer.stats().frameCount).toBeGreaterThanOrEqual(3);

      // Item 5: Stage another frame, then hide tab -> pending flush cancelled and staged keyframes discarded; on show -> repaints once
      px.fill(RED);
      root._fullDamage = true;
      renderer.renderNow(false);
      expect(renderer.driver._hasStagedKeyframes).toBe(true);
      const logsBeforeHide = con.logs.length;
      fakeDoc.visibilityState = "hidden";
      for (const fn of listeners.get("visibilitychange") ?? []) fn();
      expect(renderer.driver._hasStagedKeyframes).toBe(false);
      jest.advanceTimersByTime(80);
      expect(con.logs.length).toBe(logsBeforeHide);

      fakeDoc.visibilityState = "visible";
      for (const fn of listeners.get("visibilitychange") ?? []) fn();
      jest.advanceTimersByTime(60);
      expect(con.logs.length).toBe(logsBeforeHide + 1);
    } finally {
      jest.useRealTimers();
      renderer?.dispose();
      root.destroy();
      if (prevDoc === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = prevDoc;
    }
  });

  test("reading buffer cells between incremental paintScene calls does not force full repaints", async () => {
    await initYoga();
    const buf = new CellBuffer(16, 4);
    const px = new Uint32Array(16).fill(RED);
    let text = "one";
    const root = createNode("box", { width: 16, height: 4, flexDirection: "row" });
    const left = createNode("box", {
      width: 4,
      height: 3,
      customPaint: (b, r) => drawPixels(b, { x: r.x, y: r.y, width: r.width, height: r.height, source: { width: 4, height: 4, data: px }, fit: "fill" }),
    });
    const right = createNode("box", {
      width: 12,
      height: 1,
      customPaint: (b, r) => b.drawText(r.x, r.y, text, GREEN, DARK_BG),
    });
    root.appendChild(left);
    root.appendChild(right);

    root.calculateLayout(16, 4);
    paintScene(root, buf, { clearBg: DARK_BG });
    expect(buf._writeVersion).toBe(buf._paintedWriteVersion);

    // Simulate <ConsoleMirror> / copyText reading the buffer
    extractStyledFrame(buf);
    buf.toPlainString();
    expect(buf._writeVersion).toBe(buf._paintedWriteVersion);

    // Damage only row 0 on `right` -> incremental band paint runs (`culled` or partial band, sprite preserved)
    text = "two";
    right._sceneDirty = true;
    root._sceneDirty = true;
    root._damageLo = 1;
    root.calculateLayout(16, 4);
    paintScene(root, buf, { clearBg: DARK_BG });
    expect(buf._sprites.length).toBe(1);
    expect(buf.rowText(0, true)).toContain("two");
    root.destroy();
  });

  test("createDefaultScheduler backs rAF with a 24ms timer when rAF stalls and cancels both cleanly", () => {
    const prevRaf = globalThis.requestAnimationFrame;
    const prevCancel = globalThis.cancelAnimationFrame;
    let cancelledId = -1;
    globalThis.requestAnimationFrame = () => 77;
    globalThis.cancelAnimationFrame = (id: number) => {
      cancelledId = id;
    };
    jest.useFakeTimers();
    try {
      const sched = createDefaultScheduler();
      let runs = 0;
      sched.request(() => {
        runs++;
      });
      jest.advanceTimersByTime(23);
      expect(runs).toBe(0);
      jest.advanceTimersByTime(1);
      expect(runs).toBe(1);
      jest.advanceTimersByTime(100);
      expect(runs).toBe(1);

      let cancelledRuns = 0;
      const h = sched.request(() => {
        cancelledRuns++;
      });
      sched.cancel(h);
      expect(cancelledId).toBe(77);
      jest.advanceTimersByTime(100);
      expect(cancelledRuns).toBe(0);
    } finally {
      jest.useRealTimers();
      globalThis.requestAnimationFrame = prevRaf;
      globalThis.cancelAnimationFrame = prevCancel;
    }
  });
});
