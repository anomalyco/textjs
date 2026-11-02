import { describe, expect, test } from "bun:test";
import { CellBuffer, extractStyledFrame, ATTR_BOLD, ATTR_UNDERLINE, type StyledFrame } from "@textjs/core";
import {
  encodeFullFrame,
  FLAG_BOLD,
  FLAG_UNDERLINE,
  FrameDecoder,
  FrameEncoder,
  frameToText,
  isWireFrame,
  parseDevStatus,
  parseInputMessage,
  parseWireFrame,
  type WireFrame,
} from "../src/frame-protocol";

function buffer(lines: string[], width = 12): CellBuffer {
  const buf = new CellBuffer(width, lines.length);
  lines.forEach((l, y) => buf.drawText(0, y, l, 0xededffff, 0x0a0a0aff, 0));
  return buf;
}

function strip(frame: StyledFrame): Array<Array<[string, string | null, string | null, boolean, number]>> {
  return frame.rows.map((r) => r.map((s) => [s.text, s.fgCss, s.bgCss, s.bold, s.width]));
}

describe("frame protocol", () => {
  test("round-trips a styled frame (text, colors, attributes, wide cells)", () => {
    const buf = new CellBuffer(10, 3);
    buf.drawText(0, 0, "▼ Text", 0xff0000ff, 0x000000ff, ATTR_BOLD);
    buf.drawText(0, 1, "100%", 0x00ff00ff, 0, ATTR_UNDERLINE);
    buf.drawText(0, 2, "界e", 0xffffffff, 0, 0);
    const frame = extractStyledFrame(buf);
    const msg = new FrameEncoder().encode(frame) as WireFrame;
    expect(msg.full).toBe(true);
    expect(msg.rows).toHaveLength(3);
    expect(isWireFrame(JSON.parse(JSON.stringify(msg)))).toBe(true);
    const out = new FrameDecoder().apply(JSON.parse(JSON.stringify(msg))) as StyledFrame;
    expect(strip(out)).toEqual(strip(frame));
    expect(out.rows[0]?.[0]?.bold).toBe(true);
    expect(out.rows[1]?.[0]?.underline).toBe(true);
    expect(msg.styles.some((s) => s[2] === FLAG_BOLD)).toBe(true);
    expect(msg.styles.some((s) => s[2] === FLAG_UNDERLINE)).toBe(true);
    // The wide glyph occupies two columns: width is sent explicitly.
    expect(msg.rows[2]?.[1].some((s) => s.length === 3)).toBe(true);
    expect(frameToText(out)).toBe(frameToText(frame));
  });

  test("sends only changed rows, and nothing when idle", () => {
    const enc = new FrameEncoder();
    const dec = new FrameDecoder();
    const buf = buffer(["alpha", "beta", "gamma"]);
    dec.apply(enc.encode(extractStyledFrame(buf)) as WireFrame);
    expect(enc.encode(extractStyledFrame(buf))).toBeNull();
    buf.drawText(0, 1, "BETA", 0xededffff, 0x0a0a0aff, 0);
    const delta = enc.encode(extractStyledFrame(buf)) as WireFrame;
    expect(delta.full).toBe(false);
    expect(delta.rows.map((r) => r[0])).toEqual([1]);
    expect(delta.seq).toBe(2);
    expect(frameToText(dec.apply(delta) as StyledFrame)).toBe("alpha\nBETA\ngamma");
  });

  test("resizes and reset() force full frames; deltas before a full frame are ignored", () => {
    const enc = new FrameEncoder();
    enc.encode(extractStyledFrame(buffer(["a"])));
    expect(enc.encode(extractStyledFrame(buffer(["a", "b"])))?.full).toBe(true);
    enc.reset();
    const full = enc.encode(extractStyledFrame(buffer(["a", "b"]))) as WireFrame;
    expect(full.full).toBe(true);
    const dec = new FrameDecoder();
    expect(dec.apply({ ...full, full: false })).toBeNull();
    expect(dec.apply(full)).not.toBeNull();
  });

  test("meta changes produce a message even when rows are unchanged", () => {
    const enc = new FrameEncoder();
    const frame = extractStyledFrame(buffer(["x"]));
    enc.encode(frame, { meta: { path: "/" } });
    const msg = enc.encode(frame, { meta: { path: "/logs" } }) as WireFrame;
    expect(msg.rows).toHaveLength(0);
    const dec = new FrameDecoder();
    dec.apply(encodeFullFrame(frame, { meta: { path: "/" } }));
    dec.apply(msg);
    expect(dec.meta.path).toBe("/logs");
  });

  test("encodeFullFrame keeps source and seq for late subscribers", () => {
    const msg = encodeFullFrame(extractStyledFrame(buffer(["x"])), { source: "tab1", seq: 41 });
    expect(msg).toMatchObject({ full: true, source: "tab1", seq: 41 });
  });

  test("isWireFrame rejects malformed frames and non-hex colors", () => {
    const good = encodeFullFrame(extractStyledFrame(buffer(["x"])));
    expect(isWireFrame(good)).toBe(true);
    expect(isWireFrame({ ...good, v: 2 })).toBe(false);
    expect(isWireFrame({ ...good, width: 0 })).toBe(false);
    expect(isWireFrame({ ...good, height: 5000 })).toBe(false);
    expect(isWireFrame({ ...good, styles: [["red;background:url(x)", null, 0]] })).toBe(false);
    expect(isWireFrame({ ...good, rows: [[0, [[1, 0]]]] })).toBe(false);
    expect(isWireFrame(null)).toBe(false);
  });

  test("parseWireFrame bounds every field and copies only known meta", () => {
    const good = encodeFullFrame(extractStyledFrame(buffer(["ab", "cd"], 4)), { source: "tab1", meta: { path: "/x", title: "T", focused: true } });
    expect(parseWireFrame(JSON.parse(JSON.stringify(good)))).toEqual(good);
    const bad = (patch: Record<string, unknown>) => parseWireFrame({ ...good, ...patch });
    // seq and source
    expect(bad({ seq: 1.5 })).toBeNull();
    expect(bad({ seq: "1" })).toBeNull();
    expect(bad({ source: { toString: "x" } })).toBeNull();
    expect(bad({ source: "" })).toBeNull();
    expect(bad({ source: "x".repeat(65) })).toBeNull();
    // meta: a non-string path used to crash the editor's address bar
    expect(bad({ meta: { path: 42 } })).toBeNull();
    expect(bad({ meta: { path: "https://evil.example" } })).toBeNull();
    expect(bad({ meta: { path: "//evil.example" } })).toBeNull();
    expect(bad({ meta: { path: `/${"a".repeat(3000)}` } })).toBeNull();
    expect(bad({ meta: { focused: "yes" } })).toBeNull();
    expect(bad({ meta: { title: {} } })).toBeNull();
    expect(bad({ meta: "x" })).toBeNull();
    expect(bad({ meta: { path: "/ok", title: "t".repeat(2000), evil: "<script>" } })?.meta).toEqual({ path: "/ok", title: "t".repeat(512) });
    // grid, styles, rows and spans
    expect(bad({ width: 2.5 })).toBeNull();
    expect(bad({ styles: Array.from({ length: 4097 }, () => [null, null, 0]) })).toBeNull();
    expect(bad({ styles: [[null, null, -1]] })).toBeNull();
    expect(bad({ styles: [[null, null, 1.5]] })).toBeNull();
    expect(bad({ rows: [[0, []], [1, []], [1, []]] })).toBeNull(); // more rows than the grid has
    expect(bad({ rows: [[2, []]] })).toBeNull(); // outside the grid
    expect(bad({ rows: [[-1, []]] })).toBeNull();
    expect(bad({ rows: [[0, [["a", 0], ["b", 0], ["c", 0], ["d", 0], ["e", 0]]]] })).toBeNull(); // more spans than columns
    expect(bad({ rows: [[0, [["a", 0, 0]]]] })).toBeNull(); // zero width (duplicate React keys)
    expect(bad({ rows: [[0, [["a", 0, -3]]]] })).toBeNull();
    expect(bad({ rows: [[0, [["a", 0, 5]]]] })).toBeNull(); // wider than the grid
    expect(bad({ rows: [[0, [["", 0]]]] })).toBeNull(); // implicit zero width
    expect(bad({ rows: [[0, [["abcde", 0]]]] })).toBeNull();
    expect(bad({ rows: [[0, [["a", 9]]]] })).toBeNull(); // unknown style
    expect(bad({ rows: [[0, [["a", 0, 1, "extra"]]]] })).toBeNull();
    // total text is bounded
    const huge = { ...good, width: 1000, height: 1000, rows: Array.from({ length: 1000 }, (_, y) => [y, [["x".repeat(2000), 0, 1000]]]) };
    expect(parseWireFrame(huge)).toBeNull();
    // a wide glyph with explicit width is fine
    expect(bad({ rows: [[0, [["界", 0, 2], ["e", 0]]]] })).not.toBeNull();
  });

  test("parseDevStatus validates status documents", () => {
    const ok = { name: "textjs", version: "1.0.0", root: "/app", clients: 1, sources: 1, watchers: 0, grid: { width: 90, height: 30 }, path: "/logs", basePath: "/docs" };
    expect(parseDevStatus(ok)).toEqual(ok);
    expect(parseDevStatus({ ...ok, path: { evil: 1 } })?.path).toBeNull();
    expect(parseDevStatus({ ...ok, path: "//evil.example" })?.path).toBeNull();
    expect(parseDevStatus({ ...ok, grid: { width: -1, height: 2 } })?.grid).toBeNull();
    expect(parseDevStatus({ ...ok, sources: "9" })?.sources).toBe(0);
    expect(parseDevStatus({ ...ok, name: "other" })).toBeNull();
    expect(parseDevStatus({ ...ok, root: 1 })).toBeNull();
    // basePath: older servers omit it; malformed values are dropped.
    expect(parseDevStatus({ ...ok, basePath: undefined })?.basePath).toBe("");
    for (const bad of ["docs", "/docs/", "//evil.example", "/a?b", 7]) expect(parseDevStatus({ ...ok, basePath: bad })?.basePath).toBe("");
  });

  test("parseInputMessage validates and normalizes untrusted input", () => {
    expect(parseInputMessage({ type: "key", key: "ArrowUp", shiftKey: true, evil: 1 })).toEqual({
      type: "key",
      key: "ArrowUp",
      ctrlKey: false,
      metaKey: false,
      shiftKey: true,
      altKey: false,
    });
    expect(parseInputMessage({ type: "key", key: "" })).toBeNull();
    expect(parseInputMessage({ type: "key", key: "x".repeat(64) })).toBeNull();
    expect(parseInputMessage({ type: "paste", text: "hi" })).toEqual({ type: "paste", text: "hi" });
    expect(parseInputMessage({ type: "text", text: "你好", extra: 1 })).toEqual({ type: "text", text: "你好" });
    expect(parseInputMessage({ type: "text", text: "" })).toBeNull();
    expect(parseInputMessage({ type: "text", text: 1 })).toBeNull();
    expect(parseInputMessage({ type: "wheel", deltaY: 1e9, deltaX: "x", deltaMode: 7 })).toEqual({ type: "wheel", deltaX: 0, deltaY: 10_000, deltaMode: 0 });
    expect(parseInputMessage({ type: "navigate", href: "/logs?x=1" })).toEqual({ type: "navigate", href: "/logs?x=1" });
    expect(parseInputMessage({ type: "navigate", href: "https://evil.example" })).toBeNull();
    expect(parseInputMessage({ type: "navigate", href: "//evil.example" })).toBeNull();
    expect(parseInputMessage({ type: "navigate", href: "/\\evil" })).toBeNull();
    expect(parseInputMessage({ type: "exec" })).toBeNull();
    expect(parseInputMessage("key")).toBeNull();
  });
});
