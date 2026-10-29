import { memo, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { DevToolsFrameSnapshot } from "../protocol";
import { attrList, cssColor, hex } from "./format";
import { RefreshIcon } from "./icons";
import type { PanelState, PanelStore } from "./store";

const LINE = 14;
const DEFAULT_FG = 0xd4d4d8ff;

interface Run {
  x: number;
  len: number;
  text: string;
  style: CSSProperties;
}

function runStyle(fg: number, bg: number, attrs: number): CSSProperties {
  const inverse = (attrs & 32) !== 0;
  const f = cssColor(fg) ?? hex(DEFAULT_FG);
  const b = cssColor(bg);
  const style: CSSProperties = { color: inverse ? (b ?? "#0a0a0a") : f };
  const background = inverse ? f : b;
  if (background) style.background = background;
  if (attrs & 1) style.fontWeight = 700;
  if (attrs & 2) style.opacity = 0.6;
  if (attrs & 4) style.fontStyle = "italic";
  if (attrs & 8 || attrs & 16) style.textDecoration = [attrs & 8 ? "underline" : "", attrs & 16 ? "line-through" : ""].join(" ").trim();
  return style;
}

function rowRuns(f: DevToolsFrameSnapshot, y: number): Run[] {
  const runs: Run[] = [];
  const base = y * f.cols;
  let x = 0;
  while (x < f.cols) {
    const i = base + x;
    const fg = f.fg[i]!;
    const bg = f.bg[i]!;
    const at = f.attrs[i]! & 0x3f;
    let text = "";
    let len = 0;
    // Wide graphemes get their own run so every run maps 1:1 onto cells.
    if (x + 1 < f.cols && f.chars[i + 1] === "") {
      runs.push({ x, len: 2, text: f.chars[i] || " ", style: runStyle(fg, bg, at) });
      x += 2;
      continue;
    }
    while (x + len < f.cols) {
      const j = base + x + len;
      if (f.fg[j] !== fg || f.bg[j] !== bg || (f.attrs[j]! & 0x3f) !== at) break;
      if (x + len + 1 < f.cols && f.chars[j + 1] === "") break;
      text += f.chars[j] || " ";
      len++;
    }
    runs.push({ x, len, text, style: runStyle(fg, bg, at) });
    x += len;
  }
  return runs;
}

const Grid = memo(function Grid({ frame, cw, measure }: { frame: DevToolsFrameSnapshot; cw: number; measure: (el: HTMLSpanElement | null) => void }): ReactNode {
  const rows = useMemo(() => Array.from({ length: frame.rows }, (_, y) => rowRuns(frame, y)), [frame]);
  return (
    <div className="grid-rows" style={{ width: frame.cols * cw, height: frame.rows * LINE }}>
      <span ref={measure} aria-hidden="true" style={{ position: "absolute", visibility: "hidden", left: 0, top: 0 }}>
        {"M".repeat(MEASURE_CHARS)}
      </span>
      {rows.map((runs, y) => (
        <div key={y} className="grid-row" style={{ top: y * LINE }}>
          {runs.map((r) => (
            <span key={r.x} style={{ ...r.style, left: r.x * cw, width: r.len * cw }}>
              {r.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
});

const MEASURE_CHARS = 100;

/**
 * Cell width measured from a hidden run inside `.grid-rows`, so it uses exactly
 * the font the grid renders with (a canvas can resolve a different fallback font).
 */
function useCellWidth(): [number, (el: HTMLSpanElement | null) => void] {
  const [cw, setCw] = useState(7.2);
  const [el, setEl] = useState<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const w = el.getBoundingClientRect().width / MEASURE_CHARS;
    if (w > 0) setCw(w);
  }, [el]);
  return [cw, setEl];
}

export function FrameView({ store, state }: { store: PanelStore; state: PanelState }): ReactNode {
  const frame = state.frame;
  const [cw, measure] = useCellWidth();
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  if (!frame) return <p className="muted pad">Loading frame…</p>;

  const cellAt = (e: React.MouseEvent): { x: number; y: number } | null => {
    const r = gridRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.floor((e.clientX - r.left) / cw);
    const y = Math.floor((e.clientY - r.top) / LINE);
    return x >= 0 && y >= 0 && x < frame.cols && y < frame.rows ? { x, y } : null;
  };

  const hoverIndex = hover ? hover.y * frame.cols + hover.x : -1;
  const hoverOwner = hoverIndex >= 0 ? frame.owners[frame.owner[hoverIndex]!] : undefined;
  const selectedScene = store.sceneFor(state.selected);
  const selectedOwner = selectedScene !== null ? frame.owners[selectedScene] : undefined;
  const selectedRect = selectedOwner?.rect ?? (state.tree?.nodes.find((n) => n.scene?.id === selectedScene)?.scene?.screen ?? null);

  const outline = (rect: { x: number; y: number; width: number; height: number }, cls: string): ReactNode => (
    <div className={`cell-outline ${cls}`} style={{ left: rect.x * cw, top: rect.y * LINE, width: rect.width * cw, height: rect.height * LINE }} />
  );

  return (
    <div className="split frame-split">
      <section className="pane frame-pane">
        <div className="pane-head">
          <span className="muted small mono">{`frame #${frame.frame} · ${frame.cols} × ${frame.rows}`}</span>
          <div className="spacer" />
          <label className="check">
            <input type="checkbox" checked={state.liveFrame} onChange={(e) => store.set({ liveFrame: e.target.checked })} />
            Live
          </label>
          <button className="icon-btn" title="Refresh frame" aria-label="Refresh frame" onClick={() => store.fetchFrame()}>
            <RefreshIcon />
          </button>
        </div>
        <div className="frame-scroll">
          <div
            className="frame-grid"
            ref={gridRef}
            onMouseMove={(e) => {
              const c = cellAt(e);
              if (c?.x === hover?.x && c?.y === hover?.y) return;
              setHover(c);
              const sid = c ? frame.owner[c.y * frame.cols + c.x]! : 0;
              store.highlight(sid || null);
            }}
            onMouseLeave={() => {
              setHover(null);
              store.unhover();
            }}
            onClick={(e) => {
              const c = cellAt(e);
              if (!c) return;
              const sid = frame.owner[c.y * frame.cols + c.x]!;
              const id = sid ? store.nodeForScene(sid) : null;
              if (id !== null) store.select(id);
            }}
          >
            <Grid frame={frame} cw={cw} measure={measure} />
            {selectedRect ? outline(selectedRect, "selected") : null}
            {hoverOwner ? outline(hoverOwner.rect, "hover") : null}
            {hover ? outline({ x: hover.x, y: hover.y, width: 1, height: 1 }, "cell") : null}
          </div>
        </div>
      </section>
      <section className="pane inspector">
        <div className="inspector-body">
          {hover ? <CellInfo frame={frame} x={hover.x} y={hover.y} store={store} /> : <p className="muted small">Hover a cell to see which component painted it. Click to select it; the node is highlighted in the console.</p>}
          {selectedOwner && !hover ? (
            <div className="section">
              <div className="section-head">
                <h3>Selected</h3>
              </div>
              <OwnerInfo owner={selectedOwner} store={store} />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function CellInfo({ frame, x, y, store }: { frame: DevToolsFrameSnapshot; x: number; y: number; store: PanelStore }): ReactNode {
  const i = y * frame.cols + x;
  const owner = frame.owners[frame.owner[i]!];
  const ch = frame.chars[i] ?? "";
  const attrs = attrList(frame.attrs[i]!);
  return (
    <>
      <div className="section">
        <div className="section-head">
          <h3>Cell</h3>
          <span className="muted small mono">{`${x}, ${y}`}</span>
        </div>
        <dl className="kv compact">
          <div className="kv-row">
            <dt>char</dt>
            <dd className="mono">{ch === "" ? "(wide continuation)" : ch === " " ? "space" : `${JSON.stringify(ch)} U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`}</dd>
          </div>
          <div className="kv-row">
            <dt>fg</dt>
            <dd className="mono">
              <Swatch packed={frame.fg[i]!} />
            </dd>
          </div>
          <div className="kv-row">
            <dt>bg</dt>
            <dd className="mono">
              <Swatch packed={frame.bg[i]!} />
            </dd>
          </div>
          <div className="kv-row">
            <dt>attrs</dt>
            <dd className="mono">{attrs.length > 0 ? attrs.join(" ") : "none"}</dd>
          </div>
        </dl>
      </div>
      <div className="section">
        <div className="section-head">
          <h3>Painted by</h3>
        </div>
        {owner ? <OwnerInfo owner={owner} store={store} /> : <p className="muted small">Root background</p>}
      </div>
    </>
  );
}

function OwnerInfo({ owner, store }: { owner: DevToolsFrameSnapshot["owners"][number]; store: PanelStore }): ReactNode {
  return (
    <>
      <dl className="kv compact">
        <div className="kv-row">
          <dt>node</dt>
          <dd className="mono">{`#${owner.scene} ${owner.type === "box" ? "tx-box" : "tx-text"}${owner.label && !owner.label.startsWith("tx-") ? ` · ${owner.label}` : ""}`}</dd>
        </div>
        <div className="kv-row">
          <dt>rect</dt>
          <dd className="mono">{`${owner.rect.x}, ${owner.rect.y} · ${owner.rect.width} × ${owner.rect.height}`}</dd>
        </div>
      </dl>
      {owner.components.length > 0 ? (
        <ol className="chain">
          {owner.components.map((c, i) => (
            <li key={`${c}-${i}`}>{c}</li>
          ))}
        </ol>
      ) : null}
      {owner.fiber !== null ? (
        <button
          className="btn ghost small"
          onClick={() => {
            store.select(owner.fiber);
            store.setTab("components");
          }}
        >
          Show in Components
        </button>
      ) : null}
    </>
  );
}

function Swatch({ packed }: { packed: number }): ReactNode {
  const c = cssColor(packed);
  return (
    <span className="swatch-row">
      <span className="swatch" style={{ background: c ?? "transparent" }} />
      {c ?? "default"}
    </span>
  );
}
