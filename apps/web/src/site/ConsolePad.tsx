import { useEffect, useState, type ReactNode } from "react";
import type { ConsoleRoot } from "@textjs/react";
import { FocusPad } from "@textjs/react/dom";
import { activateCompanion, companionReady, getCompanion, PLAYGROUND_VIEWPORT_KEY } from "../console-companion/bridge";
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
  /** Above the message, in a fixed-height slot (`.pad-slot-top`). */
  top?: ReactNode;
  /** The first row of the message, in a fixed-height slot (`.pad-slot-banner`) that every demo reserves, filled or not. */
  banner?: ReactNode;
  /** Below the message, in a fixed-height slot (`.pad-slot-bottom`). */
  children?: ReactNode;
}

/**
 * The whole stage of a demo page: tells visitors to open DevTools, click, and
 * which keys to press. Clicking it routes keystrokes into the live console app.
 *
 * Playground and OpenCode share this layout. Its slots have fixed heights and the
 * message sits in a fixed frame (styles.css, "Focus pad"), so switching between
 * the pages, or the OpenCode connection resolving, never moves anything.
 */
export function ConsolePad({ hints, action, top, banner, children }: ConsolePadProps): ReactNode {
  const root = useCompanionRoot();
  const site = useSite();
  return (
    <div className="pad-stage" dir="ltr">
      <FocusPad
        root={root}
        hints={hints}
        action={action}
        capturing={site.consoleInput}
        onActivate={activateCompanion}
        top={<div className="pad-slot pad-slot-top">{top}</div>}
        banner={<div className="pad-slot pad-slot-banner">{banner}</div>}
        className="pad"
        sizeControl={{ storageKey: PLAYGROUND_VIEWPORT_KEY }}
      >
        <div className="pad-slot pad-slot-bottom">{children}</div>
      </FocusPad>
    </div>
  );
}
