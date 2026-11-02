import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getCompanion } from "../console-companion/boot";
import { siteStore, type OpenCodeConnection } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { autoConnectTarget, BRIDGE_COMMAND, DEFAULT_SERVER_URL, discoverServer, normalizeServerUrl, pairBridge, PairingRequired, rememberBridgeToken, rememberServer } from "../demos/opencode/live";
import { CopyCommand } from "../site/CodeBlock";

async function connectTo(target: string, quiet: boolean, token?: string): Promise<void> {
  if (!quiet) siteStore.set({ opencode: { mode: "connecting", url: target } });
  try {
    const info = await discoverServer(target, quiet ? 1500 : 3000, token);
    siteStore.set({ opencode: { mode: "live", url: info.apiBase, version: info.version, protocol: info.protocol, bridge: info.bridge, token: info.token } });
    rememberServer(info.apiBase);
  } catch (err) {
    // A running bridge asks for its code even on a quiet reconnect.
    if (err instanceof PairingRequired) {
      siteStore.set({ opencode: { mode: "pair", url: err.apiBase } });
      return;
    }
    if (quiet) return;
    const message = err instanceof Error ? (err.name === "AbortError" || err.name === "TimeoutError" ? "Timed out" : err.message) : String(err);
    siteStore.set({ opencode: { mode: "error", url: target, message: message === "Failed to fetch" || message === "Load failed" ? `Unreachable. Run ${BRIDGE_COMMAND}.` : message } });
  }
}

let autoTried = false;
let probing = false;

const noSubscribe = (): (() => void) => () => undefined;

/** `false` while prerendering and hydrating, `true` afterwards (and on client navigations). */
function useHydrated(): boolean {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

type PanelStatus = "pending" | "checking" | "exited" | OpenCodeConnection["mode"];

/**
 * The connection panel below the OpenCode demo, in the pad's fixed-height bottom slot. The status is
 * one line in every state: a skeleton until hydrated (prerendering can't know about a remembered
 * server), then checking, sandbox, connecting, live or error, and after `/exit` a way back in.
 * Resolving it never moves the page.
 */
export function ConnectPanel(): ReactNode {
  const site = useSite();
  const conn = site.opencode;
  const hydrated = useHydrated();
  // The default first (as prerendered), then the remembered server once mounted.
  const [url, setUrl] = useState(() => (conn.mode === "sandbox" ? DEFAULT_SERVER_URL : conn.url));
  const [code, setCode] = useState("");
  const [pairing, setPairing] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const lastMode = useRef(conn.mode);
  // After Connect (not a quiet reconnect on load), move straight to the code field.
  useEffect(() => {
    if (conn.mode === "pair" && lastMode.current === "connecting") codeInput.current?.focus();
    lastMode.current = conn.mode;
  }, [conn.mode]);
  const [checking, setChecking] = useState(() => probing || (!autoTried && conn.mode === "sandbox" && autoConnectTarget() !== null));

  // Quietly reconnect to a server that worked before; stay in the sandbox otherwise.
  useEffect(() => {
    if (siteStore.getSnapshot().opencode.mode !== "sandbox") return;
    const target = autoConnectTarget();
    if (target) setUrl(target);
    if (autoTried) return;
    autoTried = true;
    if (!target) return;
    probing = true;
    setChecking(true);
    void connectTo(target, true).finally(() => {
      probing = false;
      setChecking(false);
    });
  }, []);

  const pair = async (target: string): Promise<void> => {
    setPairing(true);
    let token: string;
    try {
      token = await pairBridge(target, code);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPairing(false);
      if (!message.startsWith("Wrong code")) {
        siteStore.set({ opencode: { mode: "error", url: target, message } });
        return;
      }
      siteStore.set({ opencode: { mode: "pair", url: target, message } });
      codeInput.current?.select();
      return;
    }
    setPairing(false);
    setCode("");
    await connectTo(target, false, token);
  };

  const status: PanelStatus = site.opencodeExited ? "exited" : !hydrated ? "pending" : checking && conn.mode === "sandbox" ? "checking" : conn.mode;
  const host = (u: string): string => u.replace(/^https?:\/\//, "");

  const line =
    status === "pending" ? (
      <span className="skeleton skeleton-line" />
    ) : status === "exited" ? (
      <>
        <span className="dot dot-idle" />
        <span className="status-text">OpenCode exited.</span>
        <button type="button" className="text-link status-action" onClick={() => getCompanion()?.activate()}>
          Restart
        </button>
      </>
    ) : status === "checking" ? (
      <>
        <span className="dot dot-idle pulse" />
        <span className="status-text">{`Looking for OpenCode at ${host(url)}…`}</span>
      </>
    ) : conn.mode === "sandbox" ? (
      <>
        <span className="dot dot-idle" />
        <span className="status-text">Sandbox with a scripted agent. Connect your own server:</span>
      </>
    ) : conn.mode === "pair" ? (
      <>
        <span className="dot dot-amber" />
        <span className="status-text" title={conn.message}>
          {conn.message ?? "Enter the code from your terminal."}
        </span>
        <button
          type="button"
          className="text-link status-action"
          onClick={() => {
            setCode("");
            rememberServer(null);
            siteStore.set({ opencode: { mode: "sandbox" } });
          }}
        >
          Cancel
        </button>
      </>
    ) : conn.mode === "connecting" ? (
      <>
        <span className="dot dot-amber pulse" />
        <span className="status-text">Connecting…</span>
      </>
    ) : conn.mode === "live" ? (
      <>
        <span className="dot" />
        <span className="status-text" title={conn.url}>
          {`Connected to ${host(conn.url)}${conn.version ? ` · ${conn.version}` : ""}`}
        </span>
        <button
          type="button"
          className="text-link status-action"
          onClick={() => {
            rememberServer(null);
            rememberBridgeToken(conn.url, null);
            siteStore.set({ opencode: { mode: "sandbox" } });
          }}
        >
          Disconnect
        </button>
      </>
    ) : (
      <>
        <span className="dot dot-amber" />
        <span className="status-text" title={conn.message}>
          {conn.message}
        </span>
      </>
    );

  return (
    <div className="pad-connect" data-console-bypass="" data-status={status}>
      {/* Keyed by state: a new line is not a layout shift, while re-centring the old one would be. */}
      <div className="status-line" key={status}>
        {line}
      </div>
      {conn.mode === "live" ? null : (
        <div className="pad-connect-row">
          <CopyCommand command={BRIDGE_COMMAND} />
          {conn.mode === "pair" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (code.trim() && !pairing) void pair(conn.url);
              }}
              className="connect-form"
            >
              <input
                className="text-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                ref={codeInput}
                placeholder="Pairing code"
                spellCheck={false}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                maxLength={16}
                aria-label="Pairing code"
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={!code.trim() || pairing}>
                {pairing ? "Pairing…" : "Pair"}
              </button>
            </form>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
}
