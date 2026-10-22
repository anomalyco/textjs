<div align="center">

# ▼ Text.js

React apps rendered entirely inside `console.log`.

[Docs](https://textjs.org/docs) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<img src="apps/web/public/og.png" alt="▼ TEXT.JS — The Console Framework for the Web" width="720" />

</div>

## Quickstart

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

Open [localhost:3000](http://localhost:3000) and press **⌘⌥J**.

## Example

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/next";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

Each frame is laid out with Yoga, run-length encoded into `%c` spans, and written in one `console.log`. Idle frames log nothing. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Packages

| Package | Description |
| --- | --- |
| [`@textjs/next`](packages/text) | App Router, CLI and route handlers |
| [`@textjs/react`](packages/react) | Reconciler, components and hooks |
| [`@textjs/core`](packages/core) | Cell buffer, layout and the `%c` driver |
| [`create-text-app`](packages/create-text-app) | Project generator |

## OpenCode

A connected [OpenCode](https://opencode.ai) client in your console:

```bash
opencode service status     # If stopped: opencode service start
bun run dev:opencode        # From the repo root; no bridge needed
```

Then open [localhost:3001](http://localhost:3001) and press **⌘⌥J**. Without a server it falls back to a demo.

For the website’s `/opencode` page, run `bunx @textjs/next proxy` from any directory instead. Leave it running, enter `http://127.0.0.1:4096` in **Connect Local Server**, click **Connect**, and allow local network access if Chrome asks. The bridge handles CORS and server auth. See [Connecting](apps/opencode-console/README.md#connecting) for foreground servers and port conflicts.

## Development

```bash
bun install
bun test packages/ apps/opencode-console/ apps/web/
bun run typecheck
bun run build
```

## License

MIT
