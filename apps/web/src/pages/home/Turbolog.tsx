import type { ReactNode } from "react";
import { A } from "../../router";
import { TurbologLockup } from "../../site/brand-marks";
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
  { step: "React 19", title: "Commit", body: <>React commits through a custom reconciler.</>, glyph: <CommitGlyph /> },
  { step: "Yoga", title: "Layout", body: <>Yoga lays out boxes on whole cells.</>, glyph: <LayoutGlyph /> },
  { step: "CellBuffer", title: "Paint", body: <>Only damaged rows repaint.</>, glyph: <BufferGlyph /> },
  { step: "Row hash", title: "Dirty gate", body: <>Unchanged frames stop here.</>, glyph: <GateGlyph /> },
  { step: "RLE", title: "Encode", body: <>{(3200).toLocaleString("en-US")} cells become {pipeline.spans} <code>%c</code> spans.</>, glyph: <EncodeGlyph /> },
  { step: "console.log", title: "Emit", body: <>Frames are appended at least 66ms apart.</>, glyph: <EmitGlyph /> },
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
          <i className="dot dirty" /> Changed frame
        </span>
        <span>
          <i className="dot idle" /> Unchanged frame, 0 calls
        </span>
      </div>
    </div>
  );
}

/* ───────────── Append vs. clear: what DevTools actually paints ───────────── */

const LANE_FRAMES = 5;

function Lane({ kind, label, blankPct }: { kind: "clear" | "append"; label: string; blankPct: number }): ReactNode {
  return (
    <div className={`tl-lane ${kind}`}>
      <div className="tl-lane-head">
        <code>{label}</code>
        <span>{`${blankPct.toFixed(1)}% blank`}</span>
      </div>
      <div className="tl-bar" aria-hidden="true">
        {Array.from({ length: LANE_FRAMES }, (_, i) => (
          <span key={i} className="seg">
            {kind === "clear" ? <span className="blank" /> : null}
            <span className="paint" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Throttle({ play }: { play: boolean }): ReactNode {
  return (
    <div className={`tl-throttle${play ? " play" : ""}`}>
      <div className="tl-throttle-copy">
        <h3>Appended frames</h3>
        <p>Clearing the console before each frame leaves it blank until DevTools paints the next one. Turbolog appends each frame instead.</p>
        <A href="/blog/turbolog-eliminating-the-flash" className="text-link">
          Read the post <ArrowRight size={14} />
        </A>
      </div>
      <div className="tl-lanes">
        <Lane kind="clear" label="clear() + log()" blankPct={clear15.blankPct} />
        <Lane kind="append" label="log(), appended" blankPct={append15.blankPct} />
        <span className="tl-playhead" aria-hidden="true">
          <i />
        </span>
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
          <p className="eyebrow tl-eyebrow">
            <TurbologLockup />
          </p>
          <h2>
            Every changed frame is one <code>console.log</code> call
          </h2>
          <p>A commit that changes no cells never reaches the console.</p>
        </div>
        <div className="frame tl-frame">
          <Crosses />
          <Pipeline play={inView} />
          <Throttle play={inView} />
          <div className="tl-metrics">
            <Metric value={pipeline.fullFrameMs} digits={3} unit="ms" label="Full repaint (layout, paint, encode)" />
            <Metric value={pipeline.typingMs} digits={3} unit="ms" label="One-row edit, such as a keystroke" />
            <Metric value={0} digits={0} unit=" calls" label="Idle frame" />
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
