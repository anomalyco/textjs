import { useEffect, useState } from "react";
import type { StyledFrame } from "@textjs/core";
import { subscribeCompanionFrame } from "../console-companion/boot";

/** The live companion's styled frame, mirrored into the page. */
export function useCompanionFrame(enabled = true): StyledFrame | null {
  const [frame, setFrame] = useState<StyledFrame | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return subscribeCompanionFrame(setFrame);
  }, [enabled]);
  return frame;
}
