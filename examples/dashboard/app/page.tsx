import { useEffect, useState, type ReactNode } from "react";
import { Box, Text, useTheme, type Metadata } from "textjs";
import Link from "textjs/link";
import { DEPLOYMENTS, formatAge, mulberry32, STATUS, throughputSeries } from "../lib/data";

export const metadata: Metadata = { title: "Overview" };

const BARS = " ▁▂▃▄▅▆▇█";

function Metric({ label, value }: { label: string; value: string }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col shrink-0" width={20}>
      <Text color={theme.subtle} wrap="nowrap">
        {label}
      </Text>
      <Text bold color={theme.fg} wrap="nowrap">
        {value}
      </Text>
    </Box>
  );
}

function useLiveSeries(length: number): number[] {
  const [series, setSeries] = useState(() => throughputSeries(length));
  useEffect(() => {
    const rand = mulberry32(99);
    const timer = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1] ?? 0.5;
        const next = Math.max(0.08, Math.min(1, last + (rand() - 0.48) * 0.25));
        return [...prev.slice(1), next];
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return series;
}

function ThroughputChart({ height = 5 }: { height?: number }): ReactNode {
  const theme = useTheme();
  const series = useLiveSeries(64);
  const rows: string[] = [];
  for (let r = height - 1; r >= 0; r--) {
    let row = "";
    for (const v of series) {
      const fill = v * height - r;
      row += fill >= 1 ? "█" : fill <= 0 ? " " : (BARS[Math.round(fill * 8)] ?? " ");
    }
    rows.push(row);
  }
  const peak = Math.max(...series);
  const now = series[series.length - 1] ?? 0;
  return (
    <Box className="flex-col shrink-0">
      <Box className="flex-row h-1">
        <Text color={theme.subtle} wrap="nowrap">
          Throughput
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">{`${Math.round(now * 1800)} req/s · peak ${Math.round(peak * 1800)}`}</Text>
      </Box>
      {rows.map((row, i) => (
        <Text key={i} color={theme.accent} wrap="nowrap">
          {row}
        </Text>
      ))}
    </Box>
  );
}

export default function OverviewPage(): ReactNode {
  const theme = useTheme();
  const recent = DEPLOYMENTS.slice(0, 5);
  return (
    <Box className="flex-col gap-1 grow">
      <Box className="flex-row shrink-0">
        <Metric label="Requests · 24h" value="1.28M" />
        <Metric label="p95 latency" value="84ms" />
        <Metric label="Error rate" value="0.04%" />
      </Box>
      <ThroughputChart />
      <Box className="flex-col shrink-0" marginTop={1}>
        <Box className="flex-row h-1">
          <Text bold color={theme.fg} wrap="nowrap">
            Recent deployments
          </Text>
          <Box className="grow" />
          <Link href="/deployments" className="text-subtle">
            View all →
          </Link>
        </Box>
        {recent.map((d) => {
          const s = STATUS[d.status];
          return (
            <Box key={d.id} className="flex-row h-1 gap-2">
              <Text color={s.color} wrap="nowrap" width={10} flexShrink={0}>{`${s.dot} ${s.label}`}</Text>
              <Link href={`/deployments/${d.id}`} focusable={false} className="text-fg" width={12}>
                {d.id}
              </Link>
              <Text color={theme.muted} wrap="truncate-end" width={16} flexShrink={0}>
                {d.branch}
              </Text>
              <Text color={theme.subtle} wrap="truncate-end" flexGrow={1} flexShrink={1}>
                {d.commit}
              </Text>
              <Text color={theme.subtle} wrap="nowrap" width={8} align="right" flexShrink={0}>
                {formatAge(d.ageMin)}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
