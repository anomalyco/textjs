import type { ReactNode } from "react";
import { A } from "../../router";
import { ArrowRight } from "../../site/icons";

/** One frame, three outputs. Rows are [text, tone] runs. */
type Run = [string, ("fg" | "muted" | "ok" | "warn" | "accent" | "dim")?];
const FRAME: Run[][] = [
  [["▼ Acme Deploys", "fg"], ["          main", "muted"]],
  [["●", "ok"], [" Ready  web   iad1  ", "fg"], ["2m", "muted"]],
  [["●", "ok"], [" Ready  api   sfo1  ", "fg"], ["4m", "muted"]],
  [["◌", "warn"], [" Build  docs  fra1  ", "fg"], ["42%", "muted"]],
];

function Frame({ dim = false }: { dim?: boolean }): ReactNode {
  return (
    <>
      {FRAME.map((row, i) => (
        <div key={i} className="aw-row">
          {row.map(([t, tone], j) => (
            <span key={j} className={dim ? "dim" : tone}>
              {t}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

function DevToolsPane(): ReactNode {
  return (
    <div className="aw-pane aw-devtools">
      <div className="aw-bar">
        <span className="aw-tab">Elements</span>
        <span className="aw-tab on">Console</span>
        <span className="aw-tab">Sources</span>
      </div>
      <div className="aw-body">
        <span className="aw-src">VM12:1</span>
        <Frame />
      </div>
    </div>
  );
}

function TerminalPane(): ReactNode {
  return (
    <div className="aw-pane aw-term">
      <div className="aw-bar">
        <span className="aw-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="aw-title">acme — text run</span>
      </div>
      <div className="aw-body">
        <div className="aw-row">
          <span className="muted">$ </span>
          <span className="fg">text run</span>
        </div>
        <Frame />
      </div>
    </div>
  );
}

function AgentPane(): ReactNode {
  return (
    <div className="aw-pane aw-agent">
      <div className="aw-bar">
        <span className="aw-title">textjs · read_frame</span>
      </div>
      <div className="aw-body">
        <div className="aw-row">
          <span className="accent">→ </span>
          <span className="fg">read_frame</span>
          <span className="muted">{` { "path": "/" }`}</span>
        </div>
        <Frame dim />
      </div>
    </div>
  );
}

const TARGETS: Array<{ pane: ReactNode; title: string; cmd: string; body: ReactNode; href: string }> = [
  { pane: <DevToolsPane />, title: "DevTools", cmd: "text dev", body: <>Turbolog writes each frame as <code>%c</code> spans in one <code>console.log</code>.</>, href: "/docs/turbolog-engine" },
  { pane: <TerminalPane />, title: "Terminal", cmd: "text run", body: <>The same App Router app in truecolor ANSI. Route handlers run in-process.</>, href: "/docs/terminal" },
  { pane: <AgentPane />, title: "Coding agents", cmd: "text mcp", body: <>Agents can’t open DevTools. Over MCP they navigate, press keys and read frames as text.</>, href: "/docs/mcp" },
];

export function AnywhereSection(): ReactNode {
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Run Anywhere</p>
          <h2>One app. Three consoles.</h2>
          <p>Layout, components, keymaps and route handlers are shared. Only the last step changes.</p>
        </div>
        <div className="aw-grid">
          {TARGETS.map((t) => (
            <A key={t.title} href={t.href} className="aw-cell">
              {t.pane}
              <div className="aw-copy">
                <h3>
                  {t.title}
                  <code className="aw-cmd">{t.cmd}</code>
                </h3>
                <p>{t.body}</p>
              </div>
            </A>
          ))}
        </div>
      </div>
    </section>
  );
}
