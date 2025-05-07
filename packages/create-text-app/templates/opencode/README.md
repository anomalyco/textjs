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
