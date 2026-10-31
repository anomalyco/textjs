import type { ReactNode } from "react";
import { A } from "../../router";
import { ArrowRight } from "../../site/icons";
import { useInView } from "../../site/useInView";
import history from "../status-history.json";
import { Crosses } from "./Crosses";
import { useCountUp } from "./motion";

const pipeline = history.pipeline.runs[history.pipeline.runs.length - 1]!;
const devtools = (strategy: string, fps: number) => history.devtools.runs.find((r) => r.strategy === strategy && r.fps === fps)!;
const clear15 = devtools("clear", 15);
const append15 = devtools("append", 15);

/* ───────────── Stage glyphs: tiny, static drawings of each step ───────────── */

function CommitGlyph(): ReactNode {
  return (
    <pre className="tl-g-code" aria-hidden="true">
      <span className="k">{"<Box>"}</span>
      {"\n ├ "}
      <span className="k">{"<Text>"}</span>
      {"\n └ "}
      <span className="k">{"<Text>"}</span>
      <span className="tl-g-dirty">{" 1"}</span>
    </pre>
  );
}

function LayoutGlyph(): ReactNode {
  return (
    <div className="tl-g-yoga" aria-hidden="true">
      <span className="a" />
      <span className="b" />
      <span className="c" />
    </div>
  );
}

function BufferGlyph(): ReactNode {
  return (
    <div className="tl-g-cells" aria-hidden="true">
      <span className="row" />
    </div>
  );
}

const HASHES = ["9f1c08e2", "a07e5b31", "31b2c4d9", "e8d046fa"];

function GateGlyph(): ReactNode {
  return (
    <div className="tl-g-hash" aria-hidden="true">
      {HASHES.map((h, i) => (
        <span key={h} className={i === 2 ? "dirty" : undefined}>
          {h}
        </span>
      ))}
      <span className="tl-g-skip">0 calls · 0 B</span>
    </div>
  );
}

const SPANS = [
  [5, 9, 4, 6],
  [3, 12, 9],
  [8, 4, 4, 8],
];

function EncodeGlyph(): ReactNode {
  return (
    <div className="tl-g-rle" aria-hidden="true">
      {SPANS.map((row, i) => (
        <div key={i}>
          {row.map((w, j) => (
            <span key={j} style={{ flexGrow: w }} className={i === 1 && j === 1 ? "hot" : undefined} />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmitGlyph(): ReactNode {
  const frame = (key: number): ReactNode => (
    <div key={key} className="f">
      <span className="curtain" />
      <span style={{ width: "70%" }} />
      <span style={{ width: "46%" }} />
      <span style={{ width: "58%" }} />
    </div>
  );
  return (
    <div className="tl-g-console" aria-hidden="true">
      <div className="tl-g-stack">{[0, 1, 2].map(frame)}</div>
    </div>
  );
}

const STAGES: Array<{ step: string; title: ReactNode; body: ReactNode; glyph: ReactNode }> = [
  { step: "React 19", title: "Commit", body: <>A custom reconciler commits <code>tx-box</code> and <code>tx-text</code> nodes.</>, glyph: <CommitGlyph /> },
  { step: "Yoga", title: "Layout", body: <>WebAssembly flexbox, snapped to integer cells.</>, glyph: <LayoutGlyph /> },
  { step: "CellBuffer", title: "Paint", body: <>Typed arrays for glyphs, colors and attributes. Only damaged rows repaint.</>, glyph: <BufferGlyph /> },
  { step: "Row hash", title: "Dirty gate", body: <>One FNV-1a hash per row. An unchanged frame returns before it allocates.</>, glyph: <GateGlyph /> },
  { step: "RLE", title: "Encode", body: <>Matching cells merge into one <code>%c</code> span. {(3200).toLocaleString("en-US")} cells, {pipeline.spans} spans.</>, glyph: <EncodeGlyph /> },
  { step: "console.log", title: "Emit", body: <>One appended call, at least 66ms after the last.</>, glyph: <EmitGlyph /> },
];

function Pipeline({ play }: { play: boolean }): ReactNode {
  return (
    <div className={`tl-pipe${play ? " play" : ""}`}>
      <div className="tl-stages-wrap">
      <div className="tl-track" aria-hidden="true">
        <span className="tl-progress dirty" />
        <span className="tl-progress idle" />
        <span className="tl-packet dirty">
          <i />
        </span>
        <span className="tl-packet idle">
          <i />
        </span>
      </div>
      <ol className="tl-stages">
        {STAGES.map((s, i) => (
          <li key={s.step} className="tl-stage" style={{ ["--i" as string]: i }}>
            <div className="tl-node">
              <span className="tl-node-label">{s.step}</span>
              {s.glyph}
              <span className="tl-ring" aria-hidden="true" />
            </div>
            <div className="tl-copy">
              <h3>
                <span className="tl-num">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      </div>
      <div className="tl-legend">
        <span>
          <i className="dot dirty" /> Dirty frame: one <code>console.log</code>
        </span>
        <span>
          <i className="dot idle" /> Idle frame: stops at the gate, zero calls, zero bytes
        </span>
      </div>
    </div>
  );
}

/* ───────────── Append vs. clear: what DevTools actually paints ───────────── */

const LANE_FRAMES = 5;

function Lane({ kind, label, note }: { kind: "clear" | "append"; label: ReactNode; note: string }): ReactNode {
  return (
    <div className={`tl-lane ${kind}`}>
      <div className="tl-lane-head">
        <code>{label}</code>
        <span>{note}</span>
      </div>
      <div className="tl-lane-row">
        <div className="tl-bar">
          {Array.from({ length: LANE_FRAMES }, (_, i) => (
            <span key={i} className="seg">
              {kind === "clear" ? <span className="blank" /> : null}
              <span className="paint" />
            </span>
          ))}
          {kind === "clear" ? (
            <span className="tl-dim" aria-hidden="true">
              <span>50ms</span>
            </span>
          ) : null}
        </div>
        <div className="tl-screen" aria-hidden="true">
          <span style={{ width: "72%" }} />
          <span style={{ width: "48%" }} />
          <span style={{ width: "60%" }} />
          <span style={{ width: "36%" }} />
          <span className="tl-screen-blank" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, before, after, digits, unit = "", total }: { label: string; before: number; after: number; digits: number; unit?: string; total?: number }): ReactNode {
  const [ref, n] = useCountUp(after);
  const fmt = (v: number): string => `${v.toFixed(digits)}${total ? ` / ${total}` : unit}`;
  return (
    <div className="tl-stat">
      <span className="tl-stat-label">{label}</span>
      <span className="tl-stat-values">
        <s>{fmt(before)}</s>
        <ArrowRight size={12} />
        <strong ref={ref} aria-label={fmt(after)}>
          {fmt(n)}
        </strong>
      </span>
    </div>
  );
}

function Throttle({ play }: { play: boolean }): ReactNode {
  return (
    <div className={`tl-throttle${play ? " play" : ""}`}>
      <div className="tl-throttle-copy">
        <h3>Append, don’t clear.</h3>
        <p>
          DevTools applies <code>console.clear()</code> at once but paints new messages on a 50ms throttle. Clearing before every frame left the console blank in {clear15.blankPct}% of
          paints. Turbolog appends each frame below a zero-width curtain, so the swap happens inside one paint.
        </p>
        <div className="tl-stats">
          <Stat label="Blank paints" before={clear15.blankPct} after={append15.blankPct} digits={1} unit="%" />
          <Stat label="Frames painted" before={clear15.painted} after={append15.painted} digits={0} total={append15.emitted} />
          <Stat label="Display lag p50" before={clear15.lagP50Ms} after={append15.lagP50Ms} digits={1} unit="ms" />
        </div>
      </div>
      <div className="tl-lanes">
        <div className="tl-lane-row tl-axis-row" aria-hidden="true">
          <div className="tl-axis">
            {Array.from({ length: LANE_FRAMES + 1 }, (_, i) => (
              <span key={i}>{i * 66}ms</span>
            ))}
          </div>
          <span className="tl-screen-label">Visible</span>
        </div>
        <Lane kind="clear" label="clear() + log()" note="≤ 0.3" />
        <Lane kind="append" label="log(), appended" note="1.0" />
        <span className="tl-playhead" aria-hidden="true">
          <i />
        </span>
        <p className="tl-lanes-foot">
          15fps, 100×32 dashboard, real DevTools frontend. <A href="/blog/turbolog-eliminating-the-flash">Read the post</A>
        </p>
      </div>
    </div>
  );
}

/* ───────────── Pipeline numbers ───────────── */

function Metric({ value, digits, unit, label }: { value: number; digits: number; unit: string; label: ReactNode }): ReactNode {
  const [ref, n] = useCountUp(value);
  return (
    <div className="tl-metric">
      <strong>
        <span ref={ref} aria-label={`${value.toFixed(digits)}${unit}`}>
          {n.toFixed(digits)}
        </span>
        <small>{unit}</small>
      </strong>
      <span>{label}</span>
    </div>
  );
}

export function TurbologSection(): ReactNode {
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  return (
    <section className="section home-section" id="turbolog">
      <div className="container" ref={ref}>
        <div className="section-head">
          <p className="eyebrow">Turbolog</p>
          <h2>
            One <code>console.log</code> per frame. None when idle.
          </h2>
          <p>Every React commit runs through six stages and ends in a single appended call, or in no call at all.</p>
        </div>
        <div className="frame tl-frame">
          <Crosses />
          <Pipeline play={inView} />
          <Throttle play={inView} />
          <div className="tl-metrics">
            <Metric value={pipeline.fullFrameMs} digits={3} unit="ms" label="Full repaint: layout, paint and encode" />
            <Metric value={pipeline.typingMs} digits={3} unit="ms" label="One-row edit, like a keystroke" />
            <Metric value={0} digits={0} unit=" calls" label="When nothing changed, and 0 bytes allocated" />
            <Metric value={pipeline.spans} digits={0} unit=" spans" label={<><code>%c</code> arguments for 3,200 cells</>} />
          </div>
        </div>
        <div className="section-foot">
          <span className="subtle">
            100×32 dashboard, mean of 1,000 frames · {history.machine}
          </span>
          <A href="/docs/turbolog-engine" className="text-link">
            Turbolog engine docs <ArrowRight size={14} />
          </A>
        </div>
      </div>
    </section>
  );
}
