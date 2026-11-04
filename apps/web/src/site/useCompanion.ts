import { useEffect, useState } from "react";
import type { StyledFrame } from "@textjs/core";
import type { ConsoleRoot } from "@textjs/react";
import { getCompanion, subscribeCompanion, subscribeCompanionFrame } from "../console-companion/bridge";

/** The live companion's styled frame, mirrored into the page. */
export function useCompanionFrame(enabled = true): StyledFrame | null {
  const [frame, setFrame] = useState<StyledFrame | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return subscribeCompanionFrame(setFrame);
  }, [enabled]);
  return frame;
}

/** The companion's console root once it has booted (`null` until then). Doesn't start it. */
export function useCompanionRoot(): ConsoleRoot | null {
  const [root, setRoot] = useState<ConsoleRoot | null>(() => getCompanion()?.root ?? null);
  useEffect(() => (root ? undefined : subscribeCompanion((c) => setRoot(c.root))), [root]);
  return root;
}
