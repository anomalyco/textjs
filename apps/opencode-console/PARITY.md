# OpenCode TUI parity · round 2

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

`verify-preview.mjs` runs the static preview on port 0, then `e2e-keys.mjs`, `e2e-examples.mjs` and `devtools-live.ts` **serially**. The last script connects the production `/opencode` page to a real ephemeral `text proxy` backed by a V2 mock, opens bundled Chrome DevTools in its own context and checks the replies through the bridge. Only that preview and bridge are allowed by the page's network route. Its SSE cadence sample is a measurement, not a guarantee for all transcripts or hardware.

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
