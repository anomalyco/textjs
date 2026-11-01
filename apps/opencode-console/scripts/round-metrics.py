"""Archive compact reproducible evidence (run after compare-pty.py stages).
Whole-screen counts are always kept, including variable placeholders and the
native animated tab strip. Panel-only counts identify differences in the
foreground dialog independent of what the two applications happen to dim.
"""
import gzip
import json
from pathlib import Path
from shutil import copyfile
from cell_diff import mcp_cells, sgr_cells

APP=Path(__file__).resolve().parents[1]
CAP=APP/'.text/round2'
OUT=APP/'parity/round2'
OUT.mkdir(exist_ok=True)
stages={}
panels={}
for stage in ['requests','transcript','footer','home','dialogs','pickers','final','rich','rich-final']:
    if not (CAP/stage).is_dir(): continue
    stages[stage]={}
    for size in ['100x32','120x40','80x24']:
        dest=CAP/stage/size
        counts={p.name[:-10]:json.loads(p.read_text())['real'] for p in sorted(dest.glob('*-diff.json'))}
        stages[stage][size]=counts
        if stage not in ['final','rich-final'] or size=='80x24': continue
        folder=OUT/(size if stage=='final' else 'rich-'+size);folder.mkdir(exist_ok=True)
        for name in counts:
            if stage=='rich-final' and name not in ['session','session-top']:continue
            copyfile(dest/f'{name}-pair.txt',folder/f'{name}.txt')
            data=json.loads((dest/f'{name}-mcp.json').read_text());cols,rows=data['cols'],data['rows']
            native=(dest/f'{name}-real.ansi').read_text()
            if name in ['session','session-dracula','permission','permission-full','question']:
                (folder/f'{name}.json.gz').write_bytes(gzip.compress(json.dumps({'realSGR':native,'mcp':data},ensure_ascii=False).encode(),mtime=0))
            a,b=sgr_cells(native,cols,rows),mcp_cells(data)
            width=min(88 if name=='sessions' else 60,cols-2)
            if name in ['models','agents','commands','sessions','help','themes']:
                x,y=(cols-width)//2,rows//4
                end=y
                while end<rows and a[end*cols+x][2]=='#141414':end+=1
            elif name.startswith('permission') or name=='question':
                x,width,end=2,cols-4,rows-1;y=end
                while y>0 and a[(y-1)*cols+x][0]=='┃':y-=1
            else: continue
            if end==y:raise RuntimeError(f'No panel found: {name} {size}')
            total=[0]*4
            for j in range(y,end):
                for i in range(x,x+width):
                    l,r=a[j*cols+i],b[j*cols+i]
                    for k in range(4):
                        if k in [1,3] and l[0]==r[0]==' ':continue
                        total[k]+=l[k]!=r[k]
            panels[f'{stage}/{size}/{name}']={'bounds':[x,y,width,end-y],**dict(zip(['glyph','fg','bg','attrs'],total))}
base=json.loads((APP/'parity/captures/measurements.json').read_text())
replayed=json.loads((CAP/'before/glyphs.json').read_text()) if (CAP/'before/glyphs.json').exists() else {}
regions={}
for size in ['100x32','120x40']:
    w,h=map(int,size.split('x')); regions[size]={}
    for stage, path in [('before',CAP/'before'/size),('after',CAP/'final'/size)]:
        if not (path/'session-mcp.json').is_file():continue
        cells=mcp_cells(json.loads((path/'session-mcp.json').read_text()));ref=sgr_cells((CAP/'final'/size/'session-real.ansi').read_text(),w,h)
        for label,lo,hi in [('Tab strip',0,1),('Transcript body',1,h-7),('Composer and footer',h-7,h)]:
            regions[size].setdefault(label,{})[stage]=sum(a[0]!=b[0] for a,b in zip(cells[lo*w:hi*w],ref[lo*w:hi*w]))
(OUT/'measurements.json').write_text(json.dumps({'stages':stages,'panels':panels,'replayedBefore':replayed,'regions':regions},indent=2)+'\n')
if (CAP/'devtools').is_dir():
    (OUT/'devtools').mkdir(exist_ok=True)
    for image in (CAP/'devtools').glob('*.png'):copyfile(image,OUT/'devtools'/image.name)
    if (CAP/'devtools/stream.json').exists():copyfile(CAP/'devtools/stream.json',OUT/'devtools/stream.json')
rows=['| Area | 100×32 mismatched glyphs | 120×40 mismatched glyphs |','| --- | ---: | ---: |']
for label,name in [('Main transcript (whole screen)','session'),('Tab strip',None),('Transcript body',None),('Composer and footer',None),('Permission','permission'),('Always allow: saved patterns','permission-always'),('Fullscreen permission','permission-full'),('Question','question'),('Home (random example)','home'),('Home (identical typed draft)','home-draft'),('Commands','commands'),('Models','models'),('Agents','agents'),('Sessions','sessions'),('Help','help'),('Themes','themes'),('Switched to Dracula','session-dracula'),('Context sidebar','sidebar'),('Rich transcript: latest','rich-session'),('Rich transcript: top','rich-session-top')]:
    columns=[label]
    for size in ['100x32','120x40']:
        if name is None:before,after=(regions[size].get(label,{}).get(k,'—') for k in ['before','after'])
        elif name.startswith('rich-'):
            key=name[5:];before=stages.get('rich',{}).get(size,{}).get(key,{}).get('glyph','—');after=stages.get('rich-final',{}).get(size,{}).get(key,{}).get('glyph','—')
        else:
            before=base[size].get(name,{}).get('real',{}).get('glyph',replayed.get(size,{}).get(name,'—'))
            after=stages['final'][size].get(name,{}).get('glyph','—')
        columns.append(f'{before} → **{after}**')
    rows.append('| '+' | '.join(columns)+' |')
start,end='<!-- round2:metrics -->','<!-- /round2:metrics -->'
doc=APP/'PARITY.md'; original=doc.read_text()
if start in original and end in original:
    doc.write_text(original.split(start)[0]+start+'\n'+'\n'.join(rows)+'\n'+end+original.split(end,1)[1])
print('Capture archive:',OUT)
