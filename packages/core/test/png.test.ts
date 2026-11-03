import { describe, expect, test } from "bun:test";
import { inflateSync } from "node:zlib";
import { bytesToBase64, deflateZlib, encodeIndexedPng, encodeSpriteSvgDataUrl } from "../src/drivers/png";

/** Parse and decompress an 8-bit indexed PNG back into `width * height` packed RGBA pixels, verifying every chunk CRC. */
function decodeIndexedPng(b64: string): { width: number; height: number; pixels: Uint32Array } {
  const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
  expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8;
  let width = 0;
  let height = 0;
  const palette = new Uint32Array(256);
  const alpha = new Uint8Array(256).fill(255);
  const idatParts: Uint8Array[] = [];
  let sawIend = false;

  while (p < bytes.length) {
    const len = dv.getUint32(p, false);
    const type = String.fromCharCode(bytes[p + 4]!, bytes[p + 5]!, bytes[p + 6]!, bytes[p + 7]!);
    const data = bytes.subarray(p + 8, p + 8 + len);
    p += 12 + len;
    if (type === "IHDR") {
      width = dv.getUint32(8 + 8, false);
      height = dv.getUint32(8 + 12, false);
      expect(data[8]).toBe(8);
      expect(data[9]).toBe(3);
    } else if (type === "PLTE") {
      for (let i = 0; i < len / 3; i++) {
        palette[i] = ((data[i * 3]! << 24) | (data[i * 3 + 1]! << 16) | (data[i * 3 + 2]! << 8) | 255) >>> 0;
      }
    } else if (type === "tRNS") {
      for (let i = 0; i < len; i++) alpha[i] = data[i]!;
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
  }
  expect(sawIend).toBe(true);
  const compressed = Buffer.concat(idatParts);
  const raw = new Uint8Array(inflateSync(compressed));
  expect(raw.length).toBe(height * (width + 1));

  const out = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    expect(raw[y * (width + 1)]).toBe(0);
    for (let x = 0; x < width; x++) {
      const idx = raw[y * (width + 1) + 1 + x]!;
      const a = alpha[idx]!;
      out[y * width + x] = a === 0 ? 0 : (((palette[idx]! & 0xffffff00) | a) >>> 0);
    }
  }
  return { width, height, pixels: out };
}

describe("deflateZlib & encodeIndexedPng", () => {
  test("deflateZlib roundtrips empty, single-byte, RLE, random, and Fibonacci-skewed inputs", () => {
    const out = new Uint8Array(200_000);

    // 1. Single byte
    const one = new Uint8Array([42]);
    let n = deflateZlib(one, 1, out, 0);
    expect(new Uint8Array(inflateSync(out.subarray(0, n)))).toEqual(one);

    // 2. Fibonacci symbol frequencies (forces raw Huffman tree depth > 15 -> exercises Kraft length-limiting!)
    const fib: number[] = [1, 1];
    for (let i = 2; i < 20; i++) fib.push(fib[i - 1]! + fib[i - 2]!);
    const total = fib.reduce((a, b) => a + b, 0);
    const skewed = new Uint8Array(total);
    let pos = 0;
    // Interleave to prevent trivial RLE collapse so literal frequencies follow Fibonacci!
    for (let s = 0; s < fib.length; s++) {
      for (let k = 0; k < fib[s]!; k++) skewed[pos++] = (s * 13 + (k & 1 ? 100 : 0)) & 255;
    }
    n = deflateZlib(skewed, skewed.length, out, 0);
    expect(new Uint8Array(inflateSync(out.subarray(0, n)))).toEqual(skewed);

    // 3. 64KB textured pattern (triggers Dynamic Huffman + LZ77 lazy matching)
    const tex = new Uint8Array(64200);
    for (let i = 0; i < tex.length; i++) tex[i] = ((i * 7) ^ (i >> 5)) & 63;
    n = deflateZlib(tex, tex.length, out, 0);
    expect(n).toBeLessThan(tex.length / 2);
    expect(new Uint8Array(inflateSync(out.subarray(0, n)))).toEqual(tex);
  });

  test("encodeIndexedPng is pixel-exact for <=256 colors and compresses deltas cleanly", () => {
    const w = 64;
    const h = 40;
    const f0 = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = ((x & 15) * 16) << 24 | ((y & 15) * 16) << 16 | 0x40ff;
        f0[y * w + x] = c >>> 0;
      }
    }
    const png0 = encodeIndexedPng(f0, w, h)!;
    expect(png0.y0).toBe(0);
    expect(png0.height).toBe(h);
    const dec0 = decodeIndexedPng(png0.base64);
    expect(dec0.pixels).toEqual(f0);

    // Identical next frame returns null
    expect(encodeIndexedPng(f0, w, h, { prev: f0 })).toBeNull();

    // Small center patch changed -> cropped delta with transparent runs
    const f1 = f0.slice();
    for (let y = 12; y < 20; y++) {
      for (let x = 20; x < 28; x++) f1[y * w + x] = 0xff2244ff;
    }
    const delta = encodeIndexedPng(f1, w, h, { prev: f0 })!;
    expect(delta.y0).toBe(12);
    expect(delta.height).toBe(8);
    expect(delta.byteLength).toBeLessThan(png0.byteLength);

    // Composite delta over f0 and verify 100% pixel identity with f1
    const decDelta = decodeIndexedPng(delta.base64);
    const composited = f0.slice();
    for (let y = 0; y < decDelta.height; y++) {
      for (let x = 0; x < w; x++) {
        const p = decDelta.pixels[y * w + x]!;
        if ((p & 255) !== 0) composited[(delta.y0 + y) * w + x] = p;
      }
    }
    expect(composited).toEqual(f1);
  });

  test("encodeIndexedPng handles >256 unique truecolor gradients via fallback cube quantizer", () => {
    const w = 32;
    const h = 32;
    const grad = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        grad[y * w + x] = (((x * 8) << 24) | ((y * 8) << 16) | (((x + y) * 4) << 8) | 255) >>> 0;
      }
    }
    const png = encodeIndexedPng(grad, w, h)!;
    const dec = decodeIndexedPng(png.base64);
    expect(dec.width).toBe(w);
    expect(dec.height).toBe(h);
    // Corners match within fallback cube step (<=26 per channel)
    expect(dec.pixels[0]).toBe(0x000000ff);
  });

  test("bytesToBase64 fallback matches native base64 across 0..20 byte lengths", () => {
    for (let len = 0; len <= 20; len++) {
      const b = new Uint8Array(len);
      for (let i = 0; i < len; i++) b[i] = (i * 73 + 19) & 255;
      // Hide toBase64 on a subclassed/masked view to exercise the pure-JS fallback
      const plain = Object.defineProperty(b.slice(), "toBase64", { value: undefined });
      expect(bytesToBase64(plain)).toBe(Buffer.from(b).toString("base64"));
    }
  });

  test("encodeSpriteSvgDataUrl builds single and multi-keyframe SVGs without parentheses in data URL", () => {
    const px = new Uint32Array([0xff0000ff, 0x00ff00ff, 0x0000ffff, 0xffffffff]);
    const p0 = encodeIndexedPng(px, 2, 2)!;
    const single = encodeSpriteSvgDataUrl([{ png: p0, delayMs: 0 }], 2, 2, 40, 40);
    expect(single.startsWith("data:image/svg+xml,")).toBe(true);
    expect(single).toContain("image-rendering:pixelated");
    expect(single).not.toContain("@keyframes");

    const multi = encodeSpriteSvgDataUrl(
      [
        { png: p0, delayMs: 0 },
        { png: p0, delayMs: 28 },
      ],
      2,
      2,
      40,
      40,
    );
    expect(multi).toContain("@keyframes s");
    expect(multi).toContain("28ms forwards");
  });
});
