import { useMemo, type ReactNode } from "react";
import { useInView } from "./useInView";
import { PREVIEWS } from "../docs/previews";
import { SandboxConsole } from "../sandbox/SandboxConsole";
import { useSandbox } from "../sandbox/useSandbox";
import { useSite } from "../console-companion/useSite";
import { HighlightedCode } from "./highlight";
import { CopyButton } from "./CodeBlock";

/** An inline, interactive mini console running a real Text.js root next to its source. */
export function LivePreview({ id, code, language }: { id: string; code: string; language: string }): ReactNode {
  const spec = PREVIEWS[id];
  const site = useSite();
  const [ref, inView] = useInView<HTMLDivElement>();
  const app = useMemo(() => spec?.render() ?? null, [spec]);
  const sandbox = useSandbox(app, { cols: spec?.cols ?? 60, rows: spec?.rows ?? 10, theme: site.theme === "geistLight" ? "geistDark" : site.theme, enabled: inView && spec !== undefined });

  return (
    <div className="preview" ref={ref}>
      <div className="preview-head">
        <span className="live">
          <span className="dot" /> Live
        </span>
        <span className="preview-stats">{`${spec?.cols ?? 0}×${spec?.rows ?? 0} · ${sandbox.stats ? `${sandbox.stats.totalMs.toFixed(2)}ms · ${sandbox.stats.spanCount} %c spans` : "booting Turbolog…"}`}</span>
        <span style={{ marginLeft: "auto" }}>{language}</span>
        <CopyButton text={code} />
      </div>
      <div className="preview-stage">
        <SandboxConsole frame={sandbox.frame} engine={sandbox.engine} source={`preview://${id}:1`} filter={`-url:preview://${id}`} cols={spec?.cols} rows={spec?.rows} />
      </div>
      <HighlightedCode code={code} language={language} />
    </div>
  );
}
