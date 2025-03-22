import { useState, type ReactNode } from "react";
import { Box, Select, Text, useTheme, type Metadata, type SelectOption } from "textjs";
import { useRouter } from "textjs/navigation";
import { DEPLOYMENTS, formatAge, formatDuration, STATUS, type Deployment } from "../../lib/data";

export const metadata: Metadata = { title: "Deployments" };

export default function DeploymentsPage(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const [highlighted, setHighlighted] = useState<Deployment>(DEPLOYMENTS[0] as Deployment);

  const options: SelectOption<string>[] = DEPLOYMENTS.map((d) => ({
    value: d.id,
    label: `${STATUS[d.status].dot} ${d.id}  ${d.project.padEnd(10)} ${d.branch}`,
    description: d.commit,
    hint: `${formatDuration(d.durationS).padStart(6)}  ${formatAge(d.ageMin).padStart(8)}`,
    badge: d.environment === "Production" ? "prod" : undefined,
  }));

  const s = STATUS[highlighted.status];
  return (
    <Box className="flex-col gap-1 pt-1 grow">
      <Box className="flex-row h-1 shrink-0">
        <Text bold color={theme.fg} wrap="nowrap">
          Deployments
        </Text>
        <Text color={theme.subtle} wrap="nowrap">{`  ${DEPLOYMENTS.length} total · ↑/↓ select · enter open`}</Text>
      </Box>
      <Box className="border rounded px-1 shrink-0" borderColor={theme.border}>
        <Select
          options={options}
          autoFocus
          limit={10}
          showDescriptions={false}
          onHighlight={(id) => setHighlighted(DEPLOYMENTS.find((d) => d.id === id) ?? highlighted)}
          onChange={(id) => router.push(`/deployments/${id}`)}
        />
      </Box>
      <Box className="flex-col border rounded px-1 shrink-0" borderColor={theme.border} title={` ${highlighted.id} `} titleColor={theme.muted}>
        <Box className="flex-row gap-2 h-1">
          <Text color={s.color} wrap="nowrap">{`${s.dot} ${s.label}`}</Text>
          <Text color={theme.muted} wrap="nowrap">{highlighted.environment}</Text>
          <Text color={theme.subtle} wrap="nowrap">{`${highlighted.sha} · ${highlighted.author} · ${highlighted.region}`}</Text>
        </Box>
        <Text color={theme.fg} wrap="truncate-end">
          {highlighted.commit}
        </Text>
      </Box>
    </Box>
  );
}
