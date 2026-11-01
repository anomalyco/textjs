The console is a grid of cells. Text.js lays it out with Yoga, the same Flexbox engine React Native uses, so `<Box>` follows the CSS flexbox rules. Units are cells: `p-1` is one column and one row of padding.

## A top bar

Most screens are a column: a one-row bar, then everything else. Give the bar a fixed height with `h-1` and let the content take the rest with `grow`.

```diff-tsx@app/page.tsx
-import { Box, Text, useInput } from "@textjs/next";
+import { Box, Spacer, Text, useInput } from "@textjs/next";
 
 export default function Page() {
   return (
-    <Box className="flex-col border rounded px-2 py-1">
-      <Text bold>▼ Acme Deploys</Text>
-      <Text color="muted">Hello, console.</Text>
+    <Box className="flex-col grow">
+      <Box className="flex-row h-1 px-1 gap-2 shrink-0">
+        <Text bold>▼ Acme</Text>
+        <Text color="subtle">acme.local</Text>
+        <Spacer />
+      </Box>
+      <Box className="flex-row grow">{/* sidebar + cards */}</Box>
     </Box>
   );
 }
```

`<Spacer>` is a growing box: anything after it is pushed to the right edge.

## Sidebar and cards

A fixed-width sidebar with a right border, and three cards that share the remaining width. `basis-0` with `grow` gives each card an equal share regardless of its content.

```diff-tsx@app/page.tsx
+const NAV = ["Overview", "Deployments", "Settings"];
+
+function Card({ title, value }: { title: string; value: string }) {
+  return (
+    <Box className="flex-col border rounded px-1 grow shrink basis-0" minWidth={14} minHeight={4}>
+      <Text color="subtle">{title}</Text>
+      <Text bold>{value}</Text>
+    </Box>
+  );
+}
+
 export default function Page() {
+  const [sidebar, setSidebar] = useState(true);
+  const [stacked, setStacked] = useState(false);
+
+  useInput((e) => {
+    if (e.input === "s") setSidebar((v) => !v);
+    if (e.input === "d") setStacked((v) => !v);
+  });
+
   return (
     <Box className="flex-col grow">
       {/* top bar */}
-      <Box className="flex-row grow">{/* sidebar + cards */}</Box>
+      <Box className="flex-row grow">
+        {sidebar && (
+          <Box className="flex-col w-18 shrink-0 border-r px-1 pt-1">
+            {NAV.map((item) => <Text key={item}>{item}</Text>)}
+          </Box>
+        )}
+        <Box className={stacked ? "flex-col grow gap-1 p-1" : "flex-row grow items-start gap-1 p-1"}>
+          <Card title="Production" value="acme-web" />
+          <Card title="Deployments" value="6 today" />
+          <Card title="Build time" value="38s p50" />
+        </Box>
+      </Box>
     </Box>
   );
 }
```

Press `s` and `d` in the console. Yoga recomputes the layout and only the rows that changed are repainted, so toggling the sidebar costs a single `console.log`.

## Responsive by default

The grid follows the docked DevTools panel. Drag the console wider or taller and the cards reflow. When you need breakpoints, `useBreakpoint()` returns the current one, in cells.
