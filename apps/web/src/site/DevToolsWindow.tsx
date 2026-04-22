import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { StyledFrame } from "@textjs/core";
import { ConsoleMirror } from "@textjs/react/dom";
import { ClearIcon, DeviceIcon, EyeIcon, GearIcon, InspectIcon, KebabIcon, SidebarIcon } from "./icons";

/** A blank frame used as a placeholder so mirrors reserve their final size (zero layout shift). */
export function blankFrame(cols: number, rows: number, bgCss = "#0a0a0a"): StyledFrame {
  const row = (): StyledFrame["rows"][number] => [
    { text: " ".repeat(cols), width: cols, fg: 0, bg: 0, attrs: 0, fgCss: null, bgCss, bold: false, dim: false, italic: false, underline: false, strikethrough: false, inverse: false, allowLink: false },
  ];
  return { width: cols, height: rows, rows: Array.from({ length: rows }, row) };
}

/** Scales a fixed-width console mirror down to fit its container (never up). */
export function ScaledMirror({
  frame,
  fontSize = 12,
  lineHeight = 14,
  cols = 100,
  rows = 32,
}: {
  frame: StyledFrame | null;
  fontSize?: number;
  lineHeight?: number;
  cols?: number;
  rows?: number;
}): ReactNode {
  const placeholder = useMemo(() => blankFrame(cols, rows), [cols, rows]);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number | undefined }>({ scale: 1, height: undefined });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = (): void => {
      const natural = i.scrollWidth;
      const scale = natural > 0 ? Math.min(1, o.clientWidth / natural) : 1;
      const height = i.offsetHeight * scale;
      setFit((f) => (Math.abs(f.scale - scale) < 0.001 && f.height === height ? f : { scale, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="mirror-scale" style={{ height: fit.height }}>
      <div ref={inner} style={{ transform: fit.scale === 1 ? undefined : `scale(${fit.scale})` }}>
        <ConsoleMirror frame={frame ?? placeholder} fontSize={fontSize} lineHeight={lineHeight} style={{ display: "block" }} />
      </div>
    </div>
  );
}

export interface DevToolsWindowProps {
  frame: StyledFrame | null;
  /** Source anchor shown right-aligned on the log row. */
  source?: string;
  /** Filter field placeholder text. */
  filter?: string;
  /** Overlay a "click to type" affordance on the log row. */
  onActivate?: () => void;
  /** Keyboard is currently routed into this console. */
  engaged?: boolean;
  /** Mark this window as a live companion surface: clicking it engages console input. */
  engage?: boolean;
  activateLabel?: ReactNode;
  /** Extra content rendered inside the log row (e.g. a hidden input sink). */
  children?: ReactNode;
  className?: string;
  fontSize?: number;
  lineHeight?: number;
  /** Grid size used for the placeholder before the first frame. */
  cols?: number;
  rows?: number;
}

const TABS = ["Elements", "Console", "Sources", "Network", "Performance", "Memory", "Application"];

/** A pixel-faithful Chrome DevTools Console panel rendering a Text.js frame. */
export function DevToolsWindow({
  frame,
  source = "text://viewport:1",
  filter = "Filter",
  onActivate,
  engaged = false,
  engage = false,
  activateLabel = "Click to focus",
  children,
  className,
  fontSize,
  lineHeight,
  cols,
  rows,
}: DevToolsWindowProps): ReactNode {
  return (
    <div className={`devtools ${className ?? ""}`} data-console-engage={engage ? "" : undefined}>
      <div className="dt-tabs" aria-hidden="true">
        <span className="dt-icon">
          <InspectIcon />
        </span>
        <span className="dt-icon">
          <DeviceIcon />
        </span>
        <span className="dt-sep" />
        {TABS.map((t) => (
          <span key={t} className={`dt-tab${t === "Console" ? " active" : ""}`}>
            {t}
          </span>
        ))}
        <span className="spacer" />
        <span className="dt-icon">
          <GearIcon />
        </span>
        <span className="dt-icon">
          <KebabIcon />
        </span>
      </div>
      <div className="dt-toolbar" aria-hidden="true">
        <SidebarIcon />
        <span className="dt-sep" />
        <ClearIcon />
        <span className="dt-select">top ▾</span>
        <EyeIcon />
        <span className="dt-filter">{filter}</span>
        <span className="dt-select">Default levels ▾</span>
        <span className="dt-sep" />
        <span style={{ whiteSpace: "nowrap" }}>No Issues</span>
        <GearIcon />
      </div>
      <div className={`dt-log${engaged ? " engaged" : ""}`}>
        <div className="dt-body">
          <ScaledMirror frame={frame} fontSize={fontSize} lineHeight={lineHeight} cols={cols} rows={rows} />
        </div>
        <span className="dt-source">{source}</span>
        {onActivate && !engaged ? (
          <button type="button" className="dt-focus" onClick={onActivate} data-textjs-interactive="">
            <span>
              ⌨ {activateLabel}
            </span>
          </button>
        ) : null}
        {children}
      </div>
      <div className="dt-prompt" aria-hidden="true">
        <span>›</span>
        <span className="dt-caret" style={{ opacity: engaged ? 0 : 0.6 }} />
      </div>
    </div>
  );
}
