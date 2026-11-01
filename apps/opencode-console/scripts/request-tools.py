"""A real V2 tool turn, with a deterministic loopback-only Chat Completions model.
The provider can only prescribe `printf parity-ok` and a two-choice question.
OpenCode itself validates the call, asks for permission, runs its shell tool and
opens its question tool. text mcp drives the user side; never use a saved URL.
"""
import base64
import importlib.util
import json
import os
import subprocess
import tempfile
import threading
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('capture', APP/'scripts/compare-pty.py')
capture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(capture)


class Provider(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def do_POST(self):
        request = json.loads(self.rfile.read(int(self.headers['content-length'])))
        count = sum(m.get('role') == 'tool' for m in request['messages'])
        calls = [('shell', {'command':'printf parity-ok', 'description':'Print fixture text'}),
                 ('question', {'questions':[{'header':'Branch','question':'Choose a branch','options':[
                     {'label':'main','description':'Default branch'}, {'label':'release','description':'Release branch'}], 'custom':False}]})]
        delta = {'content':'Fixture finished.'}
        if count < len(calls):
            name, args = calls[count]
            delta = {'tool_calls':[{'index':0,'id':f'call_{count}','type':'function','function':{'name':name,'arguments':json.dumps(args)}}]}
        finish = 'tool_calls' if 'tool_calls' in delta else 'stop'
        chunks = [{'id':'chatcmpl-parity','object':'chat.completion.chunk','created':1,'model':'fixture','choices':[{'index':0,'delta':value,'finish_reason':reason}]} for value, reason in [({'role':'assistant',**delta}, None), ({},finish)]]
        self.send_response(200)
        self.send_header('content-type','text/event-stream')
        self.end_headers()
        self.wfile.write((''.join('data: '+json.dumps(c)+'\n\n' for c in chunks)+'data: [DONE]\n\n').encode())


def main():
    with tempfile.TemporaryDirectory(dir=APP/'.text') as tmp, HTTPServer(('127.0.0.1',0), Provider) as model:
        thread = threading.Thread(target=model.serve_forever,daemon=True)
        thread.start()
        try:
            project = Path(tmp)/'project'; project.mkdir()
            env = dict(HOME=tmp, PATH=os.environ['PATH'], SHELL='/bin/sh', LANG='en_US.UTF-8', XDG_CONFIG_HOME=tmp+'/config',
                       XDG_CACHE_HOME=tmp+'/cache', XDG_STATE_HOME=tmp+'/state', XDG_DATA_HOME=tmp+'/data', OPENCODE_DISABLE_AUTOUPDATE='1', FIXTURE_KEY='fixture')
            subprocess.run(['git','init','-q','-b','master',project],env=env,check=True)
            (project/'opencode.json').write_text(json.dumps({'model':'deterministic/fixture', 'providers':{'deterministic':{
                'name':'Fixture','env':['FIXTURE_KEY'], 'package':'@opencode/ai/providers/openai-compatible',
                'settings':{'baseURL':f'http://127.0.0.1:{model.server_port}/v1'},'models':{'fixture':{'name':'Fixture'}}}}}))
            with capture.fixture_server(env, project):
                url = env['OPENCODE_SERVER_URL']; auth = base64.b64encode(('opencode:'+env['OPENCODE_PASSWORD']).encode()).decode()
                def api(path, data=None):
                    with urllib.request.urlopen(urllib.request.Request(url+path, data=json.dumps(data).encode() if data is not None else None,
                        headers={'authorization':'Basic '+auth,'content-type':'application/json'}),timeout=10) as r: return json.load(r)
                sid = api('/api/session',{'title':'Tool integration', 'location':{'directory':str(project)}, 'model':{'id':'fixture','providerID':'deterministic'},
                    'permissions':[{'action':'shell','resource':'*','effect':'ask'}]})['data']['id']
                api(f'/api/session/{sid}/prompt',{'text':'Run the two fixture tools.'})
                subprocess.run(['bun',APP/'scripts/answer-mcp.ts',url,sid],env=env,cwd=APP,check=True,timeout=75)
                messages = api(f'/api/session/{sid}/message')['data']
                parts = [p for m in messages for p in m.get('content',[]) if p['type']=='tool']
                assert {p['name'] for p in parts} >= {'shell','question'} and all(p['state']['status']=='completed' for p in parts), 'Tool did not complete'
                assert any('release' in json.dumps(p['state']['content']) for p in parts if p['name']=='question')
                print('Real shell permission + question tool: accepted, executed and resumed')
        finally:
            model.shutdown(); thread.join()

if __name__ == '__main__': main()
