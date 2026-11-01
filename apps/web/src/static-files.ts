/**
 * Plain-text and JSON files generated at build time (scripts/postbuild-pages.ts) from the same
 * registries the pages render, so they never drift from the site.
 */

import { TX_ERRORS, VERSION } from "@textjs/core";
import { DOCS, docPath } from "./docs/registry";
import { COMPONENTS, LAUNCH } from "./pages/status-components";
import history from "./pages/status-history.json";
import { INCIDENTS, type IncidentUpdate } from "./pages/status-incidents";

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

Import components from \`@textjs/app\`. Lowercase DOM elements such as \`<div>\` throw TX003. Use \`<Box>\` and \`<Text>\` instead.

## Docs

${docs.join("\n")}

## Error codes

${errors.join("\n")}
`;
}

/** Component status before and after each update: degraded until monitoring, operational after. */
function updates(list: readonly IncidentUpdate[], degraded: string): Array<IncidentUpdate & { from: string; to: string }> {
  let current = "operational";
  return list.map((u) => {
    const from = current;
    current = u.status === "investigating" || u.status === "identified" ? degraded : "operational";
    return { ...u, from, to: current };
  });
}

/** Atlassian Statuspage v2 API files (`/api/v2/status.json`, `components.json`, `summary.json`, `incidents.json`). */
export function statusApi(): Record<"status.json" | "components.json" | "summary.json" | "incidents.json", string> {
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
  const byName = new Map(components.map((c) => [c.name, c]));
  const incidents = INCIDENTS.map((i) => {
    const first = i.updates[0]!;
    const last = i.updates[i.updates.length - 1]!;
    const monitoring = i.updates.find((u) => u.status === "monitoring");
    const affected = i.components.map((name) => byName.get(name)!);
    const iso = (at: string): string => new Date(at).toISOString();
    return {
      id: i.id,
      name: i.name,
      status: "resolved",
      created_at: iso(first.at),
      updated_at: iso(last.at),
      monitoring_at: monitoring ? iso(monitoring.at) : null,
      resolved_at: iso(last.at),
      impact: i.impact,
      shortlink: `${ORIGIN}/status#${i.id}`,
      started_at: iso(first.at),
      page_id: page.id,
      incident_updates: updates(i.updates, i.impact === "major" ? "partial_outage" : "degraded_performance")
        .map((u, n) => ({
          id: `${i.id}-${n + 1}`,
          status: u.status,
          body: u.body,
          incident_id: i.id,
          created_at: iso(u.at),
          updated_at: iso(u.at),
          display_at: iso(u.at),
          affected_components: affected.map((c) => ({ code: c.id, name: c.name, old_status: u.from, new_status: u.to })),
          deliver_notifications: true,
          custom_tweet: null,
          tweet_id: null,
        }))
        .reverse(),
      components: affected.map((c) => ({ ...c, updated_at: iso(last.at) })),
    };
  });
  const json = (v: unknown): string => `${JSON.stringify(v)}\n`;
  return {
    "status.json": json({ page, status }),
    "components.json": json({ page, components }),
    "summary.json": json({ page, components, incidents: [], scheduled_maintenances: [], status }),
    "incidents.json": json({ page, incidents }),
  };
}
