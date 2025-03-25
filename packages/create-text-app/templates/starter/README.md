# {{name}}

A [Text.js](https://textjs.org) app — The Console Framework for the Web — bootstrapped with `create-text-app`.

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000), then press **⌘⌥J** (macOS) or **Ctrl+Shift+J** (Windows/Linux) to open Chrome DevTools. Your app renders in the Console. Click back into the page to capture the keyboard.

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

Press **F2** or **Ctrl+`** in the console to open the Text.js DevTools.
