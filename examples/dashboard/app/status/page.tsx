import { Suspense, useState, type ReactNode } from "react";
import { Box, KeyHint, Spinner, Text, useInput, useTheme, type Metadata } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
import { hostMetrics, probeRegion, REGIONS } from "../../lib/status.server";

/** Rendered on the server: the browser only receives console frames. */
export const runtime = "server";

export const metadata: Metadata = { title: "Status" };

function formatUptime(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

async function Host(): Promise<ReactNode> {
  const m = await hostMetrics();
  return (
    <Box className="flex-col">
      <Text wrap="nowrap">{`${m.hostname} · ${m.platform} · ${m.runtime} · ${m.cpus} CPUs`}</Text>
      <Text color="gray" wrap="nowrap">{`load ${m.load.map((l) => l.toFixed(2)).join(" ")} · memory ${m.memoryUsedPct}% · up ${formatUptime(m.uptimeS)}`}</Text>
    </Box>
  );
}

async function Region({ id, city, attempt }: { id: string; city: string; attempt: number }): Promise<ReactNode> {
  const probe = await probeRegion(id, attempt);
  return (
    <Box className="flex-row h-1 gap-2">
      <Text color={probe.healthy ? "green" : "red"} wrap="nowrap">
        {probe.healthy ? "●" : "●"}
      </Text>
      <Text bold wrap="nowrap" width={6}>
        {id}
      </Text>
      <Text color="gray" wrap="nowrap" width={18}>
        {city}
      </Text>
      <Text wrap="nowrap" width={12}>{`p50 ${probe.p50}ms`}</Text>
      <Text color="gray" wrap="nowrap">{`p99 ${probe.p99}ms`}</Text>
    </Box>
  );
}

function Probing({ id, city }: { id: string; city: string }): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-row h-1 gap-2">
      <Spinner color={theme.subtle} />
      <Text bold color={theme.subtle} wrap="nowrap" width={6}>
        {id}
      </Text>
      <Text color={theme.subtle} wrap="nowrap" width={18}>
        {city}
      </Text>
      <Text color={theme.subtle} wrap="nowrap">
        probing…
      </Text>
    </Box>
  );
}

export default function StatusPage(): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  useInput((e) => {
    if (e.ctrl || e.meta) return;
    if (e.input === "r") {
      setAttempt((n) => n + 1);
      router.refresh();
    }
  });

  return (
    <Box className="flex-col gap-1 pt-1 grow">
      <Box className="flex-row h-1 shrink-0 gap-2">
        <Text bold color={theme.fg} wrap="nowrap">
          Status
        </Text>
        <Text color={theme.subtle} italic wrap="nowrap">
          rendered on the server, streamed into console.log.
        </Text>
      </Box>

      <Box className="flex-col shrink-0 border rounded px-1" borderColor={theme.border} title=" Host ">
        <Suspense fallback={<Spinner label="Reading host metrics…" color={theme.subtle} />}>
          <Host />
        </Suspense>
      </Box>

      <Box className="flex-col shrink-0 border rounded px-1" borderColor={theme.border} title=" Edge regions ">
        {REGIONS.map((r) => (
          <Suspense key={`${r.id}:${attempt}`} fallback={<Probing id={r.id} city={r.city} />}>
            <Region id={r.id} city={r.city} attempt={attempt} />
          </Suspense>
        ))}
      </Box>

      <Box className="grow" />
      <Box className="flex-row h-1 shrink-0 gap-3">
        <KeyHint keys="r" label="re-probe" />
        <Text color={theme.subtle} wrap="nowrap">
          {`attempt ${attempt + 1}`}
        </Text>
      </Box>
    </Box>
  );
}
