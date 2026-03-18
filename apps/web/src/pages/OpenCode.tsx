import { useEffect, useState, type ReactNode } from "react";
import { PAGE_HINTS, siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { autoConnectTarget, BRIDGE_COMMAND, DEFAULT_SERVER_URL, normalizeServerUrl, OpenCodeClient, rememberServer } from "../demos/opencode/live";
import { CopyCommand } from "../site/CodeBlock";
import { ConsolePad } from "../site/ConsolePad";

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
  const [url, setUrl] = useState(() => (conn.mode === "sandbox" ? (autoConnectTarget() ?? DEFAULT_SERVER_URL) : conn.url));

  // Quietly reconnect to a server that worked before; stay in the sandbox otherwise.
  useEffect(() => {
    if (autoTried || siteStore.getSnapshot().opencode.mode !== "sandbox") return;
    autoTried = true;
    const target = autoConnectTarget();
    if (target) void connectTo(target, true);
  }, []);

  const status =
    conn.mode === "sandbox" ? (
      <>
        <span className="dot dot-idle" /> Sandbox — a scripted agent. Connect yours:
      </>
    ) : conn.mode === "connecting" ? (
      <>
        <span className="dot dot-amber pulse" /> Connecting…
      </>
    ) : conn.mode === "live" ? (
      <>
        <span className="dot" />
        <span className="status-text">
          {`Connected to ${conn.url.replace(/^https?:\/\//, "")}${conn.version ? ` · ${conn.version}` : ""}`}
        </span>
        <button
          type="button"
          className="text-link status-action"
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
        <span className="dot dot-amber" /> <span className="status-text">{conn.message}</span>
      </>
    );

  return (
    <div className="pad-connect" data-console-bypass="">
      <div className="status-line">{status}</div>
      {conn.mode === "live" ? null : (
        <div className="pad-connect-row">
          <CopyCommand command={BRIDGE_COMMAND} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const raw = url.trim() || DEFAULT_SERVER_URL;
              const target = normalizeServerUrl(raw);
              if (target) {
                setUrl(target);
                void connectTo(target, false);
              }
            }}
            className="connect-form"
          >
            <input className="text-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={DEFAULT_SERVER_URL} spellCheck={false} aria-label="OpenCode server URL" />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={conn.mode === "connecting"}>
              {conn.mode === "connecting" ? "Connecting…" : "Connect"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function OpenCodePage(): ReactNode {
  const { action, hints } = PAGE_HINTS.opencode;
  return (
    <ConsolePad hints={hints} action={action} top={<span className="pad-title">OpenCode, in the console</span>}>
      <ConnectPanel />
    </ConsolePad>
  );
}
