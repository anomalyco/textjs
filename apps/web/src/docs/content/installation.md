## Requirements

- [Bun](https://bun.sh) 1.2+ or Node.js 22+
- Chrome, Edge, Firefox or Safari on desktop

## Create an app

```bash
bunx create-text-app@latest
```

Pick a template (`starter`, `dashboard` or `opencode`), then start the dev server:

```bash
cd my-app
bun install
bun dev
```

## Open the console

Visit `http://localhost:3000` and open the console.

| Browser | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome, Edge, Arc, Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | macOS only |

In Safari, first turn on **Show features for web developers** in Settings → Advanced.

Click the page to focus it, then type. Docking DevTools to the bottom gives the widest grid.

## Console settings

Turn off **Preserve log** in the console settings. Text.js appends one message per frame and clears the console to release old frames. With Preserve log on, DevTools ignores the clear and old frames accumulate.

## Manual setup

```bash
bun add @textjs/app react react-dom
```

```json@package.json
{
  "scripts": { "dev": "text dev", "build": "text build", "start": "text start" }
}
```

```tsx@app/page.tsx
import { Text } from "@textjs/app";

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
