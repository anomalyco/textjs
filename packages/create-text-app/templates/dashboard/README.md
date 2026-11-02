# {{name}}

A real-time metrics and deployments dashboard built with [Text.js](https://textjs.org). It renders in the DevTools console.

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and [open the browser console](https://textjs.org/docs/installation#open-the-console).

- `app/page.tsx`: live CPU / memory sparklines and deployments
- `app/deployments/[id]/page.tsx`: dynamic route with `notFound()`
- `app/api/metrics/route.ts`: a route handler (`GET /api/metrics`)

Keys: `1`/`2` navigate · `Tab` focus · `Enter` open · `Esc` back · `F2` Dev Overlay.

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
```

A static host (`--adapter static`) can't serve `app/api/metrics/route.ts`, a dynamic route handler. To export a static site, add `export const dynamic = "force-static"` to it or delete it.

See [Deploying](https://textjs.org/docs/deploying).
