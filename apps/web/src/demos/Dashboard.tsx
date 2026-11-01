import { useEffect, useState, type ReactNode } from "react";
import { Box, Text, useApp, useInput, useViewport } from "@textjs/react";

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

const DEPLOYS = [
  { id: "dpl_8fK2", status: "ready", msg: "feat: stream cells downward", age: "2m" },
  { id: "dpl_7Qa9", status: "building", msg: "perf: merge spans across \\n", age: "4m" },
  { id: "dpl_6Zx1", status: "ready", msg: "fix: escape %% in format strings", age: "1h" },
] as const;

// `dev1` is Vercel's region name for localhost. Its stats are this console's own renderer.
const REGIONS = ["iad1", "sfo1", "fra1", "hnd1", "dev1"];
const DEV1 = REGIONS.indexOf("dev1");

function Stat({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <Box className="flex-col shrink-0" width={18}>
      <Text color="subtle" wrap="nowrap">
        {label}
      </Text>
      <Text bold color="fg" wrap="nowrap">
        {value}
      </Text>
    </Box>
  );
}

/** Enough history for the widest console. */
const HISTORY = 200;

export function DashboardDemo(): ReactNode {
  const vp = useViewport();
  const history = useLiveSeries(HISTORY, 7);
  // The chart fills the console: full width, and taller when there's room.
  const series = history.slice(-Math.max(16, Math.min(HISTORY, vp.cols - 4)));
  const chartHeight = Math.max(3, Math.min(12, vp.rows - 20));
  const [region, setRegion] = useState(0);
  useInput((e) => {
    if (e.key === "left" || e.key === "right") {
      e.stopPropagation();
      setRegion((r) => (r + (e.key === "left" ? REGIONS.length - 1 : 1)) % REGIONS.length);
    }
  });
  const now = history[history.length - 1] ?? 0;
  const { renderer } = useApp();
  // Read on the series tick: the numbers describe the frame before this one.
  const stats = region === DEV1 ? renderer.stats() : null;
  return (
    <Box className="flex-col grow px-2 gap-1">
      <Box className="flex-row h-1 gap-2 shrink-0">
        {REGIONS.map((r, i) => (
          <Text key={r} wrap="nowrap" color={i === region ? "fg" : "subtle"} bold={i === region} underline={i === region}>
            {r}
          </Text>
        ))}
      </Box>
      <Box className="flex-row shrink-0" marginTop={1}>
        {stats ? (
          <>
            <Stat label="Frames / s" value={stats.fps.toFixed(1)} />
            <Stat label="Frame time" value={`${stats.totalMs.toFixed(3)}ms`} />
            <Stat label="%c spans" value={String(stats.spanCount)} />
          </>
        ) : (
          <>
            <Stat label="Requests / s" value={String(Math.round(now * 1800 * (1 - region * 0.17)))} />
            <Stat label="p95 latency" value={`${70 + region * 9 + Math.round(now * 30)}ms`} />
            <Stat label="Error rate" value="0.04%" />
          </>
        )}
      </Box>
      <ThroughputBars series={series} height={chartHeight} />
      <Box className="flex-col shrink-0" marginTop={1}>
        {DEPLOYS.map((d) => (
          <Box key={d.id} className="flex-row h-1 gap-2">
            <Text color={d.status === "ready" ? "success" : "warning"} wrap="nowrap" width={10} flexShrink={0}>{`● ${d.status}`}</Text>
            <Text color="muted" wrap="truncate-end" flexGrow={1} flexShrink={1}>
              {d.msg}
            </Text>
            <Text color="subtle" wrap="nowrap" width={3} align="right" flexShrink={0}>
              {d.age}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
