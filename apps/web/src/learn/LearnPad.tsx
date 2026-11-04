import type { ReactNode } from "react";
import { FocusPad } from "@textjs/react/dom";
import { activateCompanion, LEARN_VIEWPORT_KEY } from "../console-companion/bridge";
import type { Hint } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import { PAD_MESSAGES, padHints, padText } from "../site/pad-messages";
import { useCompanionRoot } from "../site/useCompanion";

/** An inline focus pad for a chapter's console app (the Playground pad, sized for an article). */
export function LearnPad({ title, hints, action }: { title: string; hints: readonly Hint[]; action: string }): ReactNode {
  const root = useCompanionRoot();
  const site = useSite();
  return (
    <div className="learn-pad">
      <FocusPad
        root={root}
        title={title}
        hints={padHints(hints)}
        action={padText(action)}
        capturing={site.consoleInput}
        onActivate={activateCompanion}
        className="pad"
        messages={PAD_MESSAGES}
        sizeControl={{ storageKey: LEARN_VIEWPORT_KEY }}
      />
    </div>
  );
}
