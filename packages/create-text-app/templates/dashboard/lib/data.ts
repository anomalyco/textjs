export type Status = "ready" | "building" | "error";

export interface Deployment {
  id: string;
  branch: string;
  commit: string;
  status: Status;
  age: string;
}

export const DEPLOYMENTS: readonly Deployment[] = [
  { id: "dpl_a1", branch: "main", commit: "feat: real-time metrics", status: "building", age: "1m" },
  { id: "dpl_b2", branch: "fix/chart", commit: "fix: sparkline clipping at 80 cols", status: "ready", age: "18m" },
  { id: "dpl_c3", branch: "main", commit: "chore: upgrade textjs", status: "ready", age: "2h" },
  { id: "dpl_d4", branch: "exp/wasm", commit: "perf: yoga in a worker", status: "error", age: "5h" },
];

export const STATUS_COLOR: Record<Status, string> = { ready: "success", building: "warning", error: "danger" };

const SPARK = "▁▂▃▄▅▆▇█";

export function sparkline(values: readonly number[]): string {
  return values.map((v) => SPARK[Math.max(0, Math.min(7, Math.round(v * 7)))]).join("");
}

export function nextSample(prev: number): number {
  return Math.max(0.05, Math.min(1, prev + (Math.random() - 0.5) * 0.18));
}
