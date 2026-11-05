Folders in `app/` define routes, and special files define the UI for each route.

## Folders

| Folder | Purpose |
| :-- | :-- |
| `app` | Routes, layouts and route handlers |
| `lib` | Shared modules, not routed |
| `public` | Static assets |

## Routing files

| File | Purpose |
| :-- | :-- |
| `layout.tsx` | Shared UI for a segment |
| `page.tsx` | A routable screen |
| `loading.tsx` | Suspense fallback |
| `error.tsx` | Error boundary |
| `not-found.tsx` | Unmatched URLs |
| `route.ts` | API endpoint |

```text
app/
├── layout.tsx            → shared shell
├── page.tsx              → /
├── sessions/
│   ├── page.tsx          → /sessions
│   └── [id]/page.tsx     → /sessions/:id
└── api/health/route.ts   → GET /api/health
```

## Dynamic routes

| Folder | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

## text.config.ts

```ts@text.config.ts
import { defineConfig } from "@textjs/app";

export default defineConfig({
  title: "Acme",
  viewport: { width: 120, height: 36, theme: "geistDark" },
  hints: [{ keys: "↑ ↓", label: "count" }],
});
```

| Option | Default | Description |
| :-- | :-- | :-- |
| `title` | `""` | Page and FocusPad title |
| `viewport` | fit console, else `120×36` | `responsive` (default `true`), fallback `width × height`, `theme` |
| `hints` | `[]` | Two or three keys shown on the page's FocusPad |
| `action` | `press <first hint>` | What to do once focused, e.g. `"type a prompt"` |
| `devIndicators` | `true` | In-console Dev Overlay (`[▼]`) |
| `focusHint` | `true` | "Click the page to use the keyboard" over the console's last row while the page doesn't have focus |
| `rewrites` | `[]` | Rewrites and proxies |
| `ansi` | `{ cols: 80, rows: 24 }` | Frame size for [curl and terminal clients](/docs/curl), or `false` to serve them HTML |
| `embed` | `false` | Build the app as one script tag for another site ([Embedding](/docs/embedding), experimental) |

## CLI

| Command | Description |
| :-- | :-- |
| `text dev` | Dev server with Fast Refresh |
| `text build` | Production build |
| `text start` | Serve the build and route handlers |
| `text run` | Render the app in a terminal ([Terminal](/docs/terminal)) |
| `text mcp` | Serve the app to coding agents ([MCP](/docs/mcp)) |
