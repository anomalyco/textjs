`text run` runs the same app in a terminal. Layout, components, keymaps and route handlers are shared, and the output is truecolor ANSI instead of `%c` CSS spans.

## `text run`

Add a script and run it:

```diff-json@package.json
   "scripts": {
     "dev": "text dev",
     "build": "text build",
-    "start": "text start"
+    "start": "text start",
+    "tui": "text run"
   },
```

```bash
bun run tui                        # render ./app at /
bun run tui -- --path /deployments # start on another route
```

`text run` imports every file in `app/`, mounts the App Router with an in-memory history and draws it full-screen. `<Link>`, `useRouter()`, `notFound()` and `redirect()` work unchanged, and same-origin `fetch("/api/…")` calls run your route handlers in-process. `Ctrl+C` quits and restores your scrollback. It needs Bun.

## Quit with `q`

Terminal users expect `q`. `useApp().exit()` unmounts the app and restores the terminal; in the browser it unmounts the console app.

```diff-tsx@app/layout.tsx
+import { useApp } from "@textjs/next";
 
 export default function RootLayout({ children }: { children?: ReactNode }) {
+  const app = useApp();
   useInput((e) => {
     if (e.key === "backspace") router.back();
+    if (e.input === "q") app.exit();
   });
```

## Your own CLI

For a single component, use `renderToTerminal`:

```tsx@cli.tsx
import { renderToTerminal } from "@textjs/next/terminal";
import DeploymentsPage from "./app/deployments/page";

const app = await renderToTerminal(<DeploymentsPage />);
await app.waitUntilExit();
```

## What's different

Terminals repaint faster (up to 60fps instead of ~15) and size the grid to the window instead of the docked console. Images need pixel data instead of a URL. Everything else, including this dashboard, is the same code.
