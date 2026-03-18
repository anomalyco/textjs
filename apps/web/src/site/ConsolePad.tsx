import { useEffect, useState, type ReactNode } from "react";
import type { ConsoleRoot } from "@textjs/react";
import { FocusPad } from "@textjs/react/dom";
import { companionReady, getCompanion } from "../console-companion/boot";
import type { Hint } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";

function useCompanionRoot(): ConsoleRoot | null {
  const [root, setRoot] = useState<ConsoleRoot | null>(() => getCompanion()?.root ?? null);
  useEffect(() => {
    if (root) return;
    let alive = true;
    void companionReady()?.then((c) => {
      if (alive) setRoot(c.root);
    });
    return () => {
      alive = false;
    };
  }, [root]);
  return root;
}

export interface ConsolePadProps {
  hints: readonly Hint[];
  /** "Then click here and …" */
  action: string;
  top?: ReactNode;
  children?: ReactNode;
}

/**
 * The whole stage of a demo page: tells visitors to open DevTools, click, and
 * which keys to press. Clicking it routes keystrokes into the live console app.
 */
export function ConsolePad({ hints, action, top, children }: ConsolePadProps): ReactNode {
  const root = useCompanionRoot();
  const site = useSite();
  return (
    <div className="pad-stage">
      <FocusPad
        root={root}
        hints={hints}
        action={action}
        capturing={site.consoleInput}
        onActivate={() => getCompanion()?.activate()}
        top={top}
        className="pad"
      >
        {children}
      </FocusPad>
    </div>
  );
}
