`text build` produces a static client and, if you have route handlers, a server for `text start`.

## Build

```bash
bun run build
```

```text
   ▼ Text.js 1.0.1 (Turbolog)

   Creating an optimized console production build...

 ✓ Compiled successfully in 0.8s
 ✓ Collecting route data
 ✓ Generating static console cells (3/4)
 ✓ Prerendering console shells (3/3)
 ✓ Prerendering curl frames (3/3)
 ✓ Finalizing console optimization

Route (app)                              Type       Target
┌ ○ /                                    Static     console.log (%c)
├ ○ /_not-found                          Static     console.log (%c)
├ ○ /deployments                         Static     console.log (%c)
├ ƒ /deployments/[id]                    Dynamic    console.log (%c)
├ ○ /settings                            Static     console.log (%c)
└ ƒ /api/deployments                     Dynamic    Route Handler
+ First Load JS shared by all             698.2 kB (241.6 kB gzip)

○  (Static)   prerendered as static console cells
ƒ  (Dynamic)  on-demand console reconciliation
```

`text start` serves the build and runs your route handlers. It runs on any host with Bun 1.2+ or Node.js 22+.

## Metadata

Set the browser tab title in the root layout. Pages can override it.

```diff-tsx@app/deployments/page.tsx
+export const metadata = { title: "Deployments" }; // → "Deployments · Acme"
```

## Static hosting

Without route handlers the build is a plain static site. Each static route gets its own HTML file. Dynamic routes such as `/deployments/[id]` are served by `index.html`.

On Vercel and Cloudflare Pages, `text build` detects the platform and writes that fallback itself. Other static hosts need a rewrite. On Netlify, add a `_redirects` file to `public/`:

```diff-text@public/_redirects
+/*  /index.html  200
```

Netlify serves files that exist before it applies the rule, so assets and prerendered routes are unaffected.

## Before you ship

- Turn off **Preserve log** in your console settings. Your users need it off too.
- Test narrow sizes such as 80×24. DevTools docked to the side gives a narrow grid.
- Run `bun test`.

Press `Enter` in the console to ship. Then claim your certificate.
