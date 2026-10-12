import { afterEach, describe, expect, test } from "bun:test";
import { useState } from "react";
import { Box, flattenTree, List, Table, Text, Tree, type TableColumn, type TreeNode } from "../src/index";
import { cleanup, render } from "../src/testing";

afterEach(cleanup);

describe("<List>", () => {
  test("virtualizes 100k items: only visible rows are mounted", async () => {
    const items = Array.from({ length: 100_000 }, (_, i) => `item ${i}`);
    let picked = "";
    const app = await render(
      <Box className="flex-col grow">
        <List items={items} autoFocus onSelect={(item) => (picked = item)} />
      </Box>,
      { cols: 30, rows: 6 },
    );
    expect(app.lines()).toEqual(["› item 0                     ┃", "  item 1                     │", "  item 2                     │", "  item 3                     │", "  item 4                     │", "  item 5                     │"]);
    expect(app.root.renderer.stats().yogaNodes).toBeLessThan(80);
    await app.press("G");
    expect(app.lines().at(-1)).toBe("› item 99999                 ┃");
    await app.press("k pageup");
    expect(app.lastFrame()).toContain("› item 99993");
    await app.press("g return");
    expect(picked).toBe("item 0");
    await app.wheel(2);
    expect(app.lines()[2]).toStartWith("› item 2");
  });

  test("fixed height, custom rows, disabled items and empty state", async () => {
    const app = await render(
      <List
        items={["a", "b", "c", "d"]}
        height={2}
        autoFocus
        isItemDisabled={(x) => x === "b"}
        renderItem={(x, s) => <Text>{s.highlighted ? `[${x}]` : x}</Text>}
      />,
      { cols: 16, rows: 4 },
    );
    expect(app.lines().slice(0, 2)).toEqual(["› [a]          ┃", "  b            │"]);
    await app.press("down");
    expect(app.lines().slice(0, 2)).toEqual(["  b            │", "› [c]          ┃"]);
    await app.rerender(<List items={[]} height={1} emptyText="Nothing here" />);
    expect(app.lastFrame()).toBe("  Nothing here");
  });
});

interface Row {
  name: string;
  region: string;
  p95: number;
}

const ROWS: Row[] = [
  { name: "web", region: "iad1", p95: 120 },
  { name: "api", region: "sfo1", p95: 48 },
  { name: "docs", region: "fra1", p95: 300 },
];

const COLUMNS: TableColumn<Row>[] = [
  { key: "name", header: "Name" },
  { key: "region", header: "Region", width: 8 },
  { key: "p95", header: "p95", width: 5, align: "right" },
];

describe("<Table>", () => {
  test("aligned columns, header rule and right alignment", async () => {
    const app = await render(<Table columns={COLUMNS} rows={ROWS} height={3} autoFocus />, { cols: 32, rows: 5 });
    expect(app.lines()).toEqual([
      "  Name           Region      p95",
      "────────────────────────────────",
      "› web            iad1        120",
      "  api            sfo1         48",
      "  docs           fra1        300",
    ]);
  });

  test("sorting by key, by column number and flipping direction", async () => {
    const app = await render(<Table columns={COLUMNS} rows={ROWS} height={3} sortable autoFocus />, { cols: 32, rows: 5 });
    await app.press("3");
    expect(app.lines()[0]).toContain("p95 ↑");
    expect(app.lines().slice(2).map((l) => l.trim().split(/\s+/).at(-1))).toEqual(["48", "120", "300"]);
    await app.press("3");
    expect(app.lines()[0]).toContain("p95 ↓");
    expect(app.lines()[2]).toContain("docs");
    // `s` cycles through the sortable columns, then back to unsorted.
    await app.press("s");
    expect(app.lines()[0]).not.toContain("↑");
    await app.press("s");
    expect(app.lines()[0]).toContain("Name ↑");
    expect(app.lines()[2]).toContain("api");
    await app.press("S");
    expect(app.lines()[0]).toContain("Name ↓");
  });

  test("multiple selection with space; Enter selects the highlighted row", async () => {
    let keys: Array<string | number> = [];
    let opened: Row | null = null;
    const app = await render(
      <Table
        columns={COLUMNS}
        rows={ROWS}
        height={3}
        autoFocus
        selectionMode="multiple"
        getRowKey={(r) => r.name}
        onSelectionChange={(k) => (keys = [...k])}
        onSelect={(r) => (opened = r)}
      />,
      { cols: 34, rows: 5 },
    );
    await app.press("space down down space");
    expect(keys).toEqual(["web", "docs"]);
    expect(app.lines()[2]).toStartWith("  ✓ web");
    expect(app.lines()[3]).toStartWith("  · api");
    await app.press("return");
    expect(opened!.name).toBe("docs");
  });

  test("fills its parent and scrolls a large data set", async () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ name: `svc-${i}`, region: "iad1", p95: i }));
    const app = await render(
      <Box className="flex-col grow">
        <Table columns={COLUMNS} rows={many} autoFocus />
      </Box>,
      { cols: 34, rows: 8 },
    );
    expect(app.lines().length).toBe(8);
    expect(app.lines()[2]).toContain("svc-0");
    expect(app.lines()[2]?.endsWith("┃")).toBe(true);
    await app.press("end");
    expect(app.lines().at(-1)).toContain("svc-499");
  });
});

const TREE: TreeNode[] = [
  {
    id: "app",
    label: "app",
    children: [
      { id: "layout", label: "layout.tsx", hint: "1.2 kB" },
      { id: "docs", label: "docs", children: [{ id: "slug", label: "[slug]", children: [{ id: "page", label: "page.tsx" }] }] },
    ],
  },
  { id: "pkg", label: "package.json" },
];

describe("<Tree>", () => {
  test("flattenTree draws guides and skips collapsed branches", () => {
    const flat = flattenTree(TREE, new Set(["app", "docs"]));
    expect(flat.map((f) => `${f.guide}${f.node.label}`)).toEqual(["app", "├─ layout.tsx", "└─ docs", "   └─ [slug]", "package.json"]);
  });

  test("keyboard expand / collapse / parent jump and selection", async () => {
    let selected = "";
    function App() {
      const [open, setOpen] = useState<Set<string>>(new Set());
      return <Tree data={TREE} height={6} autoFocus expanded={open} onExpandedChange={setOpen} onSelect={(n) => (selected = n.id)} />;
    }
    const app = await render(<App />, { cols: 30, rows: 6 });
    expect(app.lines().slice(0, 2)).toEqual(["▸ app", "  package.json"]);
    await app.press("right");
    expect(app.lines()[0]).toBe("▾ app");
    expect(app.lines()[1]).toBe("├─   layout.tsx         1.2 kB");
    await app.press("right down right right");
    expect(app.lines()[3]).toBe("   └─ ▸ [slug]");
    await app.press("left");
    expect(app.lines()[2]).toBe("└─ ▾ docs");
    await app.press("left");
    expect(app.lines()[2]).toBe("└─ ▸ docs");
    await app.press("left left");
    expect(app.lines()[0]).toBe("▸ app");
    await app.press("down return");
    expect(selected).toBe("pkg");
  });
});
