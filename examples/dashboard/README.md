# ▼ Vershell Console — Text.js dashboard example

A multi-route App Router showcase that renders entirely inside your browser's DevTools Console.

```bash
bun install
bun run --cwd examples/dashboard dev     # text dev
bun run --cwd examples/dashboard build   # text build
bun run --cwd examples/dashboard start   # text start
```

Open the page, press **⌘⌥J** (or **Ctrl+Shift+J**), and click back into the page to capture the keyboard.

| Route                | File                               |
| -------------------- | ---------------------------------- |
| `/`                  | `app/page.tsx`                     |
| `/deployments`       | `app/deployments/page.tsx`         |
| `/deployments/[id]`  | `app/deployments/[id]/page.tsx`    |
| `/logs`              | `app/logs/page.tsx`                |
| `/settings`          | `app/settings/page.tsx`            |
| `/api/health`        | `app/api/health/route.ts`          |
| `/api/deployments`   | `app/api/deployments/route.ts`     |

Keys: `1`–`4` navigate · `Tab` focus · `Enter` open · `Esc` back · `F2` / ``Ctrl+` `` Text.js DevTools.
