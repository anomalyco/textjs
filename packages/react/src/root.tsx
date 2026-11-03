/**
 * Console roots: mount a React tree into `console.log`.
 */

import { useSyncExternalStore, type ReactNode } from "react";
import {
  ConsoleRenderer,
  createNode,
  initYoga,
  InputEngine,
  isYogaReady,
  txError,
  type ConsoleRendererOptions,
  type FrameResult,
  type SceneNode,
  type ViewportOptions,
} from "@textjs/core";
import { RuntimeContext, ScopeContext, ROOT_SCOPE, type RootRuntime } from "./context";
import { FocusManager } from "./focus";
import { InputManager } from "./input-manager";
import { ConcurrentRoot, injectDevTools, reconciler, type ConsoleContainer } from "./reconciler";
import { StatsStore, ViewportStore } from "./stores";
import { resolveTheme, ThemeProvider, type TextTheme, type ThemeName } from "./theme";
import { TxBox } from "./host";
import { connectDevTools, type DevToolsConnection } from "./devtools-hook";
import { FocusHint } from "./components/FocusHint";

export interface ConsoleRootOptions extends Omit<ConsoleRendererOptions, "root" | "input" | "viewport"> {
  /** Fixed grid width in cells (shorthand for `viewport.width`). */
  width?: number;
  /** Fixed grid height in cells (shorthand for `viewport.height`). */
  height?: number;
  /** Follow the docked DevTools size (shorthand for `viewport.responsive`). */
  responsive?: boolean;
  viewport?: ViewportOptions;
  /** Input engine: `true` attaches a DOM engine (browser default), or pass an instance. */
  input?: InputEngine | boolean;
  theme?: TextTheme | ThemeName;
  /** Skip painting the theme background behind the app. */
  transparent?: boolean;
  /** Tab / Shift+Tab focus cycling (default `true`). */
  tabFocus?: boolean;
  /**
   * Cover the bottom row with "Click the page to use the keyboard" while the page doesn't have focus
   * and the input engine reads keys from it (default `true`). See `<FocusHint>`.
   */
  focusHint?: boolean;
  identifierPrefix?: string;
  onUncaughtError?: (error: unknown) => void;
  onRecoverableError?: (error: unknown) => void;
  /** Errors caught by an error boundary (default: `console.error`). */
  onCaughtError?: (error: unknown, errorInfo: { componentStack?: string | null }) => void;
  onExit?: (error?: unknown) => void;
}

export interface ConsoleRoot {
  render(element: ReactNode): void;
  unmount(): void;
  readonly renderer: ConsoleRenderer;
  readonly input: InputEngine;
  readonly rootNode: SceneNode;
  readonly focus: FocusManager;
  /** Flush pending synchronous React work and emit a frame immediately. */
  flushSyncRender(): FrameResult;
  /** Subscribe to every renderer frame (for DOM HUDs; never re-renders the console tree). */
  onFrame(listener: (frame: FrameResult) => void): () => void;
  /** Reactive viewport state (size, page focus, pause) for DOM companions. */
  readonly viewport: ViewportStore;
  setTheme(theme: TextTheme | ThemeName): void;
  getTheme(): TextTheme;
  /** Resolves when the app calls `exit()` or the root is unmounted. */
  waitUntilExit(): Promise<void>;
  readonly unmounted: boolean;
}

const hasDom = typeof window !== "undefined" && typeof document !== "undefined";

class ThemeStore {
  private theme: TextTheme;
  private readonly listeners = new Set<() => void>();
  constructor(theme: TextTheme) {
    this.theme = theme;
  }
  readonly subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  readonly get = (): TextTheme => this.theme;
  set(theme: TextTheme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    for (const l of this.listeners) l();
  }
}

function RootShell({
  runtime,
  themeStore,
  transparent,
  focusHint,
  children,
}: {
  runtime: RootRuntime;
  themeStore: ThemeStore;
  transparent: boolean;
  focusHint: boolean;
  children: ReactNode;
}): ReactNode {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.get);
  return (
    <RuntimeContext value={runtime}>
      <ScopeContext value={ROOT_SCOPE}>
        <ThemeProvider theme={theme}>
          <TxBox
            width="100%"
            height="100%"
            flexDirection="column"
            bg={transparent ? undefined : theme.bg}
            fg={theme.fg}
            wireframeLabel="app"
          >
            {children}
            {focusHint ? <FocusHint /> : null}
          </TxBox>
        </ThemeProvider>
      </ScopeContext>
    </RuntimeContext>
  );
}

function defaultErrorHandler(error: unknown): void {
  console.error(error);
}

/** Create a root synchronously. Requires `await initYoga()` to have resolved. */
export function createConsoleRootSync(options: ConsoleRootOptions = {}): ConsoleRoot {
  if (!isYogaReady()) {
    throw txError("TX001");
  }
  injectDevTools();
  const {
    width,
    height,
    responsive,
    viewport,
    input,
    theme,
    transparent = false,
    tabFocus = true,
    focusHint = true,
    identifierPrefix = "tx",
    onUncaughtError = defaultErrorHandler,
    onRecoverableError = defaultErrorHandler,
    onCaughtError = defaultErrorHandler,
    onExit,
    onFrame,
    ...rendererOptions
  } = options;

  const rootNode = createNode("box", { width: "100%", height: "100%", flexDirection: "column", wireframeLabel: "root" });
  let stats: StatsStore | null = null;
  const engineOption: InputEngine | boolean = input ?? (hasDom ? true : new InputEngine({ document: null }));
  const userBeforeFrame = rendererOptions.beforeFrame;
  let devtools: DevToolsConnection | null = null;
  const renderer = new ConsoleRenderer({
    ...rendererOptions,
    root: rootNode,
    input: engineOption,
    viewport: { ...viewport, ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}), ...(responsive !== undefined ? { responsive } : {}) },
    beforeFrame: () => {
      if (devtools !== null && devtools.active) {
        const t = performance.now();
        reconciler.flushSyncWork();
        devtools.setReactMs(performance.now() - t);
      } else reconciler.flushSyncWork();
      userBeforeFrame?.();
    },
    onFrame: (frame) => {
      stats?.handleFrame(frame);
      if (devtools !== null) devtools.frame(frame);
      onFrame?.(frame);
    },
  });
  const engine = renderer.input ?? new InputEngine({ document: null });
  stats = new StatsStore(renderer);
  const focus = new FocusManager();
  if (!tabFocus) focus.disable();
  const inputManager = new InputManager(engine, focus, renderer);
  const viewportStore = new ViewportStore(renderer);
  const themeStore = new ThemeStore(resolveTheme(theme));

  const container: ConsoleContainer = {
    rootNode,
    onCommit: () => {
      if (devtools !== null) devtools.commit();
      renderer.requestRender();
    },
  };

  let unmounted = false;
  let resolveExit: () => void = () => undefined;
  const exitPromise = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });

  const fiberRoot = reconciler.createContainer(
    container,
    ConcurrentRoot,
    null,
    false,
    null,
    identifierPrefix,
    (error) => onUncaughtError(error),
    (error, info) => onCaughtError(error, info),
    (error) => onRecoverableError(error),
    () => undefined,
    null,
  );
  devtools = connectDevTools({ fiberRoot, rootNode, renderer });

  const unmount = (): void => {
    if (unmounted) return;
    unmounted = true;
    reconciler.updateContainerSync(null, fiberRoot, null, null);
    reconciler.flushSyncWork();
    devtools?.dispose();
    devtools = null;
    inputManager.dispose();
    viewportStore.dispose();
    stats?.dispose();
    renderer.dispose();
    rootNode.destroy();
    resolveExit();
  };

  const runtime: RootRuntime = {
    renderer,
    engine,
    container,
    rootNode,
    input: inputManager,
    focus,
    viewport: viewportStore,
    stats,
    exit: (error?: unknown) => {
      // Defer so `exit()` is safe to call from render-phase handlers and effects.
      queueMicrotask(() => {
        if (unmounted) return;
        unmount();
        onExit?.(error);
      });
    },
  };

  const statsStore = stats;
  return {
    render(element: ReactNode) {
      if (unmounted) throw txError("TX005");
      reconciler.updateContainerSync(
        <RootShell runtime={runtime} themeStore={themeStore} transparent={transparent} focusHint={focusHint}>
          {element}
        </RootShell>,
        fiberRoot,
        null,
        null,
      );
      reconciler.flushSyncWork();
    },
    unmount,
    renderer,
    input: engine,
    rootNode,
    focus,
    flushSyncRender() {
      reconciler.flushSyncWork();
      return renderer.renderNow();
    },
    onFrame: (listener) => statsStore.onFrame(listener),
    viewport: viewportStore,
    setTheme: (t) => themeStore.set(resolveTheme(t)),
    getTheme: () => themeStore.get(),
    waitUntilExit: () => exitPromise,
    get unmounted() {
      return unmounted;
    },
  };
}

/** Load Yoga, create the renderer and return a console root. */
export async function createConsoleRoot(options: ConsoleRootOptions = {}): Promise<ConsoleRoot> {
  await initYoga();
  return createConsoleRootSync(options);
}

/** Create a root and render `element` into the DevTools console. */
export async function renderToConsole(element: ReactNode, options: ConsoleRootOptions = {}): Promise<ConsoleRoot> {
  const root = await createConsoleRoot(options);
  root.render(element);
  return root;
}
