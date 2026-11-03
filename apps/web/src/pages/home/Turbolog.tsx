import type { ReactNode } from "react";
import { rich } from "../../i18n/rich";
import { formatNumber, t } from "../../i18n/t";
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
      <span className="tl-g-skip">{t("0 calls · 0 B")}</span>
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
  { step: "React 19", title: t("Commit"), body: t("React commits through a custom reconciler."), glyph: <CommitGlyph /> },
  { step: "Yoga", title: t("Layout"), body: t("Yoga lays out boxes on whole cells."), glyph: <LayoutGlyph /> },
  { step: "CellBuffer", title: t("Paint"), body: t("Only damaged rows repaint."), glyph: <BufferGlyph /> },
  { step: t("Row hash"), title: t("Dirty gate"), body: t("Unchanged frames stop here."), glyph: <GateGlyph /> },
  { step: "RLE", title: t("Encode"), body: rich("{cells} cells become {spans} <c>%c</c> spans.", { c: (c) => <code>{c}</code> }, { cells: formatNumber(3200), spans: pipeline.spans }), glyph: <EncodeGlyph /> },
  { step: "console.log", title: t("Emit"), body: t("Frames are appended at least 66ms apart."), glyph: <EmitGlyph /> },
];

function Pipeline({ play }: { play: boolean }): ReactNode {
  return (
    <div className={`tl-pipe${play ? " play" : ""}`} dir="ltr">
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
          <i className="dot dirty" /> {t("Changed frame")}
        </span>
        <span>
          <i className="dot idle" /> {t("Unchanged frame, 0 calls")}
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
        <span>{t("{pct}% blank", { pct: blankPct.toFixed(1) })}</span>
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
        <h3>{t("Appended frames")}</h3>
        <p>{t("Clearing the console before each frame leaves it blank until DevTools paints the next one. Turbolog appends each frame instead.")}</p>
        <A href="/blog/turbolog-eliminating-the-flash" className="text-link">
          {t("Read the post")} <ArrowRight size={14} />
        </A>
      </div>
      <div className="tl-lanes" dir="ltr">
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
          <div className="section-mark">
            <TurbologLockup />
          </div>
          <h2>{rich("Every changed frame is one <c>console.log</c> call", { c: (c) => <code>{c}</code> })}</h2>
          <p>{t("A commit that changes no cells never reaches the console.")}</p>
        </div>
        <div className="frame tl-frame">
          <Crosses />
          <Pipeline play={inView} />
          <Throttle play={inView} />
          <div className="tl-metrics">
            <Metric value={pipeline.fullFrameMs} digits={3} unit="ms" label={t("Full repaint (layout, paint, encode)")} />
            <Metric value={pipeline.typingMs} digits={3} unit="ms" label={t("One-row edit, such as a keystroke")} />
            <Metric value={0} digits={0} unit={t(" calls")} label={t("Idle frame")} />
            <Metric value={pipeline.spans} digits={0} unit={t(" spans")} label={rich("<c>%c</c> arguments for 3,200 cells", { c: (c) => <code>{c}</code> })} />
          </div>
        </div>
        <div className="section-foot">
          <span className="subtle">
            {t("100×32 dashboard, mean of 1,000 frames")} · {history.machine}
          </span>
          <A href="/docs/turbolog-engine" className="text-link">
            {t("Turbolog engine docs")} <ArrowRight size={14} />
          </A>
        </div>
      </div>
    </section>
  );
}
