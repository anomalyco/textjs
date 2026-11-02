import { createElement, useEffect, useMemo, useRef, useState, type ComponentType, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { siteStore } from "../../console-companion/store";
import { preloadCompanionTab } from "../../console-companion/tabs-loader";
import { useSite } from "../../console-companion/useSite";
import { exampleFrame, HOME_EXAMPLE_GRID, homeExampleHeader } from "../../docs/preview-meta";
import { A } from "../../router";
import { SandboxConsole } from "../../sandbox/SandboxConsole";
import { useSandbox } from "../../sandbox/useSandbox";
import { DevToolsWindow } from "../../site/DevToolsWindow";
import { ArrowRight } from "../../site/icons";
import { runInConsole, useConsoleAvailable } from "../../site/LivePreview";
import { useCompanionFrame } from "../../site/useCompanion";
import { useInView } from "../../site/useInView";
import { prefetchFailed } from "../../telemetry/capture";
import { Crosses } from "./Crosses";

const { cols: COLS, rows: ROWS } = HOME_EXAMPLE_GRID;

type KitModule = typeof import("../../demos/Kit");
let kitCache: KitModule | null = null;
let kitPromise: Promise<KitModule> | null = null;

function loadKit(): Promise<KitModule> {
  if (kitCache) return Promise.resolve(kitCache);
  if (!kitPromise) {
    kitPromise = import("../../demos/Kit").then((m) => {
      kitCache = m;
      return m;
    });
  }
  return kitPromise;
}

function renderKitTab(mod: KitModule | null, id: string): ReactNode {
  if (!mod) return null;
  const map: Record<string, ComponentType | undefined> = {
    table: mod.TablePreview,
    charts: mod.ChartsPreview,
    controls: mod.ControlsPreview,
    keymap: mod.KeymapPreview,
  };
  const Comp = map[id];
  return Comp ? createElement(Comp) : null;
}

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

/** The in-page sandbox, or, while this example runs in the console, a mirror of the console's frames. */
function Preview({ id, enabled, active, available }: { id: string; enabled: boolean; active: boolean; available: boolean }): ReactNode {
  const site = useSite();
  const [kit, setKit] = useState<KitModule | null>(kitCache);
  useEffect(() => {
    if (!enabled && !active) return;
    preloadCompanionTab("example").catch(prefetchFailed);
    if (kit) return;
    let alive = true;
    void loadKit().then((m) => {
      if (alive) setKit(m);
    });
    return () => {
      alive = false;
    };
  }, [enabled, active, kit]);
  const app = useMemo(() => renderKitTab(kit, id), [kit, id]);
  const [wireframe, setWireframe] = useState(false);
  const sandbox = useSandbox(app, { cols: COLS, rows: ROWS, theme: site.theme === "geistLight" ? "geistDark" : site.theme, enabled: enabled && !active, wireframe });
  const companionFrame = useCompanionFrame(active);
  if (active)
    return (
      <div className="sandbox">
        <DevToolsWindow
          frame={exampleFrame(companionFrame, homeExampleHeader(id), id, "home") ?? sandbox.frame}
          engage
          engaged={site.consoleInput}
          onActivate={() => runInConsole(id)}
          activateLabel="Click to type"
          cols={COLS}
          rows={ROWS}
        />
      </div>
    );
  return (
    <SandboxConsole
      frame={sandbox.frame}
      engine={sandbox.engine}
      source={`preview://${id}:1`}
      filter={`-url:preview://${id}`}
      cols={COLS}
      rows={ROWS}
      activateLabel={available ? "Click to run in console" : undefined}
      onInspect={() => setWireframe((w) => !w)}
      inspecting={wireframe}
    />
  );
}

export function KitSection(): ReactNode {
  const site = useSite();
  const [tab, setTab] = useState(0);
  const [ref, inView] = useInView<HTMLDivElement>();
  const [liveRef, liveVisible] = useInView<HTMLDivElement>("0px");
  const active = TABS[tab] ?? TABS[0]!;
  const available = useConsoleAvailable();
  // Desktop only: while the section is engaged, the console runs the selected tab.
  const inConsole = site.tab === "home" && site.example === active.id;

  const select = (i: number): void => {
    setTab(i);
    const next = TABS[i];
    if (inConsole && next) runInConsole(next.id);
  };

  // A click outside the live panel, or scrolling it out of view, gives the console back to the counter.
  useEffect(() => {
    if (!inConsole) return;
    const onDown = (e: globalThis.MouseEvent): void => {
      const el = liveRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) siteStore.exitExample();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [inConsole, liveRef]);
  const seen = useRef(false);
  useEffect(() => {
    if (!inConsole) seen.current = false;
    else if (liveVisible) seen.current = true;
    else if (seen.current) siteStore.exitExample();
  }, [inConsole, liveVisible]);

  const onStageMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 || (e.target as Element).closest(".dt-inspect")) return;
    e.preventDefault();
    e.stopPropagation();
    runInConsole(active.id);
  };
  // Tabbing into the sandbox runs it in the console too.
  const onStageFocus = (e: FocusEvent): void => {
    if ((e.target as Element).classList.contains("sandbox-sink")) runInConsole(active.id);
  };
  const live = available && !inConsole;
  return (
    <section className="section home-section">
      <div className="container">
        <div className="section-head">
          <h2>Tables, charts, forms and shortcuts</h2>
        </div>
        <div className="frame kit-frame" ref={ref}>
          <Crosses />
          <div className={`kit-live${inConsole ? " in-console" : ""}`} ref={liveRef}>
            <div className="file-tabs kit-tabs" role="tablist" aria-label="Live components">
              {TABS.map((t, i) => (
                <button key={t.id} type="button" role="tab" aria-selected={i === tab} onClick={() => select(i)}>
                  {t.label}
                </button>
              ))}
              <span className="kit-live-badge">
                <span className="dot" /> {inConsole ? "Live in your console" : "Live"}
              </span>
            </div>
            <div
              className="kit-stage"
              onMouseDownCapture={live ? onStageMouseDown : undefined}
              onFocusCapture={live ? onStageFocus : undefined}
              title={live ? "Click to run in your console" : undefined}
            >
              <Preview key={active.id} id={active.id} enabled={inView} active={inConsole} available={available} />
            </div>
            <div className="kit-foot">
              <span>{inConsole ? `${active.hint} · Esc back to counter` : active.hint}</span>
              <div className="kit-foot-actions">
                {inConsole ? (
                  <button type="button" className="preview-run desktop-only" onClick={() => siteStore.exitExample()} title="Show the counter in the console again">
                    Back to counter
                  </button>
                ) : (
                  <button type="button" className="preview-run desktop-only" onClick={() => runInConsole(active.id)} title="Runs this example in your DevTools console">
                    Run in console
                  </button>
                )}
                <A href={active.href} className="text-link">
                  Docs <ArrowRight size={13} />
                </A>
              </div>
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
