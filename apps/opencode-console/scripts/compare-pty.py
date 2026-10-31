"""Capture real terminal cells (text + SGR) without using OpenCode's shared service.

Run from anywhere: python3 apps/opencode-console/scripts/compare-pty.py
Requires tmux, opencode (V2), Bun and the built workspace packages.
"""

import argparse
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import time
import uuid


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=APP / '.text' / 'captures')
    opts = parser.parse_args()
    opts.out.mkdir(parents=True, exist_ok=True)
    (APP / '.text').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=APP / '.text') as tmp:
        home = Path(tmp)
        project = home / 'project'
        project.mkdir()
        # Deliberately don't inherit API keys, OPENCODE_*, an existing tmux server,
        # or the user's config. A separate git root also isolates location discovery.
        env = dict(PATH=os.environ['PATH'], HOME=tmp, SHELL='/bin/sh', LANG='en_US.UTF-8',
                   XDG_DATA_HOME=tmp+'/data', XDG_CONFIG_HOME=tmp+'/config',
                   XDG_CACHE_HOME=tmp+'/cache', XDG_STATE_HOME=tmp+'/state',
                   TERM='tmux-256color', COLORTERM='truecolor', OPENCODE_DISABLE_AUTOUPDATE='1')
        subprocess.run(['git', 'init', '-q', project], env=env, check=True)
        sock = 'textjs-parity-' + uuid.uuid4().hex

        def tmux(*args, check=True):
            return subprocess.run(['tmux', '-L', sock, '-f', '/dev/null', *args],
                                  env=env, check=check, capture_output=True, text=True).stdout

        try:
            for name, cwd, cmd in [
                ('real', project, [shutil.which('opencode'), '--standalone']),
                # No window origin under text run => demo, never the dev proxy.
                ('textjs', APP, [shutil.which('bun'), ROOT/'packages/text/bin/text.ts', 'run']),
            ]:
                tmux('new-session', '-d', '-x', '120', '-y', '40', '-s', name, '-c', str(cwd),
                     'exec ' + shlex.join(map(str, cmd)))
                tmux('set-option', '-t', name, 'status', 'off')

            def screen(name, sgr=False):
                return tmux('capture-pane', '-p', *(['-e'] if sgr else []), '-t', name)

            def wait(name, needle):
                until = time.monotonic() + 40
                while time.monotonic() < until:
                    if needle in screen(name):
                        return
                    time.sleep(.1)
                raise RuntimeError(f'{name}: missing {needle!r}\n{screen(name)}')

            for name in ('real', 'textjs'):
                wait(name, 'Ask anything')
            for cols, rows in [(120, 40), (100, 32), (80, 24)]:
                for name in ('real', 'textjs'):
                    tmux('resize-window', '-t', name, '-x', str(cols), '-y', str(rows))
                    time.sleep(.4)
                    for state in ('home', 'commands'):
                        if state == 'commands':
                            tmux('send-keys', '-t', name, 'C-p')
                            wait(name, 'Commands')
                        dest = opts.out / f'{cols}x{rows}'
                        dest.mkdir(exist_ok=True)
                        for ext, sgr in [('txt', False), ('ansi', True)]:
                            (dest/f'{state}-{name}.{ext}').write_text(screen(name, sgr))
                    tmux('send-keys', '-t', name, 'Escape')
                    time.sleep(.25)
                for state in ('home', 'commands'):
                    def cells(name):
                        lines = (dest/f'{state}-{name}.txt').read_text().splitlines()
                        return ''.join(line.ljust(cols) for line in lines)
                    a, b = cells('real'), cells('textjs')
                    print(f'{cols}x{rows} {state}: {sum(x != y for x, y in zip(a,b))} differing glyphs')
        finally:
            tmux('kill-server', check=False)


if __name__ == '__main__':
    main()
