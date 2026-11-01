import { useEffect, useState } from "react";
import { BarChart, Box, Sparkline, Spinner, Table, Text, useInput, type SortState, type TableColumn } from "@textjs/next";
import type { Deployment } from "../../lib/deployments";
import { Status } from "../status";

export const metadata = { title: "Deployments" }; // → "Deployments · Acme"

const COLUMNS: TableColumn<Deployment>[] = [
  { key: "status", header: "Status", width: 11, render: (d) => <Status status={d.status} /> },
  { key: "commit", header: "Commit", grow: 2 },
  { key: "project", header: "Project", width: 10 },
  { key: "duration", header: "Build", width: 6, align: "right", value: (d) => d.duration, render: (d) => <Text>{`${d.duration}s`}</Text> },
];

export default function DeploymentsPage() {
  const [rows, setRows] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortState | null>(null);
  const [chart, setChart] = useState<"spark" | "bars">("spark");

  const refetch = async () => {
    setLoading(true);
    setRows(await (await fetch("/api/deployments")).json());
    setLoading(false);
  };
  useEffect(() => void refetch(), []);

  useInput((e) => {
    if (e.input === "r") void refetch();
    if (e.input === "n") void fetch("/api/deployments", { method: "POST", body: "{}" }).then(refetch);
    if (e.input === "c") setChart((c) => (c === "spark" ? "bars" : "spark"));
  });

  if (loading) return <Spinner label="Loading deployments…" />;
  const buildTimes = rows.map((d) => d.duration).reverse();
  const byProject = [...new Set(rows.map((d) => d.project))].map((project) => {
    const times = rows.filter((d) => d.project === project).map((d) => d.duration);
    return { label: project, value: Math.round(times.reduce((a, b) => a + b, 0) / times.length) };
  });
  return (
    <Box className="flex-col grow gap-1">
      <Box className="flex-col" height={4}>
        <Text color="subtle">Build time, last 24 deployments</Text>
        {chart === "spark" ? (
          <Sparkline data={buildTimes} height={3} color="accent" />
        ) : (
          <BarChart data={byProject} formatValue={(v) => `${v}s`} />
        )}
      </Box>
      <Table columns={COLUMNS} rows={rows} getRowKey={(d) => d.id} sortable sort={sort} onSortChange={setSort} autoFocus />
    </Box>
  );
}
