import { Text } from "@textjs/next";

export type DeployStatus = "ready" | "building" | "error" | "queued";

export const STATUS = {
  ready: { label: "Ready", color: "success" },
  building: { label: "Building", color: "warning" },
  error: { label: "Error", color: "danger" },
  queued: { label: "Queued", color: "subtle" },
} as const;

export function Status({ status }: { status: DeployStatus }) {
  const s = STATUS[status];
  return <Text color={s.color} wrap="nowrap">{`● ${s.label}`}</Text>;
}
