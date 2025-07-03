import { useMemo, type ReactNode } from "react";
import type { ThemeName } from "@textjs/react";
import { CompanionApp } from "../console-companion/App";
import { DashboardDemo } from "../demos/Dashboard";
import { FormDemo } from "../demos/Form";
import { OpenCodeLite } from "../demos/opencode/OpenCodeLite";
import { SnakeDemo } from "../demos/Snake";
import { StreamingDemo } from "../demos/Streaming";
import { useSandbox } from "../sandbox/useSandbox";
import { A } from "../router";
import { ScaledMirror } from "../site/DevToolsWindow";
import { useInView } from "../site/useInView";

interface Entry {
  title: string;
  body: string;
  href: string;
  tags: string[];
  cols: number;
  rows: number;
  theme: ThemeName;
  render: () => ReactNode;
}

const ENTRIES: Entry[] = [
  {
    title: "OpenCode Lite",
    body: "A coding-agent TUI with streaming tool cards, a command palette and live SSE against a local opencode server.",
    href: "/opencode",
    tags: ["ScrollBox", "Markdown", "Diff", "Modal", "Textarea"],
    cols: 100,
    rows: 30,
    theme: "opencodeDark",
    render: () => <OpenCodeLite active={false} />,
  },
  {
    title: "Vershell Console",
    body: "A deployments dashboard: live throughput, metric cards and a status table, refreshed once a second at 0 DOM nodes.",
    href: "/playground",
    tags: ["useState", "ThroughputBars", "Spinner"],
    cols: 100,
    rows: 26,
    theme: "geistDark",
    render: () => <DashboardDemo title="vershell-console" />,
  },
  {
    title: "textjs.org Console Companion",
    body: "This website's own console app: five tabs, synced with the page you're reading. It is running in your DevTools right now.",
    href: "/",
    tags: ["renderToConsole", "useSyncExternalStore", "Tabs"],
    cols: 104,
    rows: 32,
    theme: "geistDark",
    render: () => <CompanionApp />,
  },
  {
    title: "Console Snake",
    body: "A 60fps game loop proving zero-flicker, single-console.log frames. High scores persist in localStorage.",
    href: "/playground",
    tags: ["useInput", "useConsoleStats", "60fps"],
    cols: 96,
    rows: 24,
    theme: "tokyoNight",
    render: () => <SnakeDemo reserveRows={2} title="console snake" />,
  },
  {
    title: "Streaming Assistant",
    body: "Token-by-token Markdown with code fences, tables and an inline diff, re-encoding only the rows that changed.",
    href: "/docs/components-content",
    tags: ["Markdown", "Code", "Diff"],
    cols: 84,
    rows: 26,
    theme: "geistDark",
    render: () => <StreamingDemo />,
  },
  {
    title: "Project Wizard",
    body: "Forms in the console: inputs, a region picker and plan tabs with full focus management.",
    href: "/docs/components-interactive",
    tags: ["Input", "Select", "Tabs", "useFocusManager"],
    cols: 84,
    rows: 19,
    theme: "amberCrt",
    render: () => <FormDemo />,
  },
];

/** A live, non-interactive console frame (rendered by a headless root, not a screenshot). */
function FrameShot({ entry }: { entry: Entry }): ReactNode {
  const [ref, inView] = useInView<HTMLDivElement>();
  const app = useMemo(() => entry.render(), [entry]);
  const { frame } = useSandbox(app, { cols: entry.cols, rows: entry.rows, theme: entry.theme, enabled: inView });
  return (
    <div ref={ref} className="shot">
      <ScaledMirror frame={frame} cols={entry.cols} rows={entry.rows} />
    </div>
  );
}

export function ShowcasePage(): ReactNode {
  return (
    <>
      <div className="container page-head">
        <div className="eyebrow">▼ Showcase</div>
        <h1>Built with Text.js</h1>
        <p>Applications from some of the world's most questionable engineering teams. Every preview below is a live console frame, rendered by Turbolog.</p>
      </div>
      <div className="container" style={{ paddingBottom: 96 }}>
        <div className="showcase-grid">
          {ENTRIES.map((e) => (
            <A key={e.title} href={e.href} className="show-card">
              <FrameShot entry={e} />
              <div className="meta">
                <h3>{e.title}</h3>
                <p>{e.body}</p>
                <div className="tags">
                  {e.tags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </A>
          ))}
        </div>
      </div>
    </>
  );
}
