import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HERO_FILES } from "../src/pages/home-files";
import { HighlightedCode } from "../src/site/highlight";

describe("hero files", () => {
  test("app/globals.css is empty and renders one numbered line", () => {
    const css = HERO_FILES.find((f) => f.name === "app/globals.css");
    expect(css).toEqual({ name: "app/globals.css", language: "css", code: "" });
    const html = renderToStaticMarkup(<HighlightedCode code="" language="css" lineNumbers />);
    expect(html.match(/class="line"/g)?.length).toBe(1);
    expect(html).toContain('<span class="ln">1</span></span>');
  });
});
