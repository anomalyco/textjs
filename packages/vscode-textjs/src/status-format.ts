/** Status bar text and tooltip. Pure (no `vscode`). */

import type { ServerState } from "./webview-protocol";

export interface StatusInput {
  server: ServerState;
  url: string | null;
  tabs: number;
  grid: { width: number; height: number } | null;
  /** Where the grid size comes from. */
  gridSource: "browser" | "preview" | null;
  path: string | null;
}

/** Pure formatting, exported for tests. */
export function formatStatus(s: StatusInput): { text: string; tooltip: string } {
  const host = s.url ? s.url.replace(/^https?:\/\//, "").replace(/^localhost/, "") : null;
  const grid = s.grid ? `${s.grid.width}×${s.grid.height}` : null;
  let text: string;
  if (s.server === "running") text = `$(triangle-down) ${host ?? "Text.js"}${grid ? `  $(terminal) ${grid}` : ""}`;
  else if (s.server === "starting") text = "$(loading~spin) Text.js";
  else text = `$(triangle-down) Text.js${grid ? `  $(terminal) ${grid}` : ""}`;
  const lines: string[] = ["**▼ Text.js**", ""];
  if (s.server === "running") {
    lines.push(`$(pass-filled) Dev server running at [${s.url}](${s.url})`);
    lines.push(`$(browser) ${s.tabs === 0 ? "No browser tabs connected" : s.tabs === 1 ? "1 browser tab" : `${s.tabs} browser tabs`}${s.path ? ` · \`${s.path}\`` : ""}`);
  } else if (s.server === "starting") lines.push("$(loading~spin) Starting the dev server…");
  else lines.push("$(circle-outline) Dev server stopped");
  if (grid) lines.push(`$(terminal) Console grid ${grid} (${s.gridSource === "preview" ? "preview" : "browser"})`);
  lines.push("", "Click for actions");
  return { text, tooltip: lines.join("\n\n") };
}
