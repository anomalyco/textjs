import { memo, type CSSProperties, type ReactNode } from "react";
import type { StyledFrame, StyledSpan } from "@textjs/core";

export interface ConsoleMirrorProps {
  /** Snapshot from `extractStyledFrame(renderer.buffer)`. */
  frame: StyledFrame | null;
  /** Draw Chrome DevTools chrome (tab strip + console toolbar). */
  chrome?: boolean;
  /** Source badge shown at the right of the log row. */
  source?: string;
  appearance?: "dark" | "light";
  fontSize?: number;
  lineHeight?: number;
  className?: string;
  style?: CSSProperties;
}

const FONT = 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, monospace';

const DEVTOOLS = {
  dark: { bg: "#282828", panel: "#3c3c3c", border: "#4a4a4a", text: "#e3e3e3", muted: "#9aa0a6", accent: "#7cacf8", row: "#202124" },
  light: { bg: "#ffffff", panel: "#f1f3f4", border: "#d0d0d0", text: "#1f1f1f", muted: "#5f6368", accent: "#1a73e8", row: "#ffffff" },
} as const;

function spanStyle(s: StyledSpan): CSSProperties | undefined {
  if (s.fgCss === null && s.bgCss === null && !s.bold && !s.italic && !s.underline && !s.strikethrough) return undefined;
  const st: CSSProperties = {};
  if (s.fgCss !== null) st.color = s.fgCss;
  if (s.bgCss !== null) st.backgroundColor = s.bgCss;
  if (s.bold) st.fontWeight = 700;
  if (s.italic) st.fontStyle = "italic";
  if (s.underline || s.strikethrough) st.textDecoration = `${s.underline ? "underline" : ""} ${s.strikethrough ? "line-through" : ""}`.trim();
  return st;
}

const Row = memo(function Row({ spans, height }: { spans: StyledSpan[]; height: number }): ReactNode {
  return (
    <div style={{ height, whiteSpace: "pre" }}>
      {spans.map((s, i) => (
        <span key={i} style={spanStyle(s)}>
          {s.text}
        </span>
      ))}
    </div>
  );
});

/** An HTML rendition of the DevTools console frame, for docs, previews and screenshots. */
export function ConsoleMirror({
  frame,
  chrome = false,
  source = "text://viewport:1",
  appearance = "dark",
  fontSize = 12,
  lineHeight = 14,
  className,
  style,
}: ConsoleMirrorProps): ReactNode {
  const c = DEVTOOLS[appearance];
  const body = (
    <div
      data-textjs-mirror=""
      style={{
        fontFamily: FONT,
        fontSize,
        lineHeight: `${lineHeight}px`,
        fontVariantLigatures: "none",
        color: c.text,
        background: c.row,
        overflowX: "auto",
        userSelect: "text",
      }}
    >
      {frame === null ? (
        <div style={{ color: c.muted, padding: "8px 0" }}>Waiting for the first frame…</div>
      ) : (
        frame.rows.map((row, y) => <Row key={y} spans={row} height={lineHeight} />)
      )}
    </div>
  );
  if (!chrome) {
    return (
      <div className={className} style={{ display: "inline-block", maxWidth: "100%", ...style }}>
        {body}
      </div>
    );
  }
  const tabs = ["Elements", "Console", "Sources", "Network", "Performance"];
  return (
    <div
      className={className}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        overflow: "hidden",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 12,
        color: c.text,
        maxWidth: "100%",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, background: c.panel, borderBottom: `1px solid ${c.border}`, height: 28 }}>
        {tabs.map((t) => (
          <div
            key={t}
            style={{
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              color: t === "Console" ? c.text : c.muted,
              borderBottom: t === "Console" ? `2px solid ${c.accent}` : "2px solid transparent",
            }}
          >
            {t}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderBottom: `1px solid ${c.border}`, color: c.muted }}>
        <span>⊘</span>
        <span style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 6px" }}>top ▾</span>
        <span style={{ flex: 1, border: `1px solid ${c.border}`, borderRadius: 4, padding: "1px 6px" }}>Filter</span>
        <span>Default levels ▾</span>
      </div>
      <div style={{ padding: "2px 8px", color: c.muted, fontStyle: "italic", borderBottom: `1px solid ${c.border}` }}>Console was cleared</div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
        <span style={{ color: c.muted, textDecoration: "underline", whiteSpace: "nowrap", fontSize: 11 }}>{source}</span>
      </div>
    </div>
  );
}
