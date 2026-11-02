"""Capture autocomplete in a private native TUI and in the same project's Text.js console framebuffer.
Requires opencode V2, tmux, Bun, built packages and PLAYWRIGHT. Never submits a prompt.
"""
import base64, gzip, json, os, secrets, shlex, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path
from cell_diff import mcp_cells, sgr_cells

APP = Path(__file__).resolve().parents[1]
ROUND = 'round4' if os.environ.get('PARITY_ROUND') == '4' else 'round3'
OUT = APP / 'parity' / ROUND
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
    if ROUND=='round4':
        def git(*args):subprocess.run(['git','-C',project,'-c','user.name=Fixture','-c','user.email=fixture@example.invalid',*args],env=env,check=True,stdout=subprocess.DEVNULL)
        git('add','README.md');git('commit','-qm','Fixture');git('branch','-M','main');git('checkout','-qb','review');(project/'README.md').write_text('Project fixture\nRun bun test.\n')
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
        tmux('set-option','-t','native','status','off');wait('Ask anything');wait('Build ·')
        cases=[('slash','/model','Switch model'),('mention','@readm','README.md'),('shell','!pwd','Shell')]
        if ROUND=='round4':cases += [('leader','','Ask anything'),('diff','/diff','Run bun test.'),('integrations','/connect','Connect an integration')]
        for name,typed,marker in cases:
            if name=='leader':
                tmux('send-keys','-t','native','-l','Review the changes');wait('Review the changes');tmux('send-keys','-t','native','C-x');marker='Review the changes'
            else:tmux('send-keys','-t','native','-l',typed)
            if name in ('diff','integrations'):
                wait('Open diff viewer' if name=='diff' else 'Connect an integration');time.sleep(.2);tmux('send-keys','-t','native','Enter')
            if name=='diff':
                time.sleep(.5);tmux('send-keys','-t','native','d');wait('Diff source');tmux('send-keys','-t','native','Home','Down','Down','Enter')
            wait(marker);time.sleep(.25)
            data=tmux('capture-pane','-e','-N','-p','-t','native'); (Path(tmp)/(name+'.ansi')).write_text(data)
            (Path(tmp)/(name+'.json')).write_text(json.dumps([list(c[:3])+[list(c[3])] for c in sgr_cells(data,100,32)]))
            tmux('send-keys','-t','native','Escape');time.sleep(.6);tmux('send-keys','-t','native','C-u');time.sleep(.25)
        capture_env={**env,'PLAYWRIGHT':os.environ['PLAYWRIGHT'],'PARITY_ROUND':ROUND}
        if 'PLAYWRIGHT_BROWSERS_PATH' in os.environ: capture_env['PLAYWRIGHT_BROWSERS_PATH']=os.environ['PLAYWRIGHT_BROWSERS_PATH']
        else: capture_env['PLAYWRIGHT_BROWSERS_PATH']=str(Path.home()/'.cache/ms-playwright')
        subprocess.run(['bun',APP/'scripts/completion-frame.ts',tmp,version],env=capture_env,cwd=APP,check=True,timeout=100)
        counts = {}
        for name,_,_ in cases:
            capture = json.loads(gzip.decompress((OUT/(name+'.json.gz')).read_bytes()))
            left, right = sgr_cells(capture['realSGR'],100,32), mcp_cells(capture['mcp'])
            counts[name] = {k: sum(a[i]!=b[i] for a,b in zip(left,right) if i not in (1,3) or a[0]!=' ' or b[0]!=' ')
                            for i,k in enumerate(('glyph','fg','bg','attrs'))}
        (OUT/'measurements.json').write_text(json.dumps({'nativeVersion':version,'cols':100,'rows':32,'mismatches':counts},indent=2)+'\n')
    finally:
        tmux('kill-server',check=False);proc.terminate()
        try:proc.wait(5)
        except subprocess.TimeoutExpired:proc.kill();proc.wait()
