/**
 * Acme Deploys at the end of each chapter. Each component mirrors the code the
 * chapter ends with, wired to the companion instead of a real `text dev` app
 * (the site has no App Router, so routing and fetching are simulated in memory).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart,
  Box,
  KeyHelp,
  Sparkline,
  Spinner,
  Table,
  Text,
  useInput,
  useKeymap,
  useTheme,
  type SortState,
  type TableColumn,
} from "@textjs/react";
import { siteStore } from "../../console-companion/store";
import { BUILD_TIMES, DEPLOYMENTS, seconds, Status, STATUS, TopBar, type DeployStatus, type Deployment } from "./acme";

/* ─────────────── 01 · Getting started ─────────────── */

export function GettingStartedApp(): ReactNode {
  const [hellos, setHellos] = useState(0);
  useInput((e) => {
    if (e.key === "return") setHellos((n) => n + 1);
    else if (e.input === "r") setHellos(0);
    else return;
    e.stopPropagation();
  });
  return (
    <Box className="flex-col grow items-center justify-center">
      <Box className="flex-col border rounded px-2 py-1 shrink-0">
        <Text bold>▼ Acme Deploys</Text>
        <Text color="muted">{hellos === 0 ? "Hello, console." : `Hello, console. ×${hellos}`}</Text>
      </Box>
    </Box>
  );
}

/* ─────────────── 02 · Layout ─────────────── */

const NAV = ["Overview", "Deployments", "Settings"];

function Card({ title, value }: { title: string; value: string }): ReactNode {
  return (
    <Box className="flex-col border rounded px-1 grow shrink basis-0" minWidth={14} minHeight={4}>
      <Text color="subtle" wrap="nowrap">
        {title}
      </Text>
      <Text bold wrap="nowrap">
        {value}
      </Text>
    </Box>
  );
}

export function LayoutApp(): ReactNode {
  const [sidebar, setSidebar] = useState(true);
  const [stacked, setStacked] = useState(false);
  useInput((e) => {
    if (e.input === "s") setSidebar((v) => !v);
    else if (e.input === "d") setStacked((v) => !v);
    else return;
    e.stopPropagation();
  });
  return (
    <Box className="flex-col grow">
      <TopBar />
      <Box className="flex-row grow">
        {sidebar ? (
          <Box className="flex-col w-18 shrink-0 border-r px-1 pt-1">
            {NAV.map((item) => (
              <Text key={item} color={item === "Overview" ? "fg" : "muted"} wrap="nowrap">
                {item}
              </Text>
            ))}
          </Box>
        ) : null}
        <Box className={stacked ? "flex-col grow gap-1 p-1" : "flex-row grow items-start gap-1 p-1"}>
          <Card title="Production" value="acme-web" />
          <Card title="Deployments" value="6 today" />
          <Card title="Build time" value="38s p50" />
        </Box>
      </Box>
    </Box>
  );
}

/* ─────────────── 03 · Text & styling ─────────────── */

const STATUS_ORDER: readonly DeployStatus[] = ["ready", "building", "error", "queued"];

export function StylingApp(): ReactNode {
  const theme = useTheme();
  const [status, setStatus] = useState<DeployStatus>("ready");
  useInput((e) => {
    if (e.input === "t") siteStore.cycleTheme();
    else if (e.input === "s") setStatus((s) => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length] as DeployStatus);
    else return;
    e.stopPropagation();
  });
  const d = DEPLOYMENTS[0] as Deployment;
  return (
    <Box className="flex-col grow">
      <TopBar right={<Text color="subtle">{theme.name}</Text>} />
      <Box className="flex-col grow p-1 gap-1">
        <Box className="flex-col border rounded px-2 py-1 shrink-0 bg-surface">
          <Box className="flex-row gap-2 h-1">
            <Text bold>{d.project}</Text>
            <Status status={status} />
          </Box>
          <Text color="muted" wrap="truncate-end">
            {d.commit}
          </Text>
          <Box className="flex-row gap-1 h-1" marginTop={1}>
            <Text color="subtle">{d.branch}</Text>
            <Text color="subtle">·</Text>
            <Text color="subtle">{d.region}</Text>
            <Text color="subtle">·</Text>
            <Text color={STATUS[status].color} italic={status === "building"} strikethrough={status === "error"}>
              {d.id}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ─────────────── 04 · Input & keymaps ─────────────── */

export function InputApp(): ReactNode {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const move = (by: number): void => setIndex((i) => Math.max(0, Math.min(DEPLOYMENTS.length - 1, i + by)));
  useKeymap({
    "up, k": { label: "Previous deployment", run: () => move(-1) },
    "down, j": { label: "Next deployment", run: () => move(1) },
    enter: { label: "Toggle details", run: () => setOpen((o) => !o) },
    "g g": { label: "First deployment", run: () => setIndex(0) },
  });
  const d = DEPLOYMENTS[index] as Deployment;
  return (
    <Box className="flex-col grow">
      <TopBar path="/deployments" right={<Text color="subtle">? shortcuts</Text>} />
      <Box className="flex-row grow p-1 gap-2">
        <Box className="flex-col grow shrink basis-0" minWidth={20}>
          {DEPLOYMENTS.map((row, i) => (
            <Box key={row.id} className="flex-row h-1 gap-2 px-1" backgroundColor={i === index ? "selection" : undefined}>
              <Text color={i === index ? "fg" : "muted"} wrap="nowrap">
                {i === index ? "›" : " "}
              </Text>
              <Text color={i === index ? "fg" : "muted"} bold={i === index} wrap="truncate-end">
                {row.commit}
              </Text>
            </Box>
          ))}
        </Box>
        {open ? (
          <Box className="flex-col border rounded px-1 shrink-0" width={28}>
            <Text bold>{d.id}</Text>
            <Status status={d.status} />
            <Text color="muted">{`${d.project} · ${d.branch}`}</Text>
            <Text color="subtle">{`${d.region} · ${seconds(d.duration)} · ${d.age} ago`}</Text>
          </Box>
        ) : null}
      </Box>
      <KeyHelp />
    </Box>
  );
}

/* ─────────────── 05 · Routing ─────────────── */

const ROUTES = [
  { href: "/", label: "Overview", shortcut: "1" },
  { href: "/deployments", label: "Deployments", shortcut: "2" },
  { href: "/settings", label: "Settings", shortcut: "3" },
];

function OverviewPage(): ReactNode {
  const ready = DEPLOYMENTS.filter((d) => d.status === "ready").length;
  return (
    <Box className="flex-col gap-1">
      <Text bold>Overview</Text>
      <Text color="muted">{`${DEPLOYMENTS.length} deployments · ${ready} ready · 1 building · 1 error`}</Text>
    </Box>
  );
}

function DeploymentsPage(): ReactNode {
  return (
    <Box className="flex-col">
      <Text bold>Deployments</Text>
      {DEPLOYMENTS.slice(0, 4).map((d) => (
        <Box key={d.id} className="flex-row h-1 gap-2">
          <Text color="subtle" wrap="nowrap">
            {d.id}
          </Text>
          <Text color="muted" wrap="truncate-end">
            {d.commit}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function SettingsPage(): ReactNode {
  return (
    <Box className="flex-col gap-1">
      <Text bold>Settings</Text>
      <Text color="muted">Team: Acme · Region: iad1 · Plan: Console</Text>
    </Box>
  );
}

export function RoutingApp(): ReactNode {
  const [history, setHistory] = useState<string[]>(["/"]);
  const pathname = history[history.length - 1] ?? "/";
  const push = (href: string): void => setHistory((h) => (h[h.length - 1] === href ? h : [...h, href]));
  useInput((e) => {
    const link = ROUTES.find((r) => r.shortcut === e.input);
    if (link) push(link.href);
    else if (e.key === "backspace") setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
    else return;
    e.stopPropagation();
  });
  return (
    <Box className="flex-col grow">
      <TopBar path={pathname} />
      <Box className="flex-row h-1 px-1 gap-3 shrink-0">
        {ROUTES.map((r) => (
          <Text key={r.href} color={r.href === pathname ? "fg" : "muted"} underline={r.href === pathname} wrap="nowrap">
            {`${r.shortcut} ${r.label}`}
          </Text>
        ))}
      </Box>
      <Box className="flex-col grow p-1">
        {pathname === "/" ? <OverviewPage /> : pathname === "/deployments" ? <DeploymentsPage /> : <SettingsPage />}
      </Box>
    </Box>
  );
}

/* ─────────────── 06 · Data & route handlers ─────────────── */

/** In-memory stand-in for `app/api/deployments/route.ts`. */
function useDeployments(): { rows: readonly Deployment[]; loading: boolean; refetch(): void; create(): void } {
  const [rows, setRows] = useState<readonly Deployment[]>(DEPLOYMENTS.slice(0, 4));
  const [loading, setLoading] = useState(true);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const later = (ms: number, fn: () => void): void => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };
  const refetch = (): void => {
    setLoading(true);
    later(700, () => setLoading(false));
  };
  useEffect(() => {
    refetch();
    const pending = timers.current;
    return () => {
      for (const t of pending) clearTimeout(t);
    };
  }, []);
  const create = (): void => {
    const id = `dpl_${Math.random().toString(36).slice(2, 6)}`;
    const created: Deployment = { id, project: "acme-web", branch: "main", commit: "feat: POST /api/deployments", status: "building", region: "iad1", duration: 0, age: "now" };
    setRows((r) => [created, ...r].slice(0, 6));
    later(1600, () => setRows((r) => r.map((d): Deployment => (d.id === id ? { ...d, status: "ready", duration: 29 } : d))));
  };
  return { rows, loading, refetch, create };
}

export function DataApp(): ReactNode {
  const { rows, loading, refetch, create } = useDeployments();
  useInput((e) => {
    if (e.input === "r") refetch();
    else if (e.input === "n") create();
    else return;
    e.stopPropagation();
  });
  return (
    <Box className="flex-col grow">
      <TopBar path="/deployments" right={<Text color="subtle">GET /api/deployments</Text>} />
      <Box className="flex-col grow p-1">
        {loading ? (
          <Spinner label="Loading deployments…" />
        ) : (
          rows.map((d) => (
            <Box key={d.id} className="flex-row h-1 gap-2">
              <Box width={11} flexShrink={0}>
                <Status status={d.status} />
              </Box>
              <Text color="subtle" wrap="nowrap">
                {d.id}
              </Text>
              <Text color="muted" wrap="truncate-end">
                {d.commit}
              </Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

/* ─────────────── 07 · Components ─────────────── */

const COLUMNS: ReadonlyArray<TableColumn<Deployment>> = [
  { key: "status", header: "Status", width: 11, render: (d) => <Status status={d.status} /> },
  { key: "commit", header: "Commit", grow: 2 },
  { key: "project", header: "Project", width: 10 },
  { key: "duration", header: "Build", width: 6, align: "right", value: (d) => d.duration, render: (d) => <Text>{seconds(d.duration)}</Text> },
];

const BY_PROJECT = ["acme-web", "acme-api", "acme-docs"].map((project) => {
  const times = DEPLOYMENTS.filter((d) => d.project === project).map((d) => d.duration);
  return { label: project, value: Math.round(times.reduce((a, b) => a + b, 0) / times.length) };
});

export function ComponentsApp(): ReactNode {
  const [chart, setChart] = useState<"spark" | "bars">("spark");
  const [sort, setSort] = useState<SortState | null>(null);
  useInput((e) => {
    if (e.input !== "c") return;
    e.stopPropagation();
    setChart((c) => (c === "spark" ? "bars" : "spark"));
  });
  return (
    <Box className="flex-col grow">
      <TopBar path="/deployments" right={<Text color="subtle">{sort ? `sorted by ${sort.column} ${sort.direction}` : "unsorted"}</Text>} />
      <Box className="flex-col grow p-1 gap-1">
        <Box className="flex-col shrink-0" height={4}>
          <Text color="subtle">{chart === "spark" ? "Build time, last 24 deployments" : "Average build time by project"}</Text>
          {chart === "spark" ? <Sparkline data={BUILD_TIMES} height={3} color="accent" /> : <BarChart data={BY_PROJECT} formatValue={seconds} />}
        </Box>
        <Table columns={COLUMNS} rows={DEPLOYMENTS} getRowKey={(d) => d.id} sortable sort={sort} onSortChange={setSort} focused height={DEPLOYMENTS.length} />
      </Box>
    </Box>
  );
}

/* ─────────────── 08 · Testing ─────────────── */

const TESTS = [
  { name: "lists every deployment", ms: 14 },
  { name: "↓ moves the highlight", ms: 9 },
  { name: "Enter opens the details panel", ms: 11 },
  { name: "2 navigates to /deployments", ms: 7 },
  { name: "s sorts by build time", ms: 12 },
];

export function TestingApp(): ReactNode {
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  const [broken, setBroken] = useState(false);
  useInput((e) => {
    if (e.key === "return") {
      setShown(0);
      setRun((r) => r + 1);
    } else if (e.input === "f") {
      setBroken((b) => !b);
      setShown(0);
      setRun((r) => r + 1);
    } else return;
    e.stopPropagation();
  });
  useEffect(() => {
    if (run === 0 || shown >= TESTS.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), 140);
    return () => clearTimeout(t);
  }, [run, shown]);
  const done = run > 0 && shown >= TESTS.length;
  const failIndex = broken ? 1 : -1;
  return (
    <Box className="flex-col grow p-1">
      <Text color="subtle">{"$ bun test"}</Text>
      {run === 0 ? <Text color="muted">Press Enter to run the suite.</Text> : <Text color="muted">deployments.test.tsx:</Text>}
      {TESTS.slice(0, shown).map((t, i) => (
        <Box key={t.name} className="flex-row h-1 gap-1">
          <Text color={i === failIndex ? "danger" : "success"}>{i === failIndex ? "✗" : "✓"}</Text>
          <Text color={i === failIndex ? "fg" : "muted"} wrap="truncate-end">
            {`${t.name} [${t.ms}.00ms]`}
          </Text>
        </Box>
      ))}
      {done && broken ? (
        <Box className="flex-col shrink-0" marginTop={1}>
          <Text color="danger">{'expect(app.lastFrame()).toContain("› feat: merge spans")'}</Text>
          <Text color="muted">{'Received: "› feat: stream cells downward"'}</Text>
        </Box>
      ) : null}
      {done ? (
        <Box className="flex-row gap-2 h-1" marginTop={1}>
          <Text color="success">{`${broken ? TESTS.length - 1 : TESTS.length} pass`}</Text>
          <Text color={broken ? "danger" : "subtle"}>{`${broken ? 1 : 0} fail`}</Text>
          <Text color="subtle">{`Ran ${TESTS.length} tests across 1 file. [${broken ? 61 : 58}.00ms]`}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

/* ─────────────── 09 · Terminal ─────────────── */

export function TerminalApp(): ReactNode {
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  useInput((e) => {
    if (!running && e.key === "return") setRunning(true);
    else if (running && e.input === "q") setRunning(false);
    else if (running && (e.key === "down" || e.key === "up")) setIndex((i) => Math.max(0, Math.min(3, i + (e.key === "down" ? 1 : -1))));
    else return;
    e.stopPropagation();
  });
  return (
    <Box className="flex-col grow p-1">
      <Box className="flex-col grow border rounded bg-surface">
        <Box className="flex-row h-2 px-1 gap-1 shrink-0 border-b">
          <Text color="danger">●</Text>
          <Text color="warning">●</Text>
          <Text color="success">●</Text>
          <Text color="subtle">{running ? "  acme — text run" : "  acme — zsh"}</Text>
        </Box>
        {running ? (
          <Box className="flex-col grow px-1">
            <TopBar path="/deployments" right={<Text color="subtle">q quit</Text>} />
            {DEPLOYMENTS.slice(0, 4).map((d, i) => (
              <Box key={d.id} className="flex-row h-1 gap-2" backgroundColor={i === index ? "selection" : undefined}>
                <Box width={11} flexShrink={0}>
                  <Status status={d.status} />
                </Box>
                <Text color={i === index ? "fg" : "muted"} wrap="truncate-end">
                  {d.commit}
                </Text>
              </Box>
            ))}
          </Box>
        ) : (
          <Box className="flex-col grow px-1">
            <Text color="muted">{"~/acme $ text run"}</Text>
            <Text color="subtle">Press Enter to run it in the terminal.</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─────────────── 10 · Shipping ─────────────── */

const BUILD_LOG = [
  "▼ Text.js 1.0.0 (Turbolog)",
  "  Compiling app/ … 4 routes, 1 route handler",
  "  Bundling 1 client chunk (41.2 kB gzip)",
  "✓ Built in 1.8s",
  "  Uploading build output …",
  "✓ Production: https://acme-deploys.vercel.app",
];

export function ShippingApp(): ReactNode {
  const [lines, setLines] = useState(0);
  const [started, setStarted] = useState(false);
  useInput((e) => {
    if (e.key === "return" && !started) setStarted(true);
    else if (e.input === "r") {
      setStarted(false);
      setLines(0);
    } else return;
    e.stopPropagation();
  });
  useEffect(() => {
    if (!started || lines >= BUILD_LOG.length) return;
    const t = setTimeout(() => setLines((n) => n + 1), 260);
    return () => clearTimeout(t);
  }, [started, lines]);
  const shipped = lines >= BUILD_LOG.length;
  return (
    <Box className="flex-col grow p-1">
      <Text color="subtle">{"$ text build && vercel deploy --prod"}</Text>
      {!started ? <Text color="muted">Press Enter to ship Acme Deploys.</Text> : null}
      {BUILD_LOG.slice(0, lines).map((l) => (
        <Text key={l} color={l.startsWith("✓") ? "success" : "muted"} wrap="truncate-end">
          {l}
        </Text>
      ))}
      {started && !shipped ? <Spinner label="Working…" /> : null}
      {shipped ? (
        <Box className="flex-col border rounded px-2 py-1 shrink-0" marginTop={1}>
          <Text bold>▼ Shipped.</Text>
          <Text color="muted">Acme Deploys is live.</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export const CHAPTER_APPS: Record<string, () => ReactNode> = {
  "getting-started": GettingStartedApp,
  layout: LayoutApp,
  styling: StylingApp,
  "input-and-keymaps": InputApp,
  routing: RoutingApp,
  "data-fetching": DataApp,
  components: ComponentsApp,
  testing: TestingApp,
  terminal: TerminalApp,
  shipping: ShippingApp,
};
