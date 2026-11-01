`text build` produces a static client and, if you have route handlers, a server for `text start`.

## Build

```bash
bun run build
```

```text
▼ Text.js 1.0.0 (Turbolog)
  Compiling app/ … 4 routes, 1 route handler
  Bundling 1 client chunk (41.2 kB gzip)
✓ Built in 1.8s
```

`text start` serves the build and runs your route handlers. It runs on any host with Bun 1.2+ or Node.js 22+.

## Metadata

Set the browser tab title in the root layout. Pages can override it.

```diff-tsx@app/deployments/page.tsx
+export const metadata = { title: "Deployments" }; // → "Deployments · Acme"
```

## Static hosting

Without route handlers the build is a plain static site. Every route is served by the same `index.html`, so the host needs one SPA rewrite:

```diff-json@vercel.json
+{
+  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
+}
```

## Before you ship

- Turn off **Preserve log** in your console settings. Your users need it off too.
- Test narrow sizes such as 80×24. DevTools docked to the side gives a narrow grid.
- Run `bun test`.

Press `Enter` in the console to ship. Then claim your certificate.
