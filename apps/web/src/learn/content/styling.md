Every cell has a character, a foreground, a background and a set of attributes. Text.js compiles them into `%c` CSS spans, so the console shows real colors, bold and italics.

## Text attributes

`<Text>` takes `bold`, `dim`, `italic`, `underline` and `strikethrough`. Nested `<Text>` elements become styled spans inside one line.

```tsx
<Text>
  Deployed <Text bold>acme-web</Text> to <Text color="accent">iad1</Text>
</Text>
```

## Theme tokens

The `color` prop accepts hex values, plain color names (`emerald`) and theme tokens; Tailwind palette shades go through classes (`text-emerald-400`). Tokens follow the active theme, so prefer them for anything semantic. Add a status component:

```diff-tsx@app/status.tsx
+import { Text } from "@textjs/next";
+
+export type DeployStatus = "ready" | "building" | "error" | "queued";
+
+export const STATUS = {
+  ready: { label: "Ready", color: "success" },
+  building: { label: "Building", color: "warning" },
+  error: { label: "Error", color: "danger" },
+  queued: { label: "Queued", color: "subtle" },
+} as const;
+
+export function Status({ status }: { status: DeployStatus }) {
+  const s = STATUS[status];
+  return <Text color={s.color} wrap="nowrap">{`● ${s.label}`}</Text>;
+}
```

## A deployment card

`bg-surface` raises the card off the background. The deployment id picks up the status color, goes italic while building and is struck through on error.

```diff-tsx@app/page.tsx
-import { Box, Spacer, Text, useInput } from "@textjs/next";
+import { Box, Spacer, Text, useAppTheme, useInput } from "@textjs/next";
+import { Status, STATUS, type DeployStatus } from "./status";
+
+const ORDER: DeployStatus[] = ["ready", "building", "error", "queued"];
+
 export default function Page() {
+  const { theme, cycleTheme } = useAppTheme();
+  const [status, setStatus] = useState<DeployStatus>("ready");
+
+  useInput((e) => {
+    if (e.input === "t") cycleTheme();
+    if (e.input === "s") setStatus((s) => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length]);
+  });
+
   return (
     <Box className="flex-col grow">
       {/* top bar, now with the theme name on the right */}
+      <Box className="flex-col border rounded px-2 py-1 bg-surface">
+        <Box className="flex-row gap-2 h-1">
+          <Text bold>acme-web</Text>
+          <Status status={status} />
+        </Box>
+        <Text color="muted" wrap="truncate-end">feat: stream cells downward</Text>
+        <Text color={STATUS[status].color} italic={status === "building"} strikethrough={status === "error"}>
+          dpl_8fK2
+        </Text>
+      </Box>
     </Box>
   );
 }
```

`wrap="truncate-end"` ends long commit messages with `…` instead of wrapping onto a second row.

## Themes

Five themes ship with Text.js: Geist Dark, OpenCode Dark, Tokyo Night, Amber CRT and Geist Light. Press `t` in the console to cycle them. The whole frame repaints in the new palette, because every color above is a token.
