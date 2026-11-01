The App Router maps files in `app/` to URLs, following the Next.js App Router conventions. The browser's address bar and history stay in sync, so back, forward and deep links work while the UI renders in the console.

## Files are routes

Move the list into its own route and add a settings page:

```diff-text@app/
 app/
   layout.tsx
   page.tsx                 → /
+  deployments/
+    page.tsx               → /deployments
+    [id]/page.tsx          → /deployments/dpl_8fK2
+  settings/
+    page.tsx               → /settings
```

## A shared layout

`layout.tsx` wraps every page and keeps its state across navigation. Put the top bar and the navigation in it.

```diff-tsx@app/layout.tsx
+import type { ReactNode } from "react";
+import { Box, Spacer, Text } from "@textjs/app";
+import Link from "@textjs/app/link";
+import { usePathname } from "@textjs/app/navigation";
+
+export const metadata = { title: { default: "Acme Deploys", template: "%s · Acme" } };
+
+export default function RootLayout({ children }: { children?: ReactNode }) {
+  const pathname = usePathname();
+  return (
+    <Box className="flex-col grow">
+      <Box className="flex-row h-1 px-1 gap-2">
+        <Text bold>▼ Acme</Text>
+        <Text color="subtle">{`acme.local${pathname === "/" ? "" : pathname}`}</Text>
+        <Spacer />
+      </Box>
+      <Box className="flex-row h-1 px-1 gap-3">
+        <Link href="/" shortcut="1">Overview</Link>
+        <Link href="/deployments" shortcut="2">Deployments</Link>
+        <Link href="/settings" shortcut="3">Settings</Link>
+      </Box>
+      <Box className="flex-col grow p-1">{children}</Box>
+    </Box>
+  );
+}
```

`shortcut` binds a single key to the link. Press `1`, `2` and `3` in the console; the URL of a real app would change with each one.

## Going back

`useRouter()` navigates from code. Wire `Backspace` to `router.back()` in the layout:

```diff-tsx@app/layout.tsx
-import { Box, Spacer, Text } from "@textjs/app";
+import { Box, Spacer, Text, useInput } from "@textjs/app";
 import Link from "@textjs/app/link";
-import { usePathname } from "@textjs/app/navigation";
+import { usePathname, useRouter } from "@textjs/app/navigation";
 
 export default function RootLayout({ children }: { children?: ReactNode }) {
   const pathname = usePathname();
+  const router = useRouter();
+
+  useInput((e) => {
+    if (e.key === "backspace") router.back();
+  });
```

## Dynamic segments

`[id]` folders receive their value in `params`:

```tsx@app/deployments/[id]/page.tsx
import { Text, type PageProps } from "@textjs/app";

export default function DeploymentPage({ params }: PageProps<{ id: string }>) {
  return <Text bold>{params.id}</Text>;
}
```

On a static host, dynamic segments like this one need a rewrite to `index.html`. Chapter 10 covers it.
