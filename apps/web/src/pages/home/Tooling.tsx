import type { ReactNode } from "react";
import { ABOUT_MINUTES, CHAPTERS_META as CHAPTERS, learnPath } from "../../learn/meta";
import { rich } from "../../i18n/rich";
import { t } from "../../i18n/t";
import { A } from "../../router";
import { ArrowRight } from "../../site/icons";
import { Crosses } from "./Crosses";

const code = { c: (c: ReactNode) => <code>{c}</code> };

const TOOLS: Array<{ label: string; title: string; body: ReactNode; href: string }> = [
  { label: t("Text.js panel"), title: t("DevTools extension"), body: t("Adds a panel with the component tree, a frame inspector and a per-frame timeline."), href: "/docs/devtools-extension" },
  { label: "⌘K V", title: "VS Code", body: t("Previews the frame next to your code and scaffolds App Router files."), href: "/docs/vscode" },
  { label: "eslint-plugin-textjs", title: "ESLint", body: t("Catches DOM tags in console components, boxes inside text and glyphs Menlo doesn’t have."), href: "/docs/eslint" },
  { label: "@textjs/app/testing", title: t("Testing"), body: rich("Render offscreen, press keys and assert on <c>lastFrame()</c> in any test runner.", code), href: "/docs/testing" },
  { label: "TX###", title: t("Error codes"), body: rich("Errors and warnings with a <c>TX</c> code link to a page that explains the fix.", code), href: "/errors" },
  { label: "window.text", title: t("Console REPL"), body: t("Pause, resize, wireframe and copy the running app from the console prompt."), href: "/docs/hooks-and-repl" },
  { label: "UAX #9", title: t("Right-to-left"), body: rich("Implements the Unicode Bidirectional Algorithm and passes all 770,241 <c>BidiTest.txt</c> cases.", code), href: "/docs/internationalization" },
  { label: "@textjs/font", title: t("FIGlet fonts"), body: rich("Parses <c>.flf</c> files and matches 273 outputs recorded from the <c>figlet</c> binary.", code), href: "/docs/fonts" },
];

export function ToolingSection(): ReactNode {
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <h2>{t("Editor, lint and test tooling")}</h2>
        </div>
        <div className="tool-grid">
          {TOOLS.map((tool) => (
            <A key={tool.title} href={tool.href} className="tool-cell">
              <h3>
                {tool.title}
                <ArrowRight size={13} />
              </h3>
              <p>{tool.body}</p>
              <span className="tool-label">
                <span dir="ltr">{tool.label}</span>
              </span>
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
            <h2>{t("Build a deploy dashboard in your console")}</h2>
            <p className="muted">{t("The free course has {chapters} chapters and takes about {minutes} minutes.", { chapters: CHAPTERS.length, minutes: ABOUT_MINUTES })}</p>
            <div className="home-learn-actions">
              <A href="/learn" className="btn btn-primary">
                {t("Start learning")}
              </A>
              <A href="/docs" className="btn btn-secondary">
                {t("Read the docs")}
              </A>
            </div>
          </div>
          <ol className="home-learn-list">
            {CHAPTERS.map((c, i) => (
              <li key={c.slug}>
                <A href={learnPath(c.slug)}>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="t">{c.title}</span>
                  <span className="m">{t("{minutes} min", { minutes: c.minutes })}</span>
                </A>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
