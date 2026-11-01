/**
 * Live docs previews for the extended component kit: data, charts, forms,
 * keyboard shortcuts and the command palette.
 */

import { useState, type ReactNode } from "react";
import {
  BarChart,
  Box,
  Button,
  Checkbox,
  CommandPalette,
  KeyHelp,
  KeyHints,
  LineChart,
  ProgressBar,
  RadioGroup,
  Slider,
  Sparkline,
  StatusBar,
  Switch,
  Table,
  Text,
  Toaster,
  Tree,
  useInterval,
  useKeymap,
  useToast,
  type TableColumn,
  type TreeNode,
} from "@textjs/react";

interface Service {
  name: string;
  region: string;
  p95: number;
  status: "Ready" | "Building" | "Error";
}

const SERVICES: Service[] = [
  { name: "storefront", region: "iad1", p95: 84, status: "Ready" },
  { name: "checkout", region: "sfo1", p95: 112, status: "Ready" },
  { name: "docs", region: "fra1", p95: 41, status: "Building" },
  { name: "api", region: "iad1", p95: 230, status: "Error" },
  { name: "marketing", region: "hnd1", p95: 66, status: "Ready" },
  { name: "auth", region: "cdg1", p95: 58, status: "Ready" },
  { name: "search", region: "iad1", p95: 147, status: "Ready" },
  { name: "billing", region: "sfo1", p95: 95, status: "Building" },
];

const COLUMNS: TableColumn<Service>[] = [
  { key: "name", header: "Service" },
  { key: "region", header: "Region", width: 8 },
  { key: "p95", header: "p95", width: 7, align: "right", value: (s) => s.p95, render: (s) => <Text color="muted">{`${s.p95}ms`}</Text> },
  {
    key: "status",
    header: "Status",
    width: 10,
    render: (s) => <Text color={s.status === "Ready" ? "success" : s.status === "Error" ? "danger" : "warning"}>{`● ${s.status}`}</Text>,
  },
];

export function TablePreview(): ReactNode {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <Box className="flex-col grow p-1 gap-1">
      <Table height={7} columns={COLUMNS} rows={SERVICES} sortable selectionMode="multiple" autoFocus onSelect={(s) => setPicked(s.name)} getRowKey={(s) => s.name} />
      <Text color="subtle" wrap="truncate-end">
        {picked ? `opened ${picked}` : "↑↓ move · space select · s sort · ↵ open"}
      </Text>
    </Box>
  );
}

const FILES: TreeNode[] = [
  {
    id: "app",
    label: "app",
    children: [
      { id: "app/layout.tsx", label: "layout.tsx", hint: "1.2 kB" },
      { id: "app/page.tsx", label: "page.tsx", hint: "2.8 kB" },
      {
        id: "app/deployments",
        label: "deployments",
        children: [
          { id: "app/deployments/page.tsx", label: "page.tsx", hint: "3.1 kB" },
          { id: "app/deployments/[id]", label: "[id]", children: [{ id: "app/deployments/[id]/page.tsx", label: "page.tsx", hint: "1.9 kB" }] },
        ],
      },
      { id: "app/api", label: "api", children: [{ id: "app/api/health/route.ts", label: "health/route.ts", hint: "0.3 kB" }] },
    ],
  },
  { id: "text.config.ts", label: "text.config.ts", hint: "0.4 kB" },
];

export function TreePreview(): ReactNode {
  return (
    <Box className="flex-col grow p-1">
      <Tree height={9} data={FILES} defaultExpanded={["app", "app/deployments"]} autoFocus />
    </Box>
  );
}

function wave(n: number, seed: number): number[] {
  return Array.from({ length: n }, (_, i) => 60 + Math.sin((i + seed) / 3) * 18 + Math.sin((i + seed) / 1.7) * 7);
}

export function ChartsPreview(): ReactNode {
  const [t, setT] = useState(0);
  useInterval(() => setT((x) => x + 1), 500);
  const p50 = wave(40, t);
  const p95 = p50.map((v, i) => v + 28 + Math.sin((i + t) / 2) * 6);
  return (
    <Box className="flex-col grow p-1 gap-1">
      <Box className="flex-row gap-2">
        <Box className="flex-col grow basis-0">
          <Text color="muted">Latency</Text>
          <LineChart
            height={6}
            series={[
              { label: "p50", data: p50 },
              { label: "p95", data: p95, color: "muted" },
            ]}
            formatValue={(v) => `${Math.round(v)}ms`}
          />
        </Box>
        <Box className="flex-col gap-1" width={26}>
          <Text color="muted">Regions</Text>
          <BarChart
            data={[
              { label: "iad1", value: 1240 },
              { label: "sfo1", value: 860 },
              { label: "fra1", value: 512 },
              { label: "hnd1", value: 230 },
            ]}
          />
        </Box>
      </Box>
      <Box className="flex-row gap-2">
        <Text color="muted">Requests</Text>
        <Sparkline data={wave(80, t * 2).map((v) => v * v)} />
      </Box>
      <ProgressBar label="Build  " value={((t * 7) % 100) / 100} />
    </Box>
  );
}

export function ControlsPreview(): ReactNode {
  const toast = useToast();
  const [plan, setPlan] = useState("pro");
  return (
    <Box className="flex-col grow p-1 gap-1">
      <Checkbox label="Web Analytics" description="privacy-friendly" defaultChecked autoFocus />
      <Switch label="Edge runtime" defaultChecked />
      <RadioGroup
        orientation="horizontal"
        value={plan}
        onChange={setPlan}
        options={[
          { value: "hobby", label: "Hobby" },
          { value: "pro", label: "Pro" },
          { value: "enterprise", label: "Enterprise" },
        ]}
      />
      <Slider label="Concurrency" defaultValue={40} width={20} />
      <Box className="flex-row gap-1">
        <Button variant="primary" onPress={() => toast.success("Deployed", { description: `${plan} plan · iad1` })}>
          Deploy
        </Button>
        <Button variant="ghost" onPress={() => toast("Cancelled")}>
          Cancel
        </Button>
      </Box>
      <Toaster width={30} />
    </Box>
  );
}

export function KeymapPreview(): ReactNode {
  const toast = useToast();
  const [count, setCount] = useState(0);
  useKeymap(
    {
      "k, up": { label: "Increment", run: () => setCount((c) => c + 1), hint: true },
      "j, down": { label: "Decrement", run: () => setCount((c) => c - 1) },
      "g g": { label: "Reset", run: () => setCount(0) },
      "ctrl+s": { label: "Save", run: () => toast.success(`Saved ${count}`), hint: true },
    },
    { group: "Counter" },
  );
  return (
    <Box className="flex-col grow">
      <Box className="flex-col grow p-1 gap-1">
        <Text bold>{`count = ${count}`}</Text>
        <Text color="subtle">? shortcuts · ctrl+k commands</Text>
      </Box>
      <StatusBar right={<Text color="subtle">▼ Text.js</Text>}>
        <KeyHints items={[{ keys: "?", label: "help" }, { keys: "ctrl+k", label: "commands" }]} />
        <KeyHints />
      </StatusBar>
      <CommandPalette commands={[{ id: "toast", label: "Show a toast", group: "Demo", run: () => toast("Hello from the palette") }]} />
      <KeyHelp />
      <Toaster width={28} />
    </Box>
  );
}
