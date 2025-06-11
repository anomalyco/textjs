## System requirements

- [Bun](https://bun.sh) 1.2 or later, or Node.js 20.11+
- A Chromium-based browser (Chrome, Edge, Arc, Brave) for the reference console implementation
- macOS, Windows (including WSL) and Linux are supported

> **Good to know:** Firefox and Safari consoles render Text.js applications, but do not yet implement `%c` background spans across line breaks with the same fidelity. Turbolog targets Chromium's `ConsoleViewMessage.ts` as the reference renderer.

## Automatic installation

We recommend starting a new Text.js app using `create-text-app`, which sets everything up for you:

```bash
bunx create-text-app@latest
```

On installation, you'll see the following prompts:

```text
✔ What is your project named? my-app
✔ Which template would you like to use? › starter
    starter     Clean starter: layout, keyboard counter and <Link> navigation
    dashboard   Real-time metrics & deployments App Router dashboard
    opencode    Connect to a local OpenCode server: sessions & prompt input
```

After the prompts, `create-text-app` creates a folder with your project name, scaffolded against `textjs@^0.1.0`. Install the dependencies and start the development server:

```bash
cd my-app
bun install
bun dev
```

```text
   ▼ Text.js 0.1.0 (Turbolog)
   - Local:        http://localhost:3000

 ✓ Starting...
 ✓ Ready in 412ms

 ○ Open DevTools Console (⌘⌥J) to view your app
```

> **Good to know:** The `text` and `create-text-app` CLIs run on Bun or Node.js. With npm, use `npx create-text-app@latest`, then `npm install` and `npm run dev`.

## Open the console

Visit `http://localhost:3000`. The page will be intentionally empty. Open DevTools:

| Platform | Shortcut |
| :-- | :-- |
| macOS | `⌘` `⌥` `J` |
| Windows / Linux | `Ctrl` `Shift` `J` |
| Any | `F12`, then select **Console** |

Your application is running. Click anywhere on the page to give it keyboard focus, then type. Keystrokes are captured by a hidden input sink and delivered to your components through `useInput`.

> **Good to know:** Docking DevTools to the **bottom** of the window gives Text.js the widest grid. With `viewport.responsive` enabled, the grid follows the docked console size automatically.

## Recommended console settings

Text.js clears and redraws the console on every dirty frame. For the best experience, configure DevTools once:

1. Open the Console settings (the gear icon in the console toolbar).
2. **Uncheck "Preserve log".** Preserved logs survive `console.clear()` and will stack frames.
3. **Uncheck "Group similar messages in console".**
4. Set the log level filter to **Default levels**. Verbose filters are permitted but unnecessary.

> **Warning:** With "Preserve log" enabled, Text.js will still emit exactly one log per frame. It is your console that will remember all of them.

## Manual installation

To manually create a Text.js app, create a `package.json` with `"type": "module"` and install the required packages:

```bash
bun init -y
bun add textjs@^0.1.0 react react-dom
```

Add the following scripts to your `package.json`:

```json@package.json
{
  "scripts": {
    "dev": "text dev",
    "build": "text build",
    "start": "text start"
  }
}
```

Then create an `app` directory with a root layout and a page:

```tsx@app/layout.tsx
import type { ReactNode } from "react";
import { Box, Text } from "textjs";

export const metadata = { title: "My App" };

export default function RootLayout({ children }: { children?: ReactNode }) {
  return (
    <Box className="flex-col w-full h-full">
      <Text bold className="px-1 bg-surface">▼ My App</Text>
      {children}
    </Box>
  );
}
```

```tsx@app/page.tsx
import { Text } from "textjs";

export default function Page() {
  return <Text className="p-1">Hello from console.log</Text>;
}
```

Run `bun install` (if you haven't already) and `bun dev`, open the console, and you're done.

## Using Text.js without the framework

The renderer is also available on its own. Mount any React tree into the console from an existing site:

```tsx@main.tsx
import { renderToConsole, Box, Text } from "@textjs/react";

await renderToConsole(
  <Box className="border rounded p-1">
    <Text bold>Hello, DevTools</Text>
  </Box>,
  { width: 100, height: 32, theme: "geistDark" },
);
```

This is how `textjs.org` itself works: the page you are reading is a normal react-dom site, and a second React root runs in your console. Press `⌘⌥J` to see it.
