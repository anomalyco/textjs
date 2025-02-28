import { describe, expect, test } from "bun:test";
import { parseColor, type SceneNode } from "@textjs/core";
import {
  Box,
  classNameCacheSize,
  clearClassNameCache,
  geistDark,
  geistLight,
  parseClassName,
  Text,
  ThemeProvider,
  themes,
  tokyoNight,
  amberCrt,
  opencodeDark,
} from "../src/index";
import { createTestRoot } from "./helpers";

describe("className cell utilities", () => {
  test("layout, flex and positioning", () => {
    const p = parseClassName(
      "flex flex-col flex-wrap flex-1 items-center justify-between self-end absolute inset-0 z-50 overflow-hidden gap-2 gap-x-3 gap-y-1",
      geistDark,
    );
    expect(p).toMatchObject({
      display: "flex",
      flexDirection: "column",
      flexWrap: "wrap",
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
      alignItems: "center",
      justifyContent: "space-between",
      alignSelf: "flex-end",
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 50,
      overflow: "hidden",
      gap: 2,
      columnGap: 3,
      rowGap: 1,
    });
    expect(parseClassName("hidden", geistDark).display).toBe("none");
    expect(parseClassName("grow shrink-0", geistDark)).toMatchObject({ flexGrow: 1, flexShrink: 0 });
    expect(parseClassName("grow-0 shrink", geistDark)).toMatchObject({ flexGrow: 0, flexShrink: 1 });
    expect(parseClassName("flex-row justify-evenly items-stretch relative top-2 -left-1 right-3 bottom-4", geistDark)).toMatchObject({
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "stretch",
      position: "relative",
      top: 2,
      left: -1,
      right: 3,
      bottom: 4,
    });
  });

  test("sizing and spacing in cells", () => {
    expect(parseClassName("w-full h-full", geistDark)).toMatchObject({ width: "100%", height: "100%" });
    expect(parseClassName("w-1/2 h-1/3", geistDark)).toMatchObject({ width: "50%", height: "33.33%" });
    expect(parseClassName("w-2/3 h-3/4", geistDark)).toMatchObject({ width: "66.67%", height: "75%" });
    expect(parseClassName("w-1/4 w-auto", geistDark).width).toBe("auto");
    expect(parseClassName("w-40 h-12 min-w-10 max-w-80 min-h-3 max-h-20", geistDark)).toMatchObject({
      width: 40,
      height: 12,
      minWidth: 10,
      maxWidth: 80,
      minHeight: 3,
      maxHeight: 20,
    });
    expect(parseClassName("w-[42] h-[50%]", geistDark)).toMatchObject({ width: 42, height: "50%" });
    expect(parseClassName("p-1 px-2 py-3 pt-4 pr-5 pb-6 pl-7", geistDark)).toMatchObject({
      padding: 1,
      paddingX: 2,
      paddingY: 3,
      paddingTop: 4,
      paddingRight: 5,
      paddingBottom: 6,
      paddingLeft: 7,
    });
    expect(parseClassName("m-1 mx-2 my-3 mt-4 mr-5 mb-6 ml-7 -mt-1", geistDark)).toMatchObject({
      margin: 1,
      marginX: 2,
      marginY: 3,
      marginTop: -1,
      marginRight: 5,
      marginBottom: 6,
      marginLeft: 7,
    });
    expect(parseClassName("mx-auto", geistDark).marginX).toBe("auto");
  });

  test("borders", () => {
    expect(parseClassName("border", geistDark)).toEqual({ border: true });
    expect(parseClassName("border rounded", geistDark)).toEqual({ border: true, borderStyle: "rounded" });
    expect(parseClassName("border-rounded", geistDark)).toEqual({ border: true, borderStyle: "rounded" });
    for (const s of ["single", "double", "heavy", "dashed", "ascii"] as const) {
      expect(parseClassName(`border-${s}`, geistDark).borderStyle).toBe(s);
    }
    expect(parseClassName("border border-none", geistDark).border).toBe(false);
    expect(parseClassName("border-t", geistDark)).toEqual({ border: true, borderRight: false, borderBottom: false, borderLeft: false });
    expect(parseClassName("border-l border-b", geistDark)).toEqual({ border: true, borderTop: false, borderRight: false });
    expect(parseClassName("border-default", geistDark).borderColor).toBe(geistDark.border);
    expect(parseClassName("border-focus", geistDark).borderColor).toBe(geistDark.borderFocus);
    expect(parseClassName("border-[#3f3f46]", geistDark).borderColor).toBe("#3f3f46");
    expect(parseClassName("border-zinc-700", geistDark).borderColor).toBe("#3f3f46");
  });

  test("text styles", () => {
    expect(parseClassName("bold italic underline line-through dim inverse", geistDark)).toEqual({
      bold: true,
      italic: true,
      underline: true,
      strikethrough: true,
      dim: true,
      inverse: true,
    });
    expect(parseClassName("font-bold", geistDark).bold).toBe(true);
    expect(parseClassName("truncate", geistDark).wrap).toBe("truncate-end");
    expect(parseClassName("whitespace-nowrap", geistDark).wrap).toBe("nowrap");
    expect(parseClassName("text-center", geistDark).textAlign).toBe("center");
    expect(parseClassName("text-left", geistDark).textAlign).toBe("left");
    expect(parseClassName("text-right", geistDark).textAlign).toBe("right");
  });

  test("palette, semantic tokens and arbitrary colors", () => {
    expect(parseClassName("bg-zinc-900 text-emerald-400", geistDark)).toEqual({ bg: "#18181b", fg: "#34d399" });
    expect(parseClassName("bg-red-50 text-blue-950", geistDark)).toEqual({ bg: "#fef2f2", fg: "#172554" });
    expect(parseClassName("bg-[#18181b] text-[#22c55e]", geistDark)).toEqual({ bg: "#18181b", fg: "#22c55e" });
    expect(parseClassName("bg-surface text-muted", geistDark)).toEqual({ bg: geistDark.surface, fg: geistDark.muted });
    expect(parseClassName("bg-panel text-primary", geistDark)).toEqual({ bg: geistDark.panel, fg: geistDark.fg });
    expect(parseClassName("bg-elevated text-subtle", geistDark)).toEqual({ bg: geistDark.elevated, fg: geistDark.subtle });
    expect(parseClassName("bg-accent text-accent-fg", geistDark)).toEqual({ bg: geistDark.accent, fg: geistDark.accentFg });
    for (const k of ["accent", "success", "warning", "danger"] as const) {
      expect(parseClassName(`text-${k}`, geistDark).fg).toBe(geistDark[k]);
    }
    expect(parseClassName("bg-white text-black", geistDark)).toEqual({ bg: "white", fg: "black" });
    const translucent = parseClassName("bg-black/50", geistDark).bg;
    expect(translucent).toBe(0x00000080);
  });

  test("memoized per (theme, className) and theme-aware", () => {
    clearClassNameCache();
    const a = parseClassName("bg-surface p-1", geistDark);
    const b = parseClassName("bg-surface p-1", geistDark);
    expect(a).toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(classNameCacheSize()).toBe(1);
    const light = parseClassName("bg-surface p-1", geistLight);
    expect(light).not.toBe(a);
    expect(light.bg).toBe(geistLight.surface);
    expect(classNameCacheSize()).toBe(2);
    expect(parseClassName(undefined, geistDark)).toEqual({});
    expect(parseClassName("", geistDark)).toBe(parseClassName(undefined, geistLight));
    // Bounded cache.
    for (let i = 0; i < 3000; i++) parseClassName(`w-${i}`, geistDark);
    expect(classNameCacheSize()).toBeLessThanOrEqual(2048);
    clearClassNameCache();
  });

  test("ships five polished themes with every semantic token", () => {
    expect(Object.keys(themes).sort()).toEqual(["amberCrt", "geistDark", "geistLight", "opencodeDark", "tokyoNight"]);
    expect(geistDark.bg).toBe("#0a0a0a");
    expect(geistDark.surface).toBe("#111113");
    expect(geistDark.border).toBe("#27272a");
    expect(geistDark.fg).toBe("#ededed");
    expect(geistDark.accent).toBe("#0070f3");
    expect(geistLight.bg).toBe("#fafafa");
    expect(amberCrt.bg).toBe("#0d0900");
    expect(amberCrt.fg).toBe("#ffb000");
    const tokens = ["bg", "surface", "panel", "elevated", "border", "borderFocus", "fg", "muted", "subtle", "accent", "accentFg", "success", "warning", "danger", "info", "selection", "codeBg"] as const;
    for (const theme of [geistDark, geistLight, opencodeDark, tokyoNight, amberCrt]) {
      for (const k of tokens) expect(() => parseColor(theme[k])).not.toThrow();
      for (const k of tokens) expect(theme[k]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test("explicit props > style > className, and theme switching re-resolves tokens", async () => {
    const t = await createTestRoot({ width: 10, height: 2 });
    let node: SceneNode | null = null;
    const capture = (n: SceneNode | null): void => {
      node = n;
    };
    await t.render(
      <Box ref={capture} className="bg-red-500 p-1 w-5" style={{ bg: "#00ff00", width: 6 }} width={7} />,
    );
    const n = node as unknown as SceneNode;
    expect(n.props.bg).toBe("#00ff00");
    expect(n.props.width).toBe(7);
    expect(n.props.padding).toBe(1);

    await t.render(
      <ThemeProvider theme="tokyoNight">
        <Text ref={capture} className="text-muted bg-surface">
          x
        </Text>
      </ThemeProvider>,
    );
    expect((node as unknown as SceneNode).props.fg).toBe(tokyoNight.muted);
    await t.render(
      <ThemeProvider theme="amberCrt">
        <Text ref={capture} className="text-muted bg-surface" color="accent">
          x
        </Text>
      </ThemeProvider>,
    );
    const textNode = node as unknown as SceneNode;
    expect(textNode.props.fg).toBe(amberCrt.accent);
    expect(textNode.props.bg).toBe(amberCrt.surface);

    // Root-level theme switching repaints the background.
    await t.render(<Text>hi</Text>);
    expect(t.root.renderer.buffer.getCell(5, 1)?.bg).toBe(parseColor(geistDark.bg));
    await t.act(() => t.root.setTheme("geistLight"));
    t.frame();
    expect(t.root.renderer.buffer.getCell(5, 1)?.bg).toBe(parseColor(geistLight.bg));
    expect(t.root.getTheme().id).toBe("geistLight");
    await t.unmount();
  });
});
