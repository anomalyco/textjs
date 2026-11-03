import { afterEach, describe, expect, test } from "bun:test";
import { renderToAnsi } from "@textjs/core";
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
