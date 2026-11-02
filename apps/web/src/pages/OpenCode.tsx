import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { getCompanion } from "../console-companion/boot";
import { siteStore, type OpenCodeConnection } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { autoConnectTarget, BRIDGE_COMMAND, DEFAULT_SERVER_URL, discoverServer, normalizeServerUrl, pairBridge, PAIRING_PROMPT, PairingRequired, rememberBridgeToken, rememberServer, WrongCode } from "../demos/opencode/live";
import { CopyCommand } from "../site/CodeBlock";

/** `quiet`: a reconnect on load, which stays in the sandbox on failure. `token`: fresh from pairing (the panel stays in pair mode meanwhile). */
async function connectTo(target: string, quiet: boolean, token?: string): Promise<void> {
  if (!quiet && !token) siteStore.set({ opencode: { mode: "connecting", url: target } });
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

const STATUS_ID = "opencode-connect-status";
const PAIRING_CODE_LENGTH = 6;

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
  // A full code submits itself, so Enter right after must not send it twice.
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const focusUrl = useRef(false);
  const lastMode = useRef(conn.mode);
  // After Connect (not a quiet reconnect on load), move straight to the code field; after Cancel or Disconnect, back to the URL.
  useEffect(() => {
    if (conn.mode === "pair" && lastMode.current === "connecting") codeInput.current?.focus();
    if (focusUrl.current && conn.mode === "sandbox") {
      focusUrl.current = false;
      urlInput.current?.focus();
    }
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

  const toSandbox = (forget: string | null): void => {
    setCode("");
    rememberServer(null);
    if (forget) rememberBridgeToken(forget, null);
    focusUrl.current = true;
    siteStore.set({ opencode: { mode: "sandbox" } });
  };

  // Stays in pair mode, with "Pairing…" in the status line, until the connection is up or has failed.
  const pair = async (target: string, value: string): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPairing(true);
    siteStore.set({ opencode: { mode: "pair", url: target } });
    try {
      const token = await pairBridge(target, value);
      setCode("");
      await connectTo(target, false, token);
    } catch (err) {
      if (err instanceof WrongCode) {
        siteStore.set({ opencode: { mode: "pair", url: target, message: err.message, wrong: true } });
        codeInput.current?.select();
      } else {
        siteStore.set({ opencode: { mode: "error", url: target, message: err instanceof Error ? err.message : String(err) } });
      }
    } finally {
      inFlight.current = false;
      setPairing(false);
    }
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
        <span className={`dot dot-amber${pairing ? " pulse" : ""}`} />
        <span className="status-text" id={STATUS_ID} title={conn.message}>
          {pairing ? "Pairing…" : (conn.message ?? PAIRING_PROMPT)}
        </span>
        <button type="button" className="text-link status-action" onClick={() => toSandbox(conn.url)}>
          Cancel
        </button>
      </>
    ) : conn.mode === "connecting" ? (
      <>
        <span className="dot dot-amber pulse" />
        <span className="status-text" id={STATUS_ID}>Connecting…</span>
      </>
    ) : conn.mode === "live" ? (
      <>
        <span className="dot" />
        <span className="status-text" title={conn.url}>
          {`Connected to ${host(conn.url)}${conn.version ? ` · ${conn.version}` : ""}`}
        </span>
        <button type="button" className="text-link status-action" onClick={() => toSandbox(conn.url)}>
          Disconnect
        </button>
      </>
    ) : (
      <>
        <span className="dot dot-amber" />
        <span className="status-text" id={STATUS_ID} title={conn.message}>
          {conn.message}
        </span>
      </>
    );

  return (
    <div className="pad-connect" data-console-bypass="" data-status={status}>
      {/* Keyed by state: a new line is not a layout shift, while re-centring the old one would be. The region stays put so screen readers hear each change. */}
      <div className="status-region" role="status" aria-live="polite" aria-atomic="true">
        <div className="status-line" key={status}>
          {line}
        </div>
      </div>
      {conn.mode === "live" ? null : (
        <div className="pad-connect-row">
          <CopyCommand command={BRIDGE_COMMAND} />
          {conn.mode === "pair" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!code.trim()) codeInput.current?.focus();
                else void pair(conn.url, code);
              }}
              className="connect-form"
            >
              <input
                className="text-input code-input"
                value={code}
                onChange={(e) => {
                  const value = e.target.value;
                  setCode(value);
                  // A full code (typed or pasted) submits itself; the bridge ignores case, dashes and spaces.
                  if (value.replace(/[^0-9a-z]/gi, "").length === PAIRING_CODE_LENGTH) void pair(conn.url, value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    toSandbox(conn.url);
                  }
                }}
                ref={codeInput}
                placeholder="Pairing code"
                spellCheck={false}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                maxLength={16}
                aria-label="Pairing code"
                aria-invalid={conn.wrong === true}
                aria-describedby={STATUS_ID}
              />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={pairing}>
                Pair
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
              <input ref={urlInput} className="text-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={DEFAULT_SERVER_URL} spellCheck={false} aria-label="OpenCode server URL" aria-describedby={STATUS_ID} />
              <button type="submit" className="btn btn-secondary btn-sm" disabled={conn.mode === "connecting"}>
                Connect
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
