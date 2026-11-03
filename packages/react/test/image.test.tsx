import { afterEach, describe, expect, test } from "bun:test";
import type { ReactNode } from "react";
import { Box, FocusHint, Image, Text, type PixelData } from "../src/index";
import { cleanup, render } from "../src/testing";
import { createTestRoot } from "./helpers";

afterEach(cleanup);

/**
 * Text and ANSI output of `<Image>` outside sprite-capable consoles (tests, SSR, terminals, `text run`).
 * The digests were recorded from the 1.3.0 half-block `<Image>` and must not change.
 */

function digest(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

function rgba(width: number, height: number, fn: (x: number, y: number) => [number, number, number, number]): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(fn(x, y), (y * width + x) * 4);
  }
  return { width, height, data };
}

/** More than 256 colors, so an indexed PNG can't hold it. */
const PHOTO = rgba(48, 32, (x, y) => [x * 5, y * 8, (x * y) % 256, 255]);
/** Pixel art: four colors and fully transparent pixels. */
const ART = rgba(8, 8, (x, y) => ((x + y) % 3 === 0 ? [0, 0, 0, 0] : x < 4 ? [255, 64, 32, 255] : y < 4 ? [32, 200, 90, 255] : [40, 80, 255, 255]));
/** Partial alpha everywhere (anti-aliased edges). */
const SOFT = rgba(6, 6, (x, y) => [250, 220, 40, [0, 8, 64, 128, 200, 255][(x + y) % 6] as number]);

async function output(element: ReactNode, cols = 40, rows = 16): Promise<string> {
  const app = await render(element, { cols, rows });
  const out = `${app.lastFrame()}\n--\n${app.toAnsi()}`;
  await app.unmount();
  return digest(out);
}

const SCENES: Record<string, () => ReactNode> = {
  "photo contain": () => <Image pixels={PHOTO} width={20} height={6} />,
  "photo cover": () => <Image pixels={PHOTO} width={20} height={4} fit="cover" />,
  "photo cover tall": () => <Image pixels={PHOTO} width={6} height={8} fit="cover" />,
  "photo fill": () => <Image pixels={PHOTO} width={13} height={7} fit="fill" />,
  "photo width only": () => <Image pixels={PHOTO} width={17} />,
  "photo height only": () => <Image pixels={PHOTO} height={5} />,
  "photo natural size": () => <Image pixels={PHOTO} />,
  "art natural size": () => <Image pixels={ART} />,
  "art 2x": () => <Image pixels={ART} width={16} />,
  "soft alpha over a card": () => (
    <Box bg="#223344" padding={1} width={12} height={6}>
      <Image pixels={SOFT} width={6} />
    </Box>
  ),
  "art over a card": () => (
    <Box bg="#223344" padding={1} width={20} height={8}>
      <Image pixels={ART} width={8} />
    </Box>
  ),
  "side by side": () => (
    <Box flexDirection="row" gap={1}>
      <Image pixels={ART} width={8} />
      <Image pixels={PHOTO} width={12} height={4} fit="cover" />
    </Box>
  ),
  stacked: () => (
    <Box flexDirection="column">
      <Image pixels={ART} width={8} />
      <Text>between</Text>
      <Image pixels={PHOTO} width={12} height={4} />
    </Box>
  ),
  "clipped by overflow hidden": () => (
    <Box width={7} height={3} overflow="hidden">
      <Image pixels={PHOTO} width={16} height={6} fit="fill" />
    </Box>
  ),
  "modal over part": () => (
    <Box width={24} height={8}>
      <Image pixels={PHOTO} width={20} height={8} fit="fill" />
      <Box position="absolute" left={4} top={2} width={10} height={3} bg="#222222">
        <Text>modal</Text>
      </Box>
    </Box>
  ),
  "text over part": () => (
    <Box width={24} height={8}>
      <Image pixels={ART} width={16} height={8} fit="fill" />
      <Box position="absolute" left={2} top={3}>
        <Text>label</Text>
      </Box>
    </Box>
  ),
  "text beside on the same rows": () => (
    <Box flexDirection="row" gap={2}>
      <Image pixels={PHOTO} width={12} height={4} />
      <Box flexDirection="column">
        <Text>name</Text>
        <Text color="#888888">role</Text>
      </Box>
    </Box>
  ),
};

const GOLDEN: Record<string, string> = {
  "photo contain": "5c3fe836",
  "photo cover": "c72b5a6c",
  "photo cover tall": "ea9ec76a",
  "photo fill": "8bc2ea89",
  "photo width only": "f643cf14",
  "photo height only": "96afb2e4",
  "photo natural size": "c44d7c22",
  "art natural size": "42b39297",
  "art 2x": "74199e10",
  "soft alpha over a card": "39351aea",
  "art over a card": "fab6dd73",
  "side by side": "6618363b",
  "stacked": "a887b2ce",
  "clipped by overflow hidden": "0815ffee",
  "modal over part": "487bd229",
  "text over part": "99d0106e",
  "text beside on the same rows": "54c00715",
};

describe("<Image> half-block output", () => {
  for (const [name, scene] of Object.entries(SCENES)) {
    test(`${name}: text and ANSI match the 1.3.0 half-blocks`, async () => {
      const got = await output(scene());
      if (process.env.IMAGE_GOLDEN) console.log(`GOLDEN ${JSON.stringify(name)}: "${got}",`);
      else expect(got).toBe(GOLDEN[name] as string);
    });
  }
});

const SPRITE_URL = 'background-image:url("data:image/svg+xml,';

/** The rows of the last frame logged to the console, without `%c` markers. */
function consoleRows(t: Awaited<ReturnType<typeof createTestRoot>>): string[] {
  t.frame();
  const args = t.console.logs.at(-1) ?? [""];
  return String(args[0]).replace(/%c/g, "").replace(/[\u200b\u2060]/g, "").split("\n");
}

function consoleArgs(t: Awaited<ReturnType<typeof createTestRoot>>): string[] {
  t.frame();
  return (t.console.logs.at(-1) ?? []).slice(1).map(String);
}

function animating(t: Awaited<ReturnType<typeof createTestRoot>>): boolean {
  return (t.root.renderer as unknown as { spriteAnimatingUntil: number }).spriteAnimatingUntil > -Infinity;
}

describe("<Image> sprites in the Chromium console", () => {
  test("a lone image is one crisp sprite at its source resolution", async () => {
    const t = await createTestRoot({ width: 30, height: 8 });
    await t.render(<Image pixels={PHOTO} width={20} height={6} />);
    t.frame();
    const sp = t.root.renderer.buffer._sprites;
    expect(sp.length).toBe(1);
    // Contain lands on the cells the half-blocks use (18 of 20 columns) and fills them.
    expect(sp[0]).toMatchObject({ x: 1, y: 0, width: 18, height: 6, sourceWidth: 48, sourceHeight: 32, fit: "fill", encoding: "rgba" });
    expect(consoleArgs(t).filter((a) => a.includes(SPRITE_URL)).length).toBe(1);
    expect(consoleRows(t).join("")).not.toContain("▀");
    await t.unmount();
  });

  test("large images shrink: photos to 4 × 8 pixels per cell, indexed pixel art to 8 × 16", async () => {
    const t = await createTestRoot({ width: 30, height: 14 });
    await t.render(<Image pixels={ART} width={16} />);
    expect(t.root.renderer.buffer._sprites[0]).toMatchObject({ width: 16, height: 8, sourceWidth: 8, sourceHeight: 8, fit: "fill", encoding: "indexed" });
    // 1000×500 at 10 columns is a 10×3-cell sprite.
    await t.render(<Image pixels={rgba(1000, 500, (x, y) => [x % 256, y % 256, 0, 255])} width={10} />);
    expect(t.root.renderer.buffer._sprites[0]).toMatchObject({ width: 10, height: 3, sourceWidth: 40, sourceHeight: 20, encoding: "rgba" });
    await t.render(<Image pixels={rgba(400, 400, () => [200, 40, 40, 255])} width={10} />);
    expect(t.root.renderer.buffer._sprites[0]).toMatchObject({ width: 10, height: 5, sourceWidth: 80, sourceHeight: 80, encoding: "indexed" });
    // A 256×256 photo at 24 columns is 96×96 RGBA, smaller than its half-block frame.
    const photo = rgba(256, 256, (x, y) => [x, y, (x * y) & 255, 255]);
    await t.render(<Image pixels={photo} width={24} />);
    expect(t.root.renderer.buffer._sprites[0]).toMatchObject({ sourceWidth: 96, sourceHeight: 96, encoding: "rgba" });
    const spriteBytes = consoleArgs(t).find((a) => a.includes(SPRITE_URL))?.length ?? 0;
    expect(spriteBytes).toBeGreaterThan(0);
    expect(spriteBytes).toBeLessThan(40_000);
    await t.render(<Image pixels={photo} width={24} renderMode="halfblock" />);
    const halfBlockBytes = consoleArgs(t).join("").length;
    expect(spriteBytes).toBeLessThan(halfBlockBytes);
    await t.unmount();
  });

  test("cover center-crops the sprite the way it crops the half-blocks", async () => {
    const t = await createTestRoot({ width: 30, height: 8 });
    await t.render(<Image pixels={PHOTO} width={20} height={4} fit="cover" />);
    const sp = t.root.renderer.buffer._sprites[0];
    // 48×32 into 20×8 half-block pixels: full width, the middle 19 rows.
    expect(sp).toMatchObject({ sourceWidth: 48, sourceHeight: 19, fit: "fill" });
    expect(sp?.pixels[0]).toBe(0x00300000 | 255);
    await t.unmount();
  });

  test("two images side by side both show (as half-blocks, since they share rows)", async () => {
    const t = await createTestRoot({ width: 30, height: 6 });
    await t.render(
      <Box flexDirection="row" gap={1}>
        <Image pixels={ART} width={8} />
        <Image pixels={PHOTO} width={12} height={4} fit="cover" />
      </Box>,
    );
    expect(t.root.renderer.buffer._sprites.length).toBe(2);
    const rows = consoleRows(t);
    expect(rows[0]?.slice(0, 8)).toMatch(/[▀▄]/);
    expect(rows[0]?.slice(9, 21)).toMatch(/^▀{12}$/);
    expect(consoleArgs(t).some((a) => a.includes(SPRITE_URL))).toBe(false);
    await t.unmount();
  });

  test("stacked images are two sprites", async () => {
    const t = await createTestRoot({ width: 30, height: 12 });
    await t.render(
      <Box flexDirection="column">
        <Image pixels={ART} width={8} />
        <Text>between</Text>
        <Image pixels={PHOTO} width={12} height={4} />
      </Box>,
    );
    expect(t.root.renderer.buffer._sprites.length).toBe(2);
    expect(consoleArgs(t).filter((a) => a.includes(SPRITE_URL)).length).toBe(2);
    expect(consoleRows(t).join("\n")).toContain("between");
    await t.unmount();
  });

  test("an overflow='hidden' parent clips the image to half-blocks inside the box", async () => {
    const t = await createTestRoot({ width: 20, height: 4 });
    await t.render(
      <Box width={7} height={3} overflow="hidden">
        <Image pixels={PHOTO} width={16} height={6} fit="fill" />
      </Box>,
    );
    expect(t.root.renderer.buffer._sprites.length).toBe(0);
    const rows = consoleRows(t);
    expect(rows[0]?.slice(0, 7)).toBe("▀▀▀▀▀▀▀");
    expect(rows[0]?.slice(7).trim()).toBe("");
    await t.unmount();
  });

  test("a filled box over part of the image keeps its background", async () => {
    const t = await createTestRoot({ width: 24, height: 8 });
    await t.render(
      <Box width={24} height={8}>
        <Image pixels={PHOTO} width={20} height={8} fit="fill" />
        <Box position="absolute" left={4} top={2} width={10} height={3} bg="#222222">
          <Text>modal</Text>
        </Box>
      </Box>,
    );
    expect(t.root.renderer.buffer.getCell(10, 3)?.bg).toBe(0x222222ff);
    expect(t.root.renderer.buffer.getCell(5, 2)?.bg).toBe(0x222222ff);
    const rows = consoleRows(t);
    expect(rows[2]?.slice(4, 14)).toBe("modal     ");
    expect(rows[2]?.slice(0, 4)).toBe("▀▀▀▀");
    expect(consoleArgs(t).some((a) => a.includes("#222222"))).toBe(true);
    await t.unmount();
  });

  test("the focus-hint banner covers the image's last row, and the sprite comes back after the encode", async () => {
    const t = await createTestRoot({ width: 40, height: 4, focusHint: false });
    await t.render(
      <>
        <Image pixels={PHOTO} width={40} height={4} fit="fill" />
        <FocusHint active />
      </>,
    );
    expect(consoleArgs(t).filter((a) => a.includes(SPRITE_URL)).length).toBe(1);
    await t.act(() => t.engine.setFocused(false));
    const rows = consoleRows(t).filter((r) => r.trim() !== "");
    expect(rows.at(-1)?.trim()).toBe("Click the page to use the keyboard");
    expect(rows[0]).toMatch(/^▀{40}$/);
    expect(t.root.renderer.buffer._sprites.length).toBe(1);
    await t.act(() => t.engine.setFocused(true));
    expect(consoleArgs(t).filter((a) => a.includes(SPRITE_URL)).length).toBe(1);
    await t.unmount();
  });

  test("transparent pixels show the card behind them in the console and in <ConsoleMirror>", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { extractStyledFrame } = await import("@textjs/core");
    const { ConsoleMirror } = await import("../src/dom/ConsoleMirror");
    const t = await createTestRoot({ width: 12, height: 6 });
    await t.render(
      <Box bg="#223344" padding={1} width={12} height={6}>
        <Image pixels={SOFT} width={6} />
      </Box>,
    );
    const sp = t.root.renderer.buffer._sprites[0];
    expect(sp).toMatchObject({ encoding: "rgba", underBg: 0x223344ff });
    expect(consoleArgs(t).find((a) => a.includes(SPRITE_URL))).toContain("background-color:#223344;");
    const html = renderToStaticMarkup(<ConsoleMirror frame={extractStyledFrame(t.root.renderer.buffer)} chrome={false} />);
    expect(html).toContain("background:#223344");
    expect(html).toContain("data:image/png;base64,");
    await t.unmount();
  });

  test("static images never enter fast sprite pacing or keyframe batching; changing ones do", async () => {
    const t = await createTestRoot({ width: 30, height: 6 });
    function Scene({ n, art = ART }: { n: number; art?: PixelData }) {
      return (
        <Box flexDirection="column">
          <Image pixels={art} width={8} />
          <Text>{`tick ${n}`}</Text>
        </Box>
      );
    }
    for (let n = 0; n < 4; n++) {
      await t.render(<Scene n={n} />);
      t.frame();
      expect(animating(t)).toBe(false);
      expect(t.root.renderer.driver._hasStagedKeyframes).toBe(false);
    }
    // A photo with more than 256 colors is RGBA, which never batches, even while it changes.
    await t.render(<Scene n={5} art={PHOTO} />);
    await t.render(<Scene n={6} art={rgba(48, 32, (x, y) => [x * 5, y * 8, (x + y) % 256, 255])} />);
    t.frame();
    expect(animating(t)).toBe(false);
    // Opaque pixel art that changes frame to frame is a live sprite.
    const solid = (r: number): PixelData => rgba(8, 8, () => [r, 0, 0, 255]);
    await t.render(<Scene n={7} art={solid(10)} />);
    await t.render(<Scene n={8} art={solid(200)} />);
    t.frame();
    expect(animating(t)).toBe(true);
    await t.unmount();
  });

  test("Safari gets the same half-blocks as before", async () => {
    const { CssConsoleDriver } = await import("@textjs/core");
    const app = await render(<Image pixels={PHOTO} width={20} height={6} />, { cols: 20, rows: 6 });
    const con = { logs: [] as unknown[][], clear() {}, log(...a: unknown[]) { this.logs.push(a); } };
    new CssConsoleDriver({ console: con, browser: "safari" }).render(app.root.renderer.buffer);
    const text = String(con.logs.at(-1)?.[0]).replace(/%c/g, "").replace(/[\u200b\u2060]/g, "");
    expect(text.split("\n").filter((r) => r.trim() !== "").map((r) => r.trimEnd())).toEqual(app.lines().map((r) => r.trimEnd()));
  });
});

describe("<Image> sprite edge cases", () => {
  test("a photo beside text draws as half-blocks, so counter updates don't resend its data URL", async () => {
    const t = await createTestRoot({ width: 40, height: 10 });
    const photo = rgba(256, 256, (x, y) => [x, y, (x * y) & 255, 255]);
    function Scene({ n }: { n: number }) {
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={2}>
            <Image pixels={photo} width={12} />
            <Text>caption</Text>
          </Box>
          <Text>{`count ${n}`}</Text>
        </Box>
      );
    }
    await t.render(<Scene n={0} />);
    expect(consoleRows(t)[0]).toContain("▀");
    const clears = t.console.clears;
    for (let n = 1; n <= 30; n++) {
      await t.render(<Scene n={n} />);
      t.frame();
    }
    expect(t.console.logs.flat().some((a) => String(a).includes("url("))).toBe(false);
    expect(t.console.clears).toBe(clears);
    expect(consoleRows(t).join("\n")).toContain("count 30");
    await t.unmount();
  });

  test("an isolated photo stays a single-span sprite", async () => {
    const t = await createTestRoot({ width: 40, height: 10 });
    await t.render(
      <Box flexDirection="column">
        <Image pixels={rgba(256, 256, (x, y) => [x, y, (x * y) & 255, 255])} width={12} />
        <Text>caption</Text>
      </Box>,
    );
    const urls = consoleArgs(t).filter((a) => a.includes(SPRITE_URL));
    expect(urls.length).toBe(1);
    await t.unmount();
  });

  test("pixel art beside text seals its right edge against an opaque neighbour in Chromium, not in Firefox", async () => {
    const scene = (
      <Box bg="#0a0a0a" flexDirection="row" width={30} height={6}>
        <Image pixels={ART} width={8} />
        <Text>label</Text>
      </Box>
    );
    const t = await createTestRoot({ width: 30, height: 6 });
    await t.render(scene);
    const slices = consoleArgs(t).filter((a) => a.includes(SPRITE_URL));
    expect(slices.length).toBe(4);
    for (const css of slices) {
      expect(css).toContain("padding-right:1px;margin-right:-1px;");
      expect(css).toContain("background-size:calc(100% - 1px) ");
    }
    await t.unmount();
    const ff = await createTestRoot({ width: 30, height: 6, browser: "firefox" });
    await ff.render(scene);
    const ffSlices = consoleArgs(ff).filter((a) => a.includes(SPRITE_URL));
    expect(ffSlices.length).toBe(4);
    for (const css of ffSlices) {
      expect(css).not.toContain("margin-right:-1px");
      expect(css).toContain("background-size:100% ");
    }
    await ff.unmount();
  });

  test("transparent pixels over mixed backgrounds or text fall back to cells", async () => {
    const t = await createTestRoot({ width: 20, height: 6 });
    const over = (under: ReactNode) => (
      <Box width={20} height={6}>
        {under}
        <Box position="absolute" left={0} top={0}>
          <Image pixels={SOFT} width={12} />
        </Box>
      </Box>
    );
    await t.render(over(<Box bg="#223344" width={20} height={6} />));
    expect(t.root.renderer.buffer._sprites.length).toBe(1);
    await t.render(
      over(
        <Box flexDirection="row">
          <Box bg="#223344" width={6} height={6} />
          <Box bg="#443322" width={14} height={6} />
        </Box>,
      ),
    );
    expect(t.root.renderer.buffer._sprites.length).toBe(0);
    expect(t.root.renderer.buffer.getCell(8, 0)?.bg).not.toBe(t.root.renderer.buffer.getCell(2, 0)?.bg);
    await t.render(over(<Text>under the image</Text>));
    expect(t.root.renderer.buffer._sprites.length).toBe(0);
    // An opaque image doesn't care what's under it.
    await t.render(
      <Box flexDirection="row">
        <Box bg="#223344" width={6} height={6} />
        <Box position="absolute" left={0} top={0}>
          <Image pixels={PHOTO} width={12} />
        </Box>
      </Box>,
    );
    expect(t.root.renderer.buffer._sprites.length).toBe(1);
    await t.unmount();
  });

  test('renderMode="halfblock" registers no sprite and keeps the 1.3 output', async () => {
    const app = await render(<Image pixels={PHOTO} width={20} height={6} renderMode="halfblock" />, { cols: 40, rows: 16 });
    expect(app.root.renderer.buffer._sprites.length).toBe(0);
    await app.unmount();
    expect(await output(<Image pixels={PHOTO} width={20} height={6} renderMode="halfblock" />)).toBe(GOLDEN["photo contain"] as string);
    expect(await output(<Image pixels={PHOTO} width={20} height={4} fit="cover" renderMode="halfblock" />)).toBe(GOLDEN["photo cover"] as string);
  });
});
