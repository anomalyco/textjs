import { useState, type ReactNode } from "react";
import { getCompanion } from "../console-companion/boot";
import { PRESETS, siteStore } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import counterSource from "../demos/Counter.tsx?raw";
import dashboardSource from "../demos/Dashboard.tsx?raw";
import formSource from "../demos/Form.tsx?raw";
import streamingSource from "../demos/Streaming.tsx?raw";
import snakeSource from "../demos/Snake.tsx?raw";
import type { PresetId } from "../console-companion/store";
import { CopyButton } from "../site/CodeBlock";
import { ConsolePad } from "../site/ConsolePad";
import { HighlightedCode } from "../site/highlight";

const SOURCES: Record<PresetId, string> = {
  counter: counterSource,
  form: formSource,
  streaming: streamingSource,
  dashboard: dashboardSource,
  snake: snakeSource,
};

function Picker(): ReactNode {
  const site = useSite();
  return (
    <div className="pad-picker" role="tablist" aria-label="Demo">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={p.id === site.preset}
          title={p.description}
          onClick={() => {
            siteStore.set({ preset: p.id });
            // Picking a demo is a click on the stage: keys go straight to the console.
            getCompanion()?.activate();
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function PlaygroundPage(): ReactNode {
  const site = useSite();
  const preset = PRESETS.find((p) => p.id === site.preset) ?? PRESETS[0];
  const [showSource, setShowSource] = useState(false);
  if (!preset) return null;

  return (
    <>
      <ConsolePad hints={preset.hints} action={preset.action} top={<Picker />}>
        <button type="button" className="text-link pad-source" onClick={() => setShowSource((s) => !s)} aria-expanded={showSource}>
          {showSource ? "Hide source" : "View source"}
        </button>
      </ConsolePad>
      {showSource ? (
        <div className="container pad-code">
          <div className="codeblock" style={{ margin: 0 }}>
            <div className="codeblock-head">
              <span>{`app/page.tsx — ${preset.label}`}</span>
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
