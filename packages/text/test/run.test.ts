import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { createLocalFetch, runInTerminal, toRuntimeManifest } from "../src/cli/run";
import { parseArgs } from "../src/cli/index";
import { scanApp } from "../src/server/scan";

const DASHBOARD = resolve(import.meta.dir, "../../../examples/dashboard");

function fakeTerminal(cols: number, rows: number) {
  const screen: string[] = Array.from({ length: rows }, () => "");
  const data = new Set<(c: string) => void>();
  const stdin = {
    isTTY: false,
    on: (_e: "data", l: (c: string | Uint8Array) => void) => void data.add(l as (c: string) => void),
    off: (_e: "data", l: (c: string | Uint8Array) => void) => void data.delete(l as (c: string) => void),
    send: (s: string) => {
      for (const l of [...data]) l(s);
    },
  };
  const stdout = {
    columns: cols,
    rows,
    write: (s: string) => {
      // Rows are positioned with `ESC[<row>;1H` and written whole.
      for (const m of s.matchAll(/\x1b\[(\d+);1H((?:[^\x1b]|\x1b\[[\d;]*m)*)/g)) screen[Number(m[1]) - 1] = stripVTControlCharacters(m[2] as string);
    },
  };
  return { stdin, stdout, screen };
}

describe("text run", () => {
  // The terminal app runs outside act(), like production code.
  const g = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let prev: boolean | undefined;
  beforeAll(() => {
    prev = g.IS_REACT_ACT_ENVIRONMENT;
    g.IS_REACT_ACT_ENVIRONMENT = false;
  });
  afterAll(() => {
    g.IS_REACT_ACT_ENVIRONMENT = prev;
  });

  test("parses --path", () => {
    expect(parseArgs(["run", "examples/dashboard", "--path", "/logs"])).toMatchObject({ command: "run", dir: "examples/dashboard", path: "/logs" });
  });

  test("builds a lazy runtime manifest from app/", async () => {
    const manifest = toRuntimeManifest(scanApp(DASHBOARD));
    expect(typeof manifest.layout).toBe("function");
    expect(manifest.files?.layout).toBe("app/layout.tsx");
    expect(manifest.children?.map((c) => c.segment)).toContain("deployments");
    const mod = await (manifest.page as () => Promise<{ default?: unknown }>)();
    expect(typeof mod.default).toBe("function");
  });

  test("same-origin fetch runs route handlers in-process", async () => {
    const network = Object.assign(async () => new Response("network"), { preconnect: () => undefined }) as unknown as typeof fetch;
    const f = createLocalFetch(scanApp(DASHBOARD), network);
    const health = await f("/api/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ status: "ok", engine: "Turbolog" });
    expect((await f("/api/nope")).status).toBe(404);
    expect(await (await f("https://example.com")).text()).toBe("network");
  });

  test("renders the dashboard example in a terminal and navigates", async () => {
    const term = fakeTerminal(100, 24);
    const app = await runInTerminal({ root: DASHBOARD, stdin: term.stdin, stdout: term.stdout, skipConfig: true });
    const until = async (text: string): Promise<void> => {
      for (let i = 0; i < 200; i++) {
        if (term.screen.join("\n").includes(text)) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error(`"${text}" never appeared:\n${term.screen.join("\n")}`);
    };
    await until("Recent deployments");
    expect(term.screen.join("\n")).toContain("Edge Console");
    term.stdin.send("2");
    await until("8 total");
    app.unmount();
    expect(app.root.unmounted).toBe(true);
  }, 20_000);
});
