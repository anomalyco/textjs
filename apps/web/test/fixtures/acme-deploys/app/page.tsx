import { useState } from "react";
import { Box, Text, useAppTheme, useInput } from "@textjs/next";
import { Status, STATUS, type DeployStatus } from "./status";

const ORDER: DeployStatus[] = ["ready", "building", "error", "queued"];

function Card({ title, value }: { title: string; value: string }) {
  return (
    <Box className="flex-col border rounded px-1 grow shrink basis-0" minWidth={14} minHeight={4}>
      <Text color="subtle">{title}</Text>
      <Text bold>{value}</Text>
    </Box>
  );
}

export default function Page() {
  const { cycleTheme } = useAppTheme();
  const [status, setStatus] = useState<DeployStatus>("ready");
  const [stacked, setStacked] = useState(false);

  useInput((e) => {
    if (e.input === "t") cycleTheme();
    if (e.input === "s") setStatus((s) => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length]);
    if (e.input === "d") setStacked((v) => !v);
  });

  return (
    <Box className="flex-col grow gap-1">
      <Box className={stacked ? "flex-col gap-1" : "flex-row items-start gap-1"}>
        <Card title="Production" value="acme-web" />
        <Card title="Deployments" value="6 today" />
        <Card title="Build time" value="38s p50" />
      </Box>
      <Box className="flex-col border rounded px-2 py-1 bg-surface">
        <Box className="flex-row gap-2 h-1">
          <Text bold>acme-web</Text>
          <Status status={status} />
        </Box>
        <Text color="muted" wrap="truncate-end">feat: stream cells downward</Text>
        <Text color={STATUS[status].color} italic={status === "building"} strikethrough={status === "error"}>
          dpl_8fK2
        </Text>
      </Box>
    </Box>
  );
}
