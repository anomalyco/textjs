# ▼ Text.js for VS Code

See your console app while you write it. Live Preview, App Router scaffolding, snippets and `TX###` error links for [Text.js](https://textjs.org), the Console Framework for the Web.

## Live Preview

Open a `page.tsx`, `layout.tsx` or component and run **Text.js: Open Preview** (`⌘K V`). The panel draws the console frame cell for cell, in the same DevTools chrome you see in the browser.

- **Live**: when `text dev` is running and a browser tab has the app open, the preview mirrors that tab. Frames stream from the dev server, and keys you type in the preview go back to the app.
- **Headless**: with no dev server, or no tab open, the extension renders the file itself with the project's own Vite and `@textjs/next`. Route files render with their layouts, at a grid sized to the panel. Saving a file re-renders it.

Click the console to type into the app. Click anywhere outside it to stop. Editor shortcuts (`⌘P`, `⌘⇧P`, …) still go to VS Code.

## Commands

| Command | |
| :-- | :-- |
| Text.js: Start Dev Server | Runs your `dev` script (or `text dev`) in a terminal |
| Text.js: Open Preview | Live Preview for the active file |
| Text.js: Open in Browser Console | Opens the current route on the dev server |
| Text.js: New Page / Layout / Route Handler | App Router scaffolding, also in the Explorer context menu |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

## Also included

- Snippets: `txpage`, `txlayout`, `txroute`, `box`, `text`, `useInput`, `useKeymap`, and more.
- Hovers and links for error codes: `TX015` links to [textjs.org/errors/TX015](https://textjs.org/errors/TX015).
- A status bar item showing the dev server state and the console grid size.

## Settings

| Setting | Default | |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` or `headless` |
| `textjs.preview.followEditor` | `false` | Live mode: move the browser tab to the route you're editing |
| `textjs.preview.fontSize` | `12` | Cell font size |
| `textjs.preview.runtime` | | Node.js binary for headless previews |
| `textjs.devServer.url` | | Dev server URL (default: discover on ports 3000–3010). Only `http://` loopback addresses are used |
| `textjs.devServer.command` | | Command for Start Dev Server |

The preview and the dev server run your project's code, so they need a trusted workspace. In Restricted Mode you still get snippets, scaffolding and error links.

Docs: [textjs.org/docs/vscode](https://textjs.org/docs/vscode)
