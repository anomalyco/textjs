import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { activateCompanion } from "../console-companion/bridge";
import { DEMOS, PAGE_HINTS, PRESETS, type DemoId, type PresetId } from "../console-companion/store";
import dashboardSource from "../demos/Dashboard.tsx?raw";
import streamingSource from "../demos/Streaming.tsx?raw";
import snakeSource from "../demos/Snake.tsx?raw";
import { A } from "../router";
import { OpenCodeWordmark, TerminalWordmark } from "../site/brand-marks";
import { CopyButton } from "../site/CodeBlock";
import { ConsolePad } from "../site/ConsolePad";
import { HighlightedCode } from "../site/highlight";
import { ConnectPanel } from "./OpenCode";
import { TerminalNote } from "./Terminal";

const SOURCES: Record<PresetId, string> = {
  dashboard: dashboardSource,
  streaming: streamingSource,
  snake: snakeSource,
};

/** OpenCode and terminal.shop are apps of their own: their wordmarks lead the message. */
const WORDMARKS: Partial<Record<DemoId, () => ReactNode>> = { opencode: OpenCodeWordmark, coffee: TerminalWordmark };

/** Prevents a layout-effect warning while prerendering; the picker only scrolls in the browser. */
const useBrowserLayoutEffect = typeof window === "undefined" ? () => undefined : useLayoutEffect;

function Picker({ demo }: { demo: DemoId }): ReactNode {
  const ref = useRef<HTMLElement>(null);
  // Narrow windows scroll the picker sideways: keep the current demo in view (/coffee opens on the last one).
  useBrowserLayoutEffect(() => {
    const nav = ref.current;
    const item = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return;
    const n = nav.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    if (r.left < n.left || r.right > n.right) nav.scrollLeft += r.left - n.left - (n.width - r.width) / 2;
  }, [demo]);
  return (
    <nav className="pad-picker" aria-label="Demos" ref={ref}>
      {DEMOS.map((d) => {
        const current = d.id === demo;
        return (
          <A
            key={d.id}
            href={d.href}
            title={d.description}
            aria-current={current ? "page" : undefined}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              if (current) e.preventDefault();
              // Picking a demo is a click on the stage: keys go straight to the console.
              activateCompanion();
            }}
          >
            {d.label}
          </A>
        );
      })}
    </nav>
  );
}

/**
 * The Playground: one focus pad with a demo picker. Its own demos live at /playground and
 * /playground/<demo>; OpenCode and terminal.shop are at /opencode and /coffee. Every option renders
 * this same component, so switching between them keeps the pad mounted and moves nothing.
 */
export function PlaygroundPage({ demo }: { demo: DemoId }): ReactNode {
  const [showSource, setShowSource] = useState(false);
  const preset = PRESETS.find((p) => p.id === demo);
  const { action, hints } = preset ?? PAGE_HINTS[demo === "coffee" ? "terminal" : "opencode"];
  const Wordmark = WORDMARKS[demo];

  return (
    <>
      <ConsolePad hints={hints} action={action} top={<Picker demo={demo} />} banner={Wordmark ? <Wordmark /> : null}>
        {preset ? (
          <button type="button" className="text-link pad-source" onClick={() => setShowSource((s) => !s)} aria-expanded={showSource}>
            {showSource ? "Hide source" : "View source"}
          </button>
        ) : demo === "opencode" ? (
          <ConnectPanel />
        ) : (
          <TerminalNote />
        )}
      </ConsolePad>
      {preset && showSource ? (
        <div className="container pad-code">
          <div className="codeblock" style={{ margin: 0 }}>
            <div className="codeblock-head">
              <span>{`app/page.tsx · ${preset.label}`}</span>
              <span className="lang">tsx</span>
              <CopyButton text={SOURCES[preset.id]} />
            </div>
            <HighlightedCode code={SOURCES[preset.id]} language="tsx" lineNumbers />
          </div>
        </div>
      ) : null}
    </>
  );
}
