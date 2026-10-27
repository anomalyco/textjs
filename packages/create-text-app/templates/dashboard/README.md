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

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new) [![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy%20to-Cloudflare%20Pages-f38020?logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/?to=/:account/pages/new/provider/github)

Push this project to GitHub, then import it:

- **Vercel**: build command `bun run build`. Builds on Vercel select the Vercel adapter automatically and write `.vercel/output` (static console + route handlers as functions + `middleware.ts` at the edge).
- **Cloudflare Pages**: build command `bun run build`, output directory `dist`, and the `nodejs_compat` compatibility flag. Builds on Pages select the Cloudflare adapter automatically (`dist/_worker.js`).

Or build for a target yourself:

```bash
bunx text build --adapter vercel       # .vercel/output → vercel deploy --prebuilt
bunx text build --adapter cloudflare   # dist/_worker.js → wrangler pages deploy dist
bunx text build --adapter bun          # dist/server.js → bun dist/server.js
bunx text build --adapter static       # dist/ for any static host
```

See [Deploying](https://textjs.org/docs/deploying).
