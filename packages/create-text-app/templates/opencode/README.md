# {{name}}

An [OpenCode](https://opencode.ai) client that renders inside the DevTools Console, built with [Text.js](https://textjs.org).

```bash
opencode serve --port 4096   # in another terminal
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and press **⌘⌥J** (or **Ctrl+Shift+J**).

The browser calls `/opencode/*`, which `text dev` and `text start` proxy to `OPENCODE_URL` (default `http://localhost:4096`) — see `text.config.ts`.

- `app/page.tsx` — session list + new-session prompt
- `app/session/[id]/page.tsx` — message stream + reply input
- `lib/opencode.ts` — a minimal OpenCode HTTP client

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

`proxy` in `text.config.ts` only runs in `text dev` and `text start`. When deploying, point the browser at a reachable OpenCode server with a `rewrites` entry (for example `{ source: "/opencode/:path*", destination: "https://opencode.example.com/:path*" }`).
