import { useState, type ReactNode } from "react";
import { COMPANION_COLS, COMPANION_ROWS, getCompanion } from "../console-companion/boot";
import { useSite } from "../console-companion/useSite";
import { A } from "../router";
import { DevtoolsShortcut } from "../site/Chrome";
import { CopyCommand } from "../site/CodeBlock";
import { DevToolsWindow } from "../site/DevToolsWindow";
import { HighlightedCode } from "../site/highlight";
import { ArrowRight } from "../site/icons";
import { useCompanionFrame } from "../site/useCompanion";
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

function LiveConsole({ source = "text://viewport:1" }: { source?: string }): ReactNode {
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
    />
  );
}

function Hero(): ReactNode {
  const [file, setFile] = useState(0);
  const active = HERO_FILES[file] ?? HERO_FILES[0];
  return (
    <section className="hero">
      <div className="grid-bg" />
      <div className="container hero-wrap">
        <div className="frame" style={{ background: "rgba(0,0,0,0.4)" }}>
          <Crosses />
          <div className="hero-body">
            <h1>The Console Framework</h1>
            <p className="lede">
              Build interactive React apps rendered entirely inside <code>console.log</code>.
            </p>
            <div className="hero-ctas">
              <A href="/docs" className="btn btn-primary btn-lg">
                Get Started
              </A>
              <CopyCommand command="bunx create-text-app" />
            </div>
            <p className="hero-whisper desktop-only">
              This page is running in your console. Open it with <kbd><DevtoolsShortcut /></kbd>, click the preview below, press <kbd>↑</kbd> <kbd>↓</kbd>.
            </p>
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEATURES: Array<{ title: ReactNode; body: ReactNode }> = [
  { title: "App Router", body: <>File-system layouts, dynamic routes, and URL history.</> },
  { title: "Yoga Flexbox", body: <>WebAssembly layout snapped to integer cells.</> },
  {
    title: (
      <>
        One <code>console.log</code>
      </>
    ),
    body: <>Run-length encoded frames in 0.18ms. Zero logs when idle.</>,
  },
  {
    title: "Zero DOM",
    body: (
      <>
        An empty <code>&lt;body&gt;</code> and one hidden input.
      </>
    ),
  },
];

function Features(): ReactNode {
  return (
    <section className="section">
      <div className="container">
        <div className="features">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OpenCodeSpotlight(): ReactNode {
  return (
    <section className="section">
      <div className="container spotlight">
        <div>
          <h2>OpenCode in console.log</h2>
          <p className="muted">The OpenCode TUI, running in DevTools. Bring your own server or use the sandbox.</p>
        </div>
        <A href="/opencode" className="btn btn-secondary">
          Explore OpenCode <ArrowRight size={14} />
        </A>
      </div>
    </section>
  );
}

export function HomePage(): ReactNode {
  return (
    <>
      <Hero />
      <Features />
      <OpenCodeSpotlight />
    </>
  );
}
