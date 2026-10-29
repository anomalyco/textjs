import { Component, useEffect, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { Components } from "./Components";
import { FrameView } from "./FrameView";
import { CopyIcon, FitIcon, PauseIcon, PlayIcon, WireframeIcon } from "./icons";
import type { PanelState, PanelStore, Tab } from "./store";
import { Timeline } from "./Timeline";

export function usePanelState(store: PanelStore): PanelState {
  return useSyncExternalStore(store.subscribe, store.get);
}

const TABS: ReadonlyArray<[Tab, string]> = [
  ["components", "Components"],
  ["frame", "Frame"],
  ["timeline", "Timeline"],
];

export function App({ store }: { store: PanelStore }): ReactNode {
  const s = usePanelState(store);
  const root = s.roots.find((r) => r.id === s.rootId) ?? null;
  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <span className="mark">▼</span>
          <span>Text.js</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={s.tab === id} className="tab" onClick={() => store.setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        {s.roots.length > 1 ? (
          <select className="select" value={s.rootId ?? ""} onChange={(e) => store.selectRoot(Number(e.target.value))} aria-label="Console root">
            {s.roots.map((r) => (
              <option key={r.id} value={r.id}>{`${r.name} · #${r.id}`}</option>
            ))}
          </select>
        ) : null}
        <div className="spacer" />
        {root ? (
          <div className="controls">
            <span className={`status ${root.paused ? "paused" : ""}`} title={root.paused ? "Output paused" : `${root.fps} frames in the last second`}>
              <span className="dot" />
              <span className="status-label">{root.paused ? "Paused" : `${root.fps} fps`}</span>
            </span>
            <SizeControl cols={root.cols} rows={root.rows} responsive={root.responsive} store={store} />
            <button className="icon-btn" title="Follow the docked DevTools size" aria-label="Fit to console" aria-pressed={root.responsive} onClick={() => store.fit()}>
              <FitIcon />
            </button>
            <button className="icon-btn" title="Layout wireframe" aria-label="Wireframe" aria-pressed={root.wireframe} onClick={() => store.toggleWireframe()}>
              <WireframeIcon />
            </button>
            <button className="icon-btn" title={root.paused ? "Resume output" : "Pause output"} aria-label={root.paused ? "Resume" : "Pause"} aria-pressed={root.paused} onClick={() => store.togglePause()}>
              {root.paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <button className="icon-btn" title="Copy frame as text" aria-label="Copy frame" onClick={() => store.copyFrame()}>
              <CopyIcon />
            </button>
          </div>
        ) : null}
      </header>
      <main className="body">
        <PanelErrorBoundary key={s.tab} onRetry={() => store.refresh()}>
          {root === null ? (
            <Empty status={s.status} />
          ) : s.tab === "components" ? (
            <Components store={store} state={s} />
          ) : s.tab === "frame" ? (
            <FrameView store={store} state={s} />
          ) : (
            <Timeline store={store} state={s} root={root} />
          )}
        </PanelErrorBoundary>
      </main>
      {s.toast ? <div className="toast">{s.toast}</div> : null}
      {s.error && root ? <div className="toast error">{s.error}</div> : null}
    </div>
  );
}

/** Keeps a bad snapshot from blanking the whole panel; the toolbar stays usable. */
export class PanelErrorBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[Text.js DevTools]", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return (
      <div className="empty" role="alert">
        <div className="empty-mark">▼</div>
        <p className="empty-title">This view hit an error</p>
        <p className="empty-body mono">{error.message.slice(0, 200)}</p>
        <button
          className="btn"
          onClick={() => {
            this.setState({ error: null });
            this.props.onRetry();
          }}
        >
          Retry
        </button>
      </div>
    );
  }
}

function SizeControl({ cols, rows, responsive, store }: { cols: number; rows: number; responsive: boolean; store: PanelStore }): ReactNode {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState(String(cols));
  const [r, setR] = useState(String(rows));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setC(String(cols));
    setR(String(rows));
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, cols, rows]);
  const apply = (): void => {
    store.resize(Number(c), Number(r));
    setOpen(false);
  };
  return (
    <div className="size" ref={ref}>
      <button className="chip" onClick={() => setOpen((v) => !v)} title="Pin the grid size" aria-expanded={open}>
        <span className="mono">{`${cols} × ${rows}`}</span>
        <span className="chip-meta">{responsive ? "responsive" : "fixed"}</span>
      </button>
      {open ? (
        <form
          className="popover"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <label>
            <span>Columns</span>
            <input className="input mono" inputMode="numeric" value={c} onChange={(e) => setC(e.target.value)} autoFocus />
          </label>
          <label>
            <span>Rows</span>
            <input className="input mono" inputMode="numeric" value={r} onChange={(e) => setR(e.target.value)} />
          </label>
          <div className="popover-actions">
            <button type="button" className="btn ghost" onClick={() => (store.fit(), setOpen(false))}>
              Fit
            </button>
            <button type="submit" className="btn">
              Pin size
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function Empty({ status }: { status: PanelState["status"] }): ReactNode {
  return (
    <div className="empty">
      <div className="empty-mark">▼</div>
      {status === "connecting" ? (
        <p className="empty-title">Connecting…</p>
      ) : (
        <>
          <p className="empty-title">No console roots on this page</p>
          <p className="empty-body">
            Text.js apps register with this panel when they create a console root. Reload the page if the app started before the extension was installed.
          </p>
        </>
      )}
    </div>
  );
}
