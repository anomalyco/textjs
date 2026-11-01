import { useMemo, useState, type ReactNode } from "react";
import type { DevToolsFrameRecord, DevToolsRootInfo } from "../protocol";
import { ms, percentile } from "./format";
import type { PanelState, PanelStore } from "./store";

const VISIBLE = 160;
const PHASES = [
  ["reactMs", "React", "var(--c-react)"],
  ["layoutMs", "Layout", "var(--c-layout)"],
  ["paintMs", "Paint", "var(--c-paint)"],
  ["encodeMs", "Encode", "var(--c-encode)"],
] as const;
/** Default `minFrameInterval`: DevTools drops messages that arrive faster than its 50ms repaint throttle. */
const PACE_MS = 66;

function niceMax(v: number): number {
  const steps = [0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  return steps.find((s) => s >= v) ?? Math.ceil(v);
}

export function Timeline({ store, state, root }: { store: PanelStore; state: PanelState; root: DevToolsRootInfo }): ReactNode {
  const records = state.records;
  const visible = records.slice(-VISIBLE);
  const [hover, setHover] = useState<number | null>(null);
  const stats = useMemo(() => {
    const emitted = records.filter((r) => !r.skipped);
    const totals = emitted.map((r) => r.totalMs);
    const intervals = emitted.map((r) => r.interval).filter((v) => v > 0);
    return {
      emitted: emitted.length,
      skipped: records.length - emitted.length,
      avg: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0,
      p95: percentile(totals, 0.95),
      pace: percentile(intervals, 0.5),
      spans: emitted.length ? Math.round(emitted.reduce((a, r) => a + r.spanCount, 0) / emitted.length) : 0,
    };
  }, [records]);
  const hovered = hover !== null ? visible[hover] : visible.at(-1);

  return (
    <div className="timeline">
      <div className="pane-head">
        <button className={`btn ghost small rec${state.recording ? " on" : ""}`} onClick={() => store.set({ recording: !state.recording })}>
          <span className="rec-dot" />
          {state.recording ? "Recording" : "Stopped"}
        </button>
        <button className="btn ghost small" onClick={() => store.clearRecords()}>
          Clear
        </button>
        <div className="spacer" />
        <div className="legend">
          {PHASES.map(([, label, color]) => (
            <span key={label}>
              <i style={{ background: color }} />
              {label}
            </span>
          ))}
          <span>
            <i className="skipped-key" />
            Skipped
          </span>
        </div>
      </div>
      <div className="tiles">
        <Tile label="Emitted" value={String(stats.emitted)} />
        <Tile label="Skipped" value={String(stats.skipped)} hint="no cells changed · nothing logged" />
        <Tile label="FPS" value={String(root.fps)} />
        <Tile label="Avg frame" value={ms(stats.avg)} />
        <Tile label="p95 frame" value={ms(stats.p95)} />
        <Tile label="Median pacing" value={stats.pace ? ms(stats.pace, 0) : "—"} hint={`target ≥ ${PACE_MS}ms`} />
        <Tile label="Avg spans" value={String(stats.spans)} hint="%c spans per frame" />
      </div>
      {visible.length === 0 ? (
        <div className="empty small-empty">
          <p className="empty-title">No frames recorded yet</p>
          <p className="empty-body">Click the page and press a key to record frames. Idle apps emit nothing.</p>
        </div>
      ) : (
        <>
          <Readout record={hovered} />
          <Chart title="Frame cost" records={visible} hover={hover} setHover={setHover} kind="cost" />
          <Chart title="Pacing" records={visible} hover={hover} setHover={setHover} kind="pace" />
          <Chart title="Spans" records={visible} hover={hover} setHover={setHover} kind="spans" />
        </>
      )}
      <p className="footnote">
        Times stop at <code>console.log()</code>. Formatting and painting the message happen inside DevTools and can't be observed from the page, so they are not
        shown. React is the synchronous work flushed at the start of a frame; concurrent renders between frames are counted as commits only.
      </p>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }): ReactNode {
  return (
    <div className="tile" title={hint}>
      <div className="tile-label">{label}</div>
      <div className="tile-value mono">{value}</div>
    </div>
  );
}

function Readout({ record: r }: { record: DevToolsFrameRecord | undefined }): ReactNode {
  if (!r) return null;
  return (
    <div className="readout mono">
      <span className="strong">{r.skipped ? `skipped (after #${r.frame})` : `#${r.frame}`}</span>
      <span>{`${r.commits} commit${r.commits === 1 ? "" : "s"}`}</span>
      {PHASES.map(([k, label, color]) => (
        <span key={k}>
          <i style={{ background: color }} />
          {`${label.toLowerCase()} ${r[k].toFixed(2)}`}
        </span>
      ))}
      <span className="strong">{`total ${ms(r.totalMs)}`}</span>
      {!r.skipped ? <span>{`${r.spanCount} spans · ${r.dirtyRows} dirty rows`}</span> : null}
      {r.interval > 0 ? <span>{`+${r.interval.toFixed(1)}ms`}</span> : null}
    </div>
  );
}

function Chart({
  title,
  records,
  hover,
  setHover,
  kind,
}: {
  title: string;
  records: DevToolsFrameRecord[];
  hover: number | null;
  setHover: (i: number | null) => void;
  kind: "cost" | "pace" | "spans";
}): ReactNode {
  const H = kind === "cost" ? 120 : 56;
  const W = VISIBLE;
  const value = (r: DevToolsFrameRecord): number => (kind === "cost" ? r.totalMs : kind === "pace" ? r.interval : r.skipped ? 0 : r.spanCount);
  const peak = Math.max(...records.map(value), kind === "pace" ? PACE_MS * 1.5 : 0);
  const max = kind === "spans" ? Math.max(1, Math.ceil(peak / 100) * 100) : niceMax(peak || 1);
  const y = (v: number): number => H - (v / max) * (H - 4);
  const offset = W - records.length;
  return (
    <div className="chart">
      <div className="chart-head">
        <h3>{title}</h3>
        <span className="muted small mono">{kind === "spans" ? `${max}` : `${max}ms`}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart-svg" style={{ height: H }} onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} className="gridline" />
        ))}
        {kind === "pace" ? <line x1={0} x2={W} y1={y(PACE_MS)} y2={y(PACE_MS)} className="target" /> : null}
        {records.map((r, i) => {
          const x = offset + i;
          const dim = r.skipped ? 0.35 : 1;
          const active = hover === i;
          let bars: ReactNode;
          if (kind === "cost") {
            let acc = 0;
            bars = PHASES.map(([k, , color]) => {
              const v = r[k];
              const top = y(acc + v);
              const h = y(acc) - top;
              acc += v;
              return h > 0 ? <rect key={k} x={x + 0.12} width={0.76} y={top} height={h} fill={color} opacity={dim} /> : null;
            });
          } else {
            const v = value(r);
            bars = v > 0 ? <rect x={x + 0.12} width={0.76} y={y(v)} height={H - y(v)} className={kind === "pace" && v < PACE_MS - 1 ? "bar warn" : "bar"} /> : null;
          }
          return (
            <g key={`${r.t}-${i}`} onMouseEnter={() => setHover(i)}>
              <rect x={x} width={1} y={0} height={H} className={active ? "hit active" : "hit"} />
              {bars}
            </g>
          );
        })}
      </svg>
      {kind === "pace" ? <div className="chart-note muted small">{`Dashed line: ${PACE_MS}ms minimum interval. Faster frames restart DevTools' 50ms repaint throttle.`}</div> : null}
    </div>
  );
}
