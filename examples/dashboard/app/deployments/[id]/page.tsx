import { useState, type ReactNode } from "react";
import { Badge, Box, ScrollBox, Spinner, Text, useInput, useInterval, useTheme, type Metadata } from "@textjs/next";
import Link from "@textjs/next/link";
import { notFound, useRouter } from "@textjs/next/navigation";
import { buildLog, findDeployment, formatAge, formatDuration, STATUS } from "../../../lib/data";

export function generateMetadata({ params }: { params: Record<string, string | string[]> }): Metadata {
  return { title: `Deployment ${String(params.id)}` };
}

function useStreamedLog(lines: string[], streaming: boolean): string[] {
  const [count, setCount] = useState(3);
  useInterval(() => setCount((c) => c + 1), streaming && count < lines.length ? 350 : null);
  return streaming ? lines.slice(0, count) : lines;
}

export default function DeploymentPage({ params }: { params: Record<string, string | string[]> }): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const deployment = findDeployment(String(params.id));
  if (!deployment) notFound();

  const s = STATUS[deployment.status];
  const [lines] = useState(() => buildLog(deployment));
  const visible = useStreamedLog(lines, deployment.status === "building");
  const done = visible.length >= lines.length;

  useInput((e) => {
    if (e.key === "escape" || e.key === "backspace") {
      e.stopPropagation();
      router.back();
    }
  });

  return (
    <Box className="flex-col gap-1 pt-1 grow">
      <Box className="flex-row h-1 gap-2 shrink-0">
        <Link href="/deployments" className="text-subtle" focusable={false}>
          ← Deployments
        </Link>
        <Text color={theme.border}>/</Text>
        <Text bold color={theme.fg} wrap="nowrap">
          {deployment.id}
        </Text>
        <Badge variant={deployment.status === "ready" ? "success" : deployment.status === "error" ? "danger" : deployment.status === "building" ? "warning" : "default"}>{s.label}</Badge>
        {deployment.environment === "Production" ? <Badge variant="accent">Production</Badge> : <Badge variant="outline">Preview</Badge>}
      </Box>

      <Box className="flex-row gap-1 shrink-0">
        {[
          ["Project", deployment.project],
          ["Branch", deployment.branch],
          ["Commit", `${deployment.sha} ${deployment.commit}`],
        ].map(([k, v]) => (
          <Box key={k} className="flex-col border rounded px-1 grow basis-0" borderColor={theme.border} minWidth={14}>
            <Text color={theme.subtle} wrap="nowrap">
              {k}
            </Text>
            <Text color={theme.fg} wrap="truncate-end">
              {v}
            </Text>
          </Box>
        ))}
        <Box className="flex-col border rounded px-1" borderColor={theme.border} width={22} flexShrink={0}>
          <Text color={theme.subtle} wrap="nowrap">
            Duration · Age
          </Text>
          <Text color={theme.fg} wrap="nowrap">{`${formatDuration(deployment.durationS)} · ${formatAge(deployment.ageMin)}`}</Text>
        </Box>
      </Box>

      <Box className="flex-col grow border rounded px-1" borderColor={theme.border} title=" Build Logs " titleColor={theme.muted} bottomTitle=" esc back · ↑/↓ scroll " bottomTitleColor={theme.subtle} bottomTitleAlign="right">
        <ScrollBox className="grow" stickyScroll focusable autoFocus>
          {visible.map((line, i) => (
            <Box key={i} className="flex-row h-1 shrink-0">
              <Text color={theme.subtle} wrap="nowrap" width={5} flexShrink={0}>
                {String(i + 1).padStart(3)}
              </Text>
              <Text
                wrap="truncate-end"
                color={line.startsWith("⨯") || line.includes("Error") ? theme.danger : line.includes("✓") ? theme.success : line.startsWith("Deployment completed") ? theme.accent : theme.muted}
              >
                {line || " "}
              </Text>
            </Box>
          ))}
          {!done ? <Spinner variant="dots" label="Building…" /> : null}
        </ScrollBox>
      </Box>
    </Box>
  );
}
