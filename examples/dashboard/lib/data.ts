export type DeploymentStatus = "ready" | "building" | "error" | "queued" | "canceled";

export interface Deployment {
  id: string;
  project: string;
  branch: string;
  commit: string;
  sha: string;
  author: string;
  status: DeploymentStatus;
  environment: "Production" | "Preview";
  durationS: number;
  ageMin: number;
  region: string;
}

export const DEPLOYMENTS: readonly Deployment[] = [
  { id: "dpl_8f2kq1", project: "storefront", branch: "main", commit: "feat: console checkout flow", sha: "a1f9c2e", author: "rauno", status: "building", environment: "Production", durationS: 48, ageMin: 1, region: "iad1" },
  { id: "dpl_7hx0pz", project: "storefront", branch: "fix/cart-badge", commit: "fix: cart badge overflow at 80 cols", sha: "9be41d0", author: "shu", status: "ready", environment: "Preview", durationS: 37, ageMin: 14, region: "iad1" },
  { id: "dpl_6m3ty8", project: "docs", branch: "main", commit: "docs: %c spans explained", sha: "3c07aa9", author: "lee", status: "ready", environment: "Production", durationS: 52, ageMin: 42, region: "sfo1" },
  { id: "dpl_5rw9vb", project: "api", branch: "perf/yoga-cache", commit: "perf: memoize yoga measure funcs", sha: "e5d2b17", author: "jared", status: "error", environment: "Preview", durationS: 21, ageMin: 63, region: "fra1" },
  { id: "dpl_4qk2nd", project: "storefront", branch: "main", commit: "chore: bump react 19.3", sha: "77fa0c3", author: "rauno", status: "ready", environment: "Production", durationS: 44, ageMin: 180, region: "iad1" },
  { id: "dpl_3zb8lc", project: "marketing", branch: "landing/v2", commit: "feat: ▼ inverted hero", sha: "0d9e6b2", author: "evil", status: "queued", environment: "Preview", durationS: 0, ageMin: 2, region: "cdg1" },
  { id: "dpl_2pv6ms", project: "api", branch: "main", commit: "feat: /api/health route handler", sha: "b4c81fe", author: "shu", status: "ready", environment: "Production", durationS: 29, ageMin: 1440, region: "fra1" },
  { id: "dpl_1aa0xx", project: "docs", branch: "typo", commit: "docs: fix typo in Turbolog", sha: "1f2e3d4", author: "lee", status: "canceled", environment: "Preview", durationS: 3, ageMin: 2880, region: "sfo1" },
];

export function findDeployment(id: string): Deployment | undefined {
  return DEPLOYMENTS.find((d) => d.id === id);
}

export const STATUS: Record<DeploymentStatus, { dot: string; label: string; color: string }> = {
  ready: { dot: "●", label: "Ready", color: "success" },
  building: { dot: "●", label: "Building", color: "warning" },
  error: { dot: "●", label: "Error", color: "danger" },
  queued: { dot: "○", label: "Queued", color: "muted" },
  canceled: { dot: "○", label: "Canceled", color: "subtle" },
};

export function formatAge(min: number): string {
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.round(min / 60)}h ago`;
  return `${Math.round(min / 1440)}d ago`;
}

export function formatDuration(s: number): string {
  if (s === 0) return "—";
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Deterministic PRNG so builds and screenshots are stable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function throughputSeries(n: number, seed = 7): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  let v = 0.55;
  for (let i = 0; i < n; i++) {
    v = Math.max(0.08, Math.min(1, v + (rand() - 0.48) * 0.22));
    out.push(v);
  }
  return out;
}

export function buildLog(d: Deployment): string[] {
  const lines = [
    `Cloning github.com/acme/${d.project} (Branch: ${d.branch}, Commit: ${d.sha})`,
    "Cloning completed: 412.381ms",
    `Running build in ${d.region.toUpperCase()} — 4 cores, 8 GB`,
    "Restored build cache from previous deployment",
    'Running "bun install"',
    "bun install v1.2.10",
    " + textjs@0.2.0",
    " + react@19.3.1",
    " 132 packages installed [884.00ms]",
    'Running "text build"',
    "   ▼ Text.js 0.2.0 (Turbolog) — Creating an optimized console production build...",
    " ✓ Compiled successfully in 3.1s",
    " ✓ Collecting route data",
    " ✓ Generating static console cells (5/6)",
    " ✓ Finalizing console optimization",
    "",
    "Route (app)                              Type       Target",
    "┌ ○ /                                    Static     console.log (%c)",
    "├ ○ /_not-found                          Static     console.log (%c)",
    "├ ○ /deployments                         Static     console.log (%c)",
    "├ ƒ /deployments/[id]                    Dynamic    console.log (%c)",
    "├ ○ /logs                                Static     console.log (%c)",
    "└ ○ /settings                            Static     console.log (%c)",
    "",
  ];
  if (d.status === "error") {
    lines.push("⨯ Failed to compile.", "", "./app/page.tsx:12:7", "Type error: Property 'yoga' does not exist on type 'Console'.", "Error: Command \"text build\" exited with 1");
  } else if (d.status === "ready") {
    lines.push("Build Completed in /vershell/output [" + formatDuration(d.durationS) + "]", "Deploying outputs...", `Deployment completed — https://${d.project}-${d.sha}.vershell.app`);
  } else if (d.status === "canceled") {
    lines.splice(4);
    lines.push("Build canceled by user.");
  } else if (d.status === "queued") {
    lines.splice(0, lines.length, "Waiting for an available build machine…");
  }
  return lines;
}

export type LogLevel = "info" | "warn" | "error";

export interface LogLine {
  id: number;
  time: string;
  level: LogLevel;
  method: string;
  path: string;
  status: number;
  ms: number;
  message: string;
}

const PATHS = ["/", "/deployments", "/api/health", "/api/deployments", "/logs", "/settings", "/deployments/dpl_8f2kq1", "/favicon.ico"];
const METHODS = ["GET", "GET", "GET", "POST", "GET", "PATCH"];
const MESSAGES: Record<LogLevel, string[]> = {
  info: ["frame committed", "cache HIT", "edge function invoked", "revalidated /deployments", "%c spans merged"],
  warn: ["slow upstream (>400ms)", "rate limit 80% of quota", "console.clear() storm averted", "stale-while-revalidate served"],
  error: ["upstream 502 from origin", "TypeError: cannot read properties of undefined", "yoga node leak detected", "timeout after 10000ms"],
};

export function createLogGenerator(seed = 42): () => LogLine {
  const rand = mulberry32(seed);
  let id = 0;
  let clock = Date.UTC(2026, 9, 31, 9, 41, 0);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;
  return () => {
    clock += Math.floor(rand() * 900) + 50;
    const r = rand();
    const level: LogLevel = r < 0.08 ? "error" : r < 0.22 ? "warn" : "info";
    const status = level === "error" ? pick([500, 502, 504]) : level === "warn" ? pick([200, 429, 304]) : pick([200, 200, 200, 204, 301]);
    const d = new Date(clock);
    const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")}.${String(d.getUTCMilliseconds()).padStart(3, "0")}`;
    return { id: ++id, time, level, method: pick(METHODS), path: pick(PATHS), status, ms: Math.floor(rand() * (level === "warn" ? 900 : 120)) + 2, message: pick(MESSAGES[level]) };
  };
}
