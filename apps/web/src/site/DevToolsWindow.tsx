import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { StyledFrame } from "@textjs/core";
import { ConsoleMirror } from "@textjs/react/dom";
import { t } from "../i18n/t";
import { ClearIcon, DeviceIcon, EyeIcon, GearIcon, InspectIcon, KebabIcon, SidebarIcon } from "./icons";

/**
 * Reserves a mirror's final cols×rows box (zero layout shift) with one node: a single line of
 * `cols` spaces in the mirror's font gives the exact width a full row of cells measures to, at any
 * zoom, and the explicit height covers `rows` lines.
 */
function MirrorStrut({ cols, rows, fontSize, lineHeight }: { cols: number; rows: number; fontSize: number; lineHeight: number }): ReactNode {
  return (
    <div className="mirror-strut" aria-hidden="true" style={{ fontSize, lineHeight: `${lineHeight}px`, height: rows * lineHeight }}>
      {" ".repeat(cols)}
    </div>
  );
}

/** Scale (never up) and resulting height that fit a mirror's natural size into its container. */
export function fitMirror(outer: HTMLElement, inner: HTMLElement): { scale: number; height: number } {
  const natural = inner.scrollWidth;
  const scale = natural > 0 ? Math.min(1, outer.clientWidth / natural) : 1;
  return { scale, height: inner.offsetHeight * scale };
}

/**
 * Inline script for prerendered pages, run right after the markup: applies the same fit
 * `ScaledMirror` computes on hydration, so scaled mirrors never resize after first paint.
 */
const FIT_ALL = `document.querySelectorAll(".mirror-scale").forEach(function(o){var i=o.firstElementChild;if(!i)return;var f=fit(o,i);o.style.height=f.height+"px";if(f.scale!==1)i.style.transform="scale("+f.scale+")"})`;
export const PREFIT_MIRRORS_SCRIPT = `(function(){var fit=${fitMirror.toString()};${FIT_ALL}})()`;

/**
 * Inline script for prerendered pages, run before the markup. A long page reaches the browser in
 * several chunks and may paint between them, before `PREFIT_MIRRORS_SCRIPT` has arrived. Mutation
 * callbacks run before the next paint, so refitting on every parsed chunk means a mirror is never
 * painted at its unscaled height.
 */
export const PREFIT_MIRRORS_WHILE_PARSING_SCRIPT = `(function(){if(typeof MutationObserver==="undefined")return;var fit=${fitMirror.toString()};var run=function(){${FIT_ALL}};var mo=new MutationObserver(run);mo.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener("DOMContentLoaded",function(){mo.disconnect()})})()`;

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
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number | undefined }>({ scale: 1, height: undefined });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = (): void => {
      const { scale, height } = fitMirror(o, i);
      setFit((f) => (Math.abs(f.scale - scale) < 0.001 && f.height === height ? f : { scale, height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="mirror-scale" dir="ltr" style={{ height: fit.height }}>
      <div ref={inner} style={{ position: "relative", transform: fit.scale === 1 ? undefined : `scale(${fit.scale})` }}>
        {/* The strut always sizes the box; live frames of any size (a responsive companion
            resizing, a stale frame from another page) paint over it without moving layout. */}
        <MirrorStrut cols={cols} rows={rows} fontSize={fontSize} lineHeight={lineHeight} />
        {frame ? (
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <ConsoleMirror frame={frame} fontSize={fontSize} lineHeight={lineHeight} style={{ display: "block" }} />
          </div>
        ) : null}
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
  /** Makes the element-picker icon a toggle for the frame's layout wireframe. */
  onInspect?: () => void;
  inspecting?: boolean;
}

const TABS = ["Elements", "Console", "Sources", "Network", "Performance", "Memory", "Application"];

/** A pixel-faithful Chrome DevTools Console panel rendering a Text.js frame. */
export function DevToolsWindow({
  frame,
  source = "viewport:3",
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
  onInspect,
  inspecting = false,
}: DevToolsWindowProps): ReactNode {
  const decor = onInspect ? true : undefined;
  return (
    <div className={`devtools ${className ?? ""}`} dir="ltr" data-console-engage={engage ? "" : undefined}>
      <div className="dt-tabs" aria-hidden={onInspect ? undefined : true}>
        {onInspect ? (
          <button
            type="button"
            className={`dt-icon dt-inspect${inspecting ? " active" : ""}`}
            aria-pressed={inspecting}
            aria-label={t("Show layout wireframe")}
            // Toggling the wireframe doesn't take over the keyboard (the companion engages on document mousedown).
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onInspect}
          >
            <InspectIcon />
          </button>
        ) : (
          <span className="dt-icon">
            <InspectIcon />
          </span>
        )}
        {/* Only the inspect button is exposed; everything else in the strip is decoration. */}
        <span className="dt-icon" aria-hidden={decor}>
          <DeviceIcon />
        </span>
        <span className="dt-sep" aria-hidden={decor} />
        {TABS.map((tab) => (
          <span key={tab} className={`dt-tab${tab === "Console" ? " active" : ""}`} aria-hidden={decor}>
            {tab}
          </span>
        ))}
        <span className="spacer" aria-hidden={decor} />
        <span className="dt-icon" aria-hidden={decor}>
          <GearIcon />
        </span>
        <span className="dt-icon" aria-hidden={decor}>
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
