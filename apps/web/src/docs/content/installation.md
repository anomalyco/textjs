## Requirements

- [Bun](https://bun.sh) 1.2+ or Node.js 20.11+
- A Chromium browser (Chrome, Edge, Arc, Brave)

## Create an app

```bash
bunx create-text-app@latest
```

Pick a template — `starter`, `dashboard` or `opencode` — then start the dev server:

```bash
cd my-app
bun install
bun dev
```

## Open the console

Visit `http://localhost:3000` and open DevTools.

| Platform | Shortcut |
| :-- | :-- |
| macOS | `⌘` `⌥` `J` |
| Windows / Linux | `Ctrl` `Shift` `J` |

Click the page to focus it, then type. Docking DevTools to the bottom gives the widest grid.

## Console settings

Turn off **Preserve log** and **Group similar messages** in the console settings. Text.js clears and redraws on every frame.

## Manual setup

```bash
bun add textjs react react-dom
```

```json@package.json
{
  "scripts": { "dev": "text dev", "build": "text build", "start": "text start" }
}
```

```tsx@app/page.tsx
import { Text } from "textjs";

export default function Page() {
  return <Text className="p-1">Hello from console.log</Text>;
}
```

## Without the framework

Mount any React tree into the console from an existing site:

```tsx@main.tsx
import { renderToConsole, Box, Text } from "@textjs/react";

await renderToConsole(
  <Box className="border rounded p-1">
    <Text bold>Hello, DevTools</Text>
  </Box>,
  { width: 100, height: 32 },
);
```
