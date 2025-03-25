# {{name}}

A real-time metrics & deployments dashboard built with [Text.js](https://textjs.org) — it renders inside the DevTools Console.

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and press **⌘⌥J** (or **Ctrl+Shift+J**).

- `app/page.tsx` — live CPU / memory sparklines and deployments
- `app/deployments/[id]/page.tsx` — dynamic route with `notFound()`
- `app/api/metrics/route.ts` — a route handler (`GET /api/metrics`)

Keys: `1`/`2` navigate · `Tab` focus · `Enter` open · `Esc` back · `F2` DevTools.
