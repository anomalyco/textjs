import type { ReactNode } from "react";
import { rich } from "../../i18n/rich";
import { t } from "../../i18n/t";
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
          {row.map(([text, tone], j) => (
            <span key={j} className={dim ? "dim" : tone}>
              {text}
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

function DevToolsPane(): ReactNode {
  return (
    <div className="aw-pane aw-devtools" dir="ltr">
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
    <div className="aw-pane aw-term" dir="ltr">
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
    <div className="aw-pane aw-agent" dir="ltr">
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

const code = { c: (c: ReactNode) => <code>{c}</code> };

const TARGETS: Array<{ pane: ReactNode; title: string; cmd: string; body: ReactNode; href: string }> = [
  { pane: <DevToolsPane />, title: "DevTools", cmd: "text dev", body: rich("Turbolog writes each frame as <c>%c</c> spans in one <c>console.log</c>.", code), href: "/docs/turbolog-engine" },
  { pane: <TerminalPane />, title: t("Terminal"), cmd: "text run", body: rich("<c>text run</c> renders the same App Router app in truecolor ANSI and runs route handlers in-process.", code), href: "/docs/terminal" },
  { pane: <AgentPane />, title: t("Coding agents"), cmd: "text mcp", body: t("Over MCP, agents navigate routes, press keys and read each frame as plain text."), href: "/docs/mcp" },
];

export function AnywhereSection(): ReactNode {
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <h2>{t("Also runs in terminals and agents")}</h2>
        </div>
        <div className="aw-grid">
          {TARGETS.map((target) => (
            <A key={target.title} href={target.href} className="aw-cell">
              {target.pane}
              <div className="aw-copy">
                <h3>
                  {target.title}
                  <code className="aw-cmd">{target.cmd}</code>
                </h3>
                <p>{target.body}</p>
              </div>
            </A>
          ))}
        </div>
      </div>
    </section>
  );
}
