#!/usr/bin/env bun
/**
 * Top crash reports from textjs.org (`POST /api/errors`, see server/reports.ts).
 *
 *   bun scripts/errors.ts                 top 20 fingerprints in production, last 24 hours
 *   bun scripts/errors.ts --hours 2       a shorter window
 *   bun scripts/errors.ts --env preview   preview deployments (*.pages.dev)
 *   bun scripts/errors.ts --env all --limit 50 --json
 *   bun scripts/errors.ts --tail          stream reports live from the production deployment
 *
 * Reads the Analytics Engine dataset `textjs_errors` through the SQL API. Auth: `CLOUDFLARE_API_TOKEN`
 * (needs Account > Account Analytics > Read), else the token from `wrangler login`. The account is
 * `CLOUDFLARE_ACCOUNT_ID`, else the token's only account, else the one that owns the `textjs`
 * Pages project. `--tail` runs
 * `wrangler pages deployment tail` instead and works without the dataset.
 */

import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { printable } from "../src/telemetry/shared";

const DATASET = process.env.ERRORS_DATASET ?? "textjs_errors";
const PROJECT = "textjs";

const USAGE = `Usage: bun scripts/errors.ts [options]

Top crash reports from textjs.org, grouped by fingerprint.

Options:
  --hours <n>    Window, 1 to 2160 hours (default 24; Analytics Engine keeps data for 3 months)
  --env <name>   production, preview (*.pages.dev) or all (default production)
  --limit <n>    Fingerprints to list, 1 to 500 (default 20)
  --json         Print JSON
  --tail         Stream reports live with wrangler pages deployment tail
  --help         Show this help`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

let values: { hours?: string; env?: string; limit?: string; json?: boolean; tail?: boolean; help?: boolean };
try {
  ({ values } = parseArgs({
    options: { hours: { type: "string" }, env: { type: "string" }, limit: { type: "string" }, json: { type: "boolean" }, tail: { type: "boolean" }, help: { type: "boolean" } },
    strict: true,
    allowPositionals: false,
  }));
} catch (error) {
  fail(`${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`);
}
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}
const flag = (name: "json" | "tail"): boolean => values[name] === true;

const hours = Number(values.hours ?? 24);
const limit = Number(values.limit ?? 20);
const env = values.env ?? "production";
if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 90) fail("--hours must be a whole number from 1 to 2160 (Analytics Engine keeps data for 3 months)");
if (!Number.isInteger(limit) || limit < 1 || limit > 500) fail("--limit must be a whole number from 1 to 500");
if (!["production", "preview", "all"].includes(env)) fail("--env must be production, preview or all");

async function token(): Promise<string> {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const proc = Bun.spawnSync(["bunx", "wrangler", "auth", "token", "--json"], { stdout: "pipe", stderr: "pipe", cwd: import.meta.dir });
  try {
    return (JSON.parse(proc.stdout.toString()) as { token: string }).token;
  } catch {
    return fail("No Cloudflare credentials. Run `bunx wrangler login`, or set CLOUDFLARE_API_TOKEN (Account Analytics: Read).");
  }
}

const API = "https://api.cloudflare.com/client/v4";

async function account(auth: string): Promise<string> {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const headers = { authorization: `Bearer ${auth}` };
  const res = await fetch(`${API}/accounts?per_page=50`, { headers });
  const accounts = ((await res.json()) as { result?: Array<{ id: string }> }).result ?? [];
  if (accounts.length === 1) return (accounts[0] as { id: string }).id;
  for (const { id } of accounts) {
    const project = await fetch(`${API}/accounts/${id}/pages/projects/${PROJECT}`, { headers });
    if (project.ok) return id;
  }
  return fail(`No account with a Pages project named ${PROJECT}. Set CLOUDFLARE_ACCOUNT_ID.`);
}

interface Row {
  [column: string]: string | number | string[];
}

async function sql(auth: string, accountId: string, query: string): Promise<Row[]> {
  const res = await fetch(`${API}/accounts/${accountId}/analytics_engine/sql`, {
    method: "POST",
    headers: { authorization: `Bearer ${auth}` },
    body: `${query} FORMAT JSON`,
  });
  const text = await res.text();
  if (!res.ok) {
    if (/unknown table|does not exist|not found/i.test(text)) {
      console.log(`No reports yet. The ${DATASET} dataset is created when a deployment with the ERRORS binding receives its first report.`);
      process.exit(0);
    }
    fail(`Analytics Engine SQL API ${res.status}: ${text.slice(0, 500)}`);
  }
  return (JSON.parse(text) as { data: Row[] }).data;
}

const n = (v: unknown): number => Math.round(Number(v));
const quote = (s: string): string => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

async function top(): Promise<void> {
  const auth = await token();
  const accountId = await account(auth);
  const where = [`timestamp > NOW() - INTERVAL '${hours}' HOUR`, ...(env === "all" ? [] : [`blob10 = ${quote(env)}`])].join(" AND ");
  // Estimated events: Analytics Engine's own sampling times the page-load sampling (double1 = 1 / SAMPLE_RATE).
  const events = "SUM(_sample_interval * double1)";
  const groups = await sql(
    auth,
    accountId,
    `SELECT index1 AS fingerprint, ${events} AS events, argMax(blob1, timestamp) AS kind, argMax(blob2, timestamp) AS message, argMax(blob8, timestamp) AS code, argMax(blob9, timestamp) AS stack, argMax(blob4, timestamp) AS release, min(timestamp) AS first, max(timestamp) AS last FROM ${DATASET} WHERE ${where} GROUP BY fingerprint ORDER BY events DESC LIMIT ${limit}`,
  );
  if (groups.length === 0) {
    console.log(`No crash reports in ${env === "all" ? "any environment" : env} in the last ${hours} h.`);
    return;
  }
  const fps = groups.map((g) => quote(String(g.fingerprint))).join(", ");
  const breakdown = async (column: string): Promise<Map<string, Array<[string, number]>>> => {
    const rows = await sql(auth, accountId, `SELECT index1 AS fingerprint, ${column} AS value, ${events} AS events FROM ${DATASET} WHERE ${where} AND index1 IN (${fps}) GROUP BY fingerprint, value ORDER BY events DESC`);
    const out = new Map<string, Array<[string, number]>>();
    for (const r of rows) {
      const list = out.get(String(r.fingerprint)) ?? [];
      list.push([printable(r.value) || "(none)", n(r.events)]);
      out.set(String(r.fingerprint), list);
    }
    return out;
  };
  const [routes, browsers, oses, viewports] = await Promise.all([breakdown("blob3"), breakdown("blob5"), breakdown("blob6"), breakdown("blob7")]);

  if (flag("json")) {
    console.log(JSON.stringify(groups.map((g) => ({ ...g, events: n(g.events), routes: routes.get(String(g.fingerprint)), browsers: browsers.get(String(g.fingerprint)), os: oses.get(String(g.fingerprint)), viewports: viewports.get(String(g.fingerprint)) })), null, 2));
    return;
  }
  const total = groups.reduce((s, g) => s + n(g.events), 0);
  const list = (m: Map<string, Array<[string, number]>>, fp: string, max = 5): string => {
    const items = m.get(fp) ?? [];
    return items.slice(0, max).map(([k, c]) => `${k} ${c}`).join(", ") + (items.length > max ? `, +${items.length - max} more` : "");
  };
  console.log(`Top crash reports, ${env}, last ${hours} h: ${groups.length} fingerprints, ${total} events${groups.length === limit ? " (limit reached)" : ""}\n`);
  groups.forEach((g, i) => {
    const fp = String(g.fingerprint);
    console.log(`#${i + 1}  ${printable(fp)}  ${n(g.events)} events  ${printable(g.kind)}${g.code ? ` ${printable(g.code)}` : ""}  ${printable(g.first)} → ${printable(g.last)} UTC  release ${printable(g.release)}`);
    console.log(`    ${printable(g.message)}`);
    for (const frame of String(g.stack).split("\n").filter(Boolean).slice(0, 3)) console.log(`      at ${printable(frame)}`);
    console.log(`    routes    ${list(routes, fp)}`);
    console.log(`    browsers  ${list(browsers, fp)}`);
    console.log(`    os        ${list(oses, fp)}  ·  viewports ${list(viewports, fp)}\n`);
  });
}

function tail(): void {
  const counts = new Map<string, { n: number; message: string }>();
  const child = spawn("bunx", ["wrangler", "pages", "deployment", "tail", "--project-name", PROJECT, "--environment", env === "preview" ? "preview" : "production", "--format", "json"], {
    cwd: import.meta.dir,
    stdio: ["ignore", "pipe", "inherit"],
  });
  console.error(`Tailing ${PROJECT} (${env === "preview" ? "preview" : "production"}) for crash reports. Ctrl+C to stop.`);
  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    // `--format json` prints one pretty-printed object per event; split on top-level boundaries.
    for (;;) {
      const end = buffer.indexOf("\n}\n");
      if (end < 0) break;
      const raw = buffer.slice(0, end + 2);
      buffer = buffer.slice(end + 3);
      let event: { logs?: Array<{ message?: unknown[] }> };
      try {
        event = JSON.parse(raw.slice(raw.indexOf("{")));
      } catch {
        continue;
      }
      for (const log of event.logs ?? []) {
        const first = log.message?.[0];
        if (typeof first !== "string" || !first.includes('"textjs.report"')) continue;
        try {
          const r = JSON.parse(first) as { fingerprint: string; kind: string; message: string; route: string; browser: string; os: string; viewport: string };
          const c = counts.get(r.fingerprint) ?? { n: 0, message: r.message };
          c.n++;
          counts.set(r.fingerprint, c);
          console.log(`${new Date().toISOString().slice(11, 19)}  ${printable(r.fingerprint)} ×${c.n}  ${[r.kind, r.route, `${r.browser} ${r.os} ${r.viewport}`, r.message].map(printable).join("  ")}`);
        } catch {
          // Not a report.
        }
      }
    }
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

if (flag("tail")) tail();
else await top();
