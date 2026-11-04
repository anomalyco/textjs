import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { activateCompanion, companionReady, isCompanionConfigured, isInteractivePress, isRefocusPress } from "../console-companion/bridge";
import { PRESETS, siteStore } from "../console-companion/store";
import { preloadCompanionTab } from "../console-companion/tabs-loader";
import { useSite } from "../console-companion/useSite";
import { exampleFrame, exampleHeader, PREVIEW_META } from "../docs/preview-meta";
import type { PreviewSpec } from "../docs/previews";
import { SandboxConsole } from "../sandbox/SandboxConsole";
import { useSandbox } from "../sandbox/useSandbox";
import { t } from "../i18n/t";
import { CopyButton } from "./CodeBlock";
import { DevToolsWindow } from "./DevToolsWindow";
import { HighlightedCode } from "./highlight";
import { useCompanionFrame } from "./useCompanion";
import { prefetchFailed } from "../telemetry/capture";
import { useInView } from "./useInView";

/** Same rule as `.desktop-only`: phones and tablets have no DevTools console to run in. */
const CONSOLE_MEDIA = "(max-width: 640px), (hover: none) and (pointer: coarse)";

let previewsCache: Record<string, PreviewSpec> | null = null;
let previewsPromise: Promise<Record<string, PreviewSpec>> | null = null;

function loadPreviews(): Promise<Record<string, PreviewSpec>> {
  if (previewsCache) return Promise.resolve(previewsCache);
  if (!previewsPromise) {
    previewsPromise = import("../docs/previews").then((m) => {
      previewsCache = m.PREVIEWS;
      return m.PREVIEWS;
    });
  }
  return previewsPromise;
}

/** Whether this device has a live console companion to run examples in, or `null` while server rendering and hydrating. */
function useConsoleState(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(CONSOLE_MEDIA);
    // The companion boots on the first click, so a desktop visitor can run an example before it has.
    const update = (): void => setAvailable(isCompanionConfigured() && !mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return available;
}

/** Whether this device has a live console companion to run examples in (always `false` while hydrating). */
export function useConsoleAvailable(): boolean {
  return useConsoleState() === true;
}

/** Whether this device has no console companion (phones, tablets, narrow windows). Always `false` while hydrating. */
export function useNoConsole(): boolean {
  return useConsoleState() === false;
}

/** Make an example the console companion's app and send keystrokes to it. */
export function runInConsole(id: string): void {
  preloadCompanionTab("example").catch(prefetchFailed);
  siteStore.activateExample(id);
  activateCompanion();
}

/**
 * An inline, interactive mini console running a real Text.js root next to its source.
 * On desktop, clicking it runs the example in the real DevTools console instead, and the
 * preview mirrors the console's frames until Esc, a click elsewhere or navigation.
 */
export function LivePreview({ id, code, language }: { id: string; code: string; language: string }): ReactNode {
  const meta = PREVIEW_META[id];
  const site = useSite();
  const [ref, inView] = useInView<HTMLDivElement>();
  const active = meta !== undefined && site.tab === "docs" && site.example === id;
  const [previews, setPreviews] = useState<Record<string, PreviewSpec> | null>(previewsCache);

  useEffect(() => {
    if ((!inView && !active) || meta === undefined) return;
    // The console's example view, once the companion has started. A click loads it otherwise.
    if (companionReady()) preloadCompanionTab("example").catch(prefetchFailed);
    if (previews) return;
    let alive = true;
    void loadPreviews().then((p) => {
      if (alive) setPreviews(p);
    });
    return () => {
      alive = false;
    };
  }, [inView, active, meta, previews]);

  const spec = previews?.[id];
  const app = useMemo(() => spec?.render() ?? null, [spec]);
  const hints = meta?.hints ?? PRESETS.find((p) => p.id === id)?.hints;
  const available = useConsoleAvailable();
  const [wireframe, setWireframe] = useState(false);
  const sandbox = useSandbox(app, {
    cols: meta?.cols ?? 60,
    rows: meta?.rows ?? 10,
    theme: site.theme === "geistLight" ? "geistDark" : site.theme,
    enabled: inView && meta !== undefined && !active,
    wireframe,
  });
  const companionFrame = useCompanionFrame(active);
  const mirrored = active ? exampleFrame(companionFrame, exampleHeader(id), id) : null;

  // Clicking anywhere outside this example hands the console back to the docs.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: globalThis.MouseEvent): void => {
      const el = ref.current;
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return;
      // Coming back from DevTools only returns the keyboard to the example (boot focuses it on click).
      if (isRefocusPress(e) && !isInteractivePress(e.target)) return;
      siteStore.exitExample(id);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [active, id, ref]);

  const onStageMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 || (e.target as Element).closest(".dt-inspect")) return;
    e.preventDefault();
    e.stopPropagation();
    runInConsole(id);
  };

  const keys = hints ? hints.map((h) => `${h.keys} ${h.label}`).join(" · ") : null;
  const stats = active
    ? `${keys ? `${keys} · ` : ""}Esc back to docs`
    : keys
      ? keys
      : `${meta?.cols ?? 0}×${meta?.rows ?? 0} · ${sandbox.stats ? `${sandbox.stats.totalMs.toFixed(2)}ms` : "booting Turbolog…"}`;

  return (
    <div className={`preview${active ? " in-console" : ""}`} ref={ref} dir="ltr" data-preview={id}>
      <div className="preview-head">
        <span className="live">
          <span className="dot" /> {active ? t("Live in your console") : t("Live")}
        </span>
        <span className="preview-stats">{stats}</span>
        <span style={{ marginInlineStart: "auto" }}>{language}</span>
        {meta ? (
          active ? (
            <button type="button" className="preview-run desktop-only" onClick={() => siteStore.exitExample(id)} title={t("Show the docs in the console again")}>
              {t("Back to docs")}
            </button>
          ) : (
            <button type="button" className="preview-run desktop-only" onClick={() => runInConsole(id)} title={t("Runs this example in your DevTools console")}>
              {t("Run in console")}
            </button>
          )
        ) : null}
        <CopyButton text={code} />
      </div>
      <div className="preview-stage" onMouseDownCapture={available && meta && !active ? onStageMouseDown : undefined} title={available && !active ? t("Click to run in your console") : undefined}>
        {active ? (
          <div className="sandbox">
            <DevToolsWindow
              frame={mirrored ?? sandbox.frame}
              engage
              engaged={site.consoleInput}
              onActivate={() => runInConsole(id)}
              activateLabel={t("Click to type")}
              cols={meta?.cols}
              rows={meta?.rows}
            />
          </div>
        ) : (
          <SandboxConsole
            frame={sandbox.frame}
            engine={sandbox.engine}
            source={`preview://${id}:1`}
            filter={`-url:preview://${id}`}
            cols={meta?.cols}
            rows={meta?.rows}
            activateLabel={available ? t("Click to run in console") : undefined}
            onInspect={() => setWireframe((w) => !w)}
            inspecting={wireframe}
          />
        )}
      </div>
      <HighlightedCode code={code} language={language} />
    </div>
  );
}
