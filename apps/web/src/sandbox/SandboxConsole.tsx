import { useEffect, useRef, useState, type ReactNode } from "react";
import type { InputEngine, StyledFrame } from "@textjs/core";
import { DevToolsWindow } from "../site/DevToolsWindow";

export interface SandboxConsoleProps {
  frame: StyledFrame | null;
  engine: InputEngine;
  source?: string;
  filter?: string;
  className?: string;
  /** Forward wheel events into the app (prevents page scroll while hovering). */
  captureWheel?: boolean;
  fontSize?: number;
  lineHeight?: number;
  cols?: number;
  rows?: number;
}

/**
 * A DevTools-styled inline console that owns its keyboard input through a
 * private hidden textarea, so typing here never reaches the live companion.
 */
export function SandboxConsole({ frame, engine, source, filter, className, captureWheel = false, fontSize, lineHeight, cols, rows }: SandboxConsoleProps): ReactNode {
  const sink = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    engine.setFocused(focused);
  }, [engine, focused]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || !captureWheel) return;
    const onWheel = (e: WheelEvent): void => {
      if (!focused) return;
      e.preventDefault();
      engine.handleWheel(e);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [engine, captureWheel, focused]);

  const activate = (): void => {
    sink.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={wrap} className={`sandbox ${className ?? ""}`} data-console-bypass="" data-textjs-interactive="" onMouseDown={(e) => {
      e.preventDefault();
      activate();
    }}>
      <DevToolsWindow frame={frame} source={source} filter={filter} engaged={focused} onActivate={activate} activateLabel="Click to focus" fontSize={fontSize} lineHeight={lineHeight} cols={cols} rows={rows}>
        <textarea
          ref={sink}
          className="sandbox-sink"
          aria-label="Sandbox console keyboard input"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && e.shiftKey) {
              sink.current?.blur();
              return;
            }
            engine.handleKeyDown(e.nativeEvent);
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            const value = el.value;
            el.value = "";
            engine.handleTextInput(value);
          }}
          onPaste={(e) => {
            e.preventDefault();
            engine.handlePaste(e.clipboardData.getData("text/plain"));
          }}
        />
      </DevToolsWindow>
    </div>
  );
}
