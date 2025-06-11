This page provides an overview of the folder and file conventions in Text.js, and the CLI that builds them.

## Top-level folders

| Folder | Purpose |
| :-- | :-- |
| `app` | App Router: routes, layouts and route handlers |
| `lib` | Shared modules (data, utilities). Not routed |
| `public` | Static assets served from the site root |
| `dist` | Production build output (`text build`) |

## Top-level files

| File | Purpose |
| :-- | :-- |
| `text.config.ts` | Configuration for Text.js |
| `package.json` | Dependencies and `text` scripts |
| `tsconfig.json` | TypeScript configuration |
| `index.html` | Optional. Generated automatically when omitted |

## Routing files

| File | Extension | Purpose |
| :-- | :-- | :-- |
| `layout` | `.tsx` | Shared UI for a segment and its children |
| `page` | `.tsx` | A publicly routable console screen |
| `loading` | `.tsx` | Suspense fallback for the segment |
| `error` | `.tsx` | Error boundary for the segment |
| `not-found` | `.tsx` | UI for `notFound()` and unmatched URLs |
| `route` | `.ts` | API endpoint (`GET`, `POST`, …) |

## Nested routes

Folders define URL segments. A route is public only when it contains a `page.tsx` (or `route.ts`).

```text
app/
├── layout.tsx              → shared shell for every route
├── page.tsx                → /
├── not-found.tsx
├── sessions/
│   ├── page.tsx            → /sessions
│   └── [id]/
│       ├── page.tsx        → /sessions/:id
│       ├── loading.tsx
│       └── error.tsx
├── docs/
│   └── [...slug]/page.tsx  → /docs/a/b/c
├── (marketing)/
│   └── pricing/page.tsx    → /pricing (group folders are not in the URL)
└── api/
    └── health/route.ts     → GET /api/health
```

## Dynamic routes

| Folder | Example URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |
| `[[...slug]]` | `/docs` | `{ slug: undefined }` |

## text.config.ts

Configure the console grid, dev indicators, rewrites and proxies:

```ts@text.config.ts
import { defineConfig } from "textjs";

export default defineConfig({
  title: "Vershell Console",
  viewport: { width: 100, height: 32, theme: "geistDark" },
  devIndicators: true,
  rewrites: [{ source: "/api/opencode/:path*", destination: "http://127.0.0.1:4096/:path*" }],
});
```

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `title` | `string` | `""` | FocusPad title and default `document.title` |
| `viewport.width` | `number` | `100` | Fixed grid width in cells |
| `viewport.height` | `number` | `32` | Fixed grid height in cells |
| `viewport.responsive` | `boolean` | `false` | Follow the docked DevTools size |
| `viewport.theme` | `ThemeName` | `"geistDark"` | Initial theme preset |
| `devIndicators` | `boolean` | `true` | Show the in-console `[▼]` pill in development |
| `showMirrorDefault` | `boolean` | `false` | Open the inline console preview on the page |
| `basePath` | `string` | `""` | Mount the app under a sub-path |
| `appDir` | `string` | `"app"` | App Router directory |
| `outDir` | `string` | `"dist"` | Build output directory |
| `rewrites` | `Rewrite[]` | `[]` | Rewrites; external destinations are proxied |
| `proxy` | `Record<string, ProxyTarget>` | `{}` | Dev / start server proxy rules |
| `configureServer` | `(server) => void` | — | Extend the dev server |

## The text CLI

| Command | Description |
| :-- | :-- |
| `text dev` | Start the development server with React Fast Refresh |
| `text build` | Create an optimized console production build |
| `text start` | Serve the production build, including route handlers |

```bash
text build
```

```text
▼ Text.js 0.1.0 (Turbolog)

  Creating an optimized console production build…
  ✓ Compiled successfully in 812ms

Route (app)                    Size     First Frame
┌ ○ /                          1.2 kB   0.18ms
├ ○ /deployments               2.1 kB   0.22ms
├ ƒ /deployments/[id]          2.4 kB   0.21ms
├ ƒ /api/health                0 B      —
└ ○ /_not-found                0.4 kB   0.09ms

○  (Static)   prerendered as console frames
ƒ  (Dynamic)  rendered on demand
▼  0 DOM nodes
```

| Flag | Description |
| :-- | :-- |
| `-p, --port <port>` | Port (default `3000`) |
| `-H, --host [host]` | Expose on the network |
| `-v, --version` | Print the Text.js version |
