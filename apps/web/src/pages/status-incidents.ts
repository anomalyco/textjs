/**
 * Past incidents on the Status page and in `/api/v2/incidents.json`, newest first.
 * Each one is a bug fixed in this repository. `commits` lists fix commits that are specific to the incident.
 */

export type Impact = "none" | "minor" | "major";
export type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

export interface IncidentUpdate {
  status: IncidentStatus;
  /** ISO 8601, UTC. */
  at: string;
  body: string;
}

export interface Incident {
  id: string;
  name: string;
  impact: Impact;
  /** Names from `COMPONENTS`. */
  components: readonly string[];
  /** Oldest first. The last update is `resolved`. */
  updates: readonly IncidentUpdate[];
  postmortem: string;
  commits: readonly string[];
  links: ReadonlyArray<{ label: string; href: string }>;
}

const V1 = { label: "Changelog: 1.0.0", href: "/changelog#v1-0-0" };

export const INCIDENTS: readonly Incident[] = [
  {
    id: "ios-safari-scroll",
    name: "Pages stuck under the header on iOS Safari",
    impact: "minor",
    components: ["textjs.org"],
    updates: [
      { status: "investigating", at: "2026-10-27T15:42:00Z", body: "We are investigating reports that textjs.org pages can't be scrolled back to the top on iOS Safari." },
      {
        status: "identified",
        at: "2026-10-27T17:05:00Z",
        body: "File tabs, code blocks and prose tables have 1px of vertical overflow from the active tab underline, so they scroll on both axes and iOS gives them vertical swipes meant for the page. `scrollbar-gutter: stable` also makes the first scroll jump on iOS.",
      },
      { status: "monitoring", at: "2026-10-27T18:31:00Z", body: "A fix has been deployed. Those elements now scroll horizontally only, and `scrollbar-gutter: stable` applies to mouse devices only." },
      {
        status: "identified",
        at: "2026-10-27T20:12:00Z",
        body: "The hero headline can still end up pinned under the sticky header after scrolling down and back up. Safari's scroll anchoring is adjusting the scroll position.",
      },
      { status: "monitoring", at: "2026-10-27T20:40:00Z", body: "A fix has been deployed. Scroll anchoring is off (`overflow-anchor: none`). We are monitoring." },
      { status: "resolved", at: "2026-10-28T09:10:00Z", body: "This incident has been resolved." },
    ],
    postmortem:
      "textjs.org pages don't shift while they load, so scroll anchoring had nothing to correct. On iOS Safari it pinned the hero under the sticky header and blocked scrolling back to the top. `?debug=scroll` on textjs.org now shows a live readout of scroll, touch and resize events and names the caller of each programmatic focus or scroll call.",
    commits: ["297c5d7", "55da525", "8424fcd"],
    links: [V1],
  },
  {
    id: "ci-it-only",
    name: "Lint rule tests failing in CI",
    impact: "none",
    components: [],
    updates: [
      { status: "investigating", at: "2026-10-23T14:12:00Z", body: "The `eslint-plugin-textjs` test suite fails in CI before any rule test runs. Local runs pass." },
      {
        status: "identified",
        at: "2026-10-23T14:31:00Z",
        body: "Bun throws when `it.only` is read while the `CI` environment variable is set. The rule tester assigns `RuleTester.itOnly = it.only` at import, so loading it fails.",
      },
      { status: "resolved", at: "2026-10-23T14:58:00Z", body: "The tester now reads `it.only` lazily, when a test calls `RuleTester.itOnly`. CI is passing." },
    ],
    postmortem: "`@typescript-eslint/rule-tester` takes its test functions as static properties of `RuleTester`. The fix wraps `it.only` in a function. No package or page was affected.",
    commits: ["eca3f78"],
    links: [],
  },
  {
    id: "playground-opencode-cls",
    name: "Layout shift on /playground and /opencode",
    impact: "minor",
    components: ["textjs.org"],
    updates: [
      {
        status: "investigating",
        at: "2026-10-21T16:03:00Z",
        body: "Our layout-shift audit reports a cumulative layout shift of 0.0001 on /playground and /opencode. Every other route it covers reports 0. The focus pad also moves when navigating between the two pages.",
      },
      {
        status: "identified",
        at: "2026-10-21T19:40:00Z",
        body: "The console size control appends the measured size to its label after hydration (`Fit console · 120×36`), which moves the “Fit console” text node. The pad's top and bottom rows also differ in height between the two pages, so the pad recenters on navigation.",
      },
      { status: "monitoring", at: "2026-10-22T10:15:00Z", body: "A fix has been deployed. Both pages share one pad layout, and the size is appended without moving “Fit console”. We are monitoring." },
      { status: "resolved", at: "2026-10-22T16:30:00Z", body: "Cumulative layout shift is 0 on every route." },
    ],
    postmortem:
      "The pad now has fixed-height top and bottom slots, and every demo reserves the same rows, so changing pages or demos moves nothing. The OpenCode connection panel shows one status line in every state, with a skeleton until it hydrates. `apps/web/scripts/e2e-layout.mjs` asserts identical boxes across routes, demos, viewport sizes and connection states.",
    commits: ["8f22b9b"],
    links: [V1],
  },
  {
    id: "docs-learn-sidebar",
    name: "Docs sidebar scrolls out of view at the end of long pages",
    impact: "minor",
    components: ["textjs.org"],
    updates: [
      { status: "investigating", at: "2026-10-16T13:20:00Z", body: "We are investigating reports that the docs sidebar scrolls out of view at the bottom of long pages." },
      {
        status: "identified",
        at: "2026-10-16T14:02:00Z",
        body: "The sidebar is `position: sticky` inside the docs layout, and the site footer renders after that layout. A sticky element stays pinned only while its containing block is on screen, so when the footer scrolls in, it takes the sidebar with it.",
      },
      { status: "monitoring", at: "2026-10-16T15:30:00Z", body: "A fix has been deployed. Docs pages render the footer inside the content column, so the layout reaches the bottom of the page." },
      { status: "identified", at: "2026-10-17T09:45:00Z", body: "The chapter sidebar on Learn has the same issue." },
      { status: "monitoring", at: "2026-10-17T11:10:00Z", body: "A fix has been deployed. Learn chapters render the footer inside the content column too. We are monitoring." },
      { status: "resolved", at: "2026-10-17T17:00:00Z", body: "This incident has been resolved." },
    ],
    postmortem: "Pages with a sticky sidebar (docs and Learn chapters) render the footer in their content column. Other pages keep the shared footer.",
    commits: ["131ac96"],
    links: [V1],
  },
  {
    id: "npm-textjs",
    name: "Package name textjs unavailable on npm",
    impact: "none",
    components: [],
    updates: [
      { status: "investigating", at: "2026-10-14T18:22:00Z", body: "Publishing the framework package `textjs` to npm fails with `403 Forbidden`." },
      { status: "identified", at: "2026-10-14T18:40:00Z", body: "The name `textjs` has belonged to another npm package since March 25, 2016." },
      {
        status: "monitoring",
        at: "2026-10-14T21:05:00Z",
        body: "The framework and CLI package is now `@textjs/next`, in the same scope as `@textjs/core` and `@textjs/react`. Imports change from `textjs` to `@textjs/next`.",
      },
      { status: "resolved", at: "2026-10-15T09:00:00Z", body: "This incident has been resolved." },
    ],
    postmortem: "Starting with Text.js 1.0, apps import from `@textjs/next` instead of `textjs`, and the OpenCode bridge is `bunx @textjs/next proxy`, which runs from any directory.",
    commits: [],
    links: [{ label: "Text.js 1.0: One rename", href: "/blog/text-js-1-0#one-rename" }, V1],
  },
  {
    id: "phantom-paint-layers",
    name: "Empty paint layers at row breaks",
    impact: "minor",
    components: ["Turbolog encoder"],
    updates: [
      { status: "investigating", at: "2026-09-15T10:05:00Z", body: "We are investigating empty `<span>` elements at most row breaks in DevTools frames, and a doubled curtain span on some frames." },
      {
        status: "identified",
        at: "2026-09-15T12:30:00Z",
        body: "When a styled run ends at a row break, the `\\n` is written inside the run's `%c` span. DevTools splits the span at the line break, and the empty remainder becomes a `display: inline-block` span with `contain: paint`, which gets its own paint layer.",
      },
      { status: "monitoring", at: "2026-09-15T16:45:00Z", body: "A fix has been deployed. Row breaks that don't continue a run now reset `%c` to an empty style first, so DevTools emits a plain newline. Each frame carries one curtain." },
      { status: "resolved", at: "2026-09-16T10:00:00Z", body: "This incident has been resolved." },
    ],
    postmortem:
      "Spans with the same style still merge across row breaks. The curtain also moved onto its own line: DevTools floats the source link (`VM12:1`) to the right of a message's first line, and an inline curtain left that link beside row 0, narrowing it.",
    commits: [],
    links: [V1],
  },
  {
    id: "post-clear-latency",
    name: "Increased display latency after console.clear",
    impact: "minor",
    components: ["DevTools Throttler", "console.clear"],
    updates: [
      {
        status: "investigating",
        at: "2026-08-27T09:30:00Z",
        body: "`bench/devtools` reports a median display lag of 63ms once the console has been cleared. Lag stays at that level for every later frame.",
      },
      {
        status: "identified",
        at: "2026-08-27T13:15:00Z",
        body: "After a clear, DevTools inserts a “Console was cleared” row. It takes the throttler's immediate slot and pushes the next frame onto the 50ms timer. With frames 66ms apart, every later frame stays on that timer.",
      },
      { status: "monitoring", at: "2026-08-28T11:00:00Z", body: "A fix has been deployed. After any frame that clears, the renderer waits 110ms once, so later frames arrive more than 50ms after DevTools' previous refresh and take its immediate path." },
      { status: "resolved", at: "2026-08-31T08:00:00Z", body: "Median display lag on textjs.org is 10.4ms. The fix ships in Text.js 1.0." },
    ],
    postmortem: "Discrete input still renders synchronously when the frame interval allows.",
    commits: [],
    links: [{ label: "Break the phase lock", href: "/blog/turbolog-eliminating-the-flash#break-the-phase-lock" }, V1],
  },
  {
    id: "spinner-braille",
    name: "Spinner misaligns rows in the DevTools Console",
    impact: "minor",
    components: ["console.log"],
    updates: [
      { status: "investigating", at: "2026-08-11T15:10:00Z", body: "On macOS, rows that contain a `<Spinner>` are misaligned in DevTools. Cells to the right of the spinner sit off the grid." },
      {
        status: "identified",
        at: "2026-08-11T16:40:00Z",
        body: "The default spinner draws braille patterns (U+2800 to U+28FF). Text.js measures each as one cell, but Menlo, the DevTools console font on macOS, has no braille glyphs. The fallback glyph is wider than a cell and pushes the rest of the row right.",
      },
      { status: "monitoring", at: "2026-08-11T18:05:00Z", body: "A fix has been deployed. The default `dots` spinner now draws quadrant blocks (`▘ ▝ ▗ ▖`), one cell each in Menlo. The braille frames are available as `variant=\"braille\"` for terminals." },
      { status: "resolved", at: "2026-08-12T12:00:00Z", body: "This incident has been resolved. The fix ships in Text.js 1.0." },
    ],
    postmortem: "`LineChart` draws quadrant dots by default for the same reason. Braille is available with `marker=\"braille\"`.",
    commits: [],
    links: [V1],
  },
  {
    id: "blank-paints",
    name: "Elevated blank paints in the DevTools Console",
    impact: "major",
    components: ["console.clear", "DevTools Throttler"],
    updates: [
      { status: "investigating", at: "2026-05-05T14:20:00Z", body: "We are investigating reports of the DevTools Console flashing empty between frames under load." },
      {
        status: "identified",
        at: "2026-05-06T11:45:00Z",
        body: "DevTools applies `console.clear()` synchronously but paints new messages on a 50ms throttle. Each frame removes the previous one immediately and paints up to 50ms later. In `bench/devtools`, a 100×32 dashboard was blank in 70.6% of DevTools paints at 15fps and 81.1% at 60fps.",
      },
      {
        status: "monitoring",
        at: "2026-05-12T17:30:00Z",
        body: "textjs.org now appends frames instead of clearing. A zero-width curtain span keeps earlier frames out of view, and frames are paced at least 66ms apart.",
      },
      { status: "resolved", at: "2026-05-19T16:00:00Z", body: "The fix is released in Text.js 0.4.0. Blank paints are at 1.0%, all of them on the first frame." },
    ],
    postmortem: "Since 0.1.0, Turbolog had sent one `console.clear()` and one `console.log()` per dirty frame. `bench/devtools`, which drives the real DevTools frontend in Chrome for Testing, was built to measure this incident and produced the numbers in the DevTools frontend table above.",
    commits: ["f007ade"],
    links: [{ label: "Turbolog: eliminating the flash", href: "/blog/turbolog-eliminating-the-flash" }, { label: "Changelog: 0.4.0", href: "/changelog#v0-4-0" }],
  },
  {
    id: "linkified-paths",
    name: "File paths in console frames restyled as links",
    impact: "minor",
    components: ["Turbolog encoder"],
    updates: [
      { status: "investigating", at: "2026-04-14T12:00:00Z", body: "Text such as `src/app.tsx:12` and `http://localhost:3000` renders in DevTools' link color instead of its `%c` style." },
      {
        status: "identified",
        at: "2026-04-14T13:30:00Z",
        body: "DevTools turns URLs, `path:line` and `//host:port` text in console messages into links and forces its theme colors onto them. The encoder already broke up `://` and `www.`, but `path:line` and the `//host:port` after a scheme still match.",
      },
      { status: "monitoring", at: "2026-04-14T17:10:00Z", body: "A fix has been deployed. The encoder inserts a word joiner (U+2060) into `path:line`, `//host:port` and `data:` text, unless the cell allows links." },
      { status: "resolved", at: "2026-04-15T09:00:00Z", body: "This incident has been resolved." },
    ],
    postmortem: "`://` and `www.` have carried a word joiner since 0.1.0. Cells that should stay clickable set the allow-link attribute and are written unchanged.",
    commits: [],
    links: [{ label: "Changelog: 0.4.0", href: "/changelog#v0-4-0" }],
  },
  {
    id: "delayed-keystrokes",
    name: "Delayed keystrokes in console apps",
    impact: "minor",
    components: ["textjs.org"],
    updates: [
      { status: "investigating", at: "2025-11-04T16:00:00Z", body: "Typing in console apps lags behind the keyboard, most visibly in OpenCode on textjs.org." },
      { status: "identified", at: "2025-11-05T10:20:00Z", body: "Every update, including a keypress, waits for the next `requestAnimationFrame` before React commits and the frame is logged." },
      { status: "monitoring", at: "2025-11-06T15:00:00Z", body: "A fix has been deployed. Discrete input, such as a keypress or a paste, now renders synchronously in the same task. Other updates still commit on `requestAnimationFrame`." },
      { status: "resolved", at: "2025-11-18T17:00:00Z", body: "The fix is released in Text.js 0.3.0." },
    ],
    postmortem: "Keypresses no longer wait for the next animation frame. Commits that don't come from input, such as timers and streamed data, are still batched per animation frame.",
    commits: ["8c2d1b1"],
    links: [{ label: "Changelog: 0.3.0", href: "/changelog#v0-3-0" }],
  },
];

/** `2026-10-27T15:42:00Z` → `2026-10-27`. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Days a component was degraded: from an incident's first update through its last
 * `monitoring` update (or resolution, if it never reached monitoring).
 */
export function incidentDays(component: string): Map<string, Incident> {
  const out = new Map<string, Incident>();
  for (const incident of INCIDENTS) {
    if (!incident.components.includes(component)) continue;
    const start = Date.parse(`${dayOf(incident.updates[0]!.at)}T00:00:00Z`);
    const lastMonitoring = [...incident.updates].reverse().find((u) => u.status === "monitoring") ?? incident.updates[incident.updates.length - 1]!;
    const end = Date.parse(`${dayOf(lastMonitoring.at)}T00:00:00Z`);
    for (let t = start; t <= end; t += 86_400_000) {
      const d = new Date(t).toISOString().slice(0, 10);
      if (!out.has(d)) out.set(d, incident);
    }
  }
  return out;
}
