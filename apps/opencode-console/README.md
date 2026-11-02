# ▼ OpenCode Lite

OpenCode Lite is the OpenCode TUI in `console.log`, a connected client built with the Text.js App Router. It renders in DevTools, `text run`, and `text mcp`. The website uses the same session routes, components and event store. See [PARITY.md](PARITY.md) for measured differences from the native client.

```bash
opencode service status                    # If stopped: opencode service start
bun run dev:opencode                        # From the repo root; defaults to localhost:3001
bun run --cwd apps/opencode-console test
bun run --cwd apps/opencode-console build
```

Open the page, [open the browser console](https://textjs.org/docs/installation#open-the-console), then click back into the page so it captures the keyboard.

## Connecting

- **Local app:** open the localhost URL printed by `bun run dev:opencode`. Leave `/connect` empty to discover the managed daemon, even if its port changes. No CORS flag or separate bridge is needed. The `/__opencode` dev proxy reads the service password with `opencode service get password` and injects it server-side. `GET /__opencode/_status` reports the target, mode, and upstream status on failure, never the password.
- **Foreground server:** to select a specific server instead of the managed daemon, run `OPENCODE_SERVER_URL=http://127.0.0.1:4096 bun run dev:opencode`. For a protected foreground server on loopback, export its `OPENCODE_PASSWORD` (or legacy `OPENCODE_SERVER_PASSWORD` and optional `OPENCODE_SERVER_USERNAME`) in the dev server shell. Don't put credentials in a URL. Without an explicit URL or registered service, the dev proxy tries `127.0.0.1:4096`.
- **Website `/opencode`:** run `bunx @textjs/opencode proxy` from any directory and leave it running while using `/opencode` (`bun run dev:web` on `localhost:3000` or `https://textjs.org/opencode`). Connect to `http://127.0.0.1:4096` and allow local network access if prompted. If you instead run an unauthenticated foreground server (`opencode serve --port 4096`, adding `--cors https://textjs.org` for remote origins), `/opencode` can connect to it directly without the bridge. If port `4096` is already taken, run `bun run opencode:bridge --port 4097` (optionally `--target http://127.0.0.1:4096`) and connect to `http://127.0.0.1:4097`. Stop the bridge with Ctrl+C when done.
- **`text start`:** the same proxy is also served by `app/api/opencode/[...path]/route.ts`.
- **Custom server:** go to `/connect` (or use `?server=http://localhost:4096`). V2 (`/api/*`) and V1 (`/session`, `/event`) servers are both detected. Loopback URLs go through the proxy; anything else is fetched directly. The `?server=` parameter only accepts `localhost`, `127.0.0.1` and `[::1]`, so a crafted link can't send your prompts to someone else's server.
- **Proxy hardening:** the proxy only answers requests whose `Host` is `localhost`, `127.0.0.1` or `[::1]` (DNS rebinding), rejects cross-site `Sec-Fetch-Site` requests, requires `x-opencode-client: 1` on anything other than `GET` / `HEAD` / `OPTIONS` (CSRF), and refuses request bodies over 4 MB (`413`).
- **Demo:** when no server can be reached (for example on a static preview), or with `?demo`, the app switches to an in-memory backend. It has seeded sessions and simulates streaming reasoning, `read`/`edit`/`shell` tool calls and Markdown.

## Keys

Type `/` to search commands or `@` to attach a file, directory or subagent. Use Up/Down (or Ctrl+P/N) to select a result. Tab opens a directory; Enter attaches it. File mentions accept line ranges such as `@src/events.ts#10-20`. You can also paste an image into the browser composer.

In the sandbox, select `/demo-tools`, then press Enter to run it. The session asks whether to allow `bun test`. Allow once continues the scripted run; Reject stops it. No shell process starts.

Press `Ctrl+X` to see the leader shortcuts. Open `/settings` and select **Keybinds** to change a shortcut for this connection. On a live bridge the initial bindings come from its `~/.config/opencode/cli.json` (`$XDG_CONFIG_HOME/opencode/cli.json` when set). A direct V2 HTTP connection has no access to that file.

Try `/diff` to review the sandbox changes. Press `d` to select a comparison, `n` for the next file and `m` to mark it reviewed. In a session, `/terminal` opens a scripted pane. `pwd`, `ls`, `git status` and `bun test` have recorded responses. Live servers expose read-only terminal snapshots instead.

`/history` can load earlier turns from the active session. `/connect` lists provider sign-in methods; `/mcps` manages MCP connections. Use a test value in sandbox sign-in dialogs. New MCP definitions register disabled, and workspace deletion refuses to force-remove modified files.

### Try the sandbox

| To try | What to do |
| --- | --- |
| Reference attachment | Type `Review @docs`, select the reference with Enter, then press Enter again to submit. |
| Session panes | Open the first seeded session with `/sessions`. Run `/terminal`, type `pwd` and press Enter. Esc hides the pane; `Ctrl+X t` reopens it with the same output. |
| Diff review | Run `/diff`, press `d` and select **Uncommitted**. Use `m` to mark a file reviewed, `s` for a single patch and `?` for shortcuts. **Last turn** is available inside a session. |
| Accounts | Run `/connect`, select **OpenAI** and choose **Authorization code**. In the sandbox any test value completes the fixture. Reopen the provider to rename or disconnect the account. |
| MCP sign-in | Run `/mcps`, select **project-notes** and press Space. Its device flow completes inside the sandbox. **design-files** starts with a connection error; Space retries it. |
| Plugin updates | Run `/plugins`, select **project-tools**, press `Ctrl+U` and confirm the target. **example-plugin** demonstrates an error; Space shows the message. |
| Worktrees | Run `/worktrees`, press `Ctrl+A` and type a name (or use Tab to generate one). Creating or removing a sandbox workspace only changes the fixture. |

| Key                    | Action                                    |
| ---------------------- | ----------------------------------------- |
| `Enter` / `⇧Enter`     | Send prompt / newline (`Ctrl+J` too)      |
| `Esc` twice            | Interrupt the running session             |
| `Shift+Tab`            | Cycle available primary agents            |
| `Ctrl+P`               | Command palette                           |
| `Ctrl+X` then `n`      | New session (`/new`)                      |
| `Ctrl+X` then `l`      | Switch session (`/sessions`)              |
| `Ctrl+X` then `m`, `a` | Model or agent picker (`/models`, `/agents`) |
| `Ctrl+X` then `b`      | Toggle session sidebar                    |
| `Ctrl+X` then `g` | Search the session timeline and open message actions |
| `Ctrl+X` then `u` / `r` | Stage an undo / restore the reverted messages |
| `Ctrl+X` then `Enter` / `q` | Queue a prompt / manage the inbox in a V2 or sandbox session |
| `Ctrl+T`               | Cycle model variants (`/variants` to pick) |
| `F2` / `Shift+F2`      | Cycle recent models                       |
| `↑` / `↓` at the ends  | Recall submitted prompts / restore draft  |
| `PgUp` / `PgDn`, wheel | Scroll the timeline                       |
| `Alt+↓` / `Alt+↑`      | Cycle open sessions                      |
| `Ctrl+X` then `1`…`0`  | Select an open session by tab number     |
| `Ctrl+X w` / `Ctrl+Shift+T` | Close / reopen a tab (never deletes a session) |
| `!` on an empty prompt | Enter shell mode; Esc leaves without running anything |
| `←` / `→`, `Enter` on permission | Select and confirm; `Ctrl+F` toggles fullscreen, `Esc` minimizes or rejects |
| `↑` / `↓`, `1`–`9` on a question | Choose an answer; `Tab` changes field, `Esc` dismisses |
| `Ctrl+R` / `Ctrl+D` in sessions | Rename / arm deletion (repeat `Ctrl+D` to confirm) |

`/help`, `/settings`, `/themes` and `/copy` run in the client. `/rename`, `/compact`, `/undo` and `/redo` change the session on the connected server. Server-defined commands use `/command`; `/btw` uses the session's model without adding the answer to its transcript. In shell mode, Enter runs the command in the connected session's working directory. The sandbox never executes a shell command.

The theme picker previews the highlighted theme, rolls back on Escape and commits on Enter. The context sidebar overlays at ≤120 columns and docks to the right on wider screens.

## Layout

| Path                                 | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `app/layout.tsx`                     | Store provider + shell (header, sidebar, palette)    |
| `app/page.tsx`                       | Home: logo, hints, recent sessions, composer         |
| `app/session/[id]/page.tsx`          | Live session timeline                                |
| `app/connect/page.tsx`               | Choose a server URL / auto-discover / demo           |
| `app/api/opencode/[...path]/route.ts`| Production proxy                                     |
| `server/opencode-proxy.ts`           | Discovery, credential injection, SSE passthrough     |
| `lib/client.ts`                      | V2 / V1 HTTP + SSE client and connection logic       |
| `lib/demo.ts`                        | Interactive demo backend                             |
| `lib/store.ts`                       | Store that folds SSE events into timelines           |
