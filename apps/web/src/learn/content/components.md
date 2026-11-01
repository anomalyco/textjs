Replace the hand-rolled rows with components: `<Table>` with keyboard navigation and sorting, `<List>` with virtualized scrolling, and charts drawn with eighth blocks and quadrant dots.

## A sortable table

Columns are an array of objects. A column without a `width` shares the remaining space by `grow`, `value` is what sorting compares, and `render` draws the cell.

```diff-tsx@app/deployments/page.tsx
+import { Table, type SortState, type TableColumn } from "@textjs/next";
+
+const COLUMNS: TableColumn<Deployment>[] = [
+  { key: "status", header: "Status", width: 11, render: (d) => <Status status={d.status} /> },
+  { key: "commit", header: "Commit", grow: 2 },
+  { key: "project", header: "Project", width: 10 },
+  { key: "duration", header: "Build", width: 6, align: "right", value: (d) => d.duration, render: (d) => <Text>{`${d.duration}s`}</Text> },
+];
 
 export default function DeploymentsPage() {
+  const [sort, setSort] = useState<SortState | null>(null);
   …
-  return rows.map((d) => …);
+  return <Table columns={COLUMNS} rows={rows} getRowKey={(d) => d.id} sortable sort={sort} onSortChange={setSort} autoFocus />;
 }
```

With focus on the table, `↑` `↓` move the highlight, `s` cycles the sort column, `S` flips the direction and `Enter` calls `onSelect`. Long tables only paint the visible rows.

## A chart above it

`<Sparkline>` fills its box with the most recent points. `<BarChart>` aligns labels and values for you.

```diff-tsx@app/deployments/page.tsx
+import { BarChart, Sparkline } from "@textjs/next";
+
+  const [chart, setChart] = useState<"spark" | "bars">("spark");
+  useInput((e) => {
+    if (e.input === "c") setChart((c) => (c === "spark" ? "bars" : "spark"));
+  });
+
   return (
     <Box className="flex-col grow gap-1">
+      <Box className="flex-col" height={4}>
+        <Text color="subtle">Build time, last 24 deployments</Text>
+        {chart === "spark" ? (
+          <Sparkline data={buildTimes} height={3} color="accent" />
+        ) : (
+          <BarChart data={byProject} formatValue={(v) => `${v}s`} />
+        )}
+      </Box>
       <Table … />
     </Box>
   );
```

The chart box has a fixed height, so switching charts never moves the table, and the table rows are not re-encoded or logged.

## More components

`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` and more are documented under [Components](/docs/components-data).
