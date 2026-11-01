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
out = [f'# Keybinding inventory · OpenCode `{revision}`', '',
       'Generated by `scripts/keybind-ledger.py`. Status describes keyboard behavior. Missing includes native commands with no default key that can be found in the native palette. Browser-reserved shortcuts may only reach the app through their alternatives.', '']
for line in source.read_text().splitlines():
    if line.startswith('## '):
        out.extend([line, '', '| Command | Native default | Text.js |', '| --- | --- | --- |'])
    match = re.match(r'^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|', line)
    if match:
        key, default = match.groups()
        status = 'Partial: '+partial[key] if key in partial else 'Done' if key in supported else 'Missing'
        out.append(f'| `{key}` | {default} | {status} |')
    if not line.strip() and out[-1].startswith('| `'): out.append('')
dest = Path(__file__).resolve().parents[1]/'parity/KEYBINDINGS.md'
dest.parent.mkdir(exist_ok=True)
dest.write_text('\n'.join(out).rstrip()+'\n')
