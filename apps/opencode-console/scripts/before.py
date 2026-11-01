"""Fill missing round-one before counts, without switching checkout or ports.
Only compare frames not present in round one's checked-in measurement file.
"""
from pathlib import Path
import importlib.util
import json
import os
import subprocess
import tempfile
from cell_diff import sgr_cells, mcp_cells

APP=Path(__file__).resolve().parents[1]
ROOT=APP.parents[1]
spec=importlib.util.spec_from_file_location('capture',APP/'scripts/compare-pty.py');capture=importlib.util.module_from_spec(spec);spec.loader.exec_module(capture)
dest=APP/'.text/round2/before'
with tempfile.TemporaryDirectory(dir=APP/'.text') as tmp:
    home=Path(tmp);project=home/'project';project.mkdir()
    env=dict(HOME=tmp,PATH=os.environ['PATH'],SHELL='/bin/sh',LANG='en_US.UTF-8',XDG_CONFIG_HOME=tmp+'/config',XDG_CACHE_HOME=tmp+'/cache',XDG_STATE_HOME=tmp+'/state',XDG_DATA_HOME=tmp+'/data',OPENCODE_DISABLE_AUTOUPDATE='1')
    subprocess.run(['git','init','-q','-b','master',project],env=env,check=True)
    archive=subprocess.run(['git','archive','fc23e30','apps/opencode-console'],cwd=ROOT,capture_output=True,check=True)
    subprocess.run(['tar','-x','-C',home],input=archive.stdout,check=True)
    (home/'packages').symlink_to(ROOT/'packages',target_is_directory=True)
    with capture.fixture_server(env,project) as (_,p,q):
        subprocess.run(['bun',APP/'scripts/capture-before.ts',home/'apps/opencode-console',dest,env['OPENCODE_SERVER_URL'],p,q],cwd=ROOT,env=env,check=True,timeout=60)
    counts={}
    for cols,rows in [(100,32),(120,40)]:
        size=f'{cols}x{rows}'; counts[size]={}
        for name in ['help','themes','permission','question','sidebar']:
            frame=json.loads((dest/size/f'{name}-mcp.json').read_text())
            real=sgr_cells((APP/'.text/round2/final'/size/f'{name}-real.ansi').read_text(),cols,rows)
            counts[size][name]=sum(a[0]!=b[0] for a,b in zip(real,mcp_cells(frame)))
    (dest/'glyphs.json').write_text(json.dumps(counts,indent=2)+'\n');print(counts)
