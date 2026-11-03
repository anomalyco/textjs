import { useEffect, useState, type ReactNode } from "react";
import type { StyledFrame } from "@textjs/core";
import { activateCompanion, COMPANION_COLS, COMPANION_ROWS, subscribeCompanionFrame } from "../console-companion/bridge";
import { isHomeExampleFrame } from "../docs/preview-meta";
import { useSite } from "../console-companion/useSite";
import { A } from "../router";
import { rich } from "../i18n/rich";
import { t } from "../i18n/t";
import { CONSOLE_TAGS } from "../site/Chrome";
import { CopyCommand } from "../site/CodeBlock";
import { DevToolsWindow } from "../site/DevToolsWindow";
import { HighlightedCode } from "../site/highlight";
import { siteStore } from "../console-companion/store";
import { HERO_FILES } from "./home-files";
import { Crosses } from "./home/Crosses";
import { AnywhereSection } from "./home/Anywhere";
import { KitSection } from "./home/Kit";
import { OpenCodeBand } from "./home/OpenCodeBand";
import { ServerSection } from "./home/Server";
import { LearnSection, ToolingSection } from "./home/Tooling";
import { TurbologSection } from "./home/Turbolog";
import "./home/home.css";

/** The companion's latest Home frame. While a Components example runs in the console, the hero keeps the counter. */
function useHomeFrame(): StyledFrame | null {
  const [frame, setFrame] = useState<StyledFrame | null>(null);
  useEffect(
    () =>
      subscribeCompanionFrame((f) => {
        if (!isHomeExampleFrame(f)) setFrame(f);
      }),
    [],
  );
  return frame;
}

function LiveConsole({ source = "viewport:3" }: { source?: string }): ReactNode {
  const frame = useHomeFrame();
  const site = useSite();
  return (
    <DevToolsWindow
      frame={frame}
      source={source}
      cols={COMPANION_COLS}
      rows={COMPANION_ROWS}
      engaged={site.consoleInput && site.example === null}
      engage
      onActivate={() => {
        siteStore.exitExample();
        activateCompanion();
      }}
      onInspect={() => siteStore.set({ wireframe: !site.wireframe })}
      inspecting={site.wireframe}
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
            <h1>{t("The Console Framework")}</h1>
            <p className="lede">{rich("Build full-stack React apps that render inside <c>console.log</c>.", code)}</p>
            <div className="hero-actions">
              <div className="hero-ctas">
                <A href="/docs" className="btn btn-primary btn-lg">
                  {t("Get started")}
                </A>
                <CopyCommand command="bunx create-text-app" />
              </div>
              <p className="hero-whisper desktop-only">
                {rich("This page is running in your console. Open it with <keys></keys><safari> (<link>turn on developer features</link> first)</safari>, click the preview below and press <arrows>.</arrows>", {
                  ...CONSOLE_TAGS,
                  arrows: (c) => (
                    <span className="nowrap">
                      <kbd>↑</kbd> <kbd>↓</kbd>
                      {c}
                    </span>
                  ),
                })}
              </p>
            </div>
          </div>
          <div className="split">
            <div className="split-code" dir="ltr">
              <div className="file-tabs" role="tablist" aria-label={t("Example files")}>
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

const code = { c: (c: ReactNode) => <code>{c}</code> };

const FEATURES: Array<{ title: ReactNode; body: ReactNode }> = [
  { title: "React 19", body: t("Text.js supports concurrent rendering, Suspense and error boundaries.") },
  { title: "App Router", body: rich("Folders in <c>app/</c> become routes and layouts, and Back, Forward and deep links work.", code) },
  { title: t("Responsive grid"), body: t("The grid fits the docked DevTools panel at any page zoom.") },
  { title: t("Keyboard input"), body: rich("Keys, paste and IME composition reach the app through one hidden <textarea></textarea>.", { ...code, textarea: () => <code>&lt;textarea&gt;</code> }) },
];

function Features(): ReactNode {
  return (
    <section className="section features-band" id="fold">
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

export function HomePage(): ReactNode {
  return (
    <>
      <Hero />
      <Features />
      <KitSection />
      <TurbologSection />
      <ServerSection />
      <AnywhereSection />
      <OpenCodeBand />
      <ToolingSection />
      <LearnSection />
    </>
  );
}
