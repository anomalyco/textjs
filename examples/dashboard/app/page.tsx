import { useEffect, useState, type ReactNode } from "react";
import { Badge, Box, Text, useTheme, type Metadata } from "textjs";
import Link from "textjs/link";
import { DEPLOYMENTS, formatAge, mulberry32, STATUS, throughputSeries } from "../lib/data";

export const metadata: Metadata = { title: "Overview" };

const BARS = " ▁▂▃▄▅▆▇█";

function MetricCard({ label, value, delta, good }: { label: string; value: string; delta: string; good: boolean }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col grow basis-0 border rounded px-1" borderColor={theme.border} minWidth={18}>
      <Text color={theme.subtle} wrap="nowrap">
        {label}
      </Text>
      <Box className="flex-row">
        <Text bold color={theme.fg} wrap="nowrap">
          {value}
        </Text>
        <Box className="grow" />
        <Text color={good ? theme.success : theme.danger} wrap="nowrap">
          {delta}
        </Text>
      </Box>
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

function ThroughputChart({ height = 6 }: { height?: number }): ReactNode {
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
    <Box className="flex-col border rounded px-1 shrink-0" borderColor={theme.border} title=" Throughput · req/s " titleColor={theme.muted}>
      <Box className="flex-row h-1">
        <Text color={theme.fg} bold wrap="nowrap">{`${Math.round(now * 1800)} req/s`}</Text>
        <Text color={theme.subtle} wrap="nowrap">{`   peak ${Math.round(peak * 1800)} · last 64s · live`}</Text>
      </Box>
      {rows.map((row, i) => (
        <Text key={i} color={i < 2 ? theme.accent : theme.info} wrap="nowrap">
          {row}
        </Text>
      ))}
    </Box>
  );
}

export default function OverviewPage(): ReactNode {
  const theme = useTheme();
  const recent = DEPLOYMENTS.slice(0, 7);
  return (
    <Box className="flex-col gap-1 pt-1 grow">
      <Box className="flex-row gap-1 shrink-0">
        <MetricCard label="Requests · 24h" value="1.28M" delta="+12.4%" good />
        <MetricCard label="p95 latency" value="84ms" delta="−6ms" good />
        <MetricCard label="Error rate" value="0.04%" delta="+0.01%" good={false} />
        <MetricCard label="Bandwidth" value="38.2 GB" delta="+3.1%" good />
      </Box>
      <ThroughputChart />
      <Box className="flex-col shrink-0">
        <Box className="flex-row h-1">
          <Text bold color={theme.fg} wrap="nowrap">
            Recent Deployments
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
              {d.environment === "Production" ? <Badge variant="outline">prod</Badge> : null}
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
