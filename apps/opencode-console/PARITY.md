# OpenCode TUI parity ledger

Reference: `opencode` V2 (`packages/tui` at `69269e4e`); installed binary for PTY comparisons: `0.0.0-dev-233`. The binary and checkout are not assumed identical. A passing functional test does not imply a screen match.

## Test isolation

Only use ephemeral mock listeners, `opencode --standalone` with a disposable HOME/XDG profile, or a private server on an explicitly selected port. **Do not** test using a discovered service, the port-4096 bridge or a real user's sessions. Loading a session in either client can mark it viewed. Website browser tests must block other loopback ports.

| Surface | Baseline at 3d291f0 | Verification target |
| --- | --- | --- |
| Home, logo, prompt border, footer, model/agent hints | Approximation; two implementations | PTY and console at 80×24, 100×32, 120×40 |
| Built-in themes, semantic colors, syntax and diff tokens | Subset | Colored captures, including empty cells |
| New session, titles, history, switch session, recent projects/tabs/quick slots | Create/open available; tabs absent | Isolated session fixtures |
| Prompt editing, history, stash, queue, multiline, paste, attachments, @-completion | Basic editor, no history/completion | Key traces, wide graphemes, paste |
| Command palette, slash commands, help, key hints/which-key | Searchable picker, no leader | Keyboard and modal-focus traces |
| Model, variant, agent, provider, MCP and settings dialogs | Partial model/agent picker | API fixtures, cancel/submit |
| Session header, sidebar, footer, context/tokens/cost | Approximate, sidebar differs | Compare at all widths |
| User, assistant, reasoning, shell, idle, error, compaction and queued messages | Partial; website drops some kinds | Projection and SSE convergence |
| Tools: read/glob/grep, shell, edit/write/patch, todo, skill, subagent, web and external tools | Generic or abbreviated | Replay input, running, progress, completion, error |
| Markdown, code blocks, tables, inline diffs, full diff viewer | Partial; viewer absent | Transcript fixture |
| Permission and question/form requests; fullscreen, accept/reject/cancel | Missing | Synthetic pending requests, never auto-answer |
| Interrupt/background, notifications, toasts, timeline, paging, copy/undo/redo | Partial | Interaction tests |
| Terminal panes, editor invocation, OS actions | Not exposed | Distinguish missing API from browser limitations |
| Static simulation, opt-in live bridge, standalone proxy, reconnect | Existing implementations | Mock HTTP + SSE; production-site E2E |
| Idle/streaming frame cost and DevTools presentation | 15 fps renderer | Real DevTools + one-log/no-op assertions |

Native DevTools does not expose pointer hit-testing inside logged spans to the page, nor its actual console viewport or OS terminal/editor integration. These constraints do not prevent keyboard equivalents; other unchecked items are open work, not platform limitations.
