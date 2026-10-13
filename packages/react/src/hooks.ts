import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ConsoleRenderer } from "@textjs/core";
import { ScopeContext, useRuntime } from "./context";
import type { InputEventType, KeyEvent, PasteEvent, RegisterOptions, WheelEvent } from "./input-manager";
import type { ConsoleStats, ViewportState } from "./stores";

export interface AppApi {
  renderer: ConsoleRenderer;
  /** Unmount the app and dispose the renderer. */
  exit(error?: unknown): void;
  pause(): void;
  resume(): void;
  resize(cols: number, rows: number): void;
}

export function useApp(): AppApi {
  const rt = useRuntime();
  return useMemo(
    () => ({
      renderer: rt.renderer,
      exit: (error?: unknown) => rt.exit(error),
      pause: () => rt.renderer.pause(),
      resume: () => rt.renderer.resume(),
      resize: (cols: number, rows: number) => rt.renderer.resize(cols, rows),
    }),
    [rt],
  );
}

export interface ViewportApi extends ViewportState {
  resize(cols: number, rows: number): void;
  setResponsive(responsive: boolean): void;
}

/** Reactive console grid size, page focus and pause state. */
export function useViewport(): ViewportApi {
  const rt = useRuntime();
  const state = useSyncExternalStore(rt.viewport.subscribe, rt.viewport.getSnapshot, rt.viewport.getSnapshot);
  const resize = useCallback((cols: number, rows: number) => rt.renderer.resize(cols, rows), [rt]);
  const setResponsive = useCallback(
    (responsive: boolean) => {
      rt.renderer.viewport.setResponsive(responsive);
      rt.viewport.refresh();
    },
    [rt],
  );
  return useMemo(() => ({ ...state, resize, setResponsive }), [state, resize, setResponsive]);
}

export interface UseConsoleStatsOptions {
  /** Minimum milliseconds between updates (default `250`, i.e. 4 Hz). */
  interval?: number;
}

/**
 * Throttled renderer telemetry. Updates only after frames caused by other
 * changes, so displaying stats never re-triggers itself.
 */
export function useConsoleStats(options: UseConsoleStatsOptions = {}): ConsoleStats & { refresh(): void } {
  const rt = useRuntime();
  const interval = options.interval ?? 250;
  const subscribe = useCallback((listener: () => void) => rt.stats.subscribe(listener, interval), [rt, interval]);
  const stats = useSyncExternalStore(subscribe, rt.stats.getSnapshot, rt.stats.getSnapshot);
  const refresh = useCallback(() => rt.stats.publish(), [rt]);
  return useMemo(() => ({ ...stats, refresh }), [stats, refresh]);
}

export interface UseInputOptions {
  /** Disable the handler without unmounting (default `true`). */
  isActive?: boolean;
  /** Higher priorities run first; call `event.stopPropagation()` to stop lower ones. */
  priority?: number;
  /** Keep receiving input while a `<Modal>` outside this component is open. */
  global?: boolean;
}

function useInputRegistration<K extends InputEventType>(
  type: K,
  handler: (event: K extends "key" ? KeyEvent : K extends "paste" ? PasteEvent : WheelEvent) => void,
  options: UseInputOptions,
): void {
  const rt = useRuntime();
  const scope = useContext(ScopeContext);
  const ref = useRef(handler);
  ref.current = handler;
  const isActive = options.isActive ?? true;
  const priority = options.priority ?? 0;
  const global = options.global ?? false;
  useLayoutEffect(() => {
    if (!isActive) return;
    const opts: RegisterOptions = { priority, scope, global };
    return rt.input.register(type, ((e: never) => (ref.current as (e: never) => void)(e)) as never, opts);
  }, [rt, type, isActive, priority, scope, global]);
}

/** Subscribe to keyboard input. Handlers run at React's discrete (sync) priority. */
export function useInput(handler: (event: KeyEvent) => void, options: UseInputOptions = {}): void {
  useInputRegistration("key", handler, options);
}

/** Subscribe to clipboard pastes (⌘V / Ctrl+V). */
export function usePaste(handler: (event: PasteEvent) => void, options: UseInputOptions = {}): void {
  useInputRegistration("paste", handler, options);
}

/** Subscribe to mouse wheel / trackpad scrolling. */
export function useWheel(handler: (event: WheelEvent) => void, options: UseInputOptions = {}): void {
  useInputRegistration("wheel", handler, options);
}
