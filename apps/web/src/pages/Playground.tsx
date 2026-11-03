import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { activateCompanion } from "../console-companion/bridge";
import { DEMOS, hintsFor, PAGE_HINTS, PRESETS, type DemoId, type PresetId } from "../console-companion/store";
import { useSite } from "../console-companion/useSite";
import dashboardSource from "../demos/Dashboard.tsx?raw";
import streamingSource from "../demos/Streaming.tsx?raw";
import snakeSource from "../demos/Snake.tsx?raw";
import doomSource from "../demos/doom/Doom.tsx?raw";
import { t } from "../i18n/t";
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
  doom: doomSource,
};

/** OpenCode and terminal.shop are apps of their own: their wordmarks lead the message. */
const WORDMARKS: Partial<Record<DemoId, () => ReactNode>> = { opencode: OpenCodeWordmark, coffee: TerminalWordmark };

/** Prevents a layout-effect warning while prerendering; the picker only scrolls in the browser. */
const useBrowserLayoutEffect = typeof window === "undefined" ? () => undefined : useLayoutEffect;

/** Width of the picker's edge fades, matching `.pad-picker-track` in styles.css. */
const EDGE_FADE = 40;

/** Fades whichever edge of the picker has demos scrolled out of view (physical sides, so RTL works too). */
function markHiddenEdges(track: HTMLElement): void {
  const first = track.firstElementChild?.getBoundingClientRect();
  const last = track.lastElementChild?.getBoundingClientRect();
  const box = track.getBoundingClientRect();
  const left = first && last ? Math.min(first.left, last.left) < box.left - 1 : false;
  const right = first && last ? Math.max(first.right, last.right) > box.right + 1 : false;
  track.toggleAttribute("data-more-left", left);
  track.toggleAttribute("data-more-right", right);
}

function Picker({ demo }: { demo: DemoId }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  // Narrow windows scroll the picker sideways: keep the current demo in view (/coffee opens on the last one).
  useBrowserLayoutEffect(() => {
    const track = ref.current;
    const item = track?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!track || !item || track.scrollWidth <= track.clientWidth) return;
    const n = track.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    // An edge with more demos beyond it is faded over EDGE_FADE px, so keep the current one clear of it.
    const padL = item.previousElementSibling ? EDGE_FADE : 0;
    const padR = item.nextElementSibling ? EDGE_FADE : 0;
    if (r.left < n.left + padL || r.right > n.right - padR) track.scrollLeft += r.left - n.left - (n.width - r.width) / 2;
  }, [demo]);
  useBrowserLayoutEffect(() => {
    const track = ref.current;
    if (!track) return;
    const update = (): void => markHiddenEdges(track);
    update();
    track.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(track);
    return () => {
      track.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);
  return (
    <nav className="pad-picker" aria-label={t("Demos")}>
      <div className="pad-picker-track" ref={ref}>
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
      </div>
    </nav>
  );
}

/**
 * The Playground: one focus pad with a demo picker. Its own demos live at /playground and
 * /playground/<demo>; Doom, OpenCode and terminal.shop are at /doom, /opencode and /coffee. Every option renders
 * this same component, so switching between them keeps the pad mounted and moves nothing.
 */
export function PlaygroundPage({ demo }: { demo: DemoId }): ReactNode {
  const [showSource, setShowSource] = useState(false);
  const site = useSite();
  const preset = PRESETS.find((p) => p.id === demo);
  const { action, hints } = preset ? hintsFor("playground", preset.id, site.doomStatus) : PAGE_HINTS[demo === "coffee" ? "terminal" : "opencode"];
  const Wordmark = WORDMARKS[demo];

  return (
    <>
      <ConsolePad hints={hints} action={action} top={<Picker demo={demo} />} banner={Wordmark ? <Wordmark /> : null}>
        {preset ? (
          demo === "doom" ? (
            // One run of text that wraps inside the notice. Word joiners glue the dot to the button and the notice, so it never ends or starts a line.
            <p className="pad-footer">
              <button type="button" className="text-link pad-source" onClick={() => setShowSource((s) => !s)} aria-expanded={showSource}>
                {showSource ? t("Hide source") : t("View source")}
              </button>
              <span className="pad-sep" aria-hidden="true">
                {"\u2060·\u2060"}
              </span>
              <a className="text-link pad-legal" href="/doom/LICENSE-DOOM1.TXT">
                {t("DOOM is a trademark of id Software. Text.js is not affiliated with or endorsed by id Software.")}
              </a>
            </p>
          ) : (
            <button type="button" className="text-link pad-source" onClick={() => setShowSource((s) => !s)} aria-expanded={showSource}>
              {showSource ? t("Hide source") : t("View source")}
            </button>
          )
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
