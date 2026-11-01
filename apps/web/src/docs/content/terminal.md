`text run` renders an App Router app in a terminal. Layout, components, keymaps and route handlers are shared with the browser. Output is truecolor ANSI instead of `%c` spans.

```bash
text run              # render ./app at /
text run --path /logs # start on another route
```

Press `Ctrl+C` to quit. `text run` needs Bun.

## `text run`

`text run` imports every file in `app/`, mounts the App Router with an in-memory history and draws it full-screen. `<Link>`, `useRouter()`, `notFound()` and `redirect()` work unchanged.

Same-origin `fetch("/api/...")` calls run your `route.ts` handlers in-process, exactly as `text dev` would serve them. Other URLs go to the network.

## `renderToTerminal`

For a single component, or your own CLI:

```tsx@cli.tsx
import { renderToTerminal } from "@textjs/app/terminal";
import { App } from "./app";

const app = await renderToTerminal(<App />);
await app.waitUntilExit();
```

`useApp().exit()` unmounts and restores the terminal.

| Option | Description |
| :-- | :-- |
| `stdin` / `stdout` | Default `process.stdin` / `process.stdout` |
| `cols` / `rows` | Fixed size (default: follow the terminal) |
| `altScreen` | Restore the scrollback on exit (default `true`) |
| `mouse` | Wheel scrolling (default `true`) |
| `exitOnCtrlC` | Default `true` |
| `fps` | Frame cap (default `60`) |
| `patchConsole` | Hold `console.*` until exit (default `true`) |
| `theme` / `transparent` | As in `createConsoleRoot` |

## Output

Each frame is diffed row by row. Only changed rows are written, wrapped in synchronized-output markers so terminals that support them never show a half-drawn frame. Idle apps write nothing.

## Input

Raw-mode stdin is parsed into the same events the browser produces: arrows and function keys with modifiers, `Alt` combinations, bracketed paste, SGR mouse wheel and the kitty keyboard protocol. `TerminalInputParser` and `parseTerminalInput` are exported if you need them elsewhere.

## Differences

| Feature | DevTools | Terminal |
| :-- | :-- | :-- |
| Frame pacing | ~15fps | Up to `fps` |
| Grid size | Docked console | Terminal window |
| `<Image src>` | Loads via canvas | Use `pixels` |
| `console.log` | Your frames | Held until exit |
