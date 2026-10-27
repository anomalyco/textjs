/**
 * Server-only data for `app/status/page.tsx` (`export const runtime = "server"`).
 * Reads the host with `node:os` and simulates region probes; none of this ships
 * to the browser, which only receives console frames.
 */

import os from "node:os";
import { mulberry32 } from "./data";

export const REGIONS = [
  { id: "iad1", city: "Washington, D.C." },
  { id: "sfo1", city: "San Francisco" },
  { id: "fra1", city: "Frankfurt" },
  { id: "cdg1", city: "Paris" },
  { id: "hnd1", city: "Tokyo" },
] as const;

export interface HostMetrics {
  hostname: string;
  platform: string;
  runtime: string;
  cpus: number;
  load: [number, number, number];
  memoryUsedPct: number;
  uptimeS: number;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function hostMetrics(): Promise<HostMetrics> {
  await sleep(120);
  const total = os.totalmem();
  const [l1 = 0, l5 = 0, l15 = 0] = os.loadavg();
  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.arch()}`,
    runtime: typeof process.versions.bun === "string" ? `Bun ${process.versions.bun}` : `Node ${process.versions.node}`,
    cpus: os.cpus().length,
    load: [l1, l5, l15],
    memoryUsedPct: total > 0 ? Math.round(((total - os.freemem()) / total) * 100) : 0,
    uptimeS: Math.round(process.uptime()),
  };
}

export interface RegionProbe {
  p50: number;
  p99: number;
  healthy: boolean;
}

/** A deterministic-per-minute fake probe that takes 150–650ms, like a real one would. */
export async function probeRegion(id: string, attempt: number): Promise<RegionProbe> {
  let seed = attempt * 7919 + Math.floor(Date.now() / 60_000);
  for (const ch of id) seed = Math.imul(seed ^ ch.charCodeAt(0), 0x01000193);
  const rand = mulberry32(seed);
  await sleep(150 + Math.round(rand() * 500));
  const p50 = 8 + Math.round(rand() * 60);
  return { p50, p99: p50 * 3 + Math.round(rand() * 80), healthy: rand() > 0.12 };
}
