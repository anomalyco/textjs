/** @jsxImportSource @textjs/app/server */
/**
 * A live server in its own process, for tests that stub browser globals
 * (`window`, `document`, …) which server rendering in the same process would
 * pick up, and for a second origin in Chromium. Run as a script, it prints
 * `port <n>` once listening and `request <method> <url>` per request; `GET
 * /__drop` closes every open connection. Tests start it with {@link spawnLiveServer}.
 */

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { useState, type ReactNode } from "react";
import { Text, useInput } from "@textjs/react";
import { useRouter } from "../src/navigation";
import type { RouteManifest } from "../src/router";
import { LiveServer } from "../src/server/live";
import { createLiveApp } from "../src/server/live-app";

function Counter(): ReactNode {
  const [n, setN] = useState(0);
  const router = useRouter();
  useInput((e) => {
    if (e.input === "+") setN((v) => v + 1);
    if (e.input === "o") router.push("/other");
  });
  return <Text>{`count ${n}`}</Text>;
}

const routes: RouteManifest = {
  segment: "",
  page: { default: Counter, runtime: "server", metadata: { title: "Home" } },
  children: [{ segment: "other", page: { default: () => <Text>other server page</Text>, runtime: "server", metadata: { title: "Other" } } }],
};

export interface LiveServerProcess {
  origin: string;
  /** Every line the server printed so far. */
  lines: string[];
  close(): Promise<void>;
}

/** Start this file in its own process (`args`: `["--cors", origin]`). */
export async function spawnLiveServer(args: string[] = []): Promise<LiveServerProcess> {
  const child = Bun.spawn([process.execPath, fileURLToPath(import.meta.url), ...args], { stdout: "pipe", stderr: "inherit" });
  const lines: string[] = [];
  let port: string | null = null;
  const ready = (async () => {
    const dec = new TextDecoder();
    let buf = "";
    for await (const chunk of child.stdout) {
      buf += dec.decode(chunk, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        lines.push(line);
        if (port === null && line.startsWith("port ")) port = line.slice(5);
      }
    }
  })();
  const t0 = Date.now();
  while (port === null) {
    if (Date.now() - t0 > 15_000 || child.exitCode !== null) {
      child.kill();
      throw new Error("live server fixture did not start");
    }
    await new Promise((r) => setTimeout(r, 20));
  }
  return {
    origin: `http://127.0.0.1:${port}`,
    lines,
    async close() {
      child.kill();
      await child.exited;
      await ready.catch(() => undefined);
    },
  };
}

/** `--cors <origin>`: a stand-in for cross-origin support, answering that one origin's preflights and credentialed requests. */
function serve(cors: string | null): void {
  const live = new LiveServer({ frameIntervalMs: 10, runtimeOf: () => "server", createApp: (init) => createLiveApp({ ...init, routes }) });
  const http = createServer((req, res) => {
    console.log(`request ${req.method} ${req.url}`);
    if (req.url === "/__drop") {
      res.end();
      http.closeAllConnections();
      return;
    }
    if (cors !== null && req.headers.origin === cors) {
      res.setHeader("Access-Control-Allow-Origin", cors);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST");
        res.setHeader("Access-Control-Allow-Headers", "accept, content-type, x-textjs-live");
        res.statusCode = 204;
        res.end();
        return;
      }
      delete req.headers.origin;
      delete req.headers["sec-fetch-site"];
    }
    void live.handle(req, res, req.url ?? "/");
  });
  http.listen(0, "127.0.0.1", () => console.log(`port ${(http.address() as AddressInfo).port}`));
}

if (import.meta.main) serve(process.argv[2] === "--cors" ? (process.argv[3] ?? null) : null);
