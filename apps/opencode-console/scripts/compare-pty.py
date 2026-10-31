"""Capture real terminal cells (text + SGR) without using OpenCode's shared service.

Run from anywhere: python3 apps/opencode-console/scripts/compare-pty.py
Requires tmux, opencode (V2), Bun and the built workspace packages.
"""

import argparse
import base64
import contextlib
import json
import os
from pathlib import Path
import secrets
import shlex
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
import uuid


APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]


@contextlib.contextmanager
def fixture_server(env, project):
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    assert port not in [4096, 49374]
    env.update(OPENCODE_SERVER_URL=f'http://127.0.0.1:{port}', OPENCODE_PASSWORD=secrets.token_urlsafe(32))
    proc = subprocess.Popen(['opencode', 'serve', '--hostname', '127.0.0.1', '--port', str(port)],
                            env=env, cwd=project, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    auth = base64.b64encode(('opencode:'+env['OPENCODE_PASSWORD']).encode()).decode()
    def api(path, body=None):
        req = urllib.request.Request(env['OPENCODE_SERVER_URL'] + path,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={'authorization': 'Basic '+auth, 'content-type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as res:
            data = res.read()
            return json.loads(data) if data else None
    try:
        until = time.monotonic() + 30
        while time.monotonic() < until:
            if proc.poll() is not None:
                raise RuntimeError('Private server exited before becoming ready')
            try:
                if api('/api/info')['version']:
                    break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Private server did not start')
        session = api('/api/session', {'title': 'Parity fixture', 'agent': 'build',
                      'location': {'directory': str(project)}, 'model': {'providerID': 'opencode', 'id': 'big-pickle'}})['data']['id']
        # A genuine V2 shell projection without submitting a prompt or using a model.
        api(f'/api/session/{session}/shell', {'command': 'echo Ready'})
        yield session
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=APP / '.text' / 'captures')
    opts = parser.parse_args()
    opts.out.mkdir(parents=True, exist_ok=True)
    (APP / '.text').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=APP / '.text') as tmp, contextlib.ExitStack() as cleanup:
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
        sid = cleanup.enter_context(fixture_server(env, project))
        subprocess.run(['bun', APP/'scripts/capture-mcp.ts', opts.out.resolve(), env['OPENCODE_SERVER_URL'], sid],
                       cwd=ROOT, env=env, check=True, timeout=120)
        sock = 'textjs-parity-' + uuid.uuid4().hex

        def tmux(*args, check=True):
            return subprocess.run(['tmux', '-L', sock, '-f', '/dev/null', *args],
                                  env=env, check=check, capture_output=True, text=True).stdout

        try:
            for name, cwd, cmd in [
                ('real', project, [shutil.which('opencode'), '--server', env['OPENCODE_SERVER_URL']]),
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
                if name == 'textjs':
                    wait(name, 'connected')
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
                    for state, chord, needle in [('models', 'm', 'model'), ('agents', 'a', 'agent'), ('sessions', 'l', 'Parity fixture')]:
                        tmux('send-keys', '-t', name, 'C-x', chord)
                        wait(name, needle)
                        time.sleep(.15)
                        for ext, sgr in [('txt', False), ('ansi', True)]:
                            (dest/f'{state}-{name}.{ext}').write_text(screen(name, sgr))
                        if state == 'sessions':
                            tmux('send-keys', '-t', name, 'Enter')
                            wait(name, 'Ready')
                            for ext, sgr in [('txt', False), ('ansi', True)]:
                                (dest/f'session-{name}.{ext}').write_text(screen(name, sgr))
                            tmux('send-keys', '-t', name, 'C-x', 'n')
                            wait(name, 'Ask anything')
                        else:
                            tmux('send-keys', '-t', name, 'Escape')
                        time.sleep(.15)
                for state in ('home', 'commands', 'models', 'agents', 'sessions', 'session'):
                    def cells(name):
                        lines = (dest/f'{state}-{name}.txt').read_text().splitlines()
                        return ''.join(line.ljust(cols) for line in lines)
                    a, b, c = cells('real'), cells('mcp'), cells('textjs')
                    print(f'{cols}x{rows} {state}: TUI vs MCP {sum(x != y for x, y in zip(a,b))}; '
                          f'MCP vs text run {sum(x != y for x, y in zip(b,c))} differing glyphs')
        finally:
            tmux('kill-server', check=False)


if __name__ == '__main__':
    main()
