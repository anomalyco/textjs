import { useMemo, useState, type ReactNode } from "react";
import { COMPANION_COLS, COMPANION_ROWS, getCompanion } from "../console-companion/boot";
import { useSite } from "../console-companion/useSite";
import { OpenCodeLite } from "../demos/opencode/OpenCodeLite";
import { InlineSandbox } from "../sandbox/InlineSandbox";
import { A } from "../router";
import { devtoolsShortcut } from "../site/Chrome";
import { CopyCommand } from "../site/CodeBlock";
import { DevToolsWindow } from "../site/DevToolsWindow";
import { HighlightedCode } from "../site/highlight";
import { ArrowRight, Logo } from "../site/icons";
import { useCompanionFrame, useCompanionTelemetry, type Telemetry } from "../site/useCompanion";
import { HERO_FILES } from "./home-files";

function Crosses(): ReactNode {
  return (
    <>
      <span className="cross tl" />
      <span className="cross tr" />
      <span className="cross bl" />
      <span className="cross br" />
    </>
  );
}

export function LiveConsole({ source = "text://viewport:1" }: { source?: string }): ReactNode {
  const frame = useCompanionFrame();
  const site = useSite();
  return (
    <DevToolsWindow
      frame={frame}
      source={source}
      cols={COMPANION_COLS}
      rows={COMPANION_ROWS}
      engaged={site.consoleInput}
      engage
      onActivate={() => getCompanion()?.activate()}
      activateLabel="Click to type into this console"
    />
  );
}

function Hero(): ReactNode {
  const [file, setFile] = useState(0);
  const active = HERO_FILES[file] ?? HERO_FILES[0];
  return (
    <section className="hero">
      <div className="grid-bg" />
      <div className="container" style={{ position: "relative", paddingTop: 48, paddingBottom: 96 }}>
        <div className="frame" style={{ background: "rgba(0,0,0,0.4)" }}>
          <Crosses />
          <div className="hero-body">
            <A href="/docs/turbolog-engine" className="pill">
              <Logo size={11} /> Introducing Text.js 0.2 (Turbolog) — Zero-DOM React 19 Framework <ArrowRight size={12} />
            </A>
            <h1>The Console Framework for the Web</h1>
            <p className="lede">
              Used by some of the world's most questionable engineering teams, Text.js enables you to create full-stack interactive web applications rendered
              entirely inside <code>console.log</code>.
            </p>
            <div className="hero-ctas">
              <A href="/docs" className="btn btn-primary btn-lg">
                Get Started
              </A>
              <A href="/opencode" className="btn btn-secondary btn-lg">
                <Logo size={12} /> OpenCode in Console
              </A>
              <CopyCommand command="bunx create-text-app@latest" />
            </div>
          </div>
          <div className="split">
            <div className="split-code">
              <div className="file-tabs" role="tablist" aria-label="Example files">
                {HERO_FILES.map((f, i) => (
                  <button key={f.name} type="button" role="tab" aria-selected={i === file} onClick={() => setFile(i)}>
                    {f.name}
                  </button>
                ))}
              </div>
              {active ? <HighlightedCode code={active.code} language={active.language} lineNumbers highlight={active.highlight} /> : null}
            </div>
            <div className="split-console">
              <LiveConsole />
              <div className="callout-live">
                <span className="dot pulse" />
                <span>
                  <strong>Not a video.</strong> Press <kbd>{devtoolsShortcut()}</kbd> right now — this exact buffer is live in your real browser console.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bento(): ReactNode {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">▼ Features</div>
          <h2>What's in Text.js?</h2>
          <p>Everything you need to build great console products, and nothing you would need to build anything else.</p>
        </div>
        <div className="bento">
          <div className="bento-card">
            <h3>
              <Logo size={14} /> Inverted Architecture
            </h3>
            <p>Traditional frameworks render up into the DOM. Text.js streams cells down into the DevTools Console drawer, where your users were never expecting them.</p>
            <div className="viz tree">
              {"React 19 Fiber\n   ▼\nSceneNode graph\n   ▼\n"}
              <span className="hl">console.log()</span>
            </div>
          </div>
          <div className="bento-card">
            <h3>Turbolog %c RLE Engine</h3>
            <p>Full-frame layout, raster and run-length encoding in a single pass, with cross-newline span merging and interned CSS.</p>
            <div className="viz stat-row">
              <div className="stat">
                <b>0.18ms</b>
                <span>full frame</span>
              </div>
              <div className="stat">
                <b>1</b>
                <span>log / frame</span>
              </div>
              <div className="stat">
                <b>0</b>
                <span>noop logs idle</span>
              </div>
            </div>
          </div>
          <div className="bento-card">
            <h3>File-System App Router</h3>
            <p>Nested layouts, dynamic segments, loading and error boundaries, and route handlers — synced with window.history.</p>
            <div className="viz tree">
              {"app/\n├── layout.tsx\n├── page.tsx\n├── sessions/[id]/\n│   ├── "}
              <span className="hl">page.tsx</span>
              {"\n│   ├── loading.tsx\n│   └── error.tsx\n└── api/health/route.ts"}
            </div>
          </div>
          <div className="bento-card">
            <h3>Yoga WASM Flexbox</h3>
            <p>C++ Yoga 3.2 compiled to WebAssembly with integer cell snapping, scissor clipping and zIndex-dimmed modals.</p>
            <div className="viz tree diagram">
              {"┌────────┬────────────────────┐\n│ grow:0 │ grow:1             │\n│ w=12   │ "}
              <span className="hl">pointScaleFactor=1</span>
              {" │\n└────────┴────────────────────┘"}
            </div>
          </div>
          <div className="bento-card">
            <h3>100/100 Lighthouse by Default</h3>
            <p>No visible DOM, no stylesheet, no layout shift. Perfect scores are a structural property rather than an optimization.</p>
            <div className="viz stat-row">
              <div className="stat">
                <b>0</b>
                <span>visible DOM elements</span>
              </div>
              <div className="stat">
                <b>0.000</b>
                <span>CLS</span>
              </div>
              <div className="stat">
                <b>0 KB</b>
                <span>CSS</span>
              </div>
            </div>
          </div>
          <div className="bento-card">
            <h3>In-Console [▼] DevTools &amp; Redbox</h3>
            <p>A wireframe inspector and a compile error overlay, rendered inside console.log, inside DevTools. Press F2.</p>
            <div className="viz tree diagram">
              {"╭─ Unhandled Runtime Error ───╮\n│ "}
              <span style={{ color: "var(--red)" }}>TypeError: undefined</span>
              {"        │\n│ app/page.tsx (14:27)        │\n╰─────────────── esc dismiss ─╯\n[▼] "}
              <span className="hl">F2 inspector</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const STAGES = [
  { n: "01", title: "React 19 Fiber", body: "Concurrent reconciler commits host instances, not HTMLElements." },
  { n: "02", title: "SceneNode Graph", body: "tx-box / tx-text intrinsics with resolved style and text models." },
  { n: "03", title: "Yoga WASM", body: "Flexbox in integer cells. pointScaleFactor = 1." },
  { n: "04", title: "TypedArray CellBuffer", body: "Uint32 chars, fg, bg · Uint16 attrs. Allocated once." },
  { n: "05", title: "Row-Hash Dirty Gate", body: "Unchanged rows reuse cached spans. Clean frames return early." },
  { n: "06", title: "RLE %c Compiler", body: "Spans merge across \\n. CSS strings are interned." },
  { n: "07", title: "1× console.log()", body: "One clear, one log, one frame. Zero when idle." },
] as const;

function stageMetric(i: number, t: Telemetry | null): ReactNode {
  if (!t) return <em>booting…</em>;
  switch (i) {
    case 0:
      return (
        <>
          {t.frames} <em>commits</em>
        </>
      );
    case 1:
      return (
        <>
          {t.yogaNodes} <em>nodes</em>
        </>
      );
    case 2:
      return (
        <>
          {t.layoutMs.toFixed(2)}ms <em>layout</em>
        </>
      );
    case 3:
      return (
        <>
          {t.cols * t.rows} <em>cells</em>
        </>
      );
    case 4:
      return (
        <>
          {t.dirtyRows}/{t.rows} <em>dirty</em>
        </>
      );
    case 5:
      return (
        <>
          {t.spanCount} <em>%c spans</em>
        </>
      );
    default:
      return (
        <>
          #{t.frames} <em>· {t.gated} gated</em>
        </>
      );
  }
}

function Pipeline(): ReactNode {
  const t = useCompanionTelemetry(250);
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">▼ Architecture</div>
          <h2>How Turbolog works</h2>
          <p>Seven stages from setState to DevTools. The numbers below are not illustrative; they are streaming from the renderer running in your console right now.</p>
        </div>
        <div className="pipeline">
          {STAGES.map((s, i) => (
            <div key={s.n} className={`stage${i === STAGES.length - 1 ? " final" : ""}`}>
              <span className="n">{s.n}</span>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
              <span className="metric">{stageMetric(i, t)}</span>
              {i < STAGES.length - 1 ? <span className="arrow">▸</span> : null}
            </div>
          ))}
        </div>
        <div className="telemetry">
          <div>
            <b>{t ? `${t.totalMs.toFixed(2)}ms` : "—"}</b>
            <span>last frame (layout + raster + RLE)</span>
          </div>
          <div>
            <b>{t ? t.spanCount : "—"}</b>
            <span>%c arguments / frame</span>
          </div>
          <div>
            <b>{t ? t.frames : "—"}</b>
            <span>console.log calls</span>
          </div>
          <div>
            <b>{t ? t.gated : "—"}</b>
            <span>idle frames gated</span>
          </div>
          <div>
            <b>{t ? `${t.cols}×${t.rows}` : "—"}</b>
            <span>cell grid</span>
          </div>
          <div>
            <b>0</b>
            <span>noop logs</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const ROWS: Array<[string, string, string]> = [
  ["Render Target", "document.body", "console.log()"],
  ["DOM Nodes Hydrated", "1,000 – 10,000+", "0"],
  ["CSS Cascade Specificity Bugs", "Ongoing", "Not applicable (no cascade)"],
  ["Cumulative Layout Shift", "Measured, optimized, regressed", "0.000 (integer cells)"],
  ["Layout Engine", "Browser (opaque)", "Yoga 3.2 WASM (yours)"],
  ["Frame Delivery", "Paint, composite, raster", "1 × console.log per dirty frame"],
  ["Idle Cost", "Event loop, observers, paint", "0 calls (row-hash gated)"],
  ["DevTools Inspectability", "Elements panel", "It is the DevTools"],
  ["Lighthouse Score", "Varies", "100 / 100 / 100 / 100"],
];

function Comparison(): ReactNode {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">▼ Comparison</div>
          <h2>A different render target.</h2>
          <p>DOM frameworks have spent a decade optimizing the document. Text.js removed it.</p>
        </div>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th />
                <th>DOM Frameworks (Next.js)</th>
                <th className="us">▼ Console Framework (Text.js)</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([k, a, b]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="them">{a}</td>
                  <td className="us">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function OpenCodeSpotlight(): ReactNode {
  const app = useMemo(() => <OpenCodeLite />, []);
  return (
    <section className="section">
      <div className="container spotlight">
        <div>
          <div className="eyebrow">▼ Showcase</div>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 44px)" }}>OpenCode, in console.log.</h2>
          <p className="muted" style={{ fontSize: 17, margin: 0 }}>
            A faithful OpenCode Lite TUI built entirely with Text.js components — sessions, streaming Markdown, read / edit / shell tool cards, a command palette and a
            multi-line prompt. Running beside this paragraph, and in your console.
          </p>
          <ul>
            <li>Streaming &lt;Markdown&gt;, &lt;Code&gt; and &lt;Diff&gt; tool cards</li>
            <li>Ctrl+P command palette in a focus-trapped &lt;Modal&gt;</li>
            <li>Tab between build and plan agents</li>
            <li>Connect to your local opencode server over HTTP + SSE</li>
          </ul>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <A href="/opencode" className="btn btn-primary">
              Open OpenCode Showcase
            </A>
            <A href="/docs/opencode" className="btn btn-secondary">
              How it's built
            </A>
          </div>
        </div>
        <InlineSandbox app={app} cols={100} rows={30} theme="opencodeDark" source="opencode://lite:1" filter="opencode" />
      </div>
    </section>
  );
}

function FinalCta(): ReactNode {
  return (
    <section className="section" style={{ padding: 0 }}>
      <div className="container">
        <div className="frame" style={{ margin: "96px 0" }}>
          <Crosses />
          <div className="cta">
            <Logo size={28} />
            <h2>Render down.</h2>
            <p className="muted" style={{ margin: 0, fontSize: 18, maxWidth: 560 }}>
              Start building with Text.js today. Your users already have the runtime installed. It's under View → Developer.
            </p>
            <div className="hero-ctas">
              <A href="/docs/installation" className="btn btn-primary btn-lg">
                Start Building
              </A>
              <CopyCommand command="bunx create-text-app@latest" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage(): ReactNode {
  return (
    <>
      <Hero />
      <Bento />
      <Pipeline />
      <Comparison />
      <OpenCodeSpotlight />
      <FinalCta />
    </>
  );
}
