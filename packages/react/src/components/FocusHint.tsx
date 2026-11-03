import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import type { DockSide } from "@textjs/core";
import { useRuntime } from "../context";
import { usePageFocus } from "../hooks";
import { useTheme } from "../theme";
import { Box } from "./Box";
import { Text } from "./Text";

export const FOCUS_HINT_TEXT = "Click the page to use the keyboard";

/** The hint's label. Docked at the bottom, the page is directly above the console. */
export function focusHintLabel(dock: DockSide): string {
  return dock === "bottom" ? `▲ ${FOCUS_HINT_TEXT}` : FOCUS_HINT_TEXT;
}

export interface FocusHintProps {
  /**
   * Whether the app wants the keyboard right now. Default: the root's input engine reads keys
   * from this page, which is never the case when server rendering, in tests or in a terminal.
   */
  active?: boolean;
}

/**
 * A one-row bar over the bottom of the console frame while the page doesn't have focus, so a visitor
 * who clicked into DevTools knows why keys stopped reaching the app. Renders nothing while focused.
 * It covers the last row because DevTools keeps the console scrolled to the bottom: when a frame is
 * taller than the console, its first rows are out of view.
 * Console roots draw one by default (`focusHint: false` turns it off); render it yourself with
 * `active` to show it only when your app wants the keyboard.
 */
export function FocusHint({ active }: FocusHintProps): ReactNode {
  const rt = useRuntime();
  const focused = usePageFocus();
  const getDock = useCallback(() => rt.viewport.getSnapshot().dock, [rt]);
  const dock = useSyncExternalStore(rt.viewport.subscribe, getDock, getDock);
  const theme = useTheme();
  if (focused || !(active ?? rt.engine.element !== null)) return null;
  return (
    <Box position="absolute" bottom={0} left={0} right={0} height={1} zIndex={1000} justifyContent="center" bg={theme.fg} wireframeLabel="focus-hint">
      <Text color={theme.bg} wrap="truncate-end">
        {focusHintLabel(dock)}
      </Text>
    </Box>
  );
}
