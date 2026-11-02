"""Regenerate the per-command ledger from an unmodified V2 source checkout."""
from pathlib import Path
import re
import subprocess
import sys

reference = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home()/'code/opencode'
source = reference/'services/www/src/docs/content/cli/keybinds.mdx'
revision = subprocess.check_output(['git', '-C', reference, 'rev-parse', '--short', 'HEAD'], text=True).strip()
supported = set('''leader command.palette.show help.show session.new session.list session.sidebar.toggle model.list
agent.list agent.cycle variant.cycle variant.list model.cycle_recent model.cycle_recent_reverse theme.switch
session.tab.next session.tab.previous session.tab.close session.tab.reopen permission.prompt.fullscreen theme.switch_mode
session.interrupt session.compact session.toggle.exploration_grouping session.page.up session.page.down session.line.up session.line.down
session.half.page.up session.half.page.down session.first session.last
input.submit input.newline input.move.left input.move.right input.move.up input.move.down input.line.home
input.line.end input.delete.to.line.end input.delete.to.line.start input.backspace input.delete
input.word.forward input.word.backward input.delete.word.forward input.delete.word.backward
dialog.select.prev dialog.select.next dialog.select.page_up dialog.select.page_down dialog.select.home
dialog.select.end dialog.select.submit'''.split()) | {f'session.tab.select.{i}' for i in range(1,11)}
supported.update('''prompt.autocomplete.prev prompt.autocomplete.next prompt.autocomplete.hide prompt.autocomplete.select
prompt.autocomplete.complete input.select.left input.select.right input.select.up input.select.down input.select.all
input.select.line.home input.select.line.end input.select.buffer.home input.select.buffer.end input.select.word.forward
input.select.word.backward input.delete.line input.undo input.redo session.messages_last_user session.pin.toggle
diff.close diff.down diff.up diff.page.down diff.page.up diff.half_page.down diff.half_page.up diff.last
diff.next_file diff.previous_file dialog.prompt.submit session.aside prompt.skills session.redo'''.split())
supported.update('''prompt.queue stash.delete queued_prompt.delete prompt.stash prompt.stash.pop prompt.stash.list'''.split())
partial = {
    'app.exit': 'Ctrl+C/D from an empty prompt or leader+Q outside the session inbox. The embed pauses and offers Restart.',
    'session.rename': 'Ctrl+R in the session picker and `/rename <title>` (V1/V2/demo).',
    'session.delete': 'Ctrl+D twice in the session picker. Closing a tab never deletes it.',
    'session.toggle.thinking': 'Compact/expanded reasoning, not the native visibility and verbosity modes.',
    'theme.switch': '33 bundled themes, live preview/cancel/commit; cannot infer a remote terminal system palette.',
    'model.dialog.favorite': 'Ctrl+F when a provider is connected. Favorites are in memory per connection.',
    'model.dialog.provider': 'Ctrl+A lists integrations. Provider authentication still uses the native client.',
    'opencode.settings': 'Open settings exposes the implemented appearance and session controls.',
    'open.menu': 'Ctrl+O opens the session picker, not the full recent-project/workspace menu.',
    'messages.copy': 'Browser Clipboard API; reports unavailability in a terminal.',
    'prompt.paste': 'Text paste in all hosts. Browser clipboard events also accept PNG, JPEG, GIF and WebP (20 MiB per paste).',
    'prompt.clear': 'Browser/MCP Ctrl+C clears nonempty input; terminal reserves Ctrl+C for exit.',
    'prompt.history.previous': 'In-memory current-connection history, no disk stash or attachment recall.',
    'prompt.history.next': 'In-memory current-connection history; restores draft.',
    'model.cycle_recent': 'In-memory; no cross-launch model preferences.',
    'model.cycle_recent_reverse': 'In-memory; no cross-launch model preferences.',
    'session.list': 'Directory/all-project toggle, local fuzzy filter and V2 server title search; first 50 per query.',
    'leader': 'Default Ctrl+X, 2s; no cli.json rebinding or which-key preview.',
    'session.timeline':'Search loaded user messages, jump, copy, revert or fork. No older-message paging.',
    'session.fork':'Full session or before a selected user message. Text restored; inline media not restored.',
    'session.undo':'Stage revert and append the prompt. Busy sessions require an explicit interrupt first. No inline media restoration.',
    'session.export':'JSON download or clipboard. No external editor or Markdown export options.',
    'prompt.editor':'Shows the native CLI requirement. Cannot launch $EDITOR from a console log.',
    'opencode.status':'Server, version, directory and MCP list. No native diagnostics.',
    'mcp.list':'Read-only server status at the active location.',
    'usage.show':'V2 usage meters and budgets. No account authentication.',
    'model.dialog.usage':'Ctrl+U opens the usage report.',
    'plugins.list':'Read-only server plugin IDs and status; no terminal plugin management.',
    'diff.open':'Unified patch for the last turn in a session or working tree from Home. No base picker or split view.',
    'diff.first':'Home jumps to the start; gg is not bound.',
    'location.reload':'V2 reload followed by a catalog and session refresh.',
    'session.pin.toggle':'Ctrl+F pins a session for this connection; no disk persistence.',
    'session.queued_prompts':'Leader+Q lists user inbox entries on V2/demo; refreshes when busy changes.',
    'queued_prompt.undo':'Cancel the entry and restore its text; underlying files are not reconstructed from the inbox.',
    'session.aside':'/btw with an argument opens an answer outside the transcript (V2/demo).',
    'prompt.skills':'Select by ID and attach to the active draft.',
}
supported.update('''diff.next_hunk diff.previous_hunk diff.toggle_file_tree diff.single_patch diff.switch_source diff.toggle_view
diff.toggle_fullscreen diff.mark_reviewed diff.help diff.first pane.focus.left pane.focus.right terminal.select terminal.toggle terminal.close
session.toggle.scrollbar session.tab.history.back session.tab.history.forward session.copy.id session.move session.cd
model.cycle_favorite model.cycle_favorite_reverse agent.cycle.reverse session.message.next session.message.previous session.message.user.next
session.message.user.previous session.parent session.child.first session.child.next session.child.previous prompt.submit
input.visual.line.home input.visual.line.end input.select.visual.line.home input.select.visual.line.end input.buffer.home input.buffer.end
composer.subagent.up composer.subagent.down composer.subagent.select composer.subagent.interrupt composer.shell.up composer.shell.down
composer.shell.select composer.shell.kill composer.terminal.up composer.terminal.down composer.terminal.select dialog.integration.rename
dialog.integration.delete dialog.worktree.generate dialog.move_session.new dialog.move_session.move dialog.move_session.delete dialog.move_session.refresh
dialog.mcp.toggle dialog.plugins.error dialog.plugins.update dialog.plugins.check which-key.toggle which-key.layout.toggle which-key.pending.toggle
which-key.group.previous which-key.group.next which-key.scroll.up which-key.scroll.down which-key.page.up which-key.page.down which-key.home
which-key.end opencode.debug docs.open session.background'''.split())
supported.update(f'session.quick_switch.{i}' for i in range(1,10))
partial.pop('diff.first')
partial.update({
 'leader':'Native defaults and timed sequences; bridge imports validated press bindings from cli.json. Browser-reserved and release-only keys cannot be taken over.',
 'prompt.history.previous':'Recalls text and attachment marks. Sandbox history survives reload; live history is connection-local, with older server prompts in /history.',
 'prompt.history.next':'Returns to the draft including mentions. Up/Down uses buffer boundaries; /history pages server turns without writing private prompts to browser storage.',
 'diff.open':'Working/branch/committed/last turn, base selection, per-file and all-files review, split or unified, tree and reviewed state. No image diffs or native pointer interactions.',
 'session.copy':'Copies normalized loaded messages; native formatting and deep Markdown export are incomplete.',
 'open.menu':'Recent sessions and directories from the session catalog; no cross-project worktree flyout.',
 'session.move':'Project API supports create, refresh, move and confirmed non-forced removal. No force-delete fallback.',
 'session.cd':'Server location validation and session move; no directory argument popup or expansion of the remote user’s home.',
 'provider.connect':'V2 key, OAuth code/automatic, external and command methods; account activation, rename and confirmed removal. Lite has no V1 auth adapter and does not handle every provider-specific custom form choice.',
 'model.dialog.provider':'Opens the integration catalog and supported V2 sign-in flows. Environment-only providers require server-side environment changes.',
 'mcp.list':'V2 status, error details, connect/disconnect and advertised integration sign-in. Provisioning remains a server configuration action.',
 'plugins.list':'Server plugin state, errors, check and confirmed update. Lite can toggle its MCP sidebar; cannot load arbitrary native TUI plugins.',
 'plugins.toggle':'Toggles the actual Lite MCP sidebar contribution. The V2 server API has no activate/deactivate route for server plugins.',
 'server.pair':'Lists reported origins. Explicit confirmation can issue and copy a short-lived V2 link; no bearer URL or QR code is printed in retained console frames.',
 'service.restart':'Displays the native service command. Restart is a local CLI capability, not a V2 HTTP operation.',
 'opencode.debug':'Version, session ID, model, viewport and clipboard copy; the page cannot inspect a remote terminal or its OS.',
 'terminal.toggle':'Scripted sandbox shell; live V2 shows existing session terminal snapshots only. No raw TTY keyboard or VT emulation.',
 'terminal.select':'Select a persistent sandbox pane or an existing V2 snapshot. No interactive live PTY.',
 'terminal.close':'Hides the pane without killing its process. The live snapshot never holds a PTY input connection.',
 'prompt.images.view':'Clipboard images use a half-block browser preview; referenced server-side media and native terminal image protocols are not decoded.',
 'which-key.toggle':'Lists executable global bindings and pending sequences. Native modal/plugin layers are not all present in the global inspector.',
})
supported.update('''app.toggle.animations app.toggle.diffwrap session.tab.next_unread session.tab.previous_unread
session.copy model.dialog.favorite model.cycle_recent model.cycle_recent_reverse session.pin.toggle mcp.list'''.split())
for key in ('session.copy','model.dialog.favorite','model.cycle_recent','model.cycle_recent_reverse','session.pin.toggle','mcp.list'):
    partial.pop(key,None)
partial.update({
    'app.debug':'Toggles a Text.js diagnostic row with the viewport, connection, session and message count; no OpenTUI renderer overlay.',
    'theme.mode.lock':'The browser can follow or lock its OS appearance. DevTools theme overrides and native terminal palettes are not observable from the page.',
    'session.verbosity.cycle':'Cycles low/medium/high, including activity summaries and expanded exploration; native cross-step groups are not reproduced.',
    'app.toggle.paste_summary':'Three-line or >150-character pastes get an editable summary; submission expands the text and rebases file marks. Undo after deleting a marker cannot restore its backing bytes.',
    'prompt.paste':'Text, compact paste markers and browser clipboard images. The terminal host has no image clipboard decoder.',
    'session.export':'Markdown or sanitized JSON, copy or browser download, with thinking/tool switches. No native editor or temporary file action.',
    'open.menu':'Recent sessions, real project catalog and directory selection. Worktree management is a separate dialog rather than the native right-arrow flyout.',
    'session.rename':'Rename from the session picker or /rename <title>. Browser-reserved Ctrl+R may not reach the picker; empty input does not generate a title.',
    'location.reload':'Reloads V2 configuration, session/command catalogs and bridge key overrides. No CLI filesystem watcher in the browser.',
    'session.fork':'Fork before any loaded user turn or at the end. Restores text and URI mentions; media bytes not retained in the projection cannot be restored.',
    'session.aside':'/btw <question> returns a separate answer. Entering /btw without an argument does not open the native question dialog.',
    'session.queued_prompts':'Lists user inbox entries and supports cancel/undo. No delivery-type promotion or live enqueue updates while busy remains unchanged.',
    'model.dialog.usage':'Ctrl+U opens the usage report; the native limits display also has reset times and workspace/account details.',
    'usage.show':'Displays V2 Go meters and budget totals. No reset countdowns or detailed budget coverage.',
    'prompt.skills':'Selects and attaches a V2 skill ID. Picker selections append to the draft rather than inserting at a mid-buffer caret.',
    'opencode.settings':'Includes theme, grouping, tabs, history and key overrides. Does not expose the full native CLI settings schema.',
})
partial.pop('session.delete');supported.add('session.delete')
missing_reason={
    'app.console':'The host already is the DevTools Console. It cannot open another native renderer console.',
    'app.scrap':'Declared in the key schema; no registered handler in the pinned classic TUI.',
    'app.toggle.file_context':'No native IDE selection/IPC channel is attached. Use explicit @ file mentions instead.',
    'app.clear':'Mini-only scrollback command; clearing the inspected page’s DevTools log would delete unrelated output.',
    'prompt.editor_context.clear':'There is no implicit IDE context to clear. Explicit attachment marks can be edited or removed.',
    'terminal.suspend':'SIGTSTP/SIGCONT job control belongs to a terminal process, not the inspected page.',
    'terminal.title.toggle':'The embed does not own the host terminal title or the inspected page’s document title.',
}
out = [f'# Keybinding inventory · OpenCode `{revision}`', '',
       'Generated by `scripts/keybind-ledger.py`. Status describes keyboard behavior. Missing includes native commands with no default key that can be found in the native palette. Browser-reserved shortcuts may only reach the app through their alternatives.', '']
for line in source.read_text().splitlines():
    if line.startswith('## '):
        out.extend([line, '', '| Command | Native default | Text.js |', '| --- | --- | --- |'])
    match = re.match(r'^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|', line)
    if match:
        key, default = match.groups()
        status = 'Partial: '+partial[key] if key in partial else 'Done' if key in supported else 'Missing: '+missing_reason[key]
        out.append(f'| `{key}` | {default} | {status} |')
    if not line.strip() and out[-1].startswith('| `'): out.append('')
dest = Path(__file__).resolve().parents[1]/'parity/KEYBINDINGS.md'
dest.parent.mkdir(exist_ok=True)
dest.write_text('\n'.join(out).rstrip()+'\n')
