import type { ReactNode } from "react";
import { ABOUT_MINUTES, CHAPTERS_META as CHAPTERS, learnPath } from "../../learn/meta";
import { A } from "../../router";
import { ArrowRight } from "../../site/icons";
import { Crosses } from "./Crosses";

const TOOLS: Array<{ label: string; title: string; body: ReactNode; href: string }> = [
  { label: "Text.js panel", title: "DevTools extension", body: <>Adds a panel with the component tree, a frame inspector and a per-frame timeline.</>, href: "/docs/devtools-extension" },
  { label: "⌘K V", title: "VS Code", body: <>Previews the frame next to your code and scaffolds App Router files.</>, href: "/docs/vscode" },
  { label: "eslint-plugin-textjs", title: "ESLint", body: <>Catches DOM tags in console components, boxes inside text and glyphs Menlo doesn’t have.</>, href: "/docs/eslint" },
  { label: "@textjs/app/testing", title: "Testing", body: <>Render offscreen, press keys and assert on <code>lastFrame()</code> in any test runner.</>, href: "/docs/testing" },
  { label: "TX###", title: "Error codes", body: <>Errors and warnings with a <code>TX</code> code link to a page that explains the fix.</>, href: "/errors" },
  { label: "window.text", title: "Console REPL", body: <>Pause, resize, wireframe and copy the running app from the console prompt.</>, href: "/docs/hooks-and-repl" },
  { label: "UAX #9", title: "Right-to-left", body: <>Implements the Unicode Bidirectional Algorithm and passes all 770,241 <code>BidiTest.txt</code> cases.</>, href: "/docs/internationalization" },
  { label: "@textjs/font", title: "FIGlet fonts", body: <>Parses <code>.flf</code> files and matches 273 outputs recorded from the <code>figlet</code> binary.</>, href: "/docs/fonts" },
];

export function ToolingSection(): ReactNode {
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <h2>Editor, lint and test tooling</h2>
        </div>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <A key={t.title} href={t.href} className="tool-cell">
              <h3>
                {t.title}
                <ArrowRight size={13} />
              </h3>
              <p>{t.body}</p>
              <span className="tool-label" dir="ltr">{t.label}</span>
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
            <h2>Build a deploy dashboard in your console</h2>
            <p className="muted">
              The free course has {CHAPTERS.length} chapters and takes about {ABOUT_MINUTES} minutes.
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
