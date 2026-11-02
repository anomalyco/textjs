import type { ReactNode } from "react";
import type { StyledFrame, StyledSpan } from "@textjs/core";
import { A } from "../../router";
import { OpenCodeWordmark } from "../../site/brand-marks";
import { DevToolsWindow } from "../../site/DevToolsWindow";
import { Crosses } from "./Crosses";
import packed from "./opencode-frames.json";

/**
 * A real OpenCode Lite frame: the /opencode sandbox at 100×38 after the prompt "The reconnect test is
 * flaky. Can you fix it?", mirrored from the console companion. Rows are packed as
 * [text, fg palette index, bg palette index, flags?], with flags bold 1, italic 2, underline 4 and
 * strikethrough 8, and -1 for no color.
 */
type PackedSpan = [string, number, number, number?];
const PACKED = packed as unknown as { palette: string[]; width: number; height: number; rows: PackedSpan[][] };

const color = (i: number): string | null => (i < 0 ? null : (PACKED.palette[i] ?? null));

const FRAME: StyledFrame = {
  width: PACKED.width,
  height: PACKED.height,
  rows: PACKED.rows.map((row) =>
    row.map(
      ([text, fg, bg, flags = 0]): StyledSpan => ({
        text,
        width: text.length,
        fg: 0,
        bg: 0,
        attrs: 0,
        fgCss: color(fg),
        bgCss: color(bg),
        bold: (flags & 1) !== 0,
        dim: false,
        italic: (flags & 2) !== 0,
        underline: (flags & 4) !== 0,
        strikethrough: (flags & 8) !== 0,
        inverse: false,
        allowLink: false,
      }),
    ),
  ),
};

const FACTS: Array<{ title: string; body: ReactNode }> = [
  { title: "Sandbox", body: <>A scripted agent answers any prompt, with nothing to install.</> },
  {
    title: "One command",
    body: (
      <>
        Run <code className="oc-cmd">bunx @textjs/opencode@latest proxy</code> and enter the code it prints. The page connects to OpenCode on your machine.
      </>
    ),
  },
  {
    title: "Your models and sessions",
    body: (
      <>
        Pick any model your server has configured with <code>/models</code>. Sessions, agents and models come from your OpenCode server.
      </>
    ),
  },
];

export function OpenCodeBand(): ReactNode {
  return (
    <section className="section home-section oc-band">
      <div className="container">
        <div className="oc-head">
          <div className="section-mark">
            <OpenCodeWordmark />
          </div>
          <h2>Code with OpenCode in DevTools</h2>
          <p className="oc-lede">OpenCode Lite is the OpenCode TUI rebuilt with Text.js to run in your browser console.</p>
          <div className="oc-ctas">
            <A href="/opencode" className="btn btn-primary">
              Try the sandbox
            </A>
            <A href="/docs/opencode#connect-a-local-server" className="btn btn-secondary">
              Connect your server
            </A>
          </div>
        </div>
        <div className="oc-stage" aria-hidden="true">
          <div className="oc-glow" />
          <div className="oc-crop">
            <DevToolsWindow frame={FRAME} source="opencode:1" cols={PACKED.width} rows={PACKED.height} fontSize={14} lineHeight={17} className="oc-window" />
          </div>
        </div>
        <div className="frame oc-facts">
          <Crosses />
          {FACTS.map((f) => (
            <div key={f.title} className="oc-fact">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
