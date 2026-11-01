# {{name}}

A [Text.js](https://textjs.org) app bootstrapped with `create-text-app`.

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000), then press **⌘⌥J** (macOS) or **Ctrl+Shift+J** (Windows/Linux) to open Chrome DevTools. Your app renders in the console. Click back into the page to capture the keyboard.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Project structure

```text
app/
  layout.tsx        Root layout (header, navigation, footer)
  page.tsx          /         keyboard counter
  about/page.tsx    /about
text.config.ts      Viewport, theme and dev server options
```

## Commands

| Command          | Description                                   |
| ---------------- | --------------------------------------------- |
| `bun dev`        | Start the dev server with Fast Refresh        |
| `bun run build`  | Create an optimized console production build  |
| `bun start`      | Serve the production build                    |

Press **F2** or **Ctrl+`** in the console to open the Dev Overlay.

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
