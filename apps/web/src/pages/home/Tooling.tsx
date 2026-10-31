import type { ReactNode } from "react";
import { CHAPTERS, learnPath, TOTAL_MINUTES } from "../../learn/course";
import { A } from "../../router";
import { ArrowRight } from "../../site/icons";
import { Crosses } from "./Crosses";

const TOOLS: Array<{ label: string; title: string; body: ReactNode; href: string }> = [
  { label: "Text.js panel", title: "DevTools extension", body: <>Components, a cell-by-cell frame inspector and a per-frame timeline. DevTools inside DevTools.</>, href: "/docs/devtools-extension" },
  { label: "⌘K V", title: "VS Code", body: <>A live preview of the frame next to your code, plus App Router scaffolding and snippets.</>, href: "/docs/vscode" },
  { label: "eslint-plugin-textjs", title: "ESLint", body: <>Catches DOM tags in console components, boxes inside text and glyphs Menlo doesn’t have.</>, href: "/docs/eslint" },
  { label: "@textjs/next/testing", title: "Testing", body: <><code>render</code>, <code>press</code>, <code>lastFrame</code>. No browser, no DevTools.</>, href: "/docs/testing" },
  { label: "TX###", title: "Error codes", body: <>Every framework error carries a stable code and a page that explains the fix.</>, href: "/errors" },
  { label: "window.text", title: "Console REPL", body: <>Pause, resize, wireframe and copy the running app from the console prompt.</>, href: "/docs/hooks-and-repl" },
  { label: "UAX #9", title: "Right-to-left", body: <>A complete bidi implementation. All 770,241 <code>BidiTest.txt</code> cases pass.</>, href: "/docs/internationalization" },
  { label: "@textjs/font", title: "FIGlet fonts", body: <>Parses <code>.flf</code> files and lays them out exactly like <code>figlet</code>, down to the last smush.</>, href: "/docs/fonts" },
];

export function ToolingSection(): ReactNode {
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Developer Experience</p>
          <h2>The rest of the toolchain.</h2>
          <p>Editors, linters, tests and inspectors, each aware that your UI lives in the console.</p>
        </div>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <A key={t.title} href={t.href} className="tool-cell">
              <span className="tool-label">{t.label}</span>
              <h3>
                {t.title}
                <ArrowRight size={13} />
              </h3>
              <p>{t.body}</p>
            </A>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LearnSection(): ReactNode {
  return (
    <section className="section home-section">
      <div className="container">
        <div className="frame home-learn">
          <Crosses />
          <div className="home-learn-copy">
            <p className="eyebrow">Learn Text.js</p>
            <h2>Build a deploy dashboard in your console.</h2>
            <p className="muted">
              A free course in {CHAPTERS.length} chapters, about {Math.round(TOTAL_MINUTES / 5) * 5} minutes. Every chapter runs live in DevTools as you read it.
            </p>
            <div className="home-learn-actions">
              <A href="/learn" className="btn btn-primary">
                Start learning
              </A>
              <A href="/docs" className="btn btn-secondary">
                Read the docs
              </A>
            </div>
          </div>
          <ol className="home-learn-list">
            {CHAPTERS.map((c, i) => (
              <li key={c.slug}>
                <A href={learnPath(c.slug)}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="t">{c.title}</span>
                  <span className="m">{c.minutes} min</span>
                </A>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
