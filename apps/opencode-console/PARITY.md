# OpenCode Lite parity

## Round 4

Round 4 compares the same 237 command IDs and the same classic OpenCode 2.1.4 binary as round 3. The code reference is `anomalyco/opencode@8bca5329`. The [command ledger](parity/KEYBINDINGS.md) gives the default key and the remaining limitation for each partial or missing ID. A command with no default binding can still be available in Ctrl+P.

| Inventory | Done | Partial | Missing |
| --- | ---: | ---: | ---: |
| All 237 IDs, round 3 → 4 | **97 → 185** | **36 → 45** | **104 → 7** |
| The 187 IDs with default bindings | **90 → 160** | **25 → 25** | **72 → 2** |

The number of partial IDs increased because native-only and incomplete workflows now have usable controls. For example, a persistent terminal snapshot can be selected and read, but does not accept live PTY input. None of these partials count toward the 185 done IDs.

### What changed

| Surface | Behavior |
| --- | --- |
| Slash and `@` | Uses the native fuzzysort version, separate name/description keys and prefix scoring. The key hint belongs in the palette rather than the slash row. V2 reference aliases come from `/api/reference`, skip hidden entries and send the server's file URI with the selected alias. The sandbox includes `@docs`. |
| Keys | The leader preview shows available continuations; Ctrl+Alt+K opens the grouped guide. It supports one/two columns, group changes, line/page scrolling and boundaries. Settings → Keybinds changes bindings for this connection. The bridge serves validated chords and the leader timeout from its machine's `cli.json`, with `OPENCODE_CLI_CONFIG_CONTENT` overrides. The V2 server config endpoint does **not** serve CLI keybinds. Direct connections have defaults and local overrides. Release-only bindings, native fallthrough flags, some modal shortcuts and browser-reserved keys remain different. |
| Diff review | Read All, Committed, Uncommitted or Last turn. `d` selects a source/base; `s` switches all files/single file, `n`/`p` move between files, `[`/`]` between hunks, `m` marks reviewed. `b`, `v`, `f` and `?` control tree, split/unified, fullscreen and help. At 108 columns or wider a session can keep the review beside its prompt with leader+Left/Right focus. The viewer only mounts visible patch rows. Binary/image diffs, native sticky headings and pointer menus are not complete. |
| History and editor | `/history` searches recent drafts and pages older user turns from the selected server session. Recall preserves URI mentions; large pastes use native summary markers and expand on send. Clipboard images have a leader+I preview. Sandbox recall persists in browser storage (500 entries, bounded by size, no inline image data); Settings can clear it. Live prompts are not written to browser storage. Alt+A/E and their selection variants operate on wrapped rows. |
| Integrations | `/connect` lists providers, methods and accounts. Supports key entry, OAuth auto/code, external methods, confirmed provider commands, account activation, rename and confirmed removal. Secrets go to the selected endpoint on submit; the key field is masked and is not the composer. Fixtures use test values only. Provider-specific optional/custom form choices and V1 authentication are incomplete. Environment variables must be set on the server. |
| MCP and plugins | `/mcps` shows status and errors, signs in through the server's advertised integration, connects/disconnects, and supports confirmed registration/removal. New remote URLs or local argument arrays register **disabled**. Secret headers and environment options belong in the server config. `/plugins` shows failures and package updates; check before updating an explicit target. A local toggle changes the MCP sidebar contribution. There is no server API for enabling arbitrary native TUI plugins in a web client. |
| Session controls | Recent sessions/projects, tab history, unread/attention tab cycling, pinned quick slots with tabs hidden, child navigation, session-owned shell output and stop/interrupt controls. `/worktrees` uses the selected project ID for create/refresh/move/delete; deletion never sets `force: true`. `/cd` validates the server location before changing it. Session export supports Markdown and JSON, with reasoning/tool options for Markdown. Browser preferences retain favorite/recent models and pins. |
| Terminal pane | From a session, `/terminal` opens a **scripted sandbox** shell. `help` lists its commands. Hiding and reopening it retains its output; each pane belongs to its session. On V2, only existing persistent terminal lists and text snapshots are read. `r` refreshes a snapshot. There is no live PTY input, process creation, VT emulation or terminal resize negotiation. |
| Pairing and native-only controls | `/pair` lists the reported server origins and asks before issuing a clipboard-only link. No QR code or bearer URL is printed to the console. `/editor` retains the draft and shows the native configuration message. `/restart` and `/update` explain the native CLI action rather than claiming success. `/debug` reports the actual client/session details. |

### Captures

Left is the disposable native PTY, right is the styled Text.js console framebuffer at 100×32. Each PNG has an adjacent plain-text pair and compressed source frames. [Counts by glyph, foreground, background and attributes](parity/round4/measurements.json).

| Input | Pair | Difference |
| --- | --- | --- |
| `/model` | [slash.png](parity/round4/slash.png) | Round 3 had **107** different glyphs. Round 4 matches glyphs and styles. |
| `@readm` and `!pwd` | [mention.png](parity/round4/mention.png) · [shell.png](parity/round4/shell.png) | Matching glyphs and styles. |
| `@docs/` | [reference.png](parity/round4/reference.png) | Matching glyphs and styles for a real sibling-directory alias. The same private server also returned a hidden alias, which Lite excluded. |
| `/diff`, Uncommitted | [diff.png](parity/round4/diff.png) | Matching glyphs and styles for a tracked README with one added line. Both clients read the private server's diff. |
| `/connect` | [integrations.png](parity/round4/integrations.png) | Native grouping, gutter, selected label and provider order. The console paints an inverse caret; tmux does not serialize the hardware cursor. |
| Ctrl+X | [leader.png](parity/round4/leader.png) | Intentional difference: the 2.1.4 binary accepts the sequence but does not show a list in this classic profile. Lite shows the requested preview. The capture keeps the same typed draft behind both frames. |

Real Chrome DevTools, using the authenticated test bridge: [leader preview](parity/round4/devtools/which-key.png), [diff](parity/round4/devtools/diff.png), [slash menu](parity/round4/devtools/slash.png) and [Help opened by the fixture's F9 binding](parity/round4/devtools/bridge-keybind.png).

### Remaining gaps

The seven **missing behaviors** are `app.console` (the host already is the console), `app.scrap` (no handler found in the pinned classic source), `app.clear` (Mini-only scrollback), `app.toggle.file_context` and `prompt.editor_context.clear` (no attached IDE selection channel), `terminal.suspend` (no process job control from a page), and `terminal.title.toggle` (the embed does not own the host title). Settings includes a native-controls note. Explanatory text does not count as implementing those actions.

The ledger records all 45 partial IDs separately. The main open implementation work is image and pointer diff review, complete dialog/editor remapping, deeper session timeline and project browsing, complete provider-specific forms, media restoration on fork/undo, and native plugin UI execution. Browser limitations account for the OS editor, job control, terminal title and native terminal palette, **not** for all of those gaps. This is not a visual sign-off for every tool, theme, dialog or viewport.

### Round 4 verification

| Check | Result on the Text.js runner |
| --- | --- |
| `CI=1 bun test packages/` | **1,231 passed, 8 skipped**, zero failures |
| App suites | OpenCode console **65 passed**, web **327 passed**, terminal.shop **51 passed** |
| Types and builds | Package build, root typecheck and all three app typechecks and production builds passed |
| Starter QA | `bun scripts/qa-starters.ts --skip-build` passed all applicable checks on all seven targets, including the Bun and npm OpenCode template |
| Production preview | `e2e-keys`, `e2e-examples`, `e2e-layout`, `e2e-eggs`, `cls.mjs` and live-bridge DevTools passed. Cold `/opencode` and the measured navigations to it had **CLS 0.0000**. |
| Embed cost | The initial Playground did not load `OpenCodeLite`. Vite reported **88.01 kB gzip** for that chunk (round 3: 73.29 kB). The dialog chunk is a separate **17.84 kB gzip** and was not fetched on OpenCode Home. During the measured Playground → OpenCode activation, seven newly requested JS assets totaled **102,554 bytes** when gzipped individually. |
| API isolation | Verified real reference visibility, project, worktree, plugin and MCP catalog responses, fork, staged undo, redo, sanitized export and committed revert on a disposable V2 server. Authentication, account mutations, MCP provisioning and scripted terminal input used fixtures. No real provider credential or paid model call was used. |

### Reproduce

```sh
bun install && bun run build:packages
PARITY_ROUND=4 PYTHONDONTWRITEBYTECODE=1 python3 apps/opencode-console/scripts/compare-completion.py
bun run --cwd apps/web build
PARITY_ROUND=4 FILMSTRIP=0 ROUTES=/opencode node apps/opencode-console/scripts/verify-preview.mjs
bun scripts/qa-starters.ts --skip-build
```

The Text.js runner provides `PLAYWRIGHT`. The capture waits for the native model row as well as the requested menu. It uses a throwaway git branch, HOME, XDG directories and listener, then checks real V2 catalog, fork, revert and export responses. It never submits a model prompt. Browser tests allow only the preview and their own test/debug listeners on loopback.

## Round 3 inventory

Reference: [`anomalyco/opencode` at `8bca5329`](https://github.com/anomalyco/opencode/tree/8bca5329293a34f4bdd7fdc4f4020be80c1eb477/packages/tui/src), classic theme and layout. The comparison binary is **2.1.4**. The baseline for this round is Text.js **1.0.3** (`6ba85bb`). The [TUI guide](https://opencode.ai/v2/docs/cli/tui/), [command guide](https://opencode.ai/v2/docs/commands/), [attachment contract](https://opencode.ai/v2/docs/attachments/) and upstream `packages/protocol/openapi.json` describe the V2 interactions. V1 uses a separate HTTP adapter.

The [keybinding checklist](parity/KEYBINDINGS.md) covers all **237 command IDs** in the pinned CLI keybind reference, including commands with no default binding. The 1.0.3 ledger called these groups `Implemented`, qualified descriptions and `Open`. Across the same IDs: **59 → 97 done, 18 → 36 partial, 160 → 104 missing**. These counts describe behavior. For example, the usage dialog has a working Ctrl+U binding, but only displays the meters and budgets.

Of the 187 IDs with a default other than `none`, **55 → 90 are done, 15 → 25 partial and 117 → 72 missing**. The feature table groups the bindings with parts of the TUI that have no command ID. Across its **30 areas**, **1 → 6 are done, 15 → 23 partial and 14 → 1 missing**. A partial row can have substantial gaps, including terminal panes in the shell and subagent area.

| Feature | 1.0.3 → this branch | Coverage and limits |
| --- | --- | --- |
| Home, composer, tabs and split borders | Partial → partial | Shared cell renderer, native logo, agent colors, usage footer and theme variants. No native tab animations or pointer hit testing in logged spans. |
| Inline `/` | Missing → done | Prompt-anchored list, descriptions, key hints, prefix/subsequence filtering, wraparound Up/Down or Ctrl+P/N, Tab/Enter and Escape. Argument-taking commands leave a draft. Ranking ties differ from fuzzysort. |
| Server-defined commands | Partial → done | V1 `/command` and V2 `/api/command`. V2 updates the catalog after command-change events. Runs on the command endpoint, including nested command names. |
| File and directory `@` | Missing → done | Searches V2 `/api/fs/find` at the session location or V1 `/find/file`. Tab descends; Enter attaches. Handles spaces, URI encoding and `#start-end`, and ignores stale searches. Edits through a mention detach it. |
| Agent, skill and reference `@` | Missing → partial | Non-hidden subagent-capable agents and V2 skill IDs. Registered aliases from `/api/reference` are missing. |
| Text input, selection and history | Partial → partial | Multiline paste, wrapped caret, grapheme and word movement, selection, undo/redo and boundary history. History is in memory; recalled text does not recover every attachment. No native selection copy or terminal paste summaries. |
| Images | Missing → partial | Browser clipboard events accept PNG, JPEG, GIF and WebP, show an editable marker and send the data URI only on submit. No full-screen image viewer or terminal clipboard integration. |
| `$EDITOR` and editor context | Missing → partial | `/editor` and leader+E explain the CLI requirement. DevTools cannot launch a local process. Editor selection sync is missing. |
| Stash, queue and steer | Missing → partial | Palette actions stash and pop a draft with attachments, or browse eight in-memory stashes. Ctrl+X Enter queues; Ctrl+X Q opens the session inbox; Ctrl+D cancels, Ctrl+U returns text to the draft. No disk persistence or delivery-type switching. |
| `!` shell mode | Partial → done | A deliberate `!` keystroke on an empty prompt enters shell mode. Esc leaves. Paste never enters shell mode. V1/V2 send to the session shell endpoint. Sandbox `pwd`, `ls` and `git status` read fixtures. |
| Palette and leader keys | Partial → partial | Ctrl+P picker, two-second Ctrl+X sequences, session actions, model/agent actions and modal input traps. No which-key inspector or `cli.json` binding overrides. |
| Session list, projects and tabs | Partial → partial | Search/switch/rename/delete, pin for this connection, all-project filter, V2 server title search and open/close/reopen tabs. First 50 matches per search. No native open-project menu, deep message paging or directory move. |
| Model and agent pickers | Partial → partial | Provider grouping, recent and favorite models, variants and primary agents. Shift+Tab cycles in V2; Tab/Shift+Tab cycle forward/back in V1. No provider authentication, persistent recents or cross-launch favorites. |
| Themes | Partial → partial | 33 bundled themes with available light/dark modes and live preview. No user theme import or terminal palette detection. |
| Markdown and thinking | Partial → partial | Streaming text, headings, fences, lists, quotes, tables, reasoning labels/duration and expanded thinking. V2 `/thinking` selects model variants; V1 toggles reasoning. No native Tree-sitter or full transcript verbosity presets. |
| Tool cards and failures | Partial → partial | Shell output; read/grep/glob/list; edit/patch/write with diffs; todos, questions, webfetch/search, skills, subagent labels, generic tools and errors. No arbitrary plugin renderers, media results or background-shell drill-down. |
| Permission and form dialogs | Done → done | Session and child V2 requests, allow once/always/reject, saved patterns, rejection reason, fullscreen and multi-field forms. V1 permission events are not adapted. |
| Session timeline and fork | Missing → partial | Search loaded user turns, preview their scroll positions, jump, copy, revert, or fork from a message or full session. Fork restores text, not binary attachments. |
| Undo/redo | Missing → partial | Stage/clear a server revert, show the boundary, restore text and supported mentions, and commit a replacement prompt. Busy sessions require an explicit interrupt. Native file-change summary and inline-media restoration are missing. |
| Compaction, copy and export | Partial → partial | Server compact/summarize, completion/failure note, last reply copy, JSON clipboard/download. V2 uses sanitized full-server export; V1 falls back to normalized messages. Markdown export options and an OS editor are missing. |
| Sharing | Missing → partial | On V1 servers that expose `POST /session/:id/share`, confirm before creating a public link. `/unshare` calls the corresponding DELETE. V2 has no native share API. The sandbox creates a revocable browser-local JSON preview, never a public link. |
| Session scrolling | Partial → partial | Lines, pages, half pages, top/bottom, last user turn, timeline jumping and sticky latest. No message-by-message palette navigation or selectable console spans. |
| Diff review | Missing → partial | `/diff` shows a unified last-turn or working-tree patch with file navigation and scrolling. No tree, base picker, reviewed state, split layout or image comparison. |
| Sidebar, status and toasts | Partial → partial | Context %, cache-inclusive tokens, reported cost, model/agent, branch, todos, MCP status, status dialog and transient notifications. No native notifications or service diagnostics. Current V2's default sidebar slots do not include an LSP list. |
| Side questions | Missing → done | `/btw question` calls session generate and opens a scrollable, copyable answer outside the conversation. |
| Stats, provider limits and plugins | Missing → partial | Read-only V2 reports. No statistics graphs, auth, plugin installation/update, permission policy editor or plugin UI slots. |
| Terminals and subagents | Partial → partial | Session shell and tool transcript are visible. Persistent PTYs, pane focus, background task control, child-session picker and navigation are missing. |
| Service and system actions | Missing → partial | V2 config reload. Pairing, restarting/updating the service, native release highlights, debug panes and terminal suspension remain CLI actions. |
| Local simulation | Partial → partial | `/demo-tools` streams the tool sequence, pauses at `bun test`, and resumes or stops after a decision. `/review`, `/init`, scope-aware autocomplete, share preview, compaction, revert and forks use memory. No real shell, network tools or inference. |
| Alternate clients and designs | Missing → missing | Mini scrollback, the experimental new-designs theme, storybook, native editor/terminal integrations, plugin-defined goals and the full CLI settings surface are outside the classic console renderer. |

### Slash command inventory

The native registrations live in `app.tsx`, `component/prompt/index.tsx`, `component/session-frame.tsx`, `routes/session/index.tsx` and `feature-plugins/`. Availability depends on the route, service and enabled plugins.

| Status | Names |
| --- | --- |
| Done for the indicated action | `/agents`, `/models`, `/variants` (`/effort`, V2 `/thinking`), `/themes`, `/help`, `/exit` (`/quit`, `/q`), `/new`, `/copy`, `/details`, `/compact`, `/rename <title>`, `/btw <question>`, `/reload` (V2), catalog commands including `/init` when registered |
| Partial | `/sessions` (`/resume`, `/continue`), `/open` (`/project`, `/projects`), `/clear`, `/connect`, `/settings`, `/skills`, `/worktrees`, `/status`, `/mcps`, `/plugins`, `/stats`, `/usage`, `/diff`, `/timeline`, `/fork`, `/undo`, `/redo`, `/export`, `/editor`, `/share`, `/unshare`. See the limits above. |
| Missing | `/cd`, `/terminal`, `/debug`, `/pair` (`/web`), `/restart`, `/update`, `/highlights`; arbitrary plugin commands registered in the native UI rather than the server catalog. |

### Side-by-side captures

| Input, 100×32 | Native PTY and console cells | Different glyphs |
| --- | --- | ---: |
| `/model` | [slash.png](parity/round3/slash.png) · [text](parity/round3/slash.txt) | 107 |
| `@readm` | [mention.png](parity/round3/mention.png) · [text](parity/round3/mention.txt) | 0 |
| `!pwd` before submit | [shell.png](parity/round3/shell.png) · [text](parity/round3/shell.txt) | 0 |

The [styled cell counts](parity/round3/measurements.json) also match foreground, background and attributes for the mention and shell fixtures. The slash capture differs in 13 foreground cells and matches every background. The `.json.gz` files retain the native SGR capture and MCP style runs. For the actual Chrome console, see the [slash menu](parity/round3/devtools/slash.png) and [file menu](parity/round3/devtools/mention.png) captured through a live test bridge.

`scripts/compare-completion.py` starts OpenCode on a random loopback port with a fresh HOME/XDG profile and a one-file git repo. It captures the left frame with tmux and the right with `text mcp` (`styles: true, trim: false`), then draws both captured grids into a PNG. Chromium's screenshot page blocks all network access. These are cell comparisons; neither an animated hardware cursor nor DevTools font fallback is included in the glyph count. The slash frame shows the added key hint and different alias order and padding. No input in this comparison is submitted.

### Round 3 verification

| Check | Result |
| --- | --- |
| `CI=1 bun test packages/` | 1,229 passed, 8 skipped |
| OpenCode console / website / terminal.shop | 41 / 327 / 51 tests passed. Run the website suite with `bun run --cwd apps/web test` so Bun uses the site's test preload. |
| Typecheck and build | Package build and root typecheck; app, website and terminal.shop typechecks and production builds passed. |
| `bun scripts/qa-starters.ts --skip-build` | Passed all applicable checks for all seven targets. The OpenCode template passed Bun and npm install, dev, build and start. The standalone app passed online/offline workspace checks. |
| Production preview | `e2e-keys`, `e2e-examples`, `e2e-layout`, `e2e-eggs` and the live-bridge DevTools check passed. Cold `/opencode` and both client navigations to it measured CLS **0.0000**. |
| Embed cost | Vite reported **73.29 kB gzip** for the lazy `OpenCodeLite` chunk in the measured production build. The browser test checks that the initial Playground does not fetch it and that selecting OpenCode does. |
| Private V2 server | Imported the transcript into an empty disposable project and verified the fork boundary, staged undo, redo, nonempty sanitized export and committed revert against OpenCode 2.1.4. No model prompt was sent. |

To reproduce the new capture and browser checks on the Text.js runner, build the packages, then run:

```sh
bun run --cwd apps/web build
PYTHONDONTWRITEBYTECODE=1 python3 apps/opencode-console/scripts/compare-completion.py
FILMSTRIP=0 ROUTES=/opencode node apps/opencode-console/scripts/verify-preview.mjs
```

The runner provides `PLAYWRIGHT`. For a local preview check, set it to the absolute path to `playwright-core/index.mjs`. The static preview binds to port 0. The E2Es block unrelated loopback ports; live-bridge actions go only to the test's authenticated mock. No model provider credentials are required.

## Previous round: transcript and request dialogs

**Compare the frame, not the feature name.** The native side is `opencode 0.0.0-dev-233` running in tmux, informed by the read-only V2 source at `69269e4e`. The primary Text.js side is `text mcp` over the official stdio SDK with `read_frame(styles=true, trim=false)`. `text run` is an independent ANSI cross-check. Both clients use the same isolated HTTP service and transcript. This is the classic TUI, not the experimental new-designs mode.

## Results by area

Before → after means **individual cells with different glyphs**, not differing lines, and not a similarity percentage inflated by blank cells. The standard whole-screen before values come from [round 1](PARITY-ROUND1.md); missing baseline views are replayed from `fc23e30` in a temporary directory. Rich-text “before” is the first capture of a *second* fixture, after the standard fixture already matched. `—` means no baseline case. Exact crops for the three transcript components use one tab row, the scroll viewport, and the last seven composer/footer rows.

<!-- round2:metrics -->
| Area | 100×32 mismatched glyphs | 120×40 mismatched glyphs |
| --- | ---: | ---: |
| Main transcript (whole screen) | 619 → **0** | 759 → **0** |
| Tab strip | 51 → **0** | 51 → **0** |
| Transcript body | 287 → **0** | 387 → **0** |
| Composer and footer | 281 → **0** | 321 → **0** |
| Permission | 321 → **0** | 341 → **0** |
| Always allow: saved patterns | — → **0** | — → **0** |
| Fullscreen permission | — → **0** | — → **0** |
| Question | 297 → **0** | 328 → **0** |
| Home (random example) | 533 → **20** | 193 → **0** |
| Home (identical typed draft) | — → **0** | — → **0** |
| Commands | 703 → **57** | 747 → **0** |
| Models | 629 → **0** | 634 → **0** |
| Agents | 720 → **20** | 543 → **0** |
| Sessions | 625 → **0** | 565 → **0** |
| Help | 612 → **20** | 485 → **0** |
| Themes | 412 → **0** | 422 → **0** |
| Switched to Dracula | — → **0** | — → **0** |
| Context sidebar | 1137 → **0** | 1214 → **0** |
| Rich transcript: latest | 821 → **0** | 985 → **0** |
| Rich transcript: top | 322 → **0** | 578 → **0** |
<!-- /round2:metrics -->

Source data: [glyph, foreground, background and attribute counts per stage and per dialog](parity/round2/measurements.json). [100×32 pairs](parity/round2/100x32/) · [120×40 pairs](parity/round2/120x40/) · [rich transcript](parity/round2/rich-100x32/) · [real DevTools frontend](parity/round2/devtools/). Left is native; right is Text.js via MCP. Compressed `.json.gz` files contain the native SGR and the full MCP styled frame, not screenshots reconstructed from the expected text.

### Iterations

1. `requests`: bind a permission/form to its owning session; replace the composer, retain the draft, expose child requests at the root, and use the native keys and copy. Check the real HTTP decision, not just dismissal. Preserve newer SSE asks/replies across in-flight GETs and resync after reconnection.
2. `transcript`: port the raised `┃` block geometry, agent colors, contiguous exploration summary, disclosure style, single-number patch gutter, applied patch metadata, todos and turn footer. At 120×40 the content rows matched while the header and composer still differed. At 100×32 the missing status row shifted the *entire* sticky transcript by one row.
3. `footer`: real tab widths, selected/new/attention indicators; directory and branch below the split prompt; last context window (including cache), percent and reported session cost. This eliminated the vertical scroll offset. Home and session use the same composer.
4. `home`: native spacers, narrow-screen padding, 75-cell maximum width, footer version and the native pool of example prompts. Capture an identical **typed** draft as well as the randomly chosen placeholder.
5. `dialogs` → `pickers` → `final`: quarter-height dialog placement, 60/88-cell panel widths, classic backdrop, search focus, grouping, constrained list height, gutter, current marker and footer keys. Corrected agent IDs vs display names, clipping, and centering the initially selected theme. Theme changes preview, cancel, commit and (in browser storage) survive reload. When a provider is connected, Ctrl+F toggles a model favorite locally. Closing a session tab is not deletion. Deletion in the session picker requires a second Ctrl+D.
6. `rich` → `rich-final`: separately imported a write, shell output, heading, emphasis, list, TypeScript fence, blockquote and table. Removed the extra code frame, painted full-width table rules between **every** row, kept the trailing empty numbered write line, and showed “Jump to latest ↓” when scrolling away. The Markdown renderer retains parsed closed blocks during streaming and reuses the kit parser, tokenizer, grapheme measurement and scroll controls.
7. `final` also checks the 42-cell context inspector: overlaid through 120 columns, docked above 120. A narrow overlay traps input, so hidden prompts cannot be submitted or approved. The tab strip stays outside its dimmed area.

## What the numbers don't mean

- Empty home screens independently draw one of three native example prompts. That text is visible **behind** shorter dialogs such as Help and Select agent. The table above keeps those mismatches. The separate `panels` measurements compare the visible dialog rectangle only. The steady block cursor in Text.js is a painted inverse cell; tmux's pane capture doesn't serialize the native terminal cursor into the SGR cells.
- Native command categories are registered by plugins. Captures sometimes start the non-suggested section with VCS or System instead of Session. The client exposes its implemented actions, not arbitrary native plugins. Don't rearrange the command list per fixture just to score zero. Provider, session, cost and MCP data are likewise real catalog/state, not fixed menu strings.
- The attention tab uses the native resting spatial glow; native animation phase, hover, tab marquee and pointer selection are not replicated frame-for-frame. Independently started `text run` sessions don't inherit another process's open tabs. Sidebar, form and permission **body** comparisons distinguish that surrounding chrome.
- The client switches among the 33 bundled theme documents and their available light/dark variants. A transparent token reveals the existing Text.js host backdrop; browser JS cannot discover an arbitrary terminal's system palette. On a live switch to Dracula, the native binary retained old foreground colors on already-mounted list/table cells in the rich fixture; this client recolors them immediately. Neither client is a universal Tree-sitter equivalent: Text.js uses its language tokenizer, including on partial fences.
- The static website sandbox retains its demo status, shortcut and picker labels; it never executes a real shell command. The live website and standalone client share the same session UI. DevTools console spans don't send clicks back to the page. Keyboard equivalents work; native OS editors, terminal panes, provider authentication, custom plugin UIs, full diff review, @-attachment autocomplete, prompt stashes/queues, deep history and every CLI setting are not complete. See the [key inventory](parity/KEYBINDINGS.md) for scope, not a declaration of 100% parity.

## Real tool / browser checks

`request-tools.py` starts an authenticated V2 server with disposable HOME/XDG directories, a git project and a deterministic **loopback-only** Chat Completions provider. The model prescribes `printf parity-ok` and a two-choice question. OpenCode itself validates and runs its built-in tools. MCP checks the actual shell command, expands/minimizes the permission, selects Allow once and submits “release.” The runner verifies **both tool states are completed** and the answer reached the tool result. No remote inference or stored credentials. Separate tests exercise queued requests, saved patterns, rejection reasons on the correct child route, validation/conditional fields, multiselect review, cancellation, races, and draft restoration.

`verify-preview.mjs` runs the static preview on port 0, then `e2e-keys.mjs`, `e2e-examples.mjs` and `devtools-live.ts` **serially**. The last script connects the production `/opencode` page to a real ephemeral `@textjs/opencode` bridge backed by a V2 mock, opens bundled Chrome DevTools in its own context and checks the replies through the bridge. Only that preview and bridge are allowed by the page's network route. Its SSE cadence sample is a measurement, not a guarantee for all transcripts or hardware.

## MCP dogfood notes

| Friction | Fixed or intentionally separate |
| --- | --- |
| The transcript arrived before the separate VCS GET. Waiting for “Ready” could save a frame missing only `:master`. Two reads can race a stream. | **Fixed:** `wait_for.text` also accepts an array of up to eight visible strings; all must match the same frame, together with the existing `href`, `gone`, `styles`, `idle` and `trim` options. Tested positive and negative conditions. The capture waits for transcript **and** branch. |
| Reloading after every size correctly preserved dimensions, but also reset the app's in-memory tabs while the native process kept them. | **Driver fix:** reload at the start and resize in-place for the matching navigation trace. Don't persist test-only fake tabs. |
| A choice-to-text form transition could show a textarea with no keyboard focus; validation said “Answer required” after typing a number. | **App fix:** explicit focus IDs and focus transfer after field/rejection stage changes, plus a full multi-field regression test. Picker and sidebar traces assert their focus owners. |
| When the two programs chose different examples, an otherwise identical picker looked different in a whole-frame comparison. | **Measurement fix:** keep unmasked totals, add native dialog bounds and a same-input draft capture. |
| A transparent theme doesn't produce the literal string `transparent` in a styled framebuffer. | **Harness fix:** check the composed host background and an agent foreground. Test all 33 selections and all 61 supported mode combinations via actual keyboard commands. |
| Raw MCP cells can't measure compositor lag, actual glyph fallback, a terminal's hardware cursor, or mouse events inside a console log. | **Not an MCP emulation target:** use real DevTools and the ANSI PTY. [Earlier fixed MCP issues](PARITY-ROUND1.md#text-mcp-dogfood-log) include rectangular reads, clipped wide cells and size retention on reload. |

## Verification

Root, standalone and website typechecks passed. `bun test packages/`: **1,190 passed, 8 skipped, zero failures**. Standalone app: **29 passed**; website: **101 passed**. Both builds succeeded (including the site's browser bundle, SSR and prerender). Against one ephemeral preview, `e2e-keys.mjs` passed **22 checks** and `e2e-examples.mjs` passed **23 checks**, with no page errors. The real DevTools live-bridge check verified a rejection, a structured answer and the last streamed text. Its 101 simulated deltas produced **17 console frames**, with a **66 ms minimum / 67 ms median** gap in this run. These are app-side emit timings with DevTools attached, not latency-to-paint measurements.

`editing-mcp.ts` also exercised Alt+B/Alt+F, kill-to-end, CRLF paste, Shift+Enter, a wide grapheme's caret coordinates after three resizes, Delete and clearing the draft. The route stayed on Home: none of the editing probes submitted a prompt.

## Reproduce

```sh
bun install && bun run build:packages
export PYTHONDONTWRITEBYTECODE=1
python3 apps/opencode-console/scripts/request-tools.py
python3 apps/opencode-console/scripts/compare-pty.py --out apps/opencode-console/.text/round2/final
python3 apps/opencode-console/scripts/compare-pty.py --rich --out apps/opencode-console/.text/round2/rich-final
python3 apps/opencode-console/scripts/before.py
bun apps/opencode-console/scripts/theme-matrix.ts
bun apps/opencode-console/scripts/editing-mcp.ts
bun run --cwd apps/web build
PLAYWRIGHT=$PWD/bench/devtools/node_modules/playwright-core/index.mjs node apps/opencode-console/scripts/verify-preview.mjs
python3 apps/opencode-console/scripts/round-metrics.py
```

Do **not** point these tests at a managed service, `:4096` or `:49374`. Merely opening a session can mark it viewed. The harnesses bind fresh listeners, pin the target, and tear down their own processes and data. Stage captures live under `apps/opencode-console/.text/round2/`; checked-in evidence is under `apps/opencode-console/parity/round2/`.
