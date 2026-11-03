import { memo, type CSSProperties, type ReactNode } from "react";
import { hasRtl, type StyledFrame, type StyledSpan } from "@textjs/core";

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

const FONT = 'ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Mono", Consolas, monospace';

const DEVTOOLS = {
  dark: { bg: "#282828", panel: "#3c3c3c", border: "#4a4a4a", text: "#e3e3e3", muted: "#9aa0a6", accent: "#7cacf8", row: "#202124" },
  light: { bg: "#ffffff", panel: "#f1f3f4", border: "#d0d0d0", text: "#1f1f1f", muted: "#5f6368", accent: "#1a73e8", row: "#ffffff" },
} as const;

/**
 * Spans are full-height inline blocks and rows are clipped to exactly one line
 * box, so cell backgrounds tile edge to edge with no horizontal scanline gaps
 * and no font fallback can ever shift a row.
 */
function spanStyle(s: StyledSpan, linePx: number): CSSProperties {
  const st: CSSProperties = { display: "inline-block", height: linePx, lineHeight: `${linePx}px`, verticalAlign: "top" };
  if (s.fgCss !== null) st.color = s.fgCss;
  if (s.bgCss !== null) st.backgroundColor = s.bgCss;
  if (s.bold) st.fontWeight = 700;
  if (s.italic) st.fontStyle = "italic";
  if (s.underline || s.strikethrough) st.textDecoration = `${s.underline ? "underline" : ""} ${s.strikethrough ? "line-through" : ""}`.trim();
  // Cells are already in visual order: stop the browser from reordering right-to-left text again.
  if (hasRtl(s.text)) {
    st.direction = "ltr";
    st.unicodeBidi = "bidi-override";
  }
  return st;
}

/** The width-weighted most common cell background, used to fill the mirror behind every row. */
function dominantBg(frame: StyledFrame): string | null {
  const weight = new Map<string, number>();
  let best: string | null = null;
  let bestWeight = 0;
  for (const row of frame.rows) {
    for (const s of row) {
      if (s.bgCss === null) continue;
      const w = (weight.get(s.bgCss) ?? 0) + s.width;
      weight.set(s.bgCss, w);
      if (w > bestWeight) {
        best = s.bgCss;
        bestWeight = w;
      }
    }
  }
  return best;
}

const Row = memo(function Row({ spans, height }: { spans: StyledSpan[]; height: number }): ReactNode {
  // Keyed by start column: a run that moves becomes a new node instead of a shifted one, so
  // live frames never register as layout shifts (CLS) on the host page.
  let x = 0;
  return (
    <div style={{ height: `${height}px`, lineHeight: `${height}px`, overflow: "hidden", whiteSpace: "pre" }}>
      {spans.map((s) => {
        const col = x;
        x += s.width;
        return (
          <span key={col} style={spanStyle(s, height)}>
            {s.text}
          </span>
        );
      })}
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
  const fill = frame === null ? (appearance === "dark" ? "#0a0a0a" : c.row) : (dominantBg(frame) ?? c.row);
  const body = (
    <div
      data-textjs-mirror=""
      style={{
        // Cells are in visual order: an RTL host page (<html dir="rtl">) must not reverse the span flow.
        direction: "ltr",
        fontFamily: FONT,
        fontSize,
        lineHeight: `${lineHeight}px`,
        fontVariantLigatures: "none",
        whiteSpace: "pre",
        color: c.text,
        background: fill,
        overflowX: "auto",
        overflowY: "hidden",
        userSelect: "text",
        position: "relative",
        ...(frame === null ? null : { height: frame.height * lineHeight, contain: "layout paint style" }),
      }}
    >
      {frame === null ? (
        <div style={{ color: c.muted, padding: "8px 0" }}>Waiting for the first frame…</div>
      ) : (
        <>
          {frame.rows.map((row, y) => (
            <Row key={y} spans={row} height={lineHeight} />
          ))}
          {frame._sprites?.map((sp, i) => (
            <div
              key={`sp-${i}`}
              style={{
                position: "absolute",
                left: `${(sp.x / Math.max(1, frame.width)) * 100}%`,
                top: sp.y * lineHeight,
                width: `${(sp.width / Math.max(1, frame.width)) * 100}%`,
                height: sp.height * lineHeight,
                background: sp.bgCss ?? fill,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <img
                src={sp.dataUrl}
                alt=""
                style={{
                  width: sp.fit === "fill" ? "100%" : "auto",
                  height: sp.fit === "fill" ? "100%" : "100%",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  aspectRatio: sp.fit === "fill" ? undefined : `${sp.sourceWidth * sp.pixelAspect} / ${sp.sourceHeight}`,
                  objectFit: sp.fit === "fill" ? "fill" : "contain",
                  imageRendering: "pixelated",
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
  if (!chrome) {
    return (
      <div className={className} style={{ display: "inline-block", maxWidth: "100%", direction: "ltr", ...style }}>
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
        direction: "ltr",
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
        <span style={{ color: c.muted, textDecoration: "underline", whiteSpace: "nowrap", fontSize: 11 }}>{source}</span>
      </div>
    </div>
  );
}
