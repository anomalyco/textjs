import type { DeployStatus } from "../app/status";

export interface Deployment {
  id: string;
  project: string;
  branch: string;
  commit: string;
  status: DeployStatus;
  region: string;
  /** Build time in seconds. */
  duration: number;
  age: string;
}

export const DEPLOYMENTS: Deployment[] = [
  { id: "dpl_8fK2", project: "acme-web", branch: "main", commit: "feat: stream cells downward", status: "ready", region: "iad1", duration: 38, age: "2m" },
  { id: "dpl_7Qa9", project: "acme-api", branch: "main", commit: "perf: merge spans across rows", status: "building", region: "sfo1", duration: 52, age: "4m" },
  { id: "dpl_6Zx1", project: "acme-web", branch: "fix/escape", commit: "fix: escape % in format strings", status: "ready", region: "fra1", duration: 31, age: "1h" },
  { id: "dpl_5Lm3", project: "acme-docs", branch: "main", commit: "docs: keymaps chapter", status: "error", region: "iad1", duration: 12, age: "3h" },
  { id: "dpl_4Hc7", project: "acme-api", branch: "feat/charts", commit: "feat: build time sparkline", status: "ready", region: "hnd1", duration: 44, age: "5h" },
  { id: "dpl_3Pv8", project: "acme-web", branch: "main", commit: "chore: bump react to 19.3", status: "ready", region: "iad1", duration: 36, age: "1d" },
];

export function createDeployment(input: Partial<Deployment>): Deployment {
  const deployment: Deployment = {
    id: `dpl_${Math.random().toString(36).slice(2, 6)}`,
    project: "acme-web",
    branch: "main",
    commit: "feat: POST /api/deployments",
    region: "iad1",
    duration: 0,
    age: "now",
    ...input,
    status: "building",
  };
  DEPLOYMENTS.unshift(deployment);
  return deployment;
}
