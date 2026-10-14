import type { ReactNode } from "react";
import { Box, Spacer, Text } from "@textjs/react";

/** The app every chapter builds on: Acme Deploys, a deploy dashboard in the console. */

export type DeployStatus = "ready" | "building" | "error" | "queued";

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

export const DEPLOYMENTS: readonly Deployment[] = [
  { id: "dpl_8fK2", project: "acme-web", branch: "main", commit: "feat: stream cells downward", status: "ready", region: "iad1", duration: 38, age: "2m" },
  { id: "dpl_7Qa9", project: "acme-api", branch: "main", commit: "perf: merge spans across rows", status: "building", region: "sfo1", duration: 52, age: "4m" },
  { id: "dpl_6Zx1", project: "acme-web", branch: "fix/escape", commit: "fix: escape % in format strings", status: "ready", region: "fra1", duration: 31, age: "1h" },
  { id: "dpl_5Lm3", project: "acme-docs", branch: "main", commit: "docs: keymaps chapter", status: "error", region: "iad1", duration: 12, age: "3h" },
  { id: "dpl_4Hc7", project: "acme-api", branch: "feat/charts", commit: "feat: build time sparkline", status: "ready", region: "hnd1", duration: 44, age: "5h" },
  { id: "dpl_3Pv8", project: "acme-web", branch: "main", commit: "chore: bump react to 19.3", status: "ready", region: "iad1", duration: 36, age: "1d" },
];

/** Build times of the last 24 deployments, oldest first. */
export const BUILD_TIMES: readonly number[] = [41, 38, 44, 36, 52, 47, 39, 35, 33, 38, 31, 29, 34, 30, 42, 37, 33, 31, 28, 35, 30, 27, 29, 26];

export const STATUS: Record<DeployStatus, { label: string; color: string }> = {
  ready: { label: "Ready", color: "success" },
  building: { label: "Building", color: "warning" },
  error: { label: "Error", color: "danger" },
  queued: { label: "Queued", color: "subtle" },
};

export function Status({ status }: { status: DeployStatus }): ReactNode {
  const s = STATUS[status];
  return (
    <Text color={s.color} wrap="nowrap">
      {`● ${s.label}`}
    </Text>
  );
}

/** The app's top bar, from chapter 2 on. */
export function TopBar({ path = "/", right }: { path?: string; right?: ReactNode }): ReactNode {
  return (
    <Box className="flex-row h-1 px-1 gap-2 shrink-0">
      <Text bold wrap="nowrap">
        ▼ Acme
      </Text>
      <Text color="subtle" wrap="nowrap">
        {`acme.local${path === "/" ? "" : path}`}
      </Text>
      <Spacer />
      {right}
    </Box>
  );
}

export function seconds(s: number): string {
  return `${s}s`;
}
