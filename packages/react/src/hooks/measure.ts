/**
 * Read laid-out node sizes. Layout runs after React commits, so measurements
 * arrive one frame later and re-render only when the size actually changes.
 */

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { SceneNode } from "@textjs/core";
import { useRuntime } from "../context";

export interface Measurement {
  width: number;
  height: number;
  /** Absolute column of the node's top-left cell. */
  x: number;
  /** Absolute row of the node's top-left cell. */
  y: number;
  /** Inner size (minus border and padding). */
  contentWidth: number;
  contentHeight: number;
}

const ZERO: Measurement = Object.freeze({ width: 0, height: 0, x: 0, y: 0, contentWidth: 0, contentHeight: 0 });

function same(a: Measurement, b: Measurement): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.x === b.x &&
    a.y === b.y &&
    a.contentWidth === b.contentWidth &&
    a.contentHeight === b.contentHeight
  );
}

/**
 * `const [ref, { width, height }] = useMeasure()` — attach `ref` to a `<Box>`.
 * Values are `0` until the first frame has been laid out.
 */
export function useMeasure(options: { enabled?: boolean } = {}): [(node: SceneNode | null) => void, Measurement] {
  const enabled = options.enabled ?? true;
  const rt = useRuntime();
  const nodeRef = useRef<SceneNode | null>(null);
  const [size, setSize] = useState<Measurement>(ZERO);
  const last = useRef<Measurement>(ZERO);

  const read = useCallback((): void => {
    const node = nodeRef.current;
    if (node === null) return;
    const L = node.layout;
    const next: Measurement = {
      width: L.width,
      height: L.height,
      x: L.x,
      y: L.y,
      contentWidth: L.contentWidth,
      contentHeight: L.contentHeight,
    };
    if (same(next, last.current)) return;
    last.current = next;
    setSize(next);
  }, []);

  useLayoutEffect(() => (enabled ? rt.stats.onFrame(read) : undefined), [rt, read, enabled]);

  const ref = useCallback(
    (node: SceneNode | null) => {
      nodeRef.current = node;
      if (node !== null && enabled) rt.renderer.requestRender();
    },
    [rt, enabled],
  );
  return [ref, size];
}
