/**
 * The Text.js Live Preview webview: a DevTools-styled console mirror with a
 * calm VS Code toolbar, keyboard forwarding and headless auto-fit.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ConsoleMirror } from "@textjs/react/dom";
import type { StyledFrame } from "@textjs/core";
import { FrameDecoder, frameToText } from "@textjs/next/frame-protocol";
import type { HostToWebview, ModePreference, PreviewState, WebviewCommand, WebviewToHost } from "../src/webview-protocol";
import { Icon, type IconName } from "./icons";

interface VsCodeApi {
  postMessage(msg: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode: VsCodeApi =
  typeof acquireVsCodeApi === "function"
    ? acquireVsCodeApi()
    : { postMessage: (m) => (window as unknown as { __posted?: unknown[] }).__posted?.push(m), getState: () => null, setState: () => undefined };

const post = (msg: WebviewToHost): void => vscode.postMessage(msg);

const LINE = 14;
const MIRROR_FONT = 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace';

const INITIAL: PreviewState = {
  mode: "idle",
  preference: "auto",
  server: { state: "stopped", url: null, clients: 0 },
  target: null,
  path: null,
  error: null,
  follow: false,
  fontSize: 12,
  mac: navigator.platform.toLowerCase().includes("mac"),
  hint: null,
  focused: true,
  loading: false,
  restricted: false,
};

function useHost(): { state: PreviewState; frame: StyledFrame | null } {
  const [state, setState] = useState<PreviewState>(INITIAL);
  const [frame, setFrame] = useState<StyledFrame | null>(null);
  const decoder = useMemo(() => new FrameDecoder(), []);
  useEffect(() => {
    const onMessage = (e: MessageEvent<HostToWebview>): void => {
      const msg = e.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "state") setState(msg.state);
      else if (msg.type === "frame") {
        const f = decoder.apply(msg.frame);
        if (f) setFrame(f);
      } else if (msg.type === "clearFrame") {
        decoder.reset();
        setFrame(null);
      }
    };
    window.addEventListener("message", onMessage);
    post({ type: "ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [decoder]);
  return { state, frame };
}

function measureCell(fontSize: number): number {
  const probe = document.createElement("span");
  probe.textContent = "M".repeat(100);
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-family:${MIRROR_FONT};font-size:${fontSize}px;font-variant-ligatures:none`;
  document.body.appendChild(probe);
  const w = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return w || fontSize * 0.6;
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function IconButton({ icon, label, onClick, active, disabled }: { icon: IconName; label: string; onClick: () => void; active?: boolean; disabled?: boolean }): ReactNode {
  return (
    <button type="button" className={`icon-btn${active ? " active" : ""}`} title={label} aria-label={label} aria-pressed={active} onClick={onClick} disabled={disabled}>
      <Icon name={icon} />
    </button>
  );
}

const MODE_LABEL: Record<PreviewState["mode"], string> = { live: "Live", headless: "Headless", idle: "Idle" };

function ModeBadge({ state }: { state: PreviewState }): ReactNode {
  return (
    <label className={`mode mode-${state.mode}`} title="Preview source">
      <span className="dot" aria-hidden />
      <span className="mode-label">{MODE_LABEL[state.mode]}</span>
      {state.preference !== "auto" && <span className="mode-pin">pinned</span>}
      <Icon name="chevron" />
      <select
        aria-label="Preview source"
        value={state.preference}
        onChange={(e) => post({ type: "setMode", preference: e.target.value as ModePreference })}
      >
        <option value="auto">Auto: live when a tab is open</option>
        <option value="live">Live: mirror the browser tab</option>
        <option value="headless">Headless: render the file here</option>
      </select>
    </label>
  );
}

function AddressBar({ state }: { state: PreviewState }): ReactNode {
  const [draft, setDraft] = useState(state.path ?? "");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(state.path ?? "");
  }, [state.path, editing]);
  const routable = state.mode === "live" || state.target?.kind === "route";
  if (!routable) {
    return (
      <div className="address readonly" title={state.target?.label}>
        <Icon name="file" />
        <span className="address-text">{state.target?.label ?? "No file"}</span>
      </div>
    );
  }
  return (
    <form
      className="address"
      onSubmit={(e) => {
        e.preventDefault();
        const href = draft.startsWith("/") ? draft : `/${draft}`;
        post({ type: "input", msg: { type: "navigate", href } });
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      {state.mode === "live" && state.server.url ? (
        <span className="address-origin">{state.server.url.replace(/^https?:\/\//, "")}</span>
      ) : (
        <span className="address-icon" title={state.target?.label}>
          <Icon name="route" />
        </span>
      )}
      <input
        aria-label="Route"
        spellCheck={false}
        value={editing ? draft : (state.path ?? "/")}
        onFocus={() => {
          setEditing(true);
          setDraft(state.path ?? "/");
        }}
        onBlur={() => setEditing(false)}
        onChange={(e) => setDraft(e.target.value)}
      />
    </form>
  );
}

function Toolbar({ state, frame, onCopy }: { state: PreviewState; frame: StyledFrame | null; onCopy: () => void }): ReactNode {
  const cmd = (command: WebviewCommand) => () => post({ type: "command", command });
  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <span className="brand" aria-hidden>
          ▼
        </span>
        <ModeBadge state={state} />
        <AddressBar state={state} />
      </div>
      <div className="toolbar-right">
        {frame && (
          <span className="grid-size" title="Console grid (columns × rows)">
            {frame.width}×{frame.height}
          </span>
        )}
        {state.mode === "live" && <IconButton icon="follow" label={state.follow ? "Following the editor" : "Follow the editor"} active={state.follow} onClick={cmd("toggleFollow")} />}
        <IconButton icon="reload" label="Reload" onClick={cmd("reload")} disabled={state.mode === "idle"} />
        <IconButton icon="copy" label="Copy frame as text" onClick={onCopy} disabled={!frame} />
        <IconButton icon="external" label="Open in Browser Console" onClick={cmd("openBrowser")} />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Error card
// ---------------------------------------------------------------------------

function Linkified({ text }: { text: string }): ReactNode {
  const parts = text.split(/\b(TX\d{3})\b/);
  return (
    <>
      {parts.map((p, i) =>
        /^TX\d{3}$/.test(p) ? (
          <a key={i} href="#" onClick={(e) => (e.preventDefault(), post({ type: "openLink", url: `https://textjs.org/errors/${p}` }))}>
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </>
  );
}

function ErrorCard({ error }: { error: NonNullable<PreviewState["error"]> }): ReactNode {
  return (
    <section className="error" role="alert">
      <div className="error-head">
        <Icon name="error" />
        <span className="error-title">
          <Linkified text={error.message} />
        </span>
        {error.file && (
          <button type="button" className="link-btn" onClick={() => post({ type: "command", command: "openFile" })}>
            Open file
          </button>
        )}
      </div>
      {error.stack && (
        <details>
          <summary>Details</summary>
          <pre>
            <Linkified text={error.stack} />
          </pre>
        </details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ state }: { state: PreviewState }): ReactNode {
  const stopped = state.server.state !== "running";
  if (state.restricted) {
    return (
      <div className="empty">
        <div className="empty-mark" aria-hidden>
          ▼
        </div>
        <h1>Previews are off in Restricted Mode</h1>
        <p>The preview runs this project's code (its Vite config, <code>text.config.*</code> and components). Trust the workspace to render it here.</p>
        <div className="empty-actions">
          <button type="button" className="btn primary" onClick={() => post({ type: "command", command: "manageTrust" })}>
            Manage Workspace Trust
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="empty">
      <div className="empty-mark" aria-hidden>
        ▼
      </div>
      <h1>Nothing to preview yet</h1>
      <p>Open a <code>page.tsx</code>, <code>layout.tsx</code> or component file and its console frame appears here.</p>
      <div className="empty-actions">
        {stopped ? (
          <button type="button" className="btn primary" onClick={() => post({ type: "command", command: "startServer" })} disabled={state.server.state === "starting"}>
            <Icon name="play" /> {state.server.state === "starting" ? "Starting…" : "Start Dev Server"}
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={() => post({ type: "command", command: "openBrowser" })}>
            <Icon name="external" /> Open in Browser
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage (mirror + input)
// ---------------------------------------------------------------------------

function Stage({ state, frame }: { state: PreviewState; frame: StyledFrame | null }): ReactNode {
  const stageRef = useRef<HTMLDivElement>(null);
  const sinkRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const fontSize = state.fontSize;
  const lineHeight = Math.round((LINE * fontSize) / 12);
  const lastSize = useRef("");

  // Fit: headless previews size the grid to the panel; live frames scale down to fit.
  const fit = useCallback(() => {
    const stage = stageRef.current;
    const mirror = stage?.querySelector<HTMLElement>("[data-textjs-mirror]");
    const column = mirror?.parentElement;
    if (!stage || !column) return;
    const cell = measureCell(fontSize);
    const top = column.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    const availH = stage.clientHeight - top - 28;
    const cols = Math.max(20, Math.min(400, Math.floor((column.clientWidth - 2) / cell)));
    const rows = Math.max(6, Math.min(200, Math.floor(availH / lineHeight)));
    const key = `${cols}x${rows}`;
    if (key !== lastSize.current) {
      lastSize.current = key;
      post({ type: "viewport", cols, rows });
    }
    if (frame && state.mode === "live") {
      const needed = frame.width * cell + 140;
      setZoom(Math.max(0.5, Math.min(1, stage.clientWidth / needed)));
    } else setZoom(1);
  }, [fontSize, lineHeight, frame, state.mode]);

  useLayoutEffect(() => {
    fit();
    const ro = new ResizeObserver(() => fit());
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [fit]);

  const sendFocus = (f: boolean): void => {
    setFocused(f);
    post({ type: "focus", focused: f });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.nativeEvent.isComposing) return;
    // Leave editor-level shortcuts (⌘P, ⌘W, ⌘⇧P…) to VS Code; ⌘C/⌘V keep their defaults.
    if (state.mac ? e.metaKey && !e.ctrlKey : e.ctrlKey && e.shiftKey) return;
    if (e.key === "Meta" || e.key === "Control" || e.key === "Shift" || e.key === "Alt") return;
    if (!state.mac && e.ctrlKey && (e.key === "v" || e.key === "c")) return;
    e.preventDefault();
    post({
      type: "input",
      msg: { type: "key", key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, repeat: e.repeat },
    });
  };

  const showMirror = state.mode !== "idle";
  const source = state.mode === "live" ? "text://viewport:1" : `${state.target?.label.split("/").pop() ?? "preview"}:1`;

  return (
    <div
      ref={stageRef}
      className={`stage${focused ? " focused" : ""}`}
      onMouseDown={(e) => {
        if (!showMirror) return;
        if ((e.target as HTMLElement).closest("[data-textjs-mirror]")) {
          e.preventDefault();
          sinkRef.current?.focus();
        }
      }}
      onWheel={(e) => {
        if (!showMirror || !(e.target as HTMLElement).closest("[data-textjs-mirror]")) return;
        post({ type: "input", msg: { type: "wheel", deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode } });
      }}
    >
      {showMirror ? (
        <>
          <div className="window" style={{ zoom }}>
            <ConsoleMirror frame={frame} chrome source={source} fontSize={fontSize} lineHeight={lineHeight} style={{ borderRadius: 10 }} />
            {state.loading && !frame && (
              <div className="loading">
                <span className="spinner" /> Rendering {state.target?.label ?? "preview"}…
              </div>
            )}
          </div>
          <textarea
            ref={sinkRef}
            className="sink"
            aria-label="Keyboard input for the app"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            onFocus={() => sendFocus(true)}
            onBlur={() => sendFocus(false)}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text/plain");
              if (text) post({ type: "input", msg: { type: "paste", text } });
            }}
            onInput={(e) => {
              (e.target as HTMLTextAreaElement).value = "";
            }}
          />
          <footer className="hint">
            {focused ? (
              <>
                <span className="hint-live" /> Keys go to the app · click outside to release
              </>
            ) : (
              <>{state.hint ?? "Click the console to interact"}</>
            )}
          </footer>
        </>
      ) : (
        <EmptyState state={state} />
      )}
    </div>
  );
}

function App(): ReactNode {
  const { state, frame } = useHost();
  const onCopy = (): void => {
    if (frame) post({ type: "copied", text: frameToText(frame) });
  };
  return (
    <div className="app" data-mode={state.mode}>
      <Toolbar state={state} frame={frame} onCopy={onCopy} />
      {state.error && <ErrorCard error={state.error} />}
      <Stage state={state} frame={frame} />
    </div>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
