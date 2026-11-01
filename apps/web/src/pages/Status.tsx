import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatPostDate } from "../blog";
import { TurbologLockup } from "../site/brand-marks";
import { Inline } from "../site/Markdown";
import { useConsoleLogDown } from "../console-health";
import { A } from "../router";
import type { BenchResult, Summary } from "./status-bench";
import { COMPONENTS, LAUNCH, type Component, type Tone } from "./status-components";
import history from "./status-history.json";
import { INCIDENTS, incidentDays, type Incident, type IncidentStatus } from "./status-incidents";

const DAYS = 90;

function dayList(end: string): string[] {
  const out: string[] = [];
  const t = Date.parse(`${end}T00:00:00Z`);
  for (let i = DAYS - 1; i >= 0; i--) out.push(new Date(t - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}

const DAY_LIST = dayList(history.measuredAt);
const LIVE_DAYS = DAY_LIST.filter((d) => d >= LAUNCH).length;

const TODAY = DAY_LIST[DAY_LIST.length - 1];

const IMPACT_DAY = { none: "Operational", minor: "Degraded performance", major: "Partial outage" } as const;

/** `today` overrides the last bar (a `console.log` reassigned in this tab). */
function UptimeBars({ name, tone, status, today }: { name: string; tone: Tone; status: string; today?: { tone: string; status: string } }): ReactNode {
  const incidents = incidentDays(name);
  let affected = 0;
  for (const d of DAY_LIST) if (incidents.has(d) && !(today && d === TODAY)) affected++;
  const parts = [`${name}: ${status} on ${LIVE_DAYS - affected - (today ? 1 : 0)} of the last ${DAYS} days`];
  if (affected > 0) parts.push(`${affected} ${affected === 1 ? "day" : "days"} with incidents`);
  if (today) parts.push(`${today.status} today`);
  if (LIVE_DAYS < DAYS) parts.push("no data before launch");
  return (
    <div className="st-bars" role="img" aria-label={parts.join(", ")}>
      {DAY_LIST.map((d) => {
        const incident = incidents.get(d);
        let day: { tone: string; status: string } | null = null;
        if (today && d === TODAY) day = today;
        else if (incident) day = { tone: incident.impact, status: `${IMPACT_DAY[incident.impact]}: ${incident.name}` };
        else if (d >= LAUNCH) day = { tone, status };
        return <span key={d} className={day ? `st-bar st-bar-${day.tone}` : "st-bar"} title={`${formatPostDate(d)} · ${day ? day.status : "No data"}`} />;
      })}
    </div>
  );
}

const OUTAGE = { tone: "outage", status: "Major outage" } as const;
const OUTAGE_DETAIL = "console.log was reassigned in this tab. Reload to restore.";

function ComponentRow({ c, down }: { c: Component; down: boolean }): ReactNode {
  const out = down && c.name === "console.log";
  return (
    <div className="st-component">
      <div className="st-component-head">
        <code className="st-name">{c.name}</code>
        <span className={`st-state st-state-${out ? OUTAGE.tone : c.tone}`}>{out ? OUTAGE.status : c.status}</span>
      </div>
      <UptimeBars name={c.name} tone={c.tone} status={c.status} today={out ? OUTAGE : undefined} />
      <div className="st-axis">
        <span>{DAYS} days ago</span>
        <span className="st-axis-mid">{out ? OUTAGE_DETAIL : c.detail}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const fmtMs = (ms: number, digits = 3): string => `${ms.toFixed(digits)}ms`;

type BenchState = { phase: "idle" } | { phase: "running"; progress: number } | { phase: "done"; result: BenchResult } | { phase: "error"; message: string };

function LiveBenchmark(): ReactNode {
  const [state, setState] = useState<BenchState>({ phase: "idle" });
  const running = useRef(false);

  const run = (): void => {
    if (running.current) return;
    running.current = true;
    setState({ phase: "running", progress: 0 });
    void import("./status-bench")
      .then((m) => m.runPipelineBench((progress) => setState({ phase: "running", progress })))
      .then((result) => setState({ phase: "done", result }))
      .catch((err: unknown) => setState({ phase: "error", message: err instanceof Error ? err.message : String(err) }))
      .finally(() => {
        running.current = false;
      });
  };

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(run, 300);
    return () => window.clearTimeout(id);
  }, []);

  const result = state.phase === "done" ? state.result : null;
  const progress = state.phase === "running" ? state.progress : state.phase === "done" ? 1 : 0;
  const dash = "—";
  const cell = (s: Summary | undefined): string => (s ? fmtMs(s.p50) : dash);
  const metrics: ReadonlyArray<{ label: string; value: string; sub: string }> = [
    { label: "Full frame", value: cell(result?.fullFrame), sub: result ? `mean ${fmtMs(result.fullFrame.mean)} · p95 ${fmtMs(result.fullFrame.p95)}` : "layout + paint + encode" },
    { label: "Typing", value: cell(result?.typing), sub: result ? `mean ${fmtMs(result.typing.mean)} · p95 ${fmtMs(result.typing.p95)}` : "one-row edit" },
    { label: "Idle frame", value: cell(result?.idle), sub: result ? `${result.idleConsoleCalls} console calls` : "nothing changed" },
    { label: "%c spans", value: result ? String(result.spans) : dash, sub: `${(100 * 32).toLocaleString("en-US")} cells` },
  ];

  return (
    <section className="st-card st-live" aria-labelledby="st-live-title">
      <div className="st-card-head">
        <div>
          <h2 id="st-live-title">Live benchmark</h2>
          <p>
            The <code>@textjs/core</code> pipeline runs in this tab on a 100×32 dashboard and writes frames to an in-memory console.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={run} disabled={state.phase === "running"}>
          {state.phase === "running" ? "Running…" : state.phase === "idle" ? "Run" : "Run again"}
        </button>
      </div>
      <div className="st-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
      <dl className="st-metrics" aria-live="polite">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
            <dd className="st-sub">{m.sub}</dd>
          </div>
        ))}
      </dl>
      <p className="st-foot">
        {state.phase === "error"
          ? `The benchmark could not run: ${state.message}`
          : result
            ? `${result.frames.toLocaleString("en-US")} frames in batches of 10, measured on this device. Medians shown.`
            : "Starts automatically once the page is idle."}
      </p>
    </section>
  );
}

const RUNS = history.pipeline.runs;

/** `2025-03-25` → `Mar 2025`. */
function formatMonth(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
const MAX_TYPING = Math.max(...RUNS.map((r) => r.typingMs));

function PerfHistory(): ReactNode {
  return (
    <section className="st-card" aria-labelledby="st-history-title">
      <div className="st-card-head">
        <div>
          <h2 id="st-history-title">Performance history</h2>
          <p>
            <code>packages/core/test/perf.test.ts</code> at each milestone, same machine ({history.machine}). Mean of 1,000 frames.
          </p>
        </div>
      </div>
      <div className="st-table-wrap">
        <table className="st-table">
          <thead>
            <tr>
              <th scope="col">Release</th>
              <th scope="col">Full frame</th>
              <th scope="col">Typing</th>
              <th scope="col">Idle</th>
              <th scope="col">%c spans</th>
            </tr>
          </thead>
          <tbody>
            {RUNS.map((r) => (
              <tr key={r.commit}>
                <th scope="row">
                  <span className="st-ver">{r.milestone}</span>
                  <span className="st-commit">
                    {formatMonth(r.released)} · {r.label} · <code>{r.commit}</code>
                  </span>
                </th>
                <td>{fmtMs(r.fullFrameMs)}</td>
                <td>
                  <span className="st-meter">
                    <span style={{ width: `${(r.typingMs / MAX_TYPING) * 100}%` }} />
                  </span>
                  {fmtMs(r.typingMs)}
                </td>
                <td>{fmtMs(r.idleMs)}</td>
                <td>{r.spans}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DevToolsHistory(): ReactNode {
  return (
    <section className="st-card" aria-labelledby="st-dt-title">
      <div className="st-card-head">
        <div>
          <h2 id="st-dt-title">DevTools frontend</h2>
          <p>
            <code>bench/devtools</code> in Chrome for Testing: blank paints, delivered frames and display lag, 5s per run.{" "}
            <A href="/blog/turbolog-eliminating-the-flash">How we measure</A>.
          </p>
        </div>
      </div>
      <div className="st-table-wrap">
        <table className="st-table">
          <thead>
            <tr>
              <th scope="col">Driver</th>
              <th scope="col">FPS</th>
              <th scope="col">Blank paints</th>
              <th scope="col">Painted / emitted</th>
              <th scope="col">Lag p50</th>
            </tr>
          </thead>
          <tbody>
            {history.devtools.runs.map((r) => (
              <tr key={`${r.strategy}-${r.fps}`} className={r.strategy === "append" && r.fps === 15 ? "st-ship" : undefined}>
                <th scope="row">{r.strategy === "append" ? (r.fps === 15 ? "Append (shipping)" : "Append, unpaced") : "Clear per frame"}</th>
                <td>{r.fps}</td>
                <td>{r.blankPct.toFixed(1)}%</td>
                <td>
                  {r.painted} / {r.emitted}
                </td>
                <td>{r.lagP50Ms.toFixed(1)}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const STATUS_LABEL: Record<IncidentStatus, string> = { investigating: "Investigating", identified: "Identified", monitoring: "Monitoring", resolved: "Resolved" };

/** `2026-10-27T15:42:00Z` → `Oct 27, 2026 · 15:42 UTC`. */
function formatUpdateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${date} · ${iso.slice(11, 16)} UTC`;
}

function shortDay(iso: string, year: boolean): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: year ? "numeric" : undefined, timeZone: "UTC" });
}

/** `Oct 27, 2026` or `Oct 27 – Oct 28, 2026`. */
function incidentSpan(i: Incident): string {
  const first = i.updates[0]!.at;
  const last = i.updates[i.updates.length - 1]!.at;
  if (first.slice(0, 10) === last.slice(0, 10)) return shortDay(first, true);
  return `${shortDay(first, first.slice(0, 4) !== last.slice(0, 4))} – ${shortDay(last, true)}`;
}

function monthOf(i: Incident): string {
  return new Date(i.updates[0]!.at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function IncidentItem({ incident: i }: { incident: Incident }): ReactNode {
  return (
    <li id={i.id} className="st-incident">
      <details>
        <summary>
          <span className={`st-incident-name st-impact-${i.impact}`}>{i.name}</span>
          <span className="st-incident-when">{incidentSpan(i)} · Resolved</span>
        </summary>
        <div className="st-incident-body">
          <ol className="st-updates">
            {[...i.updates].reverse().map((u) => (
              <li key={u.at}>
                <strong>{STATUS_LABEL[u.status]}</strong>
                <p>
                  <Inline text={u.body} />
                </p>
                <time dateTime={u.at}>{formatUpdateTime(u.at)}</time>
              </li>
            ))}
          </ol>
          {i.components.length > 0 ? <p className="st-affected">This incident affected: {i.components.join(", ")}.</p> : null}
          <div className="st-postmortem">
            <h4>Postmortem</h4>
            <p>
              <Inline text={i.postmortem} />
            </p>
            <p className="st-fix">
              {i.commits.length > 0 ? (
                <>
                  {i.commits.length === 1 ? "Fix" : "Fixes"}:{" "}
                  {i.commits.map((c, n) => (
                    <span key={c}>
                      {n > 0 ? ", " : null}
                      <code>{c}</code>
                    </span>
                  ))}
                </>
              ) : null}
              {i.links.map((l, n) => (
                <span key={l.href}>
                  {i.commits.length > 0 || n > 0 ? " · " : null}
                  <A href={l.href}>{l.label}</A>
                </span>
              ))}
            </p>
          </div>
        </div>
      </details>
    </li>
  );
}

function PastIncidents(): ReactNode {
  const months: Array<{ month: string; incidents: Incident[] }> = [];
  for (const i of INCIDENTS) {
    const month = monthOf(i);
    const last = months[months.length - 1];
    if (last?.month === month) last.incidents.push(i);
    else months.push({ month, incidents: [i] });
  }
  // `/status#<id>` (the incidents API's shortlinks) opens that incident.
  useEffect(() => {
    const open = (): void => {
      const id = decodeURIComponent(location.hash.slice(1));
      const details = id ? document.getElementById(id)?.querySelector("details") : null;
      if (!details) return;
      details.open = true;
      details.scrollIntoView({ block: "start" });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return (
    <section className="st-card" aria-labelledby="st-incidents-title">
      <div className="st-card-head">
        <div>
          <h2 id="st-incidents-title">Past incidents</h2>
          <p>Newest first. Times are in UTC.</p>
        </div>
      </div>
      {months.map((m) => (
        <div key={m.month} className="st-month">
          <h3>{m.month}</h3>
          <ul className="st-incidents">
            {m.incidents.map((i) => (
              <IncidentItem key={i.id} incident={i} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function StatusPage(): ReactNode {
  const down = useConsoleLogDown();
  return (
    <div className="container st">
      <header className="rs-head">
        <p className="eyebrow">Status</p>
        <h1>
          <TurbologLockup className="st-lockup" /> Status
        </h1>
      </header>

      <div className={`st-banner${down ? " st-banner-outage" : ""}`} role="status">
        <span className={`dot${down ? " dot-red" : ""}`} />
        <strong>{down ? "Major outage" : "All systems operational"}</strong>
        <span className="st-updated">Updated {formatPostDate(history.measuredAt)}</span>
      </div>

      <section className="st-card st-components" aria-label="Components">
        {COMPONENTS.map((c) => (
          <ComponentRow key={c.name} c={c} down={down} />
        ))}
      </section>

      <LiveBenchmark />
      <PerfHistory />
      <DevToolsHistory />

      <PastIncidents />
    </div>
  );
}

