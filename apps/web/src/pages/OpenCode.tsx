import { useState, type ReactNode } from "react";
import { siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { normalizeServerUrl, OpenCodeClient } from "../demos/opencode/live";
import { A } from "../router";
import { devtoolsShortcut } from "../site/Chrome";
import { CopyCommand } from "../site/CodeBlock";
import { LiveConsole } from "./Home";

const KEYS: Array<[string, string]> = [
  ["enter", "Send prompt"],
  ["shift+enter", "Newline"],
  ["tab", "Toggle build / plan"],
  ["ctrl+p", "Command palette"],
  ["ctrl+n", "New session"],
  ["ctrl+x", "Cycle model"],
  ["esc", "Interrupt / leave prompt"],
  ["pgup/pgdn", "Scroll transcript"],
];

function ConnectPanel(): ReactNode {
  const site = useSite();
  const conn = site.opencode;
  const [url, setUrl] = useState(conn.mode === "sandbox" ? "http://localhost:4096" : conn.url);

  const connect = async (): Promise<void> => {
    const target = normalizeServerUrl(url);
    if (!target) return;
    siteStore.set({ opencode: { mode: "connecting", url: target } });
    try {
      const info = await OpenCodeClient.discover(target);
      siteStore.set({ opencode: { mode: "live", url: info.apiBase, version: info.version } });
    } catch (err) {
      const message = err instanceof Error ? (err.name === "AbortError" ? "Timed out" : err.message) : String(err);
      siteStore.set({ opencode: { mode: "error", url: target, message: message === "Failed to fetch" ? "Unreachable from this browser (not running, or blocked by CORS)" : message } });
    }
  };

  return (
    <div className="panel">
      <h3>Connect to Local OpenCode Server</h3>
      <p>Switch from the Interactive Sandbox to live HTTP + SSE against an opencode server on your machine.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void connect();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <input className="text-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:4096" spellCheck={false} aria-label="OpenCode server URL" />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={conn.mode === "connecting"}>
            {conn.mode === "connecting" ? "Connecting…" : conn.mode === "live" ? "Reconnect" : "Connect"}
          </button>
          {conn.mode !== "sandbox" ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => siteStore.set({ opencode: { mode: "sandbox" } })}>
              Use sandbox
            </button>
          ) : null}
        </div>
      </form>
      <div className="status-line">
        {conn.mode === "sandbox" ? (
          <>
            <span className="dot dot-idle" /> Interactive Sandbox Mode
          </>
        ) : conn.mode === "connecting" ? (
          <>
            <span className="dot dot-amber pulse" /> Connecting to {conn.url}…
          </>
        ) : conn.mode === "live" ? (
          <>
            <span className="dot" /> Live · {conn.url}
            {conn.version ? ` · v${conn.version}` : ""}
          </>
        ) : (
          <>
            <span className="dot dot-amber" /> {conn.message}
          </>
        )}
      </div>
      <p className="subtle" style={{ fontSize: 12.5 }}>
        Try <code className="mono">http://127.0.0.1:4096</code>. Start a server with{" "}
        <code className="mono">opencode serve --port 4096</code>.
      </p>
    </div>
  );
}

export function OpenCodePage(): ReactNode {
  return (
    <>
      <div className="container page-head">
        <div className="eyebrow">▼ Showcase</div>
        <h1>OpenCode in the Console</h1>
        <p>
          OpenCode Lite is a full coding-agent TUI built with Text.js: sessions, streaming Markdown, read / edit / shell tool cards, a command palette and a multi-line
          prompt. It is running below, and in your real DevTools console. Press <kbd>{devtoolsShortcut()}</kbd>.
        </p>
      </div>
      <div className="container" style={{ paddingBottom: 96 }}>
        <div className="oc-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <LiveConsole source="opencode://lite:1" />
            <div className="callout-live">
              <span className="dot pulse" />
              <span>
                <strong>Click the console and type any prompt.</strong> This is the same buffer that is live in your DevTools — type here, watch it stream there.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ConnectPanel />
            <div className="panel">
              <h3>Run it locally</h3>
              <p>Scaffold the full app with a dev-server proxy to your local opencode — no CORS required.</p>
              <CopyCommand command="bunx create-text-app my-opencode --template opencode" />
            </div>
            <div className="panel">
              <h3>Keyboard</h3>
              <div className="keys">
                {KEYS.map(([k, label]) => (
                  <span key={k} style={{ display: "contents" }}>
                    <kbd style={{ justifySelf: "start" }}>{k}</kbd>
                    <span>{label}</span>
                  </span>
                ))}
              </div>
            </div>
            <A href="/docs/opencode" className="btn btn-secondary">
              Read: how OpenCode Lite is built →
            </A>
          </div>
        </div>
      </div>
    </>
  );
}
