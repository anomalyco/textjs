import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { DevToolsFrameSnapshot } from "../src/protocol";
import { hasRtl } from "../src/panel/format";
import { Grid, rowRuns } from "../src/panel/FrameView";

/** One row of cells; `styles[i]` groups cells into runs (same value = same fg). */
function frame(chars: string[], styles: number[] = chars.map(() => 0)): DevToolsFrameSnapshot {
  const n = chars.length;
  return {
    root: 1,
    cols: n,
    rows: 1,
    frame: 1,
    chars,
    fg: styles.map((s) => (s === 0 ? 0xffffffff : 0xff0000ff)),
    bg: new Array(n).fill(0),
    attrs: new Array(n).fill(0),
    owner: new Array(n).fill(0),
    owners: {},
  };
}

describe("FrameView: visual-order bidi text", () => {
  test("hasRtl covers Hebrew, Arabic, RLM and historic RTL scripts, not LTR text", () => {
    for (const s of ["םולש", "مرحبا", "\u200F", "ܐ", "\u{10900}", "\u{1EE00}", "ﭐ", "abc א"]) expect(hasRtl(s)).toBe(true);
    for (const s of ["hello", "123", "日本語", "→ ▼", ""]) expect(hasRtl(s)).toBe(false);
  });

  test("runs with RTL characters get an LTR bidi override; others stay untouched", () => {
    // "abc " then visual-order Hebrew (already reversed by core), in a different color.
    const runs = rowRuns(frame([..."abc ", ..."םולש"], [0, 0, 0, 0, 1, 1, 1, 1]), 0);
    expect(runs.map((r) => r.text)).toEqual(["abc ", "םולש"]);
    expect(runs[0]!.style.direction).toBeUndefined();
    expect(runs[0]!.style.unicodeBidi).toBeUndefined();
    expect(runs[1]!.style).toMatchObject({ direction: "ltr", unicodeBidi: "bidi-override" });
    // Mixed in one run: still overridden, since any RTL char can reorder the run.
    expect(rowRuns(frame([..."ab מ"]), 0)[0]!.style).toMatchObject({ direction: "ltr", unicodeBidi: "bidi-override" });
  });

  test("the grid container is LTR so an inherited RTL direction can't reverse span flow", () => {
    const html = renderToStaticMarkup(<Grid frame={frame([..."אב cd"])} cw={7} measure={() => undefined} />);
    expect(html).toMatch(/class="grid-rows" style="[^"]*direction:ltr/);
    expect(html).toMatch(/direction:ltr;unicode-bidi:bidi-override[^>]*>אב cd</);
  });
});
