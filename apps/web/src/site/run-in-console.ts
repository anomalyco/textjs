import { useEffect, useState } from "react";
import { activateCompanion, companionReady, isCompanionConfigured } from "../console-companion/bridge";
import { siteStore } from "../console-companion/store";
import { prefetchFailed } from "../telemetry/capture";

/** Same rule as `.desktop-only`: phones and tablets have no DevTools console to run in. */
const CONSOLE_MEDIA = "(max-width: 640px), (hover: none) and (pointer: coarse)";

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

/** Download the console's example view. The tab loader comes with the companion, so pages load it only then. */
function preloadExampleTab(): void {
  import("../console-companion/tabs-loader").then((m) => m.preloadCompanionTab("example")).catch(prefetchFailed);
}

/** The console's example view, once the companion has started. A click loads it otherwise. */
export function preloadExampleTabIfReady(): void {
  if (companionReady()) preloadExampleTab();
}

/** Make an example the console companion's app and send keystrokes to it. */
export function runInConsole(id: string): void {
  preloadExampleTab();
  siteStore.activateExample(id);
  activateCompanion();
}
