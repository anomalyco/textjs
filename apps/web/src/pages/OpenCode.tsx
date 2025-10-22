import { useEffect, useState, type ReactNode } from "react";
import { siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { autoConnectTarget, BRIDGE_COMMAND, DEFAULT_SERVER_URL, normalizeServerUrl, OpenCodeClient, rememberServer } from "../demos/opencode/live";
import { CopyCommand } from "../site/CodeBlock";
import { LiveConsole } from "./Home";

async function connectTo(target: string, quiet: boolean): Promise<void> {
  if (!quiet) siteStore.set({ opencode: { mode: "connecting", url: target } });
  try {
    const info = await OpenCodeClient.discover(target, quiet ? 1500 : 3000);
    siteStore.set({ opencode: { mode: "live", url: info.apiBase, version: info.version, protocol: info.protocol, bridge: info.bridge } });
    rememberServer(info.apiBase);
  } catch (err) {
    if (quiet) return;
    const message = err instanceof Error ? (err.name === "AbortError" || err.name === "TimeoutError" ? "Timed out" : err.message) : String(err);
    siteStore.set({ opencode: { mode: "error", url: target, message: message === "Failed to fetch" || message === "Load failed" ? `Unreachable. Run ${BRIDGE_COMMAND}.` : message } });
  }
}

let autoTried = false;

function ConnectPanel(): ReactNode {
  const site = useSite();
  const conn = site.opencode;
  const [url, setUrl] = useState(conn.mode === "sandbox" ? DEFAULT_SERVER_URL : conn.url);

  // Quietly reconnect to a server that worked before; stay in the sandbox otherwise.
  useEffect(() => {
    if (autoTried || siteStore.getSnapshot().opencode.mode !== "sandbox") return;
    autoTried = true;
    const target = autoConnectTarget();
    if (target) void connectTo(target, true);
  }, []);

  return (
    <div className="panel">
      <h3>Connect Local Server</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const target = normalizeServerUrl(url);
          if (target) void connectTo(target, false);
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input className="text-input" style={{ flex: 1, minWidth: 0 }} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={DEFAULT_SERVER_URL} spellCheck={false} aria-label="OpenCode server URL" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={conn.mode === "connecting"}>
          {conn.mode === "connecting" ? "Connecting…" : "Connect"}
        </button>
      </form>
      <div className="status-line">
        {conn.mode === "sandbox" ? (
          <>
            <span className="dot dot-idle" /> Sandbox
          </>
        ) : conn.mode === "connecting" ? (
          <>
            <span className="dot dot-amber pulse" /> Connecting…
          </>
        ) : conn.mode === "live" ? (
          <>
            <span className="dot" /> {conn.url.replace(/^https?:\/\//, "")}
            {conn.version ? ` · ${conn.version}` : ""}
            <button
              type="button"
              className="text-link"
              style={{ marginLeft: "auto", background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
              onClick={() => {
                rememberServer(null);
                siteStore.set({ opencode: { mode: "sandbox" } });
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <span className="dot dot-amber" /> {conn.message}
          </>
        )}
      </div>
      <CopyCommand command={BRIDGE_COMMAND} />
      <p>Bridges your local opencode daemon with CORS headers on :4096.</p>
    </div>
  );
}

export function OpenCodePage(): ReactNode {
  return (
    <>
      <div className="container page-head">
        <h1>OpenCode</h1>
        <p>The OpenCode TUI, rendered in console.log.</p>
      </div>
      <div className="container" style={{ paddingBottom: 120 }}>
        <div className="oc-grid">
          <LiveConsole source="opencode://lite:1" />
          <ConnectPanel />
        </div>
      </div>
    </>
  );
}
