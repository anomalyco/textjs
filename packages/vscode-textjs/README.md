# ▼ Text.js for VS Code

The Text.js extension shows your console frame next to the code. It mirrors the app running under `text dev`, or renders the open file itself when nothing is running. It also adds App Router scaffolding, snippets and links for `TX###` error codes.

[Text.js](https://textjs.org) is a React framework for apps that render in the DevTools console with `console.log`. Read the [docs](https://textjs.org/docs) to start a project.

## Getting started

1. Open a folder that contains a Text.js app: a `text.config.ts`, or a package that depends on `@textjs/app` and has an `app/` directory. Monorepos with several apps work too.
2. Open a `page.tsx`, `layout.tsx` or component.
3. Run **Text.js: Open Preview** (`⌘K V` on macOS, `Ctrl+K V` on Windows and Linux), or click the preview button in the editor title bar.

## Live Preview

The panel draws the frame in the same DevTools chrome and Menlo cells as your browser console. A badge in the toolbar shows where the frames come from:

- **Live**: `text dev` is running and a browser tab has the app open. The preview mirrors that tab, and keys you type in the preview go back to the app.
- **Headless**: there's no dev server, or no tab open. The extension renders the open file with the project's own Vite and `@textjs/app`. Route files render with their layouts, at a grid sized to the panel, and saving a file renders it again.

Click the console to type into the app, and click outside it to stop. Editor shortcuts such as `⌘P` and `⌘⇧P` still go to VS Code.

## Commands

| Command | Description |
| :-- | :-- |
| Text.js: Start Dev Server | Runs your `dev` script (or `text dev`) in a terminal |
| Text.js: Stop Dev Server | Stops a dev server started from VS Code |
| Text.js: Open Preview | Opens the Live Preview for the active file |
| Text.js: Open in Browser Console | Opens the current route on the dev server |
| Text.js: New Page / Layout / Route Handler | Creates App Router files. Also in the Explorer context menu for folders |
| Text.js: New Loading UI / Error Boundary / Not Found Page | Creates `loading.tsx`, `error.tsx` or `not-found.tsx` |

## Snippets and error codes

- Snippets for route files (`txpage`, `txlayout`, `txroute`), components (`box`, `text`, `scrollbox`), hooks (`useInput`, `useKeymap`, `useFocus`) and `text.config.ts` (`txconfig`).
- Hover a `TX###` code in source, logs or a stack trace to see its title and message. `⌘`-click it to open its page, for example [textjs.org/errors/TX015](https://textjs.org/errors/TX015).
- The status bar shows the dev server state and the console grid size.

## Settings

| Setting | Default | Description |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` or `headless` |
| `textjs.preview.followEditor` | `false` | In live mode, move the browser tab to the route you're editing |
| `textjs.preview.fontSize` | `12` | Cell font size in pixels |
| `textjs.preview.runtime` | | Node.js binary for headless previews (default: the one bundled with VS Code) |
| `textjs.devServer.url` | | Dev server URL (default: discover on ports 3000–3010). Only `http://` loopback addresses are used |
| `textjs.devServer.command` | | Command for Start Dev Server |

## Workspace Trust

The preview and the dev server run your project's code, so they need a trusted workspace. In Restricted Mode the extension offers snippets, scaffolding and error links only.

## Documentation

The full guide is at [textjs.org/docs/vscode](https://textjs.org/docs/vscode). Questions and bug reports go to [hello@textjs.org](mailto:hello@textjs.org).
