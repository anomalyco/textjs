Over ten chapters you'll build **Acme Deploys**, a deploy dashboard that renders entirely inside the DevTools console. Each chapter ends with the app exactly as your code leaves it, running live in the console on this page.

## Create the app

`create-text-app` scaffolds a project with the App Router, TypeScript and the `text` CLI.

```bash
bunx create-text-app@latest acme-deploys --template starter
cd acme-deploys
bun install
bun dev
```

Open `http://localhost:3000`, then open the console with ⌘⌥J (Ctrl+Shift+J elsewhere). The page is blank on purpose. Your app is in the console.

## Your first page

Every route is a `page.tsx` in `app/`. Replace the starter page with the dashboard's title card:

```tsx@app/page.tsx
import { Box, Text } from "@textjs/next";

export default function Page() {
  return (
    <Box className="flex-col border rounded px-2 py-1">
      <Text bold>▼ Acme Deploys</Text>
      <Text color="muted">Hello, console.</Text>
    </Box>
  );
}
```

Save the file. Fast Refresh redraws the frame and keeps your component state.

## Respond to a key

`useInput` receives every keystroke while the page has focus. Count the hellos:

```diff-tsx@app/page.tsx
-import { Box, Text } from "@textjs/next";
+import { useState } from "react";
+import { Box, Text, useInput } from "@textjs/next";
 
 export default function Page() {
+  const [hellos, setHellos] = useState(0);
+
+  useInput((e) => {
+    if (e.key === "return") setHellos((n) => n + 1);
+    if (e.input === "r") setHellos(0);
+  });
+
   return (
     <Box className="flex-col border rounded px-2 py-1">
       <Text bold>▼ Acme Deploys</Text>
-      <Text color="muted">Hello, console.</Text>
+      <Text color="muted">{hellos === 0 ? "Hello, console." : `Hello, console. ×${hellos}`}</Text>
     </Box>
   );
 }
```

That's a complete Text.js app: React state, a layout box and one `console.log` per changed frame. Nothing is logged while it sits idle.
