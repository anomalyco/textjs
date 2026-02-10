import { describe, expect, test } from "bun:test";
import {
  blendOver,
  COLOR_DEFAULT,
  colorToCss,
  mixColors,
  packRGBA,
  parseColor,
  unpackRGBA,
  withAlpha,
} from "../src/index";

describe("packRGBA / unpackRGBA", () => {
  test("round-trips as unsigned 32-bit", () => {
    const c = packRGBA(255, 128, 1, 255);
    expect(c).toBe(0xff8001ff);
    expect(c).toBeGreaterThan(0);
    expect(unpackRGBA(c)).toEqual({ r: 255, g: 128, b: 1, a: 255 });
  });

  test("withAlpha replaces only the alpha channel", () => {
    expect(withAlpha(0x112233ff, 0.5)).toBe(0x11223380);
    expect(withAlpha(0x112233ff, 0)).toBe(0x11223300);
    expect(withAlpha(0x112233ff, 2)).toBe(0x112233ff);
  });
});

describe("parseColor", () => {
  test("hex forms", () => {
    expect(parseColor("#fff")).toBe(0xffffffff);
    expect(parseColor("#f008")).toBe(0xff000088);
    expect(parseColor("#22c55e")).toBe(0x22c55eff);
    expect(parseColor("#22C55E80")).toBe(0x22c55e80);
  });

  test("rgb() / rgba() including modern syntax", () => {
    expect(parseColor("rgb(1, 2, 3)")).toBe(0x010203ff);
    expect(parseColor("rgba(0, 0, 0, 0.65)")).toBe(packRGBA(0, 0, 0, 166));
    expect(parseColor("rgb(255 0 0 / 50%)")).toBe(packRGBA(255, 0, 0, 128));
  });

  test("named colors", () => {
    expect(parseColor("black")).toBe(0x000000ff);
    expect(parseColor("white")).toBe(0xffffffff);
    expect(parseColor("zinc")).toBe(0x71717aff);
    expect(parseColor("emerald")).toBe(0x10b981ff);
    expect(parseColor("magenta")).toBe(parseColor("fuchsia"));
    expect(parseColor("transparent")).toBe(0);
    expect(parseColor("Red")).toBe(0xef4444ff);
  });

  test("numbers pass through, junk resolves to default", () => {
    expect(parseColor(0x123456ff)).toBe(0x123456ff);
    expect(parseColor(-1)).toBe(0xffffffff);
    expect(parseColor(undefined)).toBe(COLOR_DEFAULT);
    expect(parseColor(null)).toBe(COLOR_DEFAULT);
    expect(parseColor("not-a-color")).toBe(COLOR_DEFAULT);
    expect(parseColor("#12")).toBe(COLOR_DEFAULT);
  });
});

describe("blendOver", () => {
  test("opaque and transparent shortcuts", () => {
    expect(blendOver(0xff0000ff, 0x00ff00ff)).toBe(0xff0000ff);
    expect(blendOver(0xff000000, 0x00ff00ff)).toBe(0x00ff00ff);
  });

  test("50% black over white is mid gray", () => {
    const out = unpackRGBA(blendOver(packRGBA(0, 0, 0, 128), 0xffffffff));
    expect(out.a).toBe(255);
    expect(out.r).toBeGreaterThanOrEqual(126);
    expect(out.r).toBeLessThanOrEqual(128);
    expect(out.r).toBe(out.g);
  });

  test("translucent over default background stays translucent", () => {
    const overlay = parseColor("rgba(0,0,0,0.65)");
    expect(blendOver(overlay, COLOR_DEFAULT)).toBe(overlay);
  });

  test("translucent over translucent accumulates alpha", () => {
    const out = unpackRGBA(blendOver(packRGBA(255, 0, 0, 128), packRGBA(0, 0, 255, 128)));
    expect(out.a).toBe(192);
    expect(out.r).toBeGreaterThan(out.b);
  });

  test("mixColors interpolates", () => {
    expect(mixColors(0x000000ff, 0xffffffff, 0.5)).toBe(packRGBA(128, 128, 128, 255));
  });
});

describe("colorToCss", () => {
  test("hex for opaque, #rrggbbaa otherwise, interned", () => {
    expect(colorToCss(0x22c55eff)).toBe("#22c55e");
    expect(colorToCss(packRGBA(0, 0, 0, 166))).toBe("#000000a6");
    expect(colorToCss(0x22c55eff)).toBe(colorToCss(0x22c55eff));
  });
});
