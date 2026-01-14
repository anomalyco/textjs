import { describe, expect, test } from "bun:test";
import { useState } from "react";
import {
  AsciiFont,
  Badge,
  Box,
  Code,
  Diff,
  diffTexts,
  Divider,
  KeyHint,
  Markdown,
  parseInline,
  parseMarkdown,
  parseUnifiedDiff,
  renderAsciiFont,
  Select,
  Spacer,
  Spinner,
  Tabs,
  Text,
  tokenize,
  geistDark,
} from "../src/index";
import { parseColor } from "@textjs/core";
import { createMarkdownStreamCache, parseMarkdownIncremental } from "../src/markdown";
import { activeSpinnerTickerCount } from "../src/components/Spinner";
import { createTestRoot } from "./helpers";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe("<Markdown>", () => {
  test("parses blocks and inline styles", () => {
    const blocks = parseMarkdown(
      "# Title\n\nPara **bold** *it* `code` [link](https://textjs.org)\nsecond line\n\n- a\n  - b\n1. one\n2. two\n\n> quoted\n\n---\n\n| A | B |\n|:--|--:|\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```",
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "quote", "hr", "table", "code"]);
    const para = blocks[1] as { text: string };
    expect(para.text).toBe("Para **bold** *it* `code` [link](https://textjs.org) second line");
    const list = blocks[2] as { items: Array<{ depth: number; ordered: boolean }> };
    expect(list.items.map((i) => [i.depth, i.ordered])).toEqual([
      [0, false],
      [1, false],
      [0, true],
      [0, true],
    ]);
    expect(blocks[5]).toMatchObject({ header: ["A", "B"], align: ["left", "right"], rows: [["1", "2"]] });
    expect(blocks[6]).toMatchObject({ language: "ts", code: "const x = 1;", closed: true });
    expect(parseInline("a **b** *c* `d` ~~e~~ [f](g)")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", code: true },
      { text: " " },
      { text: "e", strike: true },
      { text: " " },
      { text: "f", href: "g" },
    ]);
    // Dangling markers stay literal mid-stream.
    expect(parseInline("half **bold and `tick")).toEqual([{ text: "half **bold and `tick" }]);
  });

  test("renders headings, lists, quotes, tables and fenced code", async () => {
    const t = await createTestRoot({ width: 40, height: 30 });
    await t.render(
      <Markdown>{"# Hello\n\nSome **bold** text.\n\n- one\n- two\n\n> wise words\n\n| k | v |\n|---|---|\n| a | 1 |\n\n```js\nlet a = 1\n```"}</Markdown>,
    );
    const lines = t.lines();
    expect(lines[0]).toBe("Hello");
    expect(lines).toContain("Some bold text.");
    expect(lines).toContain("• one");
    expect(lines).toContain("│ wise words");
    expect(lines).toContain("│ k │ v │");
    expect(lines).toContain("│ a │ 1 │");
    expect(lines.some((l) => l.startsWith("╭─ js"))).toBe(true);
    expect(lines.some((l) => l.includes("let a = 1"))).toBe(true);
    const bold = t.root.renderer.buffer.getCell(5, 2);
    expect(bold?.char).toBe("b");
    expect((bold?.attrs ?? 0) & 1).toBe(1);
    await t.unmount();
  });

  test("streams safely through an unclosed code fence", async () => {
    const t = await createTestRoot({ width: 40, height: 20 });
    let set: (s: string) => void = () => undefined;
    function Stream() {
      const [s, setS] = useState("");
      set = setS;
      return <Markdown content={s} />;
    }
    await t.render(<Stream />);
    const doc = "Here is code:\n\n```tsx\nexport function App() {\n  return <Box />;\n}\n```\n\nDone **now**.";
    for (let i = 1; i <= doc.length; i += 7) {
      await t.act(() => set(doc.slice(0, i)));
      expect(() => t.frame()).not.toThrow();
    }
    await t.act(() => set(doc.slice(0, doc.indexOf("}") + 1)));
    let frame = t.frame();
    expect(frame).toContain("export function App() {");
    expect(frame).toContain("streaming…");
    expect(parseMarkdown(doc.slice(0, 40)).at(-1)).toMatchObject({ type: "code", closed: false });
    await t.act(() => set(doc));
    frame = t.frame();
    expect(frame).not.toContain("streaming…");
    expect(frame).toContain("Done now.");
    await t.unmount();
  });

  test("parseMarkdownIncremental matches full parseMarkdown on every streamed chunk and reuses block refs", () => {
    const doc = [
      "# Streaming Heading",
      "",
      "Intro with **bold**, *italic*, `code` and [docs](https://textjs.org).",
      "",
      "- [x] First task",
      "- [ ] Second task",
      "  continued lazily",
      "",
      "> Quoted paragraph",
      ">",
      "> ```ts",
      "> const inside = 1;",
      "> ```",
      "",
      "| Col | Num |",
      "| :--- | ---: |",
      "| alpha | 42 |",
      "",
      "```tsx",
      "export function Demo() {",
      "",
      "  return <Box />;",
      "}",
      "```",
      "",
      "Final paragraph.",
    ].join("\r\n");

    const cache = createMarkdownStreamCache();
    let prevBlocks: ReturnType<typeof parseMarkdown> = [];
    let reusedCount = 0;
    for (let i = 1; i <= doc.length; i += 3) {
      const prefix = doc.slice(0, i);
      const inc = parseMarkdownIncremental(prefix, cache);
      const full = parseMarkdown(prefix);
      expect(inc).toEqual(full);
      if (prevBlocks.length >= 2 && inc.length >= 2 && prevBlocks[0] === inc[0]) {
        reusedCount++;
      }
      prevBlocks = inc;
    }
    expect(reusedCount).toBeGreaterThan(20);
  });
});

describe("<Code>", () => {
  test("tokenizes TS/TSX, JSON, Bash, CSS, Python, Rust and Go", () => {
    const kinds = (code: string, lang: string) => tokenize(code, lang).flat().filter((t) => t.kind !== "plain");
    const ts = kinds('const x: number = 42; // hi\nfunction foo() { return <Box flex="1" /> }', "tsx");
    expect(ts).toContainEqual({ kind: "keyword", text: "const" });
    expect(ts).toContainEqual({ kind: "type", text: "number" });
    expect(ts).toContainEqual({ kind: "number", text: "42" });
    expect(ts).toContainEqual({ kind: "comment", text: "// hi" });
    expect(ts).toContainEqual({ kind: "function", text: "foo" });
    expect(ts).toContainEqual({ kind: "tag", text: "Box" });
    expect(ts).toContainEqual({ kind: "string", text: '"1"' });
    expect(kinds('{"a": 1, "b": true}', "json")).toEqual(
      expect.arrayContaining([
        { kind: "attribute", text: '"a"' },
        { kind: "number", text: "1" },
        { kind: "constant", text: "true" },
      ]),
    );
    expect(kinds('echo "$HOME" # note', "bash")).toEqual(
      expect.arrayContaining([
        { kind: "keyword", text: "echo" },
        { kind: "comment", text: "# note" },
      ]),
    );
    expect(kinds("def f(x):\n  return None", "python")).toContainEqual({ kind: "keyword", text: "def" });
    expect(kinds("fn main() { let v: Vec<u8> = vec![]; }", "rust")).toContainEqual({ kind: "keyword", text: "fn" });
    expect(kinds("func main() { var s string }", "go")).toContainEqual({ kind: "type", text: "string" });
    expect(kinds(".a { color: red; }", "css")).toContainEqual({ kind: "attribute", text: "color" });
    // Multi-line comments split per line.
    expect(tokenize("/* a\nb */ x", "ts")[1]?.[0]).toEqual({ kind: "comment", text: "b */" });
  });

  test("renders line numbers, highlighted lines and syntax colors", async () => {
    const t = await createTestRoot({ width: 40, height: 6 });
    await t.render(<Code code={"const a = 1;\nconst b = 2;\n"} language="ts" showLineNumbers highlightLines={[2]} />);
    expect(t.lines()).toEqual(["1 │ const a = 1;", "2 ▌ const b = 2;"]);
    const buf = t.root.renderer.buffer;
    expect(buf.getCell(4, 0)?.fg).toBe(parseColor(geistDark.syntax.keyword));
    expect(buf.getCell(10, 1)?.bg).toBe(parseColor(geistDark.selection));
    await t.render(<Code code={"1\n2\n3\n4\n5"} maxHeight={3} />);
    expect(t.lines()).toEqual(["1", "2", "… 3 more lines"]);
    await t.unmount();
  });
});

describe("<Diff>", () => {
  const patch = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 export {};
`;

  test("parses unified diffs and diffs raw texts", () => {
    const files = parseUnifiedDiff(patch);
    expect(files.length).toBe(1);
    expect(files[0]).toMatchObject({ oldPath: "src/app.ts", newPath: "src/app.ts", additions: 2, deletions: 1 });
    expect(files[0]?.hunks[0]?.lines.map((l) => [l.kind, l.oldLine, l.newLine])).toEqual([
      ["context", 1, 1],
      ["remove", 2, null],
      ["add", null, 2],
      ["add", null, 3],
      ["context", 3, 4],
    ]);
    const d = diffTexts("a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n", "a\nB\nc\nd\ne\nf\ng\nh\ni\nj\nk\n", "x.txt", 1);
    expect(d.additions).toBe(2);
    expect(d.deletions).toBe(1);
    expect(d.hunks.length).toBe(2);
    expect(d.hunks[0]?.header).toBe("@@ -1,3 +1,3 @@");
  });

  test("renders file header, line numbers and tinted rows", async () => {
    const t = await createTestRoot({ width: 40, height: 10 });
    await t.render(<Diff patch={patch} />);
    const lines = t.lines();
    expect(lines[0]).toMatch(/^ src\/app\.ts\s+\+2 -1$/);
    expect(lines[1]).toBe("@@ -1,3 +1,4 @@");
    expect(lines[2]).toBe("1 1   const a = 1;");
    expect(lines[3]).toBe("2   - const b = 2;");
    expect(lines[4]).toBe("  2 + const b = 3;");
    const buf = t.root.renderer.buffer;
    expect(buf.getCell(20, 3)?.bg).toBe(parseColor(geistDark.diffRemoveBg));
    expect(buf.getCell(20, 4)?.bg).toBe(parseColor(geistDark.diffAddBg));
    await t.render(<Diff patch={{ before: "x\n", after: "y\n", filename: "f.md" }} />);
    const small = t.lines();
    expect(small[0]).toMatch(/^ f\.md\s+\+1 -1$/);
    expect(small[0]?.length).toBe(39);
    expect(small.slice(1, 4)).toEqual(["@@ -1,1 +1,1 @@", "1   - x", "  1 + y"]);
    await t.unmount();
  });

  test("diffTexts caches results without delimiter collisions and <Diff> memoizes patch content", async () => {
    const d1 = diffTexts("a\nb\n", "a\nc\n", "file.ts", 1);
    const d2 = diffTexts("a\nb\n", "a\nc\n", "file.ts", 1);
    expect(d2).toBe(d1);
    // Distinct (before, after) pairs containing colons/nulls never collide.
    const c1 = diffTexts("a:b\u0000x\n", "z\n", "f:1", 1);
    const c2 = diffTexts("a\n", "b\u0000x\nz\n", "f:1", 1);
    expect(c1).not.toEqual(c2);

    const t = await createTestRoot({ width: 40, height: 6 });
    let tick = 0;
    let bump: () => void = () => undefined;
    function Host() {
      const [n, setN] = useState(0);
      bump = () => setN((v) => v + 1);
      tick = n;
      return (
        <Box flexDirection="column">
          <Text>{`tick=${n}`}</Text>
          <Diff patch={{ before: "old\n", after: "new\n", filename: "a.ts" }} />
        </Box>
      );
    }
    await t.render(<Host />);
    await t.act(() => bump());
    expect(tick).toBe(1);
    expect(t.lines()[0]).toBe("tick=1");
    expect(t.lines()[1]).toMatch(/^ a\.ts\s+\+1 -1$/);
    await t.unmount();
  });
});

describe("<Select>", () => {
  const options = Array.from({ length: 100 }, (_, i) => ({ value: `m${i}`, label: `Model ${i}`, hint: `${i}k`, disabled: i === 2 }));

  test("keyboard navigation skips disabled options and windows 100 items", async () => {
    const t = await createTestRoot({ width: 30, height: 8 });
    const picked: string[] = [];
    const highlighted: string[] = [];
    await t.render(<Select options={options} limit={5} autoFocus onChange={(v) => picked.push(v)} onHighlight={(v) => highlighted.push(v)} />);
    let lines = t.lines();
    expect(lines[0]).toMatch(/^› Model 0\s+0k$/);
    expect(lines.at(-1)).toBe("  ↓ 95 more");
    await t.press("ArrowDown");
    await t.press("j");
    // Option 2 is disabled → skipped.
    expect(highlighted).toEqual(["m1", "m3"]);
    for (let i = 0; i < 10; i++) await t.press("ArrowDown");
    lines = t.lines();
    expect(lines[0]).toBe("  ↑ 9 more");
    expect(lines.find((l) => l.startsWith("›"))).toMatch(/^› Model 13/);
    await t.press("Enter");
    expect(picked).toEqual(["m13"]);
    await t.press("End");
    expect(t.lines().find((l) => l.startsWith("›"))).toMatch(/^› Model 99/);
    await t.press("k");
    await t.press("Home");
    expect(t.lines()[0]).toMatch(/^› Model 0/);
    await t.unmount();
  });

  test("searchable filter", async () => {
    const t = await createTestRoot({ width: 30, height: 8 });
    const picked: string[] = [];
    await t.render(<Select options={options} limit={4} searchable autoFocus onChange={(v) => picked.push(v)} />);
    expect(t.lines()[0]).toMatch(/^\/ Type to filter/);
    await t.type("l 4");
    const lines = t.lines();
    expect(lines[0]).toMatch(/^\/ l 4/);
    expect(lines[1]).toMatch(/^› Model 4\s/);
    expect(lines[2]).toMatch(/^ {2}Model 40/);
    await t.press("ArrowDown");
    await t.press("Enter");
    expect(picked).toEqual(["m40"]);
    await t.press("Backspace");
    await t.press("Backspace");
    await t.press("Backspace");
    await t.type("zzz");
    expect(t.lines()).toContain("  No matches");
    await t.unmount();
  });
});

describe("<Tabs>", () => {
  test("Left/Right when focused and shortcut keys", async () => {
    const t = await createTestRoot({ width: 40, height: 2 });
    function App() {
      const [tab, setTab] = useState("chat");
      return (
        <Box flexDirection="column">
          <Tabs
            focused
            activeTab={tab}
            onChange={setTab}
            tabs={[
              { id: "chat", label: "Chat", shortcut: "1" },
              { id: "files", label: "Files", shortcut: "2", badge: 3 },
              { id: "logs", label: "Logs", shortcut: "3" },
            ]}
          />
          <Text>{`active=${tab}`}</Text>
        </Box>
      );
    }
    await t.render(<App />);
    expect(t.lines()[0]).toBe("1 Chat │ 2 Files 3 │ 3 Logs");
    await t.press("ArrowRight");
    expect(t.lines()[1]).toBe("active=files");
    await t.press("ArrowRight");
    await t.press("ArrowRight");
    expect(t.lines()[1]).toBe("active=chat");
    await t.press("ArrowLeft");
    expect(t.lines()[1]).toBe("active=logs");
    await t.type("2");
    expect(t.lines()[1]).toBe("active=files");
    await t.unmount();
  });
});

describe("<AsciiFont>, <Spinner> and primitives", () => {
  test("AsciiFont renders 5-row block and 3-row compact glyphs", async () => {
    expect(renderAsciiFont("HI", "block")).toEqual(["#..#.###", "#..#..#.", "####..#.", "#..#..#.", "#..#.###"].map((r) => r.replace(/#/g, "█").replace(/\./g, " ").trimEnd()));
    const compact = renderAsciiFont("▼ TEXT.JS", "compact");
    expect(compact.length).toBe(3);
    expect(compact[0]?.startsWith("▀█████▀")).toBe(true);
    expect(renderAsciiFont("0123456789-./:", "block").length).toBe(5);
    const t = await createTestRoot({ width: 60, height: 6 });
    await t.render(<AsciiFont text="▼ TEXT.JS" font="compact" color="accent" />);
    const lines = t.lines();
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain("▀▀█▀▀");
    expect(t.root.renderer.buffer.getCell(1, 0)?.fg).toBe(parseColor(geistDark.accent));
    await t.unmount();
  });

  test("Spinner animates and stops while the renderer is paused", async () => {
    const t = await createTestRoot({ width: 20, height: 1 });
    await t.render(<Spinner variant="dots" label="Loading" />);
    expect(t.frame()).toBe("⠋ Loading");
    await t.act(() => sleep(100));
    expect(t.frame()).not.toBe("⠋ Loading");
    await t.act(() => t.root.renderer.pause());
    const logs = t.console.logs.length;
    await t.act(() => sleep(250));
    t.frame();
    expect(t.console.logs.length).toBe(logs);
    await t.act(() => t.root.renderer.resume());
    await t.render(<Spinner key="pulse" variant="pulse" paused />);
    expect(t.frame()).toBe("▼");
    await t.render(<Spinner key="matrix" variant="matrix" paused />);
    expect(t.frame()).toBe("▪⬝⬝");
    await t.unmount();
    expect(activeSpinnerTickerCount()).toBe(0);
  });

  test("multiple Spinners with the same interval share one ticker and coalesce commits", async () => {
    const t = await createTestRoot({ width: 30, height: 3 });
    await t.render(
      <Box flexDirection="column">
        <Spinner variant="dots" label="one" />
        <Spinner variant="dots" label="two" />
        <Spinner variant="dots" label="three" />
      </Box>,
    );
    expect(activeSpinnerTickerCount()).toBe(1);
    const logsBefore = t.console.logs.length;
    await t.act(() => sleep(95));
    t.frame();
    expect(t.console.logs.length - logsBefore).toBe(1);
    expect(t.lines()).toEqual(["⠙ one", "⠙ two", "⠙ three"]);
    await t.unmount();
    expect(activeSpinnerTickerCount()).toBe(0);
  });

  test("Divider, Badge, KeyHint and Spacer", async () => {
    const t = await createTestRoot({ width: 20, height: 3 });
    await t.render(
      <Box flexDirection="column">
        <Divider title="Logs" />
        <Box>
          <Badge variant="success">OK</Badge>
          <Spacer />
          <KeyHint keys="⌘K" label="search" />
        </Box>
      </Box>,
    );
    expect(t.lines()).toEqual(["── Logs ────────────", " OK        ⌘K search"]);
    expect(t.root.renderer.buffer.getCell(1, 1)?.bg).toBe(parseColor(geistDark.success));
    await t.unmount();
  });
});
