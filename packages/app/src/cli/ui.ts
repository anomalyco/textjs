import { BRAND_MARK, ENGINE_NAME, VERSION } from "@textjs/core";
import type { FlatRoute } from "../routing";

const enabled = (): boolean => {
  if (typeof process === "undefined") return false;
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  if (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout && process.stdout.isTTY);
};

const wrap =
  (open: number, close: number) =>
  (s: string): string =>
    enabled() ? `\x1b[${open}m${s}\x1b[${close}m` : s;

export const color = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  cyan: wrap(36, 39),
  magenta: wrap(35, 39),
  gray: wrap(90, 39),
};

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

export function brand(): string {
  return `${color.bold(`${BRAND_MARK} Text.js ${VERSION}`)} ${color.dim(`(${ENGINE_NAME})`)}`;
}

export function banner(lines: Array<[string, string]>): string {
  const out = [`   ${brand()}`];
  for (const [k, v] of lines) out.push(`   - ${`${k}:`.padEnd(14)}${v}`);
  return out.join("\n");
}

export const ok = (msg: string): string => ` ${color.green("✓")} ${msg}`;
export const fail = (msg: string): string => ` ${color.red("⨯")} ${msg}`;
export const info = (msg: string): string => ` ${color.gray("○")} ${msg}`;

export interface SummaryRoute {
  pattern: string;
  dynamic: boolean;
  target: string;
  /** `export const runtime = "server"`. */
  server?: boolean;
}

const ROUTE_COL = 37;
const TYPE_COL = 11;

/** The Next.js-style route summary table printed by `text build`. */
export function routeTable(routes: readonly SummaryRoute[]): string {
  const lines = [`${color.bold("Route (app)".padEnd(ROUTE_COL + 4))}${color.bold("Type".padEnd(TYPE_COL))}${color.bold("Target")}`];
  routes.forEach((r, i) => {
    const corner = routes.length === 1 ? "─" : i === 0 ? "┌" : i === routes.length - 1 ? "└" : "├";
    const sym = r.server ? "◇" : r.dynamic ? "ƒ" : "○";
    const pattern = r.pattern.length > ROUTE_COL - 1 ? `${r.pattern.slice(0, ROUTE_COL - 2)}…` : r.pattern;
    const type = r.server ? "Server" : r.dynamic ? "Dynamic" : "Static";
    lines.push(`${color.gray(corner)} ${sym} ${pattern.padEnd(ROUTE_COL)}${type.padEnd(TYPE_COL)}${color.gray(r.target)}`);
  });
  return lines.join("\n");
}

export const LEGEND = ["○  (Static)   prerendered as static console cells", "ƒ  (Dynamic)  on-demand console reconciliation"].join("\n");
/** Appended to {@link LEGEND} when the app has server-rendered routes. */
export const SERVER_LEGEND = "◇  (Server)   rendered on the server, streamed as frames";

export function summarize(pages: readonly FlatRoute[], api: ReadonlyArray<{ pattern: string }>, serverPatterns: ReadonlySet<string> = new Set()): SummaryRoute[] {
  const out: SummaryRoute[] = pages.map((p) =>
    serverPatterns.has(p.pattern) ? { pattern: p.pattern, dynamic: true, server: true, target: "frame player (SSE)" } : { pattern: p.pattern, dynamic: p.dynamic, target: "console.log (%c)" },
  );
  if (!out.some((r) => r.pattern === "/_not-found")) {
    const nf = { pattern: "/_not-found", dynamic: false, target: "console.log (%c)" };
    out.splice(out[0]?.pattern === "/" ? 1 : 0, 0, nf);
  }
  for (const a of api) out.push({ pattern: a.pattern, dynamic: true, target: "Route Handler" });
  return out;
}

export function formatBytes(n: number): string {
  if (n < 1000) return `${n} B`;
  return `${(n / 1000).toFixed(1)} kB`;
}

export function devtoolsHint(): string {
  return info("Open the browser console to view your app: https://textjs.org/docs/installation#open-the-console");
}
