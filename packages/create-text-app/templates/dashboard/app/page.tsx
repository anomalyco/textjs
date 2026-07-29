import { useEffect, useState, type ReactNode } from "react";
import { Box, Text, useTheme } from "@textjs/next";
import Link from "@textjs/next/link";
import { DEPLOYMENTS, nextSample, sparkline, STATUS_COLOR } from "../lib/data";

function useSeries(length: number, start: number): number[] {
  const [series, setSeries] = useState(() => Array.from({ length }, () => start));
  useEffect(() => {
    const id = setInterval(() => setSeries((s) => [...s.slice(1), nextSample(s[s.length - 1] ?? start)]), 1000);
    return () => clearInterval(id);
  }, [start]);
  return series;
}

function Metric({ label, unit, start }: { label: string; unit: string; start: number }): ReactNode {
  const theme = useTheme();
  const series = useSeries(32, start);
  const now = series[series.length - 1] ?? 0;
  return (
    <Box className="flex-col grow basis-0 border rounded px-1" borderColor={theme.border} minWidth={24}>
      <Box className="flex-row h-1">
        <Text color={theme.subtle} wrap="nowrap">
          {label}
        </Text>
        <Box className="grow" />
        <Text bold color={theme.fg} wrap="nowrap">{`${Math.round(now * 100)}${unit}`}</Text>
      </Box>
      <Text color={now > 0.8 ? theme.danger : theme.accent} wrap="nowrap">
        {sparkline(series)}
      </Text>
    </Box>
  );
}

export default function MetricsPage(): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col gap-1">
      <Box className="flex-row gap-1 shrink-0">
        <Metric label="CPU" unit="%" start={0.42} />
        <Metric label="Memory" unit="%" start={0.61} />
        <Metric label="Edge hit rate" unit="%" start={0.9} />
      </Box>
      <Text bold color={theme.fg}>
        Deployments
      </Text>
      {DEPLOYMENTS.map((d) => (
        <Box key={d.id} className="flex-row h-1 gap-2 shrink-0">
          <Text color={STATUS_COLOR[d.status]} width={10} wrap="nowrap" flexShrink={0}>{`● ${d.status}`}</Text>
          <Link href={`/deployments/${d.id}`} width={8}>
            {d.id}
          </Link>
          <Text color={theme.muted} width={12} wrap="truncate-end" flexShrink={0}>
            {d.branch}
          </Text>
          <Text color={theme.subtle} wrap="truncate-end" flexGrow={1} flexShrink={1}>
            {d.commit}
          </Text>
          <Text color={theme.subtle} wrap="nowrap">
            {d.age}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
