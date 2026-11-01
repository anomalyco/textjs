import { useEffect, useState, type ReactNode } from "react";
import type { ConsoleRoot } from "@textjs/react";
import { FocusPad } from "@textjs/react/dom";
import { activateCompanion, companionReady, getCompanion, LEARN_VIEWPORT_KEY } from "../console-companion/bridge";
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

/** An inline focus pad for a chapter's console app (the Playground pad, sized for an article). */
export function LearnPad({ title, hints, action }: { title: string; hints: readonly Hint[]; action: string }): ReactNode {
  const root = useCompanionRoot();
  const site = useSite();
  return (
    <div className="learn-pad">
      <FocusPad
        root={root}
        title={title}
        hints={hints}
        action={action}
        capturing={site.consoleInput}
        onActivate={activateCompanion}
        className="pad"
        sizeControl={{ storageKey: LEARN_VIEWPORT_KEY }}
      />
    </div>
  );
}
