Text.js is a React framework for apps that render entirely inside `console.log`.

```tsx#counter
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/next";

export default function Page() {
  const [count, setCount] = useState(0);
  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });
  return (
    <Box className="flex-col p-1 border rounded">
      <Text bold>count = {count}</Text>
    </Box>
  );
}
```

The preview is live. Click it and press `↑`.

## What's included

- **React 19** — concurrent rendering, Suspense and error boundaries.
- **App Router** — layouts, pages, dynamic segments and route handlers.
- **Yoga layout** — flexbox in WebAssembly, snapped to integer cells.
- **Turbolog** — every frame is one `console.log` call.
- **No DOM UI** — the page only hosts a focus pad and a hidden input.

## How it works

State flows down: React, then layout, then a cell buffer, then the console.

```text
React 19 ▼ Yoga ▼ CellBuffer ▼ console.log(format, ...css)
```

Unchanged frames are skipped entirely. Idle apps log nothing.

## Next steps

- [Installation](/docs/installation) — create your first app.
- [Routing](/docs/routing) — pages, layouts and navigation.
- [Turbolog](/docs/turbolog-engine) — how frames are encoded.
- [OpenCode](/docs/opencode) — a full agent TUI built with Text.js.
