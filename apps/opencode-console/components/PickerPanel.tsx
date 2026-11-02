import { useContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import { Box, createScope, ScopeContext, useRuntime, useViewport } from "@textjs/app";
import { useTokens } from "../lib/native-theme";

/** packages/tui/src/ui/dialog.tsx (legacy/classic surface). Same modal trap
 * as the Text.js kit; the TUI doesn't center or draw a rounded frame. */
export function InputTrap({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const rt = useRuntime(),
    parent = useContext(ScopeContext);
  const scope = useMemo(() => createScope(parent, true), [parent]);
  useLayoutEffect(() => (active ? rt.focus.pushTrap(scope) : undefined), [rt, scope, active]);
  return <ScopeContext value={scope}>{children}</ScopeContext>;
}
export function PickerPanel({ children, width = 60 }: { children: ReactNode; width?: number }) {
  const vp = useViewport(),
    t = useTokens();
  return (
    <InputTrap>
      <Box
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        zIndex={3000}
        backdropDim={150 / 255}
        alignItems="center"
        flexDirection="column"
        paddingTop={Math.floor(vp.rows / 4)}
      >
        <Box width={Math.min(width, vp.cols - 2)} flexDirection="column" paddingTop={1} bg={t.raised} fg={t.text} overflow="hidden">
          {children}
        </Box>
      </Box>
    </InputTrap>
  );
}
