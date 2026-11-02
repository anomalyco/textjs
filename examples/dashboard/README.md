# ▼ Edge Console

A multi-route App Router example for Text.js. It renders in your browser's DevTools console.

```bash
bun install
bun run --cwd examples/dashboard dev     # text dev
bun run --cwd examples/dashboard build   # text build
bun run --cwd examples/dashboard start   # text start
```

Open the page, [open the browser console](https://textjs.org/docs/installation#open-the-console), and click back into the page to capture the keyboard.

| Route                | File                               |
| -------------------- | ---------------------------------- |
| `/`                  | `app/page.tsx`                     |
| `/deployments`       | `app/deployments/page.tsx`         |
| `/deployments/[id]`  | `app/deployments/[id]/page.tsx`    |
| `/logs`              | `app/logs/page.tsx`                |
| `/settings`          | `app/settings/page.tsx`            |
| `/status`            | `app/status/page.tsx` (`runtime = "server"`) |
| `/api/health`        | `app/api/health/route.ts`          |
| `/api/deployments`   | `app/api/deployments/route.ts`     |

Keys: `1`–`5` navigate · `Tab` focus · `Enter` open · `Esc` back · `F2` / ``Ctrl+` `` Dev Overlay.

## Server rendering

`/status` opts into server rendering with `export const runtime = "server"`. Its React tree renders in `text dev` / `text start`, with async components reading the host through `node:os` (`lib/status.server.ts`); the browser loads only the ~21 kB (gzip) frame player, which logs the streamed frames and sends keys back. Every static route also gets a prerendered console shell in its HTML (Partial Prerendering), so the console paints before any JavaScript loads.

