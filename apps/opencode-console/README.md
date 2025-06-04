# ▼ OpenCode Lite — the OpenCode TUI in `console.log`

A connected OpenCode client built with the Text.js App Router. It renders entirely inside your browser's DevTools Console (112×34, `opencodeDark`).

```bash
bun run --cwd apps/opencode-console dev     # text dev --port 3001
bun run --cwd apps/opencode-console test
bun run --cwd apps/opencode-console build
```

Open the page, press **⌘⌥J** (or **Ctrl+Shift+J**), then click back into the page so it captures the keyboard.

## Connecting

- **Auto-discovery (dev):** `text.config.ts` mounts a `/__opencode/*` proxy. It finds the daemon with `opencode service status` and falls back to `$OPENCODE_SERVER_URL`, then `http://127.0.0.1:4096`. The service password is read with `opencode service get password` and kept in the dev server's memory as an `Authorization: Basic …` header. It never reaches the browser. `GET /__opencode/_status` returns `{ connected, targetUrl, mode }`.
- **`text start`:** the same proxy is also served by `app/api/opencode/[...path]/route.ts`.
- **Custom server:** go to `/connect` (or use `?server=http://localhost:4096`). V2 (`/api/*`) and V1 (`/session`, `/event`) servers are both detected. Loopback URLs go through the proxy; anything else is fetched directly. The `?server=` parameter only accepts `localhost`, `127.0.0.1` and `[::1]`, so a crafted link can't send your prompts to someone else's server.
- **Proxy hardening:** the proxy only answers requests whose `Host` is `localhost`, `127.0.0.1` or `[::1]` (DNS rebinding), rejects cross-site `Sec-Fetch-Site` requests, requires `x-opencode-client: 1` on anything other than `GET` / `HEAD` / `OPTIONS` (CSRF), and refuses request bodies over 4 MB (`413`).
- **Demo:** when no server can be reached (for example on a static preview), or with `?demo`, the app switches to an in-memory backend. It has seeded sessions and simulates streaming reasoning, `read`/`edit`/`shell` tool calls and Markdown.

## Keys

| Key                    | Action                                    |
| ---------------------- | ----------------------------------------- |
| `Enter` / `⇧Enter`     | Send prompt / newline (`Ctrl+J` too)      |
| `Esc`                  | Interrupt the running session             |
| `Tab`                  | Switch agent `build` ↔ `plan`             |
| `Ctrl+P` / `Ctrl+K`    | Command palette                           |
| `Ctrl+N`               | New session                               |
| `Ctrl+G`               | Switch session                            |
| `Ctrl+M`               | Switch model                              |
| `Ctrl+B`               | Toggle session sidebar                    |
| `Ctrl+O`               | Compact / expanded tool output            |
| `Ctrl+T`               | Collapse / expand thinking                |
| `PgUp` / `PgDn`, wheel | Scroll the timeline                       |

## Layout

| Path                                 | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `app/layout.tsx`                     | Store provider + shell (header, sidebar, palette)    |
| `app/page.tsx`                       | Home: logo, hints, recent sessions, composer         |
| `app/session/[id]/page.tsx`          | Live session timeline                                |
| `app/connect/page.tsx`               | Choose a server URL / auto-discover / demo           |
| `app/api/opencode/[...path]/route.ts`| Production proxy                                     |
| `server/opencode-proxy.ts`           | Discovery, credential injection, SSE passthrough     |
| `lib/client.ts`                      | V2 / V1 HTTP + SSE client and connection logic       |
| `lib/demo.ts`                        | Interactive demo backend                             |
| `lib/store.ts`                       | Store that folds SSE events into timelines           |
