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
import { Crosses } from "./home/Crosses";
import { AnywhereSection } from "./home/Anywhere";
import { KitSection } from "./home/Kit";
import { ServerSection } from "./home/Server";
import { LearnSection, ToolingSection } from "./home/Tooling";
import { TurbologSection } from "./home/Turbolog";
import "./home/home.css";

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
              Build full-stack React apps that render inside <code>console.log</code>.
            </p>
            <div className="hero-ctas">
              <A href="/docs" className="btn btn-primary btn-lg">
                Get Started
              </A>
              <CopyCommand command="bunx create-text-app" />
            </div>
            <p className="hero-whisper desktop-only">
              This page is running in your console. Open it with <kbd><DevtoolsShortcut /></kbd>, click the preview below and press <kbd>↑</kbd> <kbd>↓</kbd>.
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
  { title: "React 19", body: <>Concurrent rendering, Suspense and error boundaries.</> },
  { title: "App Router", body: <>File-system layouts, dynamic routes and URL history.</> },
  { title: "Responsive grid", body: <>The grid fits the docked DevTools panel at any page zoom.</> },
  {
    title: "Keyboard input",
    body: (
      <>
        Keys, paste and IME composition reach the app through one hidden <code>&lt;textarea&gt;</code>.
      </>
    ),
  },
];

function Features(): ReactNode {
  return (
    <section className="section" id="fold">
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
          <p className="muted">A console client for OpenCode. Connect your local server, or try the sandbox with a scripted agent.</p>
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
      <TurbologSection />
      <KitSection />
      <ServerSection />
      <AnywhereSection />
      <OpenCodeSpotlight />
      <ToolingSection />
      <LearnSection />
    </>
  );
}
