import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useInView } from "./useInView";
import { PREVIEWS } from "../docs/previews";
import { SandboxConsole } from "../sandbox/SandboxConsole";
import { useSandbox } from "../sandbox/useSandbox";
import { useSite } from "../console-companion/useSite";
import { PRESETS, siteStore } from "../console-companion/store";
import { companionReady, getCompanion } from "../console-companion/boot";
import { exampleFrame, exampleHeader } from "../console-companion/tabs/ExampleTab";
import { DevToolsWindow } from "./DevToolsWindow";
import { useCompanionFrame } from "./useCompanion";
import { HighlightedCode } from "./highlight";
import { CopyButton } from "./CodeBlock";

/** Same rule as `.desktop-only`: phones and tablets have no DevTools console to run in. */
const CONSOLE_MEDIA = "(max-width: 640px), (hover: none) and (pointer: coarse)";

/** Whether this device has a live console companion to run examples in (always `false` while hydrating). */
export function useConsoleAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(CONSOLE_MEDIA);
    let booted = getCompanion() !== null;
    const update = (): void => setAvailable(booted && !mq.matches);
    update();
    let alive = true;
    void companionReady()?.then(() => {
      booted = true;
      if (alive) update();
    });
    mq.addEventListener("change", update);
    return () => {
      alive = false;
      mq.removeEventListener("change", update);
    };
  }, []);
  return available;
}

/** Make an example the console companion's app and send keystrokes to it. */
export function runInConsole(id: string): void {
  siteStore.activateExample(id);
  const c = getCompanion();
  if (c) c.activate();
  else void companionReady()?.then((ready) => ready.activate());
}

/**
 * An inline, interactive mini console running a real Text.js root next to its source.
 * On desktop, clicking it runs the example in the real DevTools console instead, and the
 * preview mirrors the console's frames until Esc, a click elsewhere or navigation.
 */
export function LivePreview({ id, code, language }: { id: string; code: string; language: string }): ReactNode {
  const spec = PREVIEWS[id];
  const site = useSite();
  const [ref, inView] = useInView<HTMLDivElement>();
  const app = useMemo(() => spec?.render() ?? null, [spec]);
  const hints = spec?.hints ?? PRESETS.find((p) => p.id === id)?.hints;
  const available = useConsoleAvailable();
  const active = spec !== undefined && site.tab === "docs" && site.example === id;
  const [wireframe, setWireframe] = useState(false);
  const sandbox = useSandbox(app, { cols: spec?.cols ?? 60, rows: spec?.rows ?? 10, theme: site.theme === "geistLight" ? "geistDark" : site.theme, enabled: inView && spec !== undefined && !active, wireframe });
  const companionFrame = useCompanionFrame(active);
  const mirrored = active ? exampleFrame(companionFrame, exampleHeader(site.docSlug, id), id) : null;

  // Clicking anywhere outside this example hands the console back to the docs.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: globalThis.MouseEvent): void => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) siteStore.exitExample(id);
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
      : `${spec?.cols ?? 0}×${spec?.rows ?? 0} · ${sandbox.stats ? `${sandbox.stats.totalMs.toFixed(2)}ms` : "booting Turbolog…"}`;

  return (
    <div className={`preview${active ? " in-console" : ""}`} ref={ref} data-preview={id}>
      <div className="preview-head">
        <span className="live">
          <span className="dot" /> {active ? "Live in your console" : "Live"}
        </span>
        <span className="preview-stats">{stats}</span>
        <span style={{ marginLeft: "auto" }}>{language}</span>
        {spec ? (
          active ? (
            <button type="button" className="preview-run desktop-only" onClick={() => siteStore.exitExample(id)} title="Show the docs in the console again">
              Back to docs
            </button>
          ) : (
            <button type="button" className="preview-run desktop-only" onClick={() => runInConsole(id)} title="Runs this example in your DevTools console">
              Run in console
            </button>
          )
        ) : null}
        <CopyButton text={code} />
      </div>
      <div className="preview-stage" onMouseDownCapture={available && spec && !active ? onStageMouseDown : undefined} title={available && !active ? "Click to run in your console" : undefined}>
        {active ? (
          <div className="sandbox">
            <DevToolsWindow
              frame={mirrored ?? sandbox.frame}
              engage
              engaged={site.consoleInput}
              onActivate={() => runInConsole(id)}
              activateLabel="Click to type"
              cols={spec?.cols}
              rows={spec?.rows}
            />
          </div>
        ) : (
          <SandboxConsole
            frame={sandbox.frame}
            engine={sandbox.engine}
            source={`preview://${id}:1`}
            filter={`-url:preview://${id}`}
            cols={spec?.cols}
            rows={spec?.rows}
            activateLabel={available ? "Click to run in console" : undefined}
            onInspect={() => setWireframe((w) => !w)}
            inspecting={wireframe}
          />
        )}
      </div>
      <HighlightedCode code={code} language={language} />
    </div>
  );
}
