import { afterEach, describe, expect, test } from "bun:test";
import { AsciiFont } from "@textjs/react";
import { cleanup, render, renderToString } from "@textjs/react/testing";
import { small } from "../src/fonts/small";
import { slant } from "../src/fonts/slant";
import { renderFiglet } from "../src/index";
import { FigletText } from "../src/react";

afterEach(cleanup);

const frame = (rows: string[]): string => rows.map((r) => r.trimEnd()).join("\n").replace(/\n+$/, "");

describe("React integration", () => {
  test("<FigletText> renders figlet rows cell-exact", async () => {
    const out = await renderToString(<FigletText font={slant}>Text.js</FigletText>, { cols: 60, rows: 8 });
    expect(out).toBe(frame(renderFiglet(slant, "Text.js")));
  });

  test("<FigletText> passes layout, columns and align through", async () => {
    const opts = { layout: "full", width: 30, align: "center" } as const;
    const out = await renderToString(
      <FigletText font={small} layout="full" columns={30} align="center">
        {["console", ".log"]}
      </FigletText>,
      { cols: 40, rows: 16 },
    );
    expect(out).toBe(frame(renderFiglet(small, "console.log", opts)));
  });

  test("<AsciiFont font={font}> accepts a FIGlet font and keeps colors", async () => {
    const r = await render(<AsciiFont text="Hi" font={small} color="#ff0000" />, { cols: 30, rows: 6 });
    expect(r.lastFrame()).toBe(frame(small.render("Hi")));
    const pos = r.locate("|");
    expect(pos).not.toBeNull();
    expect(r.cell(pos!.x, pos!.y)?.fg).toBe(0xff0000ff);
  });

  test("<AsciiFont> built-in fonts are unchanged", async () => {
    const out = await renderToString(<AsciiFont text="HI" />, { cols: 20, rows: 6 });
    expect(out.split("\n")[0]).toBe("█  █ ███");
  });
});
