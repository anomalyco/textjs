import type { ReactNode } from "react";
import { FocusPad } from "@textjs/react/dom";
import { activateCompanion, PLAYGROUND_VIEWPORT_KEY } from "../console-companion/bridge";
import type { Hint } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { PAD_MESSAGES, padHints, padText } from "./pad-messages";
import { useCompanionRoot } from "./useCompanion";

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
    <div className="pad-stage" data-textjs-engage="">
      <FocusPad
        root={root}
        hints={padHints(hints)}
        action={padText(action)}
        capturing={site.consoleInput}
        onActivate={activateCompanion}
        // The demo picker scrolls horizontally and reads its scroll position as left-to-right.
        top={<div className="pad-slot pad-slot-top" dir="ltr">{top}</div>}
        banner={<div className="pad-slot pad-slot-banner">{banner}</div>}
        className="pad"
        messages={PAD_MESSAGES}
        sizeControl={{ storageKey: PLAYGROUND_VIEWPORT_KEY }}
      >
        <div className="pad-slot pad-slot-bottom">{children}</div>
      </FocusPad>
    </div>
  );
}
