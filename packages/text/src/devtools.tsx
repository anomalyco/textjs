/**
 * `@textjs/next/devtools` — the in-console `[▼]` DevTools pill & inspector, and the
 * Next.js-style Redbox error overlay, all rendered inside `console.log`.
 */

import { useContext, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { BRAND_MARK, ENGINE_NAME, VERSION } from "@textjs/core";
import {
  Badge,
  Box,
  createScope,
  Divider,
  ScopeContext,
  ScrollBox,
  Text,
  useApp,
  useConsoleStats,
  useInput,
  useRuntime,
  useTheme,
  useViewport,
  type KeyEvent,
  type Scope,
} from "@textjs/react";
import { useOptionalAppShell, useOptionalRouterState, useRouterState, type AppShellState } from "./context";
import { devErrors, type DevError, type DevErrorStore, type ViteErrorLike } from "./dev-errors";
import { isNavigationError } from "./navigation-errors";
import { formatParams, type RouteMatch } from "./routing";

export { devErrors, DevErrorStore, type DevError, type DevErrorKind, type DevErrorSnapshot, type ViteErrorLike } from "./dev-errors";

/** `F2` or `` Ctrl+` `` toggles the DevTools inspector. */
export function isDevToolsShortcut(e: { key: string; code?: string; ctrl: boolean; meta: boolean; alt: boolean }): boolean {
  if (e.key === "f2" && !e.ctrl && !e.meta && !e.alt) return true;
  return e.ctrl && !e.meta && (e.key === "`" || e.code === "Backquote");
}

/** Current route details (pattern, params, `○ Static` / `ƒ Dynamic`) for inspectors. */
export function useRouteInfo(): { match: RouteMatch; title: string | undefined; pathname: string } {
  const s = useRouterState();
  return { match: s.match, title: s.metadata.title, pathname: s.location.pathname };
}

/** A focus + input trap for an overlay layer (like `<Modal>`, without the panel chrome). */
function useOverlayScope(): Scope {
  const rt = useRuntime();
  const parent = useContext(ScopeContext);
  const scope = useMemo(() => createScope(parent, true), [parent]);
  useLayoutEffect(() => rt.focus.pushTrap(scope), [rt, scope]);
  return scope;
}

function useErrors(store: DevErrorStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

// ---------------------------------------------------------------------------
// <TextDevOverlay />
// ---------------------------------------------------------------------------

export interface TextDevOverlayProps {
  /** Start with the inspector open. */
  initialOpen?: boolean;
  /** Also mount `<RedboxOverlay />` (default `true`). */
  redbox?: boolean;
  store?: DevErrorStore;
  /** Draw the `[▼]` pill (default `true`). Without it, the shortcut still opens the inspector. */
  pill?: boolean;
  /** Keys that toggle the inspector (default `isDevToolsShortcut`: `F2` or `` Ctrl+` ``). */
  shortcut?: (e: KeyEvent) => boolean;
  /** Theme and wireframe controls for apps without the App Router, which otherwise provides them. */
  shell?: AppShellState;
}

/**
 * The `[▼]` pill in the bottom-left corner of the console frame. `F2` or
 * `` Ctrl+` `` opens the Turbolog DevTools inspector.
 */
export function TextDevOverlay({ initialOpen = false, redbox = true, store = devErrors, pill = true, shortcut = isDevToolsShortcut, shell }: TextDevOverlayProps): ReactNode {
  const theme = useTheme();
  const [open, setOpen] = useState(initialOpen);
  const errors = useErrors(store);
  const hasErrors = errors.errors.length > 0;

  useInput(
    (e) => {
      if (!shortcut(e)) return;
      e.stopPropagation();
      setOpen((v) => !v);
    },
    { global: true, priority: 1000 },
  );

  return (
    <>
      {pill ? (
        <Box position="absolute" left={0} bottom={0} zIndex={40} height={1} flexDirection="row" wireframeLabel="devtools-pill">
          <Text bg={hasErrors ? theme.danger : theme.elevated} fg={hasErrors ? "#ffffff" : theme.muted} bold={hasErrors} wrap="nowrap">
            {hasErrors ? `[${BRAND_MARK} !]` : `[${BRAND_MARK}]`}
          </Text>
        </Box>
      ) : null}
      {open ? <DevToolsPanel store={store} shell={shell} onClose={() => setOpen(false)} /> : null}
      {redbox && !open ? <RedboxOverlay store={store} /> : null}
    </>
  );
}

function Row({ label, children, color }: { label: string; children: ReactNode; color?: string }): ReactNode {
  const theme = useTheme();
  return (
    <Box height={1} flexDirection="row" flexShrink={0}>
      <Text color={theme.subtle} wrap="nowrap" width={10} flexShrink={0}>
        {label}
      </Text>
      <Text color={color ?? theme.fg} wrap="truncate-end" flexShrink={1}>
        {children}
      </Text>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  const theme = useTheme();
  return (
    <Box flexDirection="column" flexGrow={1} flexBasis={0} minWidth={24}>
      <Text color={theme.muted} bold wrap="nowrap">
        {title}
      </Text>
      {children}
    </Box>
  );
}

function ms(n: number): string {
  return `${n.toFixed(2)}ms`;
}

interface DevToolsPanelProps {
  store: DevErrorStore;
  shell: AppShellState | undefined;
  onClose: () => void;
}

function DevToolsPanel(props: DevToolsPanelProps): ReactNode {
  const scope = useOverlayScope();
  return (
    <ScopeContext value={scope}>
      <DevToolsPanelBody {...props} />
    </ScopeContext>
  );
}

function DevToolsPanelBody({ store, shell: shellProp, onClose }: DevToolsPanelProps): ReactNode {
  const theme = useTheme();
  const app = useApp();
  const viewport = useViewport();
  const stats = useConsoleStats({ interval: 250 });
  const contextShell = useOptionalAppShell();
  const shell = shellProp ?? contextShell;
  const router = useOptionalRouterState();
  const errors = useErrors(store);
  const [localWireframe, setLocalWireframe] = useState(false);
  const wireframe = shell ? shell.wireframe : localWireframe;

  useInput((e) => {
    if (e.ctrl || e.meta || e.alt) return;
    if (e.key === "escape") onClose();
    else if (e.key === "w") {
      if (shell) shell.setWireframe(!wireframe);
      else {
        app.renderer.setWireframe(!localWireframe);
        setLocalWireframe(!localWireframe);
      }
    } else if (e.key === "t") shell?.cycleTheme();
    else if (e.key === "r") viewport.setResponsive(!viewport.responsive);
    else if (e.key === "return" && errors.errors.length > 0) {
      store.show();
      onClose();
    } else return;
    e.stopPropagation();
  });

  const match = router?.match;
  const typeLabel = match ? (match.notFound ? "⚠ Not Found" : match.dynamic ? "ƒ Dynamic" : "○ Static") : "—";

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} zIndex={45} backdropDim={0.45} flexDirection="column" justifyContent="flex-end" wireframeLabel="devtools">
      <Box
        flexDirection="column"
        flexShrink={0}
        border="rounded"
        borderColor={theme.borderFocus}
        bg={theme.elevated}
        fg={theme.fg}
        paddingX={1}
        title={` ${BRAND_MARK} Text.js DevTools · ${ENGINE_NAME} `}
        titleColor={theme.fg}
        bottomTitle=" W wireframe · T theme · R viewport · esc close "
        bottomTitleColor={theme.subtle}
        bottomTitleAlign="right"
      >
        <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
          <Section title="ROUTE">
            <Row label="type" color={match?.dynamic ? theme.warning : theme.success}>
              {typeLabel}
            </Row>
            <Row label="pattern">{match?.pattern ?? "—"}</Row>
            <Row label="pathname">{router?.location.pathname ?? (typeof location !== "undefined" ? location.pathname : "—")}</Row>
            <Row label="params">{match ? formatParams(match.params) : "{}"}</Row>
            <Row label="title">{router?.metadata.title ?? "—"}</Row>
            <Row label="segments">{match ? String(match.chain.length) : "0"}</Row>
          </Section>
          <Section title="FRAME">
            <Row label="grid">{`${stats.cols}×${stats.rows} cells`}</Row>
            <Row label="spans">{`${stats.spanCount} %c spans`}</Row>
            <Row label="total">{ms(stats.totalMs)}</Row>
            <Row label="phases">{`${stats.layoutMs.toFixed(2)} / ${stats.rasterMs.toFixed(2)} / ${stats.encodeMs.toFixed(2)}`}</Row>
            <Row label="yoga">{`${stats.yogaNodes} nodes`}</Row>
            <Row label="gated" color={theme.success}>{`${stats.skippedFrames} noop frames`}</Row>
          </Section>
          <Section title="TOGGLES">
            <Row label="[W] wire" color={wireframe ? theme.success : theme.muted}>
              {wireframe ? "on" : "off"}
            </Row>
            <Row label="[T] theme" color={theme.accent}>
              {shell ? shell.theme.name : theme.name}
            </Row>
            <Row label="[R] view">{viewport.responsive ? "responsive" : `fixed ${viewport.cols}×${viewport.rows}`}</Row>
            <Row label="issues" color={errors.errors.length > 0 ? theme.danger : theme.success}>
              {errors.errors.length > 0 ? `${errors.errors.length} · enter to open` : "0 · all clear"}
            </Row>
            <Row label="engine">{`${ENGINE_NAME} ${VERSION}`}</Row>
          </Section>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// <RedboxOverlay />
// ---------------------------------------------------------------------------

export interface RedboxOverlayProps {
  store?: DevErrorStore;
}

/** The Next.js-style Redbox, rendered inside `console.log`. `Esc` dismisses. */
export function RedboxOverlay({ store = devErrors }: RedboxOverlayProps): ReactNode {
  const snap = useErrors(store);
  if (!snap.visible || snap.errors.length === 0) return null;
  return <RedboxLayer store={store} errors={snap.errors} />;
}

function RedboxLayer({ store, errors }: { store: DevErrorStore; errors: readonly DevError[] }): ReactNode {
  const scope = useOverlayScope();
  return (
    <ScopeContext value={scope}>
      <RedboxBody store={store} errors={errors} />
    </ScopeContext>
  );
}

function RedboxBody({ store, errors }: { store: DevErrorStore; errors: readonly DevError[] }): ReactNode {
  const theme = useTheme();
  const [index, setIndex] = useState(errors.length - 1);
  const i = Math.max(0, Math.min(errors.length - 1, index));
  const err = errors[i] as DevError;

  useInput((e) => {
    if (e.key === "escape") store.dismiss();
    else if (e.key === "left") setIndex(Math.max(0, i - 1));
    else if (e.key === "right") setIndex(Math.min(errors.length - 1, i + 1));
    else return;
    e.stopPropagation();
  });

  const heading = err.kind === "build" ? "Build Error" : err.kind === "unhandled" ? "Unhandled Runtime Error" : "Unhandled Runtime Error";
  const loc = err.location ? `${err.location.file}${err.location.line !== undefined ? `:${err.location.line}` : ""}${err.location.column !== undefined ? `:${err.location.column}` : ""}` : null;
  const frame = err.frame ? err.frame.replace(/\n+$/, "").split("\n") : [];
  const componentStack = err.componentStack
    ? err.componentStack
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];

  return (
    <Box position="absolute" top={0} left={0} right={0} bottom={0} zIndex={60} backdropDim={0.75} alignItems="center" justifyContent="center" flexDirection="column" wireframeLabel="redbox">
      <Box
        flexDirection="column"
        width="94%"
        height="92%"
        border="rounded"
        borderColor={theme.danger}
        bg={theme.elevated}
        fg={theme.fg}
        paddingX={2}
        paddingY={1}
        overflow="hidden"
        title={` ✕ ${heading} `}
        titleColor={theme.danger}
        bottomTitle=" esc dismiss · ←/→ errors · ↑/↓ scroll "
        bottomTitleColor={theme.subtle}
        bottomTitleAlign="right"
      >
        <Box height={1} flexDirection="row" flexShrink={0}>
          <Badge variant="danger">{`${i + 1} of ${errors.length} ${errors.length === 1 ? "error" : "errors"}`}</Badge>
          <Box flexGrow={1} />
          <Text color={theme.subtle} wrap="nowrap">
            {`${BRAND_MARK} Text.js ${VERSION} (${ENGINE_NAME})`}
          </Text>
        </Box>
        <Box height={1} flexShrink={0} />
        <Text color={theme.danger} bold flexShrink={0}>
          {err.kind === "build" ? err.message : `${err.name}: ${err.message}`}
        </Text>
        {loc ? (
          <Text color={theme.accent} underline wrap="truncate-start" flexShrink={0}>
            {loc}
          </Text>
        ) : null}
        {err.plugin ? (
          <Text color={theme.subtle} flexShrink={0}>
            {`plugin: ${err.plugin}`}
          </Text>
        ) : null}
        {frame.length > 0 ? (
          <Box flexDirection="column" flexShrink={0} marginTop={1} bg={theme.codeBg} paddingX={1} maxHeight={10} overflow="hidden">
            {frame.map((line, n) => (
              <Text key={n} wrap="nowrap" color={line.trimStart().startsWith(">") ? theme.danger : /^\s*\|\s*\^/.test(line) ? theme.danger : theme.muted} bold={line.trimStart().startsWith(">")}>
                {line || " "}
              </Text>
            ))}
          </Box>
        ) : null}
        <Box height={1} flexShrink={0} marginTop={1}>
          <Divider title="Call Stack" />
        </Box>
        <ScrollBox flexGrow={1} focusable autoFocus>
          {err.stack.length === 0 && componentStack.length === 0 ? (
            <Text color={theme.subtle} italic>
              No stack trace available.
            </Text>
          ) : null}
          {err.stack.map((line, n) => (
            <Text key={`s${n}`} color={theme.muted} wrap="truncate-middle">
              {line}
            </Text>
          ))}
          {componentStack.length > 0 ? (
            <Text color={theme.subtle} bold>
              {"Component Stack"}
            </Text>
          ) : null}
          {componentStack.map((line, n) => (
            <Text key={`c${n}`} color={theme.subtle} wrap="truncate-middle">
              {line}
            </Text>
          ))}
        </ScrollBox>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Vite HMR + global error wiring
// ---------------------------------------------------------------------------

/** The subset of Vite's `import.meta.hot` used by the Redbox. */
export interface HotContextLike {
  on(event: string, callback: (payload: any) => void): void;
  off?(event: string, callback: (payload: any) => void): void;
}

/**
 * Show Vite build / syntax errors in the in-console Redbox and clear them
 * (recovering crashed routes) once an HMR update applies cleanly.
 */
export function connectViteHmr(hot: HotContextLike, store: DevErrorStore = devErrors): () => void {
  const onError = (payload: { err: ViteErrorLike }): void => {
    if (payload?.err) store.reportBuild(payload.err);
  };
  const onBeforeUpdate = (): void => store.clear("build");
  const onAfterUpdate = (): void => store.clear();
  hot.on("vite:error", onError);
  hot.on("vite:beforeUpdate", onBeforeUpdate);
  hot.on("vite:afterUpdate", onAfterUpdate);
  return () => {
    hot.off?.("vite:error", onError);
    hot.off?.("vite:beforeUpdate", onBeforeUpdate);
    hot.off?.("vite:afterUpdate", onAfterUpdate);
  };
}

interface ErrorTarget {
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

/** Report uncaught exceptions and unhandled rejections to the Redbox. */
export function installGlobalErrorHandlers(target: ErrorTarget | undefined = typeof window !== "undefined" ? window : undefined, store: DevErrorStore = devErrors): () => void {
  if (!target) return () => undefined;
  const onError = (e: { error?: unknown; message?: string }): void => {
    const error = e.error ?? e.message;
    if (error !== undefined && !isNavigationError(error)) store.reportRuntime(error, null, "unhandled");
  };
  const onRejection = (e: { reason?: unknown }): void => {
    if (!isNavigationError(e.reason)) store.reportRuntime(e.reason, null, "unhandled");
  };
  target.addEventListener("error", onError);
  target.addEventListener("unhandledrejection", onRejection);
  return () => {
    target.removeEventListener("error", onError);
    target.removeEventListener("unhandledrejection", onRejection);
  };
}
