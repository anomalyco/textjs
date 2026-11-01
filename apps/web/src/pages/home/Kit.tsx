import { useMemo, useState, type ReactNode } from "react";
import { useSite } from "../../console-companion/useSite";
import { PREVIEWS } from "../../docs/previews";
import { A } from "../../router";
import { SandboxConsole } from "../../sandbox/SandboxConsole";
import { useSandbox } from "../../sandbox/useSandbox";
import { ArrowRight } from "../../site/icons";
import { useInView } from "../../site/useInView";
import { Crosses } from "./Crosses";

const COLS = 76;
const ROWS = 16;

const TABS: Array<{ id: string; label: string; hint: string; href: string }> = [
  { id: "table", label: "Table", hint: "↑ ↓ move · s sort · Space select", href: "/docs/components-data" },
  { id: "charts", label: "Charts", hint: "Line charts, bar charts, sparklines and progress bars", href: "/docs/components-charts" },
  { id: "controls", label: "Controls", hint: "Tab focus · Space toggle · ← → adjust", href: "/docs/components-forms" },
  { id: "keymap", label: "useKeymap", hint: "? help · Ctrl+K command palette", href: "/docs/keyboard" },
];

const GROUPS: Array<{ title: string; href: string; items: string[] }> = [
  { title: "Layout", href: "/docs/components-layout", items: ["Box", "Stack", "Grid", "SplitPane", "ScrollBox", "Center"] },
  { title: "Data", href: "/docs/components-data", items: ["List", "Table", "Tree", "Markdown", "Code", "Diff"] },
  { title: "Charts", href: "/docs/components-charts", items: ["LineChart", "BarChart", "Sparkline", "ProgressBar", "Gradient", "Image"] },
  { title: "Controls", href: "/docs/components-forms", items: ["Input", "Select", "Checkbox", "Switch", "Slider", "Dialog"] },
  { title: "Keyboard", href: "/docs/keyboard", items: ["useKeymap", "KeyHelp", "KeyHints", "CommandPalette", "StatusBar", "useFocus"] },
];

function Preview({ id, enabled }: { id: string; enabled: boolean }): ReactNode {
  const site = useSite();
  const app = useMemo(() => PREVIEWS[id]?.render() ?? null, [id]);
  const [wireframe, setWireframe] = useState(false);
  const sandbox = useSandbox(app, { cols: COLS, rows: ROWS, theme: site.theme === "geistLight" ? "geistDark" : site.theme, enabled, wireframe });
  return (
    <SandboxConsole
      frame={sandbox.frame}
      engine={sandbox.engine}
      source={`preview://${id}:1`}
      filter={`-url:preview://${id}`}
      cols={COLS}
      rows={ROWS}
      onInspect={() => setWireframe((w) => !w)}
      inspecting={wireframe}
    />
  );
}

export function KitSection(): ReactNode {
  const [tab, setTab] = useState(0);
  const [ref, inView] = useInView<HTMLDivElement>();
  const active = TABS[tab] ?? TABS[0]!;
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Components</p>
          <h2>Tables, charts, forms and shortcuts</h2>
          <p>
            Shortcuts declared with <code>useKeymap</code> also appear in a <kbd>?</kbd> help screen, footer hints and a <kbd>Ctrl+K</kbd> command palette.
          </p>
        </div>
        <div className="frame kit-frame" ref={ref}>
          <Crosses />
          <div className="kit-live">
            <div className="file-tabs kit-tabs" role="tablist" aria-label="Live components">
              {TABS.map((t, i) => (
                <button key={t.id} type="button" role="tab" aria-selected={i === tab} onClick={() => setTab(i)}>
                  {t.label}
                </button>
              ))}
              <span className="kit-live-badge">
                <span className="dot" /> Live
              </span>
            </div>
            <div className="kit-stage">
              <Preview key={active.id} id={active.id} enabled={inView} />
            </div>
            <div className="kit-foot">
              <span>{active.hint}</span>
              <A href={active.href} className="text-link">
                Docs <ArrowRight size={13} />
              </A>
            </div>
          </div>
          <div className="kit-index">
            {GROUPS.map((g) => (
              <div key={g.title} className="kit-group">
                <A href={g.href} className="kit-group-title">
                  {g.title}
                </A>
                <ul>
                  {g.items.map((c) => (
                    <li key={c}>
                      <code>{c.startsWith("use") ? c : `<${c}>`}</code>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
