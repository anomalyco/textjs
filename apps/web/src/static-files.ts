/**
 * Plain-text and JSON files generated at build time (scripts/postbuild-pages.ts) from the same
 * registries the pages render, so they never drift from the site.
 */

import { TX_ERRORS, VERSION } from "@textjs/core";
import { DOCS, docPath } from "./docs/registry";
import { COMPONENTS, LAUNCH } from "./pages/status-components";
import history from "./pages/status-history.json";

const ORIGIN = "https://textjs.org";

/** `/humans.txt` (humanstxt.org). `date` is the build date, `YYYY-MM-DD`. */
export function humansTxt(date: string): string {
  return `/* TEAM */
Adam Elmore
Anomaly · https://anoma.ly

/* THANKS */
React
Yoga
Geist
The Chrome DevTools team. Sorry about the console.

/* SITE */
Last update: ${date.replace(/-/g, "/")}
Standards: HTML, CSS, WHATWG Console Standard
Components: React 19, Yoga, Text.js ${VERSION} (Turbolog)
Software: Bun, Vite, Chrome DevTools
`;
}

/** `/llms.txt` (llmstxt.org). */
export function llmsTxt(): string {
  const docs = DOCS.map((d) => `- [${d.title}](${ORIGIN}${docPath(d.slug)}): ${d.description}`);
  const errors = TX_ERRORS.map((e) => `- [${e.code}: ${e.title}](${ORIGIN}/errors/${e.code})`);
  return `# Text.js

> Text.js is a React framework for apps that render in the DevTools console with console.log.

Import components from \`@textjs/next\`. Lowercase DOM elements such as \`<div>\` throw TX003. Use \`<Box>\` and \`<Text>\` instead.

## Docs

${docs.join("\n")}

## Error codes

${errors.join("\n")}
`;
}

/** Atlassian Statuspage v2 API files (`/api/v2/status.json`, `components.json`, `summary.json`). */
export function statusApi(): Record<"status.json" | "components.json" | "summary.json", string> {
  const updatedAt = `${history.measuredAt}T00:00:00.000Z`;
  const createdAt = `${LAUNCH}T00:00:00.000Z`;
  const page = { id: "textjs", name: "Text.js", url: `${ORIGIN}/status`, time_zone: "Etc/UTC", updated_at: updatedAt };
  const status = { indicator: "none", description: "All Systems Operational" };
  const components = COMPONENTS.map((c, i) => ({
    id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: c.name,
    status: "operational",
    created_at: createdAt,
    updated_at: updatedAt,
    position: i + 1,
    description: c.detail,
    showcase: true,
    start_date: LAUNCH,
    group_id: null,
    page_id: page.id,
    group: false,
    only_show_if_degraded: false,
  }));
  const json = (v: unknown): string => `${JSON.stringify(v)}\n`;
  return {
    "status.json": json({ page, status }),
    "components.json": json({ page, components }),
    "summary.json": json({ page, components, incidents: [], scheduled_maintenances: [], status }),
  };
}
