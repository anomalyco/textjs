import { useApp, type ConsoleStats } from "@textjs/react";

/**
 * Stats of the last committed frame, read during render. Unlike
 * `useConsoleStats()` this never subscribes, so it can't schedule a delayed
 * stats-only re-render (and a second `console.clear()`) after the app goes idle,
 * which would wipe the visitor's DevTools text selection.
 */
export function useFrameStats(): ConsoleStats {
  const s = useApp().renderer.stats();
  return {
    fps: s.fps,
    totalMs: s.totalMs,
    layoutMs: s.layoutMs,
    rasterMs: s.rasterMs,
    encodeMs: s.encodeMs,
    spanCount: s.spanCount,
    dirtyRows: s.dirtyRows,
    yogaNodes: s.yogaNodes,
    frameCount: s.frameCount,
    skippedFrames: s.skippedFrames,
    cols: s.cols,
    rows: s.rows,
  };
}
