The Text.js extension for VS Code shows your console frame next to the code. It mirrors the app running under `text dev`, or renders the open file itself when nothing is running. It also adds App Router scaffolding, snippets and links for `TX###` error codes.

## Install

Install [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs) from the Visual Studio Marketplace. In VS Code, open the Extensions view (`⌘⇧X`) and search for `textjs.vscode-textjs`, or run:

```bash
code --install-extension textjs.vscode-textjs
```

It activates in any folder that contains a Text.js app: a `text.config.ts`, or a package that depends on `@textjs/next` and has an `app/` directory. Monorepos with several apps work too.

## Live Preview

Open a `page.tsx`, `layout.tsx` or component and run **Text.js: Open Preview** (`⌘K V`), or click the preview button in the editor title bar. The panel draws the frame in the same DevTools chrome and Menlo cells as your browser console.

The preview gets its frames from one of two sources. The badge in the toolbar shows which one is active:

| Source | When | What you see |
| :-- | :-- | :-- |
| **Live** | `text dev` is running and a browser tab has the app open | The real app, with its state, data and grid size |
| **Headless** | No dev server, or no tab open | The open file, rendered by the extension at the panel's size |

`auto` (the default) uses Live when it can and Headless otherwise. Pin either one from the badge or with `textjs.preview.mode`.

### Keyboard

Click the console to send keys to the app: arrows, `Tab`, shortcuts, typing and paste all work, like in the browser. Click outside the console to stop. Editor shortcuts such as `⌘P` and `⌘⇧P` still go to VS Code. Scrolling over the console sends wheel events.

In the address field you can type a route, such as `/deployments/dpl_a1`, to navigate either source.

### Live mode

While a preview is open, the dev server asks connected tabs to stream their frames. Tabs send only the rows that changed, and stop sending when the preview closes, so an app with no preview open pays nothing. Saving a file goes through Fast Refresh, and the preview updates with the tab.

Turn on **Follow** (`textjs.preview.followEditor`) to move the browser tab to the route of the `page.tsx` you're editing.

Background tabs get no animation frames, so they normally hold their frames until they become visible again. While a preview is watching, a background tab draws a frame as soon as input arrives, so typing in the preview still updates. Animations in a background tab update about once per second. Put the app in its own window to keep them smooth.

### Headless mode

The extension starts a small runner in your project. It loads route files through the project's own Vite and `@textjs/next`, so aliases, TypeScript and JSX behave the same as in `text dev`. It mounts the App Router at the route of the open file, with its layouts, using an in-memory history:

| File | Preview |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id` (dynamic segments use their name) |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | The default export, or the first PascalCase export, with no props |

Same-origin `fetch("/api/...")` calls run your `route.ts` handlers in-process, as with [`text run`](/docs/terminal). The grid follows the panel's size, and saving any file in the app renders it again. Errors show above the frame, with links to their `TX###` pages.

## Commands

| Command | Description |
| :-- | :-- |
| Text.js: Start Dev Server | Runs your `dev` script (or `text dev`) in a terminal |
| Text.js: Stop Dev Server | Stops a dev server started from VS Code |
| Text.js: Open Preview | Opens the Live Preview for the active file |
| Text.js: Open in Browser Console | Opens the current route on the dev server. Then press `⌘⌥J` |
| Text.js: New Page | `app/<route>/page.tsx` with metadata and typed `params` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `app/<route>/route.ts` with `GET` and `POST` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`, `error.tsx`, `not-found.tsx` |

The scaffolding commands are also in the Explorer context menu for folders. They accept [App Router](/docs/routing) segments such as `settings`, `blog/[slug]`, `docs/[...path]` and `(marketing)/about`, and refuse to put a `page` and a `route.ts` in the same segment. JavaScript projects (no `tsconfig.json`) get `.jsx` and `.js` files.

## Snippets

| Prefix | Inserts |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | Route files, named after their folder |
| `txc` | A console component named after the file |
| `txroute`, `txroutep` | Route handlers, with or without params |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | Components |
| `input`, `select`, `tabs` | Interactive components |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hooks |
| `metadata`, `txconfig` | Route metadata and `text.config.ts` |

## Error codes

Hover a `TX###` code anywhere: in source, logs, the Output panel or a pasted stack trace. The hover shows its title, message and package, with a link to its page on textjs.org. Each code is also a link (`⌘`-click).

## Status bar

The `▼` item shows the dev server state and the console grid size, for example `▼ :3000  120×36`. Tabs report their size to the dev server whenever it changes, even with no preview open. Click the item for the main commands.

## Settings

| Setting | Default | Description |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`, `live` or `headless` |
| `textjs.preview.followEditor` | `false` | Live mode: follow the edited route |
| `textjs.preview.fontSize` | `12` | Cell font size (DevTools uses 12) |
| `textjs.preview.runtime` | | Node.js binary for headless previews (default: the one bundled with VS Code) |
| `textjs.devServer.url` | | Dev server URL (default: discover on ports 3000–3010). Only `http://` loopback addresses are used |
| `textjs.devServer.command` | | Command for Start Dev Server |

## Workspace Trust

The preview and the dev server run your project's code (its Vite config, `text.config.*` and components). In Restricted Mode the extension only offers snippets, scaffolding and error links, and ignores `textjs.preview.runtime`, `textjs.devServer.command` and `textjs.devServer.url` from workspace settings. Trust the workspace to turn the preview on. Files outside your workspace folders are never previewed.

## How it works

`text dev` serves three endpoints for editors. They answer only to loopback connections addressed to a loopback host (`localhost`, `127.0.0.1`, `[::1]`), and only to requests with no `Origin` or the dev server's own origin. Browsers' cross-site and `no-cors` requests are rejected:

| Endpoint | |
| :-- | :-- |
| `GET /__textjs/status` | Project root, connected tabs, grid size and current route |
| `GET /__textjs/frames` | Server-sent events: one `frame` event per change, encoded as row deltas |
| `POST /__textjs/input` | A key, paste, wheel or navigation for the tab. Requires JSON and the `x-textjs-mirror: 1` header, so other sites can't send keystrokes |

Tabs send frames to the dev server over Vite's HMR socket, which requires a per-server token. The wire format is exported from `@textjs/next/frame-protocol` (`FrameEncoder`, `FrameDecoder`, `parseInputMessage`) if you want to build your own viewer. None of this exists in `text build` output.
