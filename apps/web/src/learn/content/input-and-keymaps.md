Keystrokes reach your app through a hidden input on the page, so the page needs focus. That's why every Text.js app asks you to click the page first. Once it has focus, every key you press is delivered to React.

## `useInput`

`useInput` is the low-level hook you've used so far. It gets a `KeyEvent` with a normalized `key` (`"up"`, `"return"`, `"escape"`), the typed character in `input`, and `ctrl`, `alt`, `shift` and `meta`.

```tsx
useInput((e) => {
  if (e.ctrl && e.key === "k") openPalette();
});
```

Call `e.stopPropagation()` to keep a key from reaching handlers further down the tree.

## Keymaps

Once a screen has more than a couple of keys, describe them with `useKeymap`. Bindings are strings: `"up, k"` is either key, `"g g"` is a sequence, `"ctrl+k"` a chord. Labeled bindings also appear in `<KeyHelp>`, `<KeyHints>` and the command palette.

```diff-tsx@app/deployments/page.tsx
+import { useState } from "react";
+import { Box, KeyHelp, Text, useKeymap } from "@textjs/app";
+import { DEPLOYMENTS } from "../../lib/deployments";
+
+export default function DeploymentsPage() {
+  const [index, setIndex] = useState(0);
+  const [open, setOpen] = useState(false);
+  const move = (by: number) => setIndex((i) => Math.max(0, Math.min(DEPLOYMENTS.length - 1, i + by)));
+
+  useKeymap({
+    "up, k": { label: "Previous deployment", run: () => move(-1) },
+    "down, j": { label: "Next deployment", run: () => move(1) },
+    enter: { label: "Toggle details", run: () => setOpen((o) => !o) },
+    "g g": { label: "First deployment", run: () => setIndex(0) },
+  });
+
+  return (
+    <Box className="flex-row grow p-1 gap-2">
+      <Box className="flex-col grow">
+        {DEPLOYMENTS.map((d, i) => (
+          <Box key={d.id} className="flex-row h-1 gap-2 px-1" backgroundColor={i === index ? "selection" : undefined}>
+            <Text>{i === index ? "›" : " "}</Text>
+            <Text bold={i === index} wrap="truncate-end">{d.commit}</Text>
+          </Box>
+        ))}
+      </Box>
+      {open && <Details deployment={DEPLOYMENTS[index]} />}
+      <KeyHelp />
+    </Box>
+  );
+}
```

`DEPLOYMENTS` is a plain array in `lib/deployments.ts` for now. Chapter 6 moves it behind a route handler.

## The help overlay

`<KeyHelp />` listens for `?` and opens a modal listing every labeled binding that is live right now, grouped. Press `?` in the console, then `?` or `q` to close it. Bindings inside a modal trap focus, so the list underneath stops reacting until it closes.

## Focus

Components like `<Input>`, `<Select>` and `<Table>` only take keys while focused. `Tab` moves focus between them; `useFocus()` and `useFocusManager()` let you do it yourself.
