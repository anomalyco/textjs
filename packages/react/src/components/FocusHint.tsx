import { useCallback, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";
import type { DockSide } from "@textjs/core";
import { useRuntime } from "../context";
import { useTheme } from "../theme";

export const FOCUS_HINT_TEXT = "Click the page to use the keyboard";

/** The hint's label. Docked at the bottom, the page is directly above the console. */
export function focusHintLabel(dock: DockSide): string {
  return dock === "bottom" ? `▲ ${FOCUS_HINT_TEXT}` : FOCUS_HINT_TEXT;
}

export interface FocusHintProps {
  /**
   * Whether the app wants the keyboard right now. Default: a `useInput` or `usePaste` handler, or a
   * focus target, is registered.
   */
  active?: boolean;
}

function Banner({ active, pageInput }: { active: boolean | undefined; pageInput: boolean }): null {
  const rt = useRuntime();
  const theme = useTheme();
  const getLabel = useCallback(() => {
    const vp = rt.viewport.getSnapshot();
    return vp.focused ? null : focusHintLabel(vp.dock);
  }, [rt]);
  const label = useSyncExternalStore(rt.viewport.subscribe, getLabel, getLabel);
  const wants = useSyncExternalStore(rt.input.subscribeWants, rt.input.wantsKeys, rt.input.wantsKeys);
  const show = label !== null && (active ?? ((pageInput || rt.engine.element !== null) && wants));
  const { fg, bg } = theme;
  useLayoutEffect(() => {
    if (!show || label === null) return;
    rt.renderer.setBanner({ text: label, fg: bg, bg: fg });
    return () => rt.renderer.setBanner(null);
  }, [rt, show, label, fg, bg]);
  return null;
}

/**
 * "Click the page to use the keyboard" in reverse video over the console frame's last row while
 * the page doesn't have focus, so a visitor who clicked into DevTools knows why keys stopped
 * reaching the app. It covers the last row because DevTools keeps the console scrolled to the
 * bottom, and it's drawn only into console frames, never into the buffer that mirrors and tests read.
 *
 * Console roots draw one by default (`focusHint: false` turns it off). Render it yourself with
 * `active` to decide when the app wants the keyboard.
 */
export function FocusHint({ active }: FocusHintProps): ReactNode {
  return active === false ? null : <Banner active={active} pageInput={false} />;
}

/**
 * The root's default hint. `pageInput` treats the engine as reading keys from a page even
 * without a sink of its own (server-rendered routes); the app must still want keys. @internal
 */
export function RootFocusHint({ pageInput }: { pageInput: boolean }): ReactNode {
  return <Banner active={undefined} pageInput={pageInput} />;
}
