import { useEffect, useState, type ReactNode } from "react";
import { Badge, Box, KeyHint, Spinner, Text, useInput, useTheme } from "@textjs/react";

const BARS = " ▁▂▃▄▅▆▇█";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initialSeries(length: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  let v = 0.55;
  for (let i = 0; i < length; i++) {
    v = Math.max(0.1, Math.min(0.98, v + (rand() - 0.5) * 0.22));
    out.push(v);
  }
  return out;
}

export function useLiveSeries(length: number, seed = 7, intervalMs = 900): number[] {
  const [series, setSeries] = useState(() => initialSeries(length, seed));
  useEffect(() => {
    const rand = mulberry32(seed * 31);
    const id = setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1] ?? 0.5;
        const next = Math.max(0.08, Math.min(1, last + (rand() - 0.48) * 0.26));
        return [...prev.slice(1), next];
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [seed, intervalMs]);
  return series;
}

export function ThroughputBars({ series, height = 5, color = "accent" }: { series: readonly number[]; height?: number; color?: string }): ReactNode {
  const rows: string[] = [];
  for (let r = height - 1; r >= 0; r--) {
    let row = "";
    for (const v of series) {
      const fill = v * height - r;
      row += fill >= 1 ? "█" : fill <= 0 ? " " : (BARS[Math.round(fill * 8)] ?? " ");
    }
    rows.push(row);
  }
  return (
    <Box className="flex-col shrink-0">
      {rows.map((row, i) => (
        <Text key={i} color={i < Math.ceil(height / 3) ? color : "info"} wrap="nowrap">
          {row}
        </Text>
      ))}
    </Box>
  );
}

function Metric({ label, value, delta, good }: { label: string; value: string; delta: string; good: boolean }): ReactNode {
  return (
    <Box className="flex-col grow basis-0 border rounded px-1" borderColor="border" minWidth={14}>
      <Text color="subtle" wrap="nowrap">
        {label}
      </Text>
      <Box className="flex-row">
        <Text bold color="fg" wrap="nowrap">
          {value}
        </Text>
        <Box className="grow" />
        <Text color={good ? "success" : "danger"} wrap="nowrap">
          {delta}
        </Text>
      </Box>
    </Box>
  );
}

const DEPLOYS = [
  { id: "dpl_8fK2", status: "ready", branch: "main", msg: "feat: stream cells downward", age: "2m" },
  { id: "dpl_7Qa9", status: "building", branch: "turbolog-rle", msg: "perf: merge spans across \\n", age: "4m" },
  { id: "dpl_6Zx1", status: "ready", branch: "main", msg: "fix: escape %% in format strings", age: "1h" },
  { id: "dpl_5Mn3", status: "error", branch: "css-cascade", msg: "chore: try adding a stylesheet", age: "3h" },
  { id: "dpl_4Lp0", status: "ready", branch: "main", msg: "docs: disable Preserve log", age: "5h" },
] as const;

export interface DashboardDemoProps {
  title?: string;
}

export function DashboardDemo({ title = "storefront" }: DashboardDemoProps): ReactNode {
  const theme = useTheme();
  const series = useLiveSeries(56, 7);
  const [region, setRegion] = useState(0);
  const regions = ["iad1", "sfo1", "fra1", "hnd1"];
  useInput((e) => {
    if (e.key === "left" || e.key === "right") {
      e.stopPropagation();
      setRegion((r) => (r + (e.key === "left" ? regions.length - 1 : 1)) % regions.length);
    }
  });
  const now = series[series.length - 1] ?? 0;
  const peak = Math.max(...series);
  return (
    <Box className="flex-col grow px-1 gap-1">
      <Box className="flex-row h-1 gap-1 shrink-0">
        <Text bold color="fg" wrap="nowrap">
          ▼ {title}
        </Text>
        <Text color="subtle" wrap="nowrap">
          / production
        </Text>
        <Box className="grow" />
        {regions.map((r, i) => (
          <Text key={r} wrap="nowrap" color={i === region ? "accentFg" : "subtle"} bg={i === region ? theme.accent : undefined}>{` ${r} `}</Text>
        ))}
      </Box>
      <Box className="flex-row gap-1 shrink-0">
        <Metric label="Requests · 24h" value="1.28M" delta="+12.4%" good />
        <Metric label="p95 latency" value={`${70 + Math.round(now * 30)}ms`} delta="−6ms" good />
        <Metric label="Error rate" value="0.04%" delta="+0.01%" good={false} />
      </Box>
      <Box className="flex-col border rounded px-1 shrink-0" borderColor="border" title=" Throughput · req/s " titleColor={theme.muted}>
        <Box className="flex-row h-1">
          <Text color="fg" bold wrap="nowrap">{`${Math.round(now * 1800)} req/s`}</Text>
          <Text color="subtle" wrap="nowrap">{`   peak ${Math.round(peak * 1800)} · ${regions[region]} · live`}</Text>
          <Box className="grow" />
          <Spinner variant="dots" label="streaming" />
        </Box>
        <ThroughputBars series={series} height={4} />
      </Box>
      <Box className="flex-col shrink-0">
        {DEPLOYS.map((d) => {
          const color = d.status === "ready" ? "success" : d.status === "building" ? "warning" : "danger";
          return (
            <Box key={d.id} className="flex-row h-1 gap-2">
              <Text color={color} wrap="nowrap" width={11} flexShrink={0}>{`● ${d.status}`}</Text>
              <Text color="fg" wrap="nowrap" width={9} flexShrink={0}>
                {d.id}
              </Text>
              <Text color="muted" wrap="truncate-end" width={13} flexShrink={0}>
                {d.branch}
              </Text>
              <Text color="subtle" wrap="truncate-end" flexGrow={1} flexShrink={1}>
                {d.msg}
              </Text>
              <Text color="subtle" wrap="nowrap" width={3} align="right" flexShrink={0}>
                {d.age}
              </Text>
            </Box>
          );
        })}
      </Box>
      <Box className="flex-row gap-2 shrink-0">
        <KeyHint keys="←/→" label="region" />
        <Badge variant="outline">0 DOM nodes</Badge>
      </Box>
    </Box>
  );
}
