"""Capture autocomplete in a private native TUI and in the same project's Text.js console framebuffer.
Requires opencode V2, tmux, Bun, built packages and PLAYWRIGHT. Never submits a prompt.
"""
import base64, json, os, secrets, shlex, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path
from cell_diff import sgr_cells

APP = Path(__file__).resolve().parents[1]
OUT = APP / 'parity/round3'
OUT.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    project = Path(tmp) / 'project'
    project.mkdir()
    (project / 'README.md').write_text('Project fixture\n')
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]
    assert port not in (4096,49374)
    env = dict(PATH=os.environ['PATH'], HOME=tmp, LANG='C.UTF-8', SHELL='/bin/sh', TERM='tmux-256color', COLORTERM='truecolor',
               OPENCODE_SERVER_URL=f'http://127.0.0.1:{port}', OPENCODE_PASSWORD=secrets.token_hex(24), OPENCODE_DISABLE_AUTOUPDATE='1',
               OPENCODE_CLI_CONFIG_CONTENT='{"highlights":false}', **{'XDG_'+k+'_HOME':tmp+'/'+k.lower() for k in ['CONFIG','CACHE','STATE','DATA']})
    subprocess.run(['git','init','-q',project],env=env,check=True)
    proc = subprocess.Popen(['opencode','serve','--hostname','127.0.0.1','--port',str(port)],env=env,cwd=project,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    sock = 'textjs-menus-'+secrets.token_hex(6)
    def tmux(*args,check=True):
        return subprocess.run(['tmux','-L',sock,'-f','/dev/null',*args],env=env,check=check,capture_output=True,text=True).stdout
    def wait(text):
        for _ in range(150):
            screen=tmux('capture-pane','-p','-t','native')
            if text in screen:return
            time.sleep(.2)
        raise RuntimeError(f'Expected {text!r}\n{screen}')
    try:
        url=env['OPENCODE_SERVER_URL']; auth=base64.b64encode(('opencode:'+env['OPENCODE_PASSWORD']).encode()).decode()
        for _ in range(150):
            if proc.poll() is not None: raise RuntimeError('Disposable server exited')
            try:
                with urllib.request.urlopen(urllib.request.Request(url+'/api/info',headers={'authorization':'Basic '+auth}),timeout=2) as r: version=json.load(r)['version']
                break
            except OSError: time.sleep(.2)
        else: raise RuntimeError('Disposable server not ready')
        tmux('new-session','-d','-s','native','-x','100','-y','32','-c',str(project),'exec '+shlex.join(['opencode','--server',url]))
        tmux('set-option','-t','native','status','off');wait('Ask anything')
        for name,typed,marker in [('slash','/model','Switch model'),('mention','@readm','README.md'),('shell','!pwd','Shell')]:
            tmux('send-keys','-t','native','-l',typed);wait(marker);time.sleep(.25)
            data=tmux('capture-pane','-e','-N','-p','-t','native'); (OUT/(name+'.ansi')).write_text(data)
            (Path(tmp)/(name+'.json')).write_text(json.dumps([list(c[:3])+[list(c[3])] for c in sgr_cells(data,100,32)]))
            tmux('send-keys','-t','native','Escape');time.sleep(.6);tmux('send-keys','-t','native','C-u');time.sleep(.25)
        capture_env={**env,'PLAYWRIGHT':os.environ['PLAYWRIGHT']}
        if 'PLAYWRIGHT_BROWSERS_PATH' in os.environ: capture_env['PLAYWRIGHT_BROWSERS_PATH']=os.environ['PLAYWRIGHT_BROWSERS_PATH']
        else: capture_env['PLAYWRIGHT_BROWSERS_PATH']=str(Path.home()/'.cache/ms-playwright')
        subprocess.run(['bun',APP/'scripts/completion-frame.ts',tmp,version],env=capture_env,cwd=APP,check=True,timeout=100)
    finally:
        tmux('kill-server',check=False);proc.terminate()
        try:proc.wait(5)
        except subprocess.TimeoutExpired:proc.kill();proc.wait()
