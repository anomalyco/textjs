import { useEffect, useState } from "react";
import type { FrameResult, StyledFrame } from "@textjs/core";
import { onTelemetry, subscribeCompanionFrame } from "../console-companion/boot";

/** The live companion's styled frame, mirrored into the page. */
export function useCompanionFrame(enabled = true): StyledFrame | null {
  const [frame, setFrame] = useState<StyledFrame | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return subscribeCompanionFrame(setFrame);
  }, [enabled]);
  return frame;
}

export interface Telemetry {
  frames: number;
  gated: number;
  totalMs: number;
  layoutMs: number;
  rasterMs: number;
  encodeMs: number;
  spanCount: number;
  dirtyRows: number;
  yogaNodes: number;
  fps: number;
  cols: number;
  rows: number;
}

function pick(f: FrameResult): Telemetry {
  return {
    frames: f.frameCount,
    gated: f.skippedFrames,
    totalMs: f.totalMs,
    layoutMs: f.layoutMs,
    rasterMs: f.rasterMs,
    encodeMs: f.encodeMs,
    spanCount: f.spanCount,
    dirtyRows: f.dirtyRows,
    yogaNodes: f.yogaNodes,
    fps: f.fps,
    cols: f.cols,
    rows: f.rows,
  };
}

/** Throttled telemetry from the companion renderer (DOM state only; never re-renders the console). */
export function useCompanionTelemetry(intervalMs = 250): Telemetry | null {
  const [t, setT] = useState<Telemetry | null>(null);
  useEffect(() => {
    let latest: FrameResult | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = onTelemetry((f) => {
      // Skip gated frames' zeroed timings so the strip shows the last real frame.
      if (!f.skipped || latest === null) latest = f;
      else latest = { ...latest, skippedFrames: f.skippedFrames };
      if (timer === null) {
        timer = setTimeout(() => {
          timer = null;
          if (latest) setT(pick(latest));
        }, intervalMs);
      }
    });
    return () => {
      off();
      if (timer !== null) clearTimeout(timer);
    };
  }, [intervalMs]);
  return t;
}
