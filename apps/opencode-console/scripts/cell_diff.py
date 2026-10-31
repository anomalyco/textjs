"""Compare the tmux PTY SGR dump to text mcp's read_frame(styles=true).

Measured separately: graphemes, painted backgrounds (including spaces),
foreground and attributes (only where ink is visible in either capture).
The fixtures use single code points except for combining marks; this parser
is intentionally not a general VT emulator (tmux already did that work).
"""
import json
import re
import unicodedata


def columns(s):
    cells = []
    for c in s.replace('\xa0', ' '):
        if unicodedata.combining(c) and cells:
            cells[-1] += c
            continue
        cells.append(c)
        if unicodedata.east_asian_width(c) in ('F', 'W'):
            cells.append('')
    return cells


def sgr_cells(source, cols, rows):
    fg = bg = None
    attrs = set()
    ons = {1:'bold', 2:'dim', 3:'italic', 4:'underline', 7:'inverse', 9:'strikethrough'}
    offs = {22:['bold','dim'], 23:['italic'], 24:['underline'], 27:['inverse'], 29:['strikethrough']}
    grid = []
    for line in source.splitlines()[:rows]:
        cells = []
        for part in re.split(r'(\x1b\[[;\d]*m)', line):
            if not part.startswith('\x1b['):
                cells.extend((c, fg, bg, frozenset(attrs)) for c in columns(part))
                continue
            params = iter(int(n or '0') for n in part[2:-1].split(';'))
            for p in params:
                if p == 0:
                    fg = bg = None
                    attrs.clear()
                elif p in ons: attrs.add(ons[p])
                elif p in offs: attrs.difference_update(offs[p])
                elif p in (38, 48):
                    kind = next(params)
                    color = ('#%02x%02x%02x' % (next(params), next(params), next(params))) if kind == 2 else f'index:{next(params)}'
                    if p == 38: fg = color
                    else: bg = color
                elif p == 39: fg = None
                elif p == 49: bg = None
                elif 30 <= p <= 37 or 90 <= p <= 97: fg = f'sgr:{p}'
                elif 40 <= p <= 47 or 100 <= p <= 107: bg = f'sgr:{p}'
        grid.extend((cells + [(' ', fg, bg, frozenset(attrs))] * cols)[:cols])
    assert len(grid) == cols * rows
    return grid


def mcp_cells(frame):
    cols, rows = frame['cols'], frame['rows']
    cells = [(' ', None, None, frozenset())] * (cols * rows)
    for row in frame['styles']:
        for run in row['runs']:
            start = row['y'] * cols + run['x']
            chars = columns(run['text'])
            if len(chars) != run['width']:
                raise ValueError(f"Unsupported grapheme in run at {run['x']},{row['y']}")
            for i, c in enumerate(chars):
                cells[start+i] = (c, run['fg'], run['bg'], frozenset(run.get('attrs', [])))
    return cells


def measure(dest, state):
    frame = json.loads((dest/f'{state}-mcp.json').read_text())
    mcp = mcp_cells(frame)
    result = {}
    for name in ['real', 'textjs']:
        terminal = sgr_cells((dest/f'{state}-{name}.ansi').read_text(), frame['cols'], frame['rows'])
        counts = [0]*4
        for left, right in zip(terminal, mcp):
            for i in range(4):
                if i in (1, 3) and left[0] == right[0] == ' ': continue
                counts[i] += left[i] != right[i]
        result[name] = dict(zip(['glyph', 'fg', 'bg', 'attrs'], counts))
    return result
