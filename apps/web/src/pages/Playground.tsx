import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ThemeName } from "@textjs/react";
import { PRESETS, siteStore, THEME_ORDER, type PresetId } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { PresetView } from "../demos/presets";
import { STREAMING_MARKDOWN } from "../demos/Streaming";
import counterSource from "../demos/Counter.tsx?raw";
import dashboardSource from "../demos/Dashboard.tsx?raw";
import formSource from "../demos/Form.tsx?raw";
import streamingSource from "../demos/Streaming.tsx?raw";
import snakeSource from "../demos/Snake.tsx?raw";
import { SandboxConsole } from "../sandbox/SandboxConsole";
import { useSandbox, type CapturedLog } from "../sandbox/useSandbox";
import { devtoolsShortcut } from "../site/Chrome";
import { CopyButton } from "../site/CodeBlock";
import { HighlightedCode } from "../site/highlight";

const SOURCES: Record<PresetId, { file: string; code: string }> = {
  counter: { file: "app/page.tsx — Counter.tsx", code: counterSource },
  dashboard: { file: "app/page.tsx — Dashboard.tsx", code: dashboardSource },
  form: { file: "app/page.tsx — Form.tsx", code: formSource },
  streaming: { file: "app/page.tsx — Streaming.tsx", code: streamingSource },
  snake: { file: "app/page.tsx — Snake.tsx", code: snakeSource },
};

const VIEWPORTS = [
  { label: "80×24", cols: 80, rows: 24 },
  { label: "100×32", cols: 100, rows: 32 },
  { label: "120×38", cols: 120, rows: 38 },
] as const;

function isTyping(el: Element | null): boolean {
  return el !== null && el.closest("input,textarea,select,[contenteditable],[data-console-bypass]") !== null;
}

/** Render the format string with `%c` and `\n` made visible. */
function FormatString({ log }: { log: CapturedLog }): ReactNode {
  const LIMIT = 6000;
  const text = log.format.length > LIMIT ? log.format.slice(0, LIMIT) : log.format;
  const parts = text.split(/(%%|%c|\n)/);
  return (
    <pre className="fmt">
      {parts.map((p, i) =>
        p === "%c" ? (
          <span key={i} className="pc">
            %c
          </span>
        ) : p === "\n" ? (
          <span key={i} className="nl">
            {"\\n\n"}
          </span>
        ) : (
          p
        ),
      )}
      {log.format.length > LIMIT ? <span className="subtle">{`\n… ${log.format.length - LIMIT} more characters`}</span> : null}
    </pre>
  );
}

function cssColor(css: string, prop: "background" | "color"): string | undefined {
  const m = new RegExp(`(?:^|;)\\s*${prop}(?:-color)?\\s*:\\s*([^;]+)`).exec(css);
  return m ? (m[1] as string).trim() : undefined;
}

function Inspector({ log, totalMs, dirtyRows }: { log: CapturedLog | null; totalMs: number; dirtyRows: number }): ReactNode {
  const [open, setOpen] = useState(true);
  const snippet = useMemo(() => (log ? `console.log(${JSON.stringify(log.format)}, ...${JSON.stringify(log.args)});` : ""), [log]);
  return (
    <div className="inspector">
      <button type="button" className="inspector-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{open ? "▾" : "▸"}</span>
        <b>RLE Inspector</b>
        <span className="subtle">the exact console.log call for the last frame</span>
        <span className="meta">
          <span>{log ? `${log.args.length} %c spans` : "—"}</span>
          <span>{log ? `${log.format.length.toLocaleString()} chars` : ""}</span>
          <span>{`${dirtyRows} dirty rows`}</span>
          <span>{`${totalMs.toFixed(2)}ms`}</span>
          <span>{log ? `${log.calls} calls` : ""}</span>
        </span>
      </button>
      {open ? (
        <div className="inspector-body">
          <div>
            <div className="field-label" style={{ display: "flex", alignItems: "center" }}>
              format string
              <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0 }}>
                <CopyButton text={snippet} />
              </span>
            </div>
            {log ? <FormatString log={log} /> : <p className="subtle">Waiting for the first frame…</p>}
            <p className="subtle" style={{ fontSize: 12.5, margin: "12px 0 0" }}>
              Copy and paste this into your DevTools console to reproduce the frame byte-for-byte.
            </p>
          </div>
          <div>
            <div className="field-label">...css arguments</div>
            <ul className="args">
              {(log?.args ?? []).slice(0, 400).map((css, i) => (
                <li key={i}>
                  <i>{i}</i>
                  <span className="sw" style={{ background: cssColor(css, "background") ?? "transparent", borderColor: cssColor(css, "color") }} />
                  <span>{css.replace(/(?:font-family|font-size|line-height|margin|padding|font-variant-ligatures|display):[^;]*;?/g, "").slice(0, 120) || "(base typography)"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PlaygroundPage(): ReactNode {
  const site = useSite();
  const preset = site.preset;
  const [theme, setTheme] = useState<ThemeName>("geistDark");
  const [vp, setVp] = useState<(typeof VIEWPORTS)[number]>(VIEWPORTS[0]);
  const [wireframe, setWireframe] = useState(false);
  const [markdown, setMarkdown] = useState(STREAMING_MARKDOWN);
  const [showSource, setShowSource] = useState(false);
  const title = site.playgroundTitle;

  const app = useMemo(() => <PresetView preset={preset} title={title} markdown={markdown} reserveRows={2} />, [preset, title, markdown]);
  const sandbox = useSandbox(app, { cols: vp.cols, rows: vp.rows, theme, wireframe });

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "w" && e.key !== "W")) return;
      if (isTyping(document.activeElement) || siteStore.getSnapshot().consoleInput) return;
      setWireframe((w) => !w);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const source = SOURCES[preset];

  return (
    <>
      <div className="container page-head">
        <div className="eyebrow">▼ Playground</div>
        <h1>Playground</h1>
        <p>
          Five live templates, each a real console root. Pick one, tweak the theme and viewport, and inspect the exact <code className="mono">console.log("%c…")</code> call
          Turbolog emits. The selected template is also running in your console — press <kbd>{devtoolsShortcut()}</kbd> then <kbd>2</kbd>.
        </p>
      </div>
      <div className="pg">
        <aside className="pg-side">
          <div>
            <span className="field-label">Template</span>
            <div className="preset-list">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className="preset" aria-pressed={p.id === preset} onClick={() => siteStore.set({ preset: p.id })}>
                  <b>{p.label}</b>
                  <span>{p.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">Theme</span>
            <div className="segmented">
              {THEME_ORDER.map((t) => (
                <button key={t} type="button" aria-pressed={t === theme} onClick={() => setTheme(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="field-label">Viewport</span>
            <div className="segmented">
              {VIEWPORTS.map((v) => (
                <button key={v.label} type="button" aria-pressed={v.label === vp.label} onClick={() => setVp(v)}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div role="switch" aria-checked={wireframe} tabIndex={0} className="switch" onClick={() => setWireframe((w) => !w)} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setWireframe((w) => !w)}>
            <span>
              Wireframe mode <kbd>W</kbd>
            </span>
            <span className="switch-track" />
          </div>
          <div>
            <label className="field-label" htmlFor="pg-title">
              App title
            </label>
            <input id="pg-title" className="text-input" value={title} onChange={(e) => siteStore.set({ playgroundTitle: e.target.value })} spellCheck={false} />
          </div>
          {preset === "streaming" ? (
            <div>
              <label className="field-label" htmlFor="pg-md">
                Markdown source
              </label>
              <textarea id="pg-md" className="text-area" value={markdown} onChange={(e) => setMarkdown(e.target.value)} spellCheck={false} />
            </div>
          ) : null}
        </aside>
        <div className="pg-main">
          <div className="pg-stage">
            <SandboxConsole
              frame={sandbox.frame}
              engine={sandbox.engine}
              source={`playground://${preset}:1`}
              filter={`${vp.label} · ${theme}`}
              captureWheel
              cols={vp.cols}
              rows={vp.rows}
            />
            <div className="callout-live">
              <span className="dot" />
              <span>
                <strong>Click the console</strong> to focus it — keystrokes go to this sandbox only. {preset === "snake" ? "WASD / arrows to steer, Space to start." : null}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowSource((s) => !s)}>
                {showSource ? "Hide source" : "View source"}
              </button>
            </div>
            {showSource ? (
              <div className="codeblock" style={{ margin: 0 }}>
                <div className="codeblock-head">
                  <span>{source.file}</span>
                  <span className="lang">tsx</span>
                  <CopyButton text={source.code} />
                </div>
                <div style={{ maxHeight: 480, overflow: "auto" }}>
                  <HighlightedCode code={source.code} language="tsx" lineNumbers />
                </div>
              </div>
            ) : null}
          </div>
          <Inspector log={sandbox.log} totalMs={sandbox.stats?.totalMs ?? 0} dirtyRows={sandbox.stats?.dirtyRows ?? 0} />
        </div>
      </div>
    </>
  );
}
