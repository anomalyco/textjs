import { afterEach, describe, expect, test } from "bun:test";
import { parseColor } from "@textjs/core";
import {
  BarChart,
  Box,
  BrailleCanvas,
  Center,
  DotCanvas,
  dataRange,
  formatCompact,
  geistDark,
  Gradient,
  Grid,
  Image,
  Kbd,
  LineChart,
  ProgressBar,
  resamplePixels,
  sampleGradient,
  Spacer,
  Sparkline,
  sparkline,
  SplitPane,
  Stack,
  StatusBar,
  Text,
  useTheme,
} from "../src/index";
import { cleanup, render } from "../src/testing";

afterEach(cleanup);

describe("charts", () => {
  test("sparkline(), dataRange and formatCompact", () => {
    expect(sparkline([0, 4, 8])).toBe(" ▄█");
    expect(sparkline([1, 2, 3, 4, 5, 6, 7, 8], { min: 0, max: 8 })).toBe("▁▂▃▄▅▆▇█");
    expect(dataRange([5, 5])).toEqual({ min: 5, max: 6 });
    expect(formatCompact(1234)).toBe("1.2k");
    expect(formatCompact(84_000)).toBe("84k");
    expect(formatCompact(2_500_000)).toBe("2.5m");
    expect(formatCompact(0.25)).toBe("0.25");
  });

  test("BrailleCanvas plots lines with 2×4 dots per cell", () => {
    const c = new BrailleCanvas(2, 1);
    c.line(0, 3, 3, 0);
    expect(c.toString()).toBe("⡠⠊");
    const flat = new BrailleCanvas(3, 1);
    flat.plot([1, 1, 1], { min: 0, max: 2 });
    expect(flat.toString()).toBe("⠤⠤⠤");
  });

  test("<Sparkline> fills its width with the latest points; tall sparklines stack", async () => {
    const app = await render(
      <Box className="flex-col">
        <Sparkline data={[0, 1, 2, 3, 4, 5, 6, 7, 8]} width={8} />
        <Sparkline data={[0, 8, 16]} height={2} width={3} />
      </Box>,
      { cols: 10, rows: 3 },
    );
    expect(app.lines()).toEqual(["▁▂▃▄▅▆▇█", "  █", " ██"]);
  });

  test("<BarChart> aligns labels and values with eighth-cell bars", async () => {
    const app = await render(
      <BarChart
        data={[
          { label: "iad1", value: 100 },
          { label: "fra", value: 25 },
        ]}
      />,
      { cols: 20, rows: 2 },
    );
    expect(app.lines()).toEqual(["iad1 ███████████ 100", "fra  ██▊          25"]);
  });

  test("DotCanvas quadrant mode stays inside Menlo's block elements", () => {
    const q = new DotCanvas(2, 1, "quadrant");
    q.line(0, 1, 3, 0);
    expect(q.toString()).toBe("▄▀");
  });

  test("<LineChart> draws an axis, quadrant series and a legend", async () => {
    const app = await render(
      <LineChart
        height={3}
        series={[
          { label: "p50", data: [1, 2, 3, 4] },
          { label: "p95", data: [4, 3, 2, 1] },
        ]}
      />,
      { cols: 24, rows: 4 },
    );
    const lines = app.lines();
    expect(lines[0]).toStartWith("4 ┤");
    expect(lines[2]).toStartWith("1 ┤");
    expect(lines[3]).toBe("   ━ p50  ━ p95");
    expect(/[▘▝▀▖▌▞▛▗▚▐▜▄▙▟█]/.test(lines.slice(0, 3).join(""))).toBe(true);
    expect(/[\u2800-\u28ff]/.test(lines.join(""))).toBe(false);
    const success = parseColor(geistDark.success);
    let found = false;
    for (let x = 3; x < 24; x++) for (let y = 0; y < 3; y++) if (app.cell(x, y)?.fg === success) found = true;
    expect(found).toBe(true);
  });
});

describe("<ProgressBar>", () => {
  test("smooth eighth blocks, value text and line variant", async () => {
    const app = await render(
      <Box className="flex-col">
        <ProgressBar value={0.5} width={10} />
        <ProgressBar value={0.33} width={10} label="Build" />
        <ProgressBar value={3} max={4} width={8} variant="line" formatValue={(v, m) => `${v}/${m}`} />
      </Box>,
      { cols: 30, rows: 3 },
    );
    expect(app.lines()).toEqual(["█████░░░░░  50%", "Build ███▎░░░░░░  33%", "━━━━━━── 3/4"]);
  });

  test("indeterminate bars animate", async () => {
    const app = await render(<ProgressBar width={20} />, { cols: 20, rows: 1 });
    const first = app.lastFrame();
    await app.wait(400);
    expect(app.lastFrame()).not.toBe(first);
    expect(app.lastFrame()).toContain("█");
  });
});

describe("<Gradient>", () => {
  test("interpolates per cell across the widest line", async () => {
    expect(sampleGradient([parseColor("#000000"), parseColor("#ffffff")], 0.5)).toBe(parseColor("#808080"));
    const app = await render(<Gradient colors={["#ff0000", "#0000ff"]}>{"abc\nx"}</Gradient>, { cols: 4, rows: 2 });
    expect(app.lines()).toEqual(["abc", "x"]);
    expect(app.cell(0, 0)?.fg).toBe(parseColor("#ff0000"));
    expect(app.cell(2, 0)?.fg).toBe(parseColor("#0000ff"));
    expect(app.cell(0, 1)?.fg).toBe(parseColor("#ff0000"));
  });
});

describe("<Image>", () => {
  test("half-block pixels keep aspect ratio and colors", async () => {
    // 2×2: red, green / blue, transparent
    const pixels = { width: 2, height: 2, data: [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0] };
    const app = await render(<Image pixels={pixels} width={2} />, { cols: 4, rows: 2 });
    expect(app.lines()[0]).toBe("▀▀");
    expect(app.cell(0, 0)).toMatchObject({ fg: parseColor("#ff0000"), bg: parseColor("#0000ff") });
    expect(app.cell(1, 0)?.fg).toBe(parseColor("#00ff00"));
    expect(resamplePixels({ width: 2, height: 1, data: [0, 0, 0, 255, 255, 255, 255, 255] }, 1, 1)[0]).toBe(128);
  });

  test("new pixels of the same size repaint", async () => {
    const red = { width: 1, height: 2, data: [255, 0, 0, 255, 255, 0, 0, 255] };
    const blue = { width: 1, height: 2, data: [0, 0, 255, 255, 0, 0, 255, 255] };
    const app = await render(<Image pixels={red} />, { cols: 2, rows: 1 });
    expect(app.cell(0, 0)?.fg).toBe(parseColor("#ff0000"));
    await app.rerender(<Image pixels={blue} />);
    expect(app.cell(0, 0)?.fg).toBe(parseColor("#0000ff"));
  });

  test("shows alt text without pixels", async () => {
    const app = await render(<Image alt="logo.png" width={12} />, { cols: 12, rows: 1 });
    expect(app.lastFrame()).toContain("logo.png");
  });
});

describe("layout helpers", () => {
  test("<Center>, <Stack divider>, <Grid>", async () => {
    const app = await render(
      <Box className="flex-col grow">
        <Box height={3}>
          <Center>
            <Text>mid</Text>
          </Center>
        </Box>
        <Stack divider>
          <Text>one</Text>
          <Text>two</Text>
        </Stack>
        <Grid columns={2} columnGap={1}>
          <Text>a</Text>
          <Text>b</Text>
          <Text>c</Text>
        </Grid>
      </Box>,
      { cols: 9, rows: 8 },
    );
    expect(app.lines()).toEqual(["", "   mid", "", "one", "─────────", "two", "a    b", "c"]);
  });

  test("<SplitPane> sizes by fraction and resizes from the keyboard", async () => {
    const app = await render(
      <SplitPane defaultSize={0.5} resizable autoFocus minSize={2}>
        <Text>left</Text>
        <Text>right</Text>
      </SplitPane>,
      { cols: 20, rows: 2 },
    );
    expect(app.lines()[0]).toBe("left      ┃right");
    await app.press("right right");
    expect(app.lines()[0]).toBe("left        ┃right");
    await app.press("shift+left");
    expect(app.lines()[0]).toBe("left   ┃right");
  });

  test("text after a <Spacer> stays right-aligned when it gets shorter", async () => {
    function TopBar() {
      const theme = useTheme();
      return (
        <Box className="flex-row h-1 px-1 gap-2">
          <Text>▼ Acme</Text>
          <Spacer />
          <Text color="subtle">{theme.name}</Text>
        </Box>
      );
    }
    const app = await render(<TopBar />, { cols: 30, rows: 1, theme: "opencodeDark" });
    expect(app.lastFrame()).toBe(` ▼ Acme${"OpenCode Dark".padStart(22)}`);
    for (const [theme, name] of [["amberCrt", "Amber CRT"], ["tokyoNight", "Tokyo Night"], ["geistDark", "Geist Dark"]] as const) {
      await app.act(() => app.root.setTheme(theme));
      expect(app.lastFrame()).toBe(` ▼ Acme${name.padStart(22)}`);
    }
  });

  test("<Kbd> and <StatusBar>", async () => {
    const app = await render(
      <StatusBar right={<Text>main</Text>}>
        <Kbd>ctrl+k</Kbd>
      </StatusBar>,
      { cols: 20, rows: 1 },
    );
    expect(app.lastFrame()).toMatch(/^ {2}(⌃K|ctrl\+K) {2,}main$/);
  });
});
