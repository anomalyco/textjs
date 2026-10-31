# OpenCode TUI parity ledger

Reference: `opencode` V2 (`packages/tui` at `69269e4e`); installed binary for PTY comparisons: `0.0.0-dev-233`. The binary and checkout are not assumed identical. A passing functional test does not imply a screen match.

## Test isolation

Only use ephemeral mock listeners, `opencode --standalone` with a disposable HOME/XDG profile, or a private server on an explicitly selected port. **Do not** test using a discovered service, the port-4096 bridge or a real user's sessions. Loading a session in either client can mark it viewed. Website browser tests must block other loopback ports.

**Status: functional parity improved; not visually interchangeable.** The default home, palette, model/agent/session pickers and transcript still differ on all three viewport sizes. Permission and form screens are missing, not a console limitation.

## What works and what doesn't

The [per-command inventory](parity/KEYBINDINGS.md) includes all keybind IDs and native defaults in the pinned V2 CLI reference. “Implemented” there describes behavior, not screen identity.

| Surface | Implemented and exercised | Still different / open |
| --- | --- | --- |
| Hosting, navigation | Both hosts mount the same session routes, components and event reducer. Web uses memory history, its original scripted scenarios, direct V1/V2 or bridge; standalone retains its proxy. | Static simulation is intentionally not a model or a real shell. |
| Home and prompt | Two-tone glyph logo, 75-cell prompt limit, Unicode placeholder, dynamic multiline input, model/agent metadata, active editor and hints. | Footer positions, branch/version/status data, tab strip, rotation/animation, exact padding and semantic colors. |
| Editor | Enter, modified Enter/Ctrl+J, text paste, readline word editing, history at buffer boundaries with draft restoration, soft-wrapped vertical movement, Unicode clusters. | Selection, undo/redo, paste summaries, image attachment preview/entry, file/agent @-completion, stash, editor context, external editor, queue/steer management. History is memory-only. |
| Commands | Ctrl+P, 2-second Ctrl+X leader, locally dispatched `/models`, `/variants`, `/agents`, `/sessions`, `/themes`, `/new`, `/clear`, `/help`, `/copy`, `/compact`, `/rename <title>`; registered V2 project commands use `/command`, not `/prompt`. | Inline autocomplete, suggested/category grouping, exact picker geometry and backdrop, which-key, customizable CLI settings/keymap. |
| Sessions | Create/open/rename, relative timestamps, open-session tab cycling/numeric selection/close/reopen. No delete on close. | Recent projects, visible tab strip, multi-project/session pagination and deep history, pin/delete/fork/move/revert, inline rename form, unread tab navigation, child picker. |
| Model / agent | Live catalog, Shift+Tab for all primary agents, variants and recent-model cycling; session selections are drafts until submit. | Favorites, account/provider/usage UI, persistence across restarts, model catalog per location, variant-specific details. |
| Transcript | User text/files by name, assistant Markdown, reasoning title/duration, live deltas by kind/ordinal, turn footer, shell, error and compaction states. | Multi-message reasoning groups, precise turn boundaries with steering, verbosity presets, grouping across steps, full images, retry/compaction and token/cost presentation. |
| Tool results | Read ranges + loaded paths, glob/grep counts, grouped exploration with individual toggle, write/code, edit/patch metadata with multi-file diffs, shell output, todos, recorded question answers, basic webfetch/search/skill/subagent labels. | Block and inline geometry, execute/subagent drill-down, live background shell output, diagnostics, tool images, interactive per-group disclosure, native syntax styles, side-by-side and full diff review. |
| Session interaction | Scroll by page, line, half page, bounds/wheel; double-Escape interrupt; explicit `!` shell mode; browser clipboard copy. | Native project/context sidebar, timeline jump picker, background action, OS clipboard from a terminal, notification queue and matching toasts. |
| Permissions / questions | Live **reference captures**, plus a check that capture leaves both requests pending. | No pending request UI, replies, persistent approval, cancel/rejection reason or fullscreen request view. Don't use this client alone for an approval-sensitive run. |
| Settings / integrations | Basic theme selection and explicit Connect backend control. | Native theme suite and modes, settings, provider connect, MCP, plugins, worktrees, stats, goals, status, user actions/update, remote terminal panes. |
| Frame contract | 15fps renderer unchanged; stable message/tool components and cached patch totals. Unit tests cover one log per changed frame and none while idle. | No claim of native-TUI-equivalent latency. Rendering is still subject to the DevTools frontend paint schedule. |

Native DevTools does not expose pointer hit-testing inside logged spans to the page, nor its actual console viewport or OS terminal/editor integration. These constraints do not prevent keyboard equivalents; other unchecked items are open work, not platform limitations.

## Reproduce the comparison

```sh
bun install && bun run build:packages
PYTHONDONTWRITEBYTECODE=1 python3 apps/opencode-console/scripts/compare-pty.py
```

The driver creates a new authenticated loopback server, git project and disposable HOME/XDG profile. It imports [the same transcript](scripts/transcript.json) used by the native TUI, MCP client and `text run`; no model prompts. It opens real pending permission/form requests on separate fixture sessions and sends neither an answer. Its processes and profile are torn down in `finally` blocks.

**20 cases**: home, commands, models, agents, sessions and transcript at 120×40, 100×32 and 80×24; pending permission and form at 100×32. Full results: `.text/captures/<cols>x<rows>/` in this app. `*-pair.txt` puts native TUI on the left and MCP on the right. `*-real.ansi` / `*-textjs.ansi` retain PTY colors; `*-mcp.json` retains absolute cell-coordinate style runs. `*-diff.json` counts glyph/foreground/background/attribute differences separately. Background counts include blank cells; foreground/attribute counts ignore cells blank in both. These are absolute mismatches, not percentages dominated by empty screen area. The native placeholder is randomized, and visiting a session leaves a tab in the native TUI; compare matching navigation histories.

Checked-in examples: [100×32 side-by-side captures](parity/captures/100x32/), [DevTools captures](parity/captures/devtools/) and [measurements](parity/captures/measurements.json). These show **actual discrepancies**, not a target mockup. On the recorded run, MCP and `text run` agreed on every measured cell in all 20 cases. Comparing *native* vs MCP at 100×32 still found hundreds of differing glyphs. In particular, the backgrounds of all 3,200 palette cells differed. The transcript comparison identified incorrect exploration/think labels and step-vs-turn time; correcting those reduced its 100×32 glyph delta from 678 to 619 on the imported fixture.

For Chrome, build and run the local static preview. Run `apps/web/scripts/e2e-keys.mjs` and `apps/web/scripts/capture-opencode.mjs` with `BASE` pointing at that preview and `PLAYWRIGHT` pointing at `playwright-core/index.mjs`. The capture uses the bundled **real DevTools frontend**, a fresh profile, and blocks app-page requests outside the preview origin. The site uses its own Text.js scenario rather than the private PTY transcript. Raw console.log arguments, decoded grids and screenshots are written to `.text/captures/console/`.

## `text mcp` dogfood log

`scripts/capture-mcp.ts` is a real stdio SDK client, not an in-process substitute. `scripts/compare-pty.py` provisions its authenticated throwaway target. Standalone `bun apps/opencode-console/scripts/capture-mcp.ts` runs the same interaction loop in demo mode.

| Friction encountered | Resolution |
| --- | --- |
| `reload` after `resize 80×24` silently returned a 120×40 frame, making comparisons incorrect. | Fixed: an explicit runtime size survives reload. Config still reloads when no resize was requested. |
| `read_frame` trimmed trailing cells/rows, so capture code had to guess padding for blank rows. Crops still reported full viewport dimensions. | Added `trim: false` plus effective clamped `region` bounds. Default human-readable output is unchanged. |
| A crop ending halfway through a wide glyph could return two columns of text in a one-cell run. | Fixed text and styled extraction at the right edge; tested alongside the existing left-edge case. |
| `busy (still animating; frame read after timeout)` on immediate reads suggested a timeout or an animation even when neither happened. | Report `busy` without guessing the cause. |
| Picker and composer accepted keys but `inspect_tree` reported no focused component or cursor. | App used forced `focused`, deliberately outside the focus manager. Switched to stable ids and managed autofocus; MCP capture asserts the actual focus target. |
| Private server worked under `text run` but MCP stdin isn't a TTY. | Both now honor a pinned loopback `OPENCODE_SERVER_URL` via the app's own in-process route. No variable means offline demo in both. |
| Waiting for a picker title can match text on the underlying session or command list. Waiting for a streaming label then doing a second styled read can capture a later frame. | `wait_for` now accepts an exact `href` alongside text/absence constraints, and `styles`/`trim` on the actual matched frame. |
| No direct `text mcp` connection was attached to the coding session. | Used the official stdio SDK client. No server-side change needed. |
| MCP cells don't show browser font fallback, source-link intrusion, or compositor/scroll behavior. | Intentionally not “fixed” by inventing a pixel screenshot in MCP. Verify separately with the actual bundled DevTools frontend. |

## Validation

`bun run build:packages` and root/app typechecks passed. `bun test packages/`: **1,190 passed, 8 skipped, 0 failed**. Standalone: **22 passed**. Website: **94 passed**. `bun run --cwd apps/web build` passed (browser, SSR, prerender). Static-preview `e2e-keys.mjs`: **22 checks passed** with local-server blocking enabled; the additional keys cover leader+m, Shift+Tab, shell exit, `/help`, double-Escape and session switching without changing the site URL. The DevTools capture reran successfully against the preview.

The branch is a functional baseline for further work, not a visual sign-off. The remaining layout/style and UX review requires the designated Opus UI agent; this session did not have a subagent tool.
