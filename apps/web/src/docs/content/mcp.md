`text mcp` runs your `app/` directory headless, in-process, and serves it over the [Model Context Protocol](https://modelcontextprotocol.io) so coding agents can use it without DevTools. The agent navigates, presses keys, reads frames as plain text and calls route handlers, without a browser.

```bash
bunx --bun text mcp              # serve ./app over stdio
bunx --bun text mcp apps/console # another project
```

`text mcp` needs Bun. Started with Node, it re-runs itself with Bun when `bun` is on your `PATH`, and fails with `TX019` otherwise. MCP clients start it for you, so you rarely run it by hand.

## Setup

Each client starts `text mcp` from your project directory. Use `bunx --bun` so route files run as TypeScript.

### OpenCode

```json@opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "textjs": {
      "type": "local",
      "command": ["bunx", "--bun", "text", "mcp"],
      "enabled": true
    }
  }
}
```

### Claude Code

```bash
claude mcp add textjs -- bunx --bun text mcp
```

Or commit it for the team:

```json@.mcp.json
{
  "mcpServers": {
    "textjs": { "command": "bunx", "args": ["--bun", "text", "mcp"] }
  }
}
```

### Cursor

```json@.cursor/mcp.json
{
  "mcpServers": {
    "textjs": { "command": "bunx", "args": ["--bun", "text", "mcp"] }
  }
}
```

### VS Code

```json@.vscode/mcp.json
{
  "servers": {
    "textjs": { "type": "stdio", "command": "bunx", "args": ["--bun", "text", "mcp"] }
  }
}
```

For a project in a subdirectory, append the path: `["--bun", "text", "mcp", "apps/console"]`.

## Tools

| Tool | Description |
| :-- | :-- |
| `list_routes` | Pages and route handlers in `app/`, and the current location |
| `navigate` | Push or replace a path, or go `back` / `forward` |
| `read_frame` | The frame as text, with route, size, focus and cursor. `styles: true` adds colors and attributes per span |
| `press` | Key combos: `"down"`, `"ctrl+k"`, `"shift+tab"`, `"tab tab enter"`, `"down*3"` |
| `type` | Type text one key per character (up to 2,000; use `paste` for more). `submit: true` presses Enter after |
| `paste` | One paste event, like `⌘V` |
| `scroll` | Mouse-wheel scroll by `rows` (and `cols`). A `<ScrollBox>` scrolls on the wheel without keyboard focus |
| `resize` | Set the grid size in columns and rows |
| `inspect_tree` | The component tree with screen bounds, plus every focusable id |
| `find` | Bounds of each match, and the component under it |
| `wait_for` | Wait for text to appear or disappear, or for the app to go idle |
| `logs` | Captured `console.*` output and React errors |
| `fetch` | Call a `route.ts` handler in-process. Bodies are read up to `maxBytes`; event streams for `streamMs`, then cancelled |
| `reload` | Re-import the app after you edit files |

Input tools return the new frame, so the agent doesn't need a separate `read_frame` after each key. The current frame and the route list are also available as the resources `text://frame` and `text://routes`.

A typical exchange:

```text
→ navigate { "path": "/deployments" }
→ press { "keys": "down down enter" }
← route: /deployments/dpl_6m3ty8  (route /deployments/[id])  title: "Deployment dpl_6m3ty8 · Edge Console"
  size: 100×32  frame: 6  idle
  focus: _txr_c_ ScrollBox [4,12 92×18]

    ▼ Edge Console   Overview   Deployments   Logs   Settings

    ← Deployments  /  dpl_6m3ty8   Ready    Production
  …
```

## Frames and idle

Before any tool reads a frame, it waits for the app to go idle: no frame scheduled, no `fetch` in flight, and no commit or frame for 50ms. So the agent sees the result of its input, not a frame halfway through an update.

A `<Spinner>` or a chart that ticks once a second still counts as idle between ticks, so pages with animations stay readable. An app that renders more often than every 50ms never goes idle. Reads give up after 1.5 seconds (`settleMs` changes this), flush the latest frame and mark it `busy`. `wait_for` with no text waits for idle, with its own `quietMs`, and returns an error if idle never comes.

Coordinates are zero-based cells: `x` is the column, `y` the row. Wide characters such as CJK and emoji take two columns.

## Errors and logs

stdout carries the protocol. Your app's `console.*` output, stray `process.stdout.write` calls and React errors go to `logs` instead, numbered so an agent can ask for only new entries with `since`. When errors were logged since the last read, the next frame header says so.

Failures come back as tool errors, never as a crash. A tool that times out is cancelled before the next call runs, so a slow call never types into the next call's frame. Errors with a Text.js code keep it, for example `TX007` for an unknown key. If the app fails to load, every tool explains why. Fix the file and call `reload`.

## Options

| Option | Description |
| :-- | :-- |
| `--path <pathname>` | First route (default `/`) |
| `--cols` / `--rows` | Grid size (default: `viewport` in `text.config.ts`, otherwise 100×32) |
| `--theme <name>` | Theme preset |
| `--no-config` | Ignore `text.config.ts` |
| `--verbose` | Also write captured logs to stderr |

## How it works

`text mcp` runs your app the same way [`text run`](/docs/terminal) does: every route module is imported up front, the App Router uses memory history, and same-origin `fetch("/api/…")` calls run your handlers in-process. Frames go to an offscreen cell grid instead of a terminal. Server-rendered pages (`export const runtime = "server"`) and their `async function` components render in-process, as in `text dev`, and the frame is read once they resolve.

`reload` unmounts the app, clears every project module from Bun's module cache (including files outside `app/`), scans `app/` again and remounts at the current location.

To embed the server in your own process, or use another transport:

```ts
import { createTextMcpServer } from "@textjs/next/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const { server, controller } = createTextMcpServer({ root: process.cwd() });
await server.connect(new StdioServerTransport());
void controller.start();
```

## Limits

- The app runs in Bun, not a browser. `window` and `document` are undefined, as in `text run`.
- Each server runs one app with one grid. Each MCP client starts its own server.
- `text mcp` can't attach to a browser tab you have open under `text dev` yet. The dev server's frame mirror (`/__textjs/frames`) makes this possible.
