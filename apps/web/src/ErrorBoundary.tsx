import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Top-level boundary: a calm dark fallback instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("▼ Text.js website crashed", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#ededed",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 560, border: "1px solid #262626", borderRadius: 8, padding: 24, background: "#111" }}>
          <div style={{ fontSize: 14, color: "#a1a1a1", marginBottom: 8 }}>▼ Text.js</div>
          <h1 style={{ fontSize: 20, margin: "0 0 12px", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "#a1a1a1", margin: "0 0 16px", lineHeight: 1.6 }}>
            The website hit an unexpected error. The console app may still be running in DevTools.
          </p>
          <pre style={{ fontSize: 12, color: "#ff6166", whiteSpace: "pre-wrap", margin: "0 0 16px" }}>{error.message}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: "#ededed", color: "#0a0a0a", border: 0, borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
