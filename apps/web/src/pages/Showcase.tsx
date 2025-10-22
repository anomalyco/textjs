import { useMemo, type ReactNode } from "react";
import type { ThemeName } from "@textjs/react";
import { DashboardDemo } from "../demos/Dashboard";
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
  cols: number;
  rows: number;
  theme: ThemeName;
  render: () => ReactNode;
}

const ENTRIES: Entry[] = [
  {
    title: "OpenCode Lite",
    body: "A coding agent with streaming tool cards.",
    href: "/opencode",
    cols: 100,
    rows: 30,
    theme: "opencodeDark",
    render: () => <OpenCodeLite active={false} />,
  },
  {
    title: "Edge Console",
    body: "Live deploys and throughput, refreshed every second.",
    href: "/playground",
    cols: 100,
    rows: 26,
    theme: "geistDark",
    render: () => <DashboardDemo title="edge-console" />,
  },
  {
    title: "Console Snake",
    body: "A 60fps game loop, one log per frame.",
    href: "/playground",
    cols: 96,
    rows: 24,
    theme: "tokyoNight",
    render: () => <SnakeDemo reserveRows={2} title="console snake" />,
  },
  {
    title: "Streaming Markdown",
    body: "Token-by-token Markdown, code fences and diffs.",
    href: "/docs/components-content",
    cols: 84,
    rows: 26,
    theme: "geistDark",
    render: () => <StreamingDemo />,
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
        <h1>Showcase</h1>
        <p>Live console apps rendered by Text.js.</p>
      </div>
      <div className="container" style={{ paddingBottom: 120 }}>
        <div className="showcase-grid">
          {ENTRIES.map((e) => (
            <A key={e.title} href={e.href} className="show-card">
              <FrameShot entry={e} />
              <div className="meta">
                <h3>{e.title}</h3>
                <p>{e.body}</p>
              </div>
            </A>
          ))}
        </div>
      </div>
    </>
  );
}
