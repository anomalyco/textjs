import type { ReactNode } from "react";
import type { StyledFrame } from "@textjs/core";
import { rich } from "../../i18n/rich";
import { t } from "../../i18n/t";
import { A } from "../../router";
import { OpenCodeWordmark } from "../../site/brand-marks";
import { DevToolsWindow } from "../../site/DevToolsWindow";
import { unpackStyledFrame, type PackedFrame } from "../../site/packed-frame";
import { Crosses } from "./Crosses";
import packed from "./opencode-frames.json";

/**
 * A real OpenCode Lite frame: the /opencode sandbox at 100×38 after the prompt "The reconnect test is
 * flaky. Can you fix it?", mirrored from the console companion.
 */
const FRAME: StyledFrame = unpackStyledFrame(packed as unknown as PackedFrame);

const FACTS: Array<{ title: string; body: ReactNode }> = [
  { title: t("Sandbox"), body: t("A scripted agent answers any prompt, with nothing to install.") },
  {
    title: t("One command"),
    body: rich("Run <cmd>bunx @textjs/opencode@latest proxy</cmd> and enter the code it prints. The page connects to OpenCode on your machine.", { cmd: (c) => <code className="oc-cmd">{c}</code> }),
  },
  {
    title: t("Your models and sessions"),
    body: rich("Pick any model your server has configured with <c>/models</c>. Sessions, agents and models come from your OpenCode server.", { c: (c) => <code>{c}</code> }),
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
          <h2>{t("Code with OpenCode in DevTools")}</h2>
          <p className="oc-lede">{t("OpenCode Lite is the OpenCode TUI rebuilt with Text.js to run in your browser console.")}</p>
          <div className="oc-ctas">
            <A href="/opencode" className="btn btn-primary">
              {t("Try the sandbox")}
            </A>
            <A href="/docs/opencode#connect-a-local-server" className="btn btn-secondary">
              {t("Connect your server")}
            </A>
          </div>
        </div>
        <div className="oc-stage" dir="ltr" aria-hidden="true">
          <div className="oc-glow" />
          <div className="oc-crop">
            <DevToolsWindow frame={FRAME} source="opencode:1" cols={FRAME.width} rows={FRAME.height} fontSize={14} lineHeight={17} className="oc-window" />
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
