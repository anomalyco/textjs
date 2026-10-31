"""Print styled runs for a captured state, row by row: real TUI vs text mcp.

python3 apps/opencode-console/scripts/runs.py .text/captures/100x32 session [--all] [--rows 3-9]
Rows identical in glyph, fg, bg and attrs are skipped unless --all.
"""
import argparse
import json
from pathlib import Path
from cell_diff import mcp_cells, sgr_cells


def runs(cells):
    out = []
    for x, c in enumerate(cells):
        key = c[1:]
        if out and out[-1][1] == key:
            out[-1][2] += c[0]
        else:
            out.append([x, key, c[0]])
    return [(x, t, k[0], k[1], ','.join(sorted(k[2]))) for x, k, t in out]


def main():
    p = argparse.ArgumentParser()
    p.add_argument('dir', type=Path)
    p.add_argument('state')
    p.add_argument('--all', action='store_true')
    p.add_argument('--rows')
    o = p.parse_args()
    frame = json.loads((o.dir/f'{o.state}-mcp.json').read_text())
    cols, rows = frame['cols'], frame['rows']
    mcp = mcp_cells(frame)
    real = sgr_cells((o.dir/f'{o.state}-real.ansi').read_text(), cols, rows)
    lo, hi = 0, rows - 1
    if o.rows:
        a, _, b = o.rows.partition('-')
        lo, hi = int(a), int(b or a)
    for y in range(lo, hi + 1):
        r, m = real[y*cols:(y+1)*cols], mcp[y*cols:(y+1)*cols]
        if r == m and not o.all:
            continue
        print(f'--- row {y}')
        for name, row in (('R', r), ('M', m)):
            print(f'  {name}', ' | '.join(f'{x}:{t!r} {fg or "-"}/{bg or "-"}{" "+a if a else ""}' for x, t, fg, bg, a in runs(row) if t.strip() or bg))


if __name__ == '__main__':
    main()
