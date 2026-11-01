import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { getTxError } from "@textjs/core";
import { stripAnsi } from "../src/cli/ui";

const BIN = resolve(import.meta.dir, "../bin/text.ts");

async function cli(...args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", BIN, ...args], { stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  return { code, stdout: stripAnsi(stdout), stderr: stripAnsi(stderr) };
}

describe("unknown commands (TX020)", () => {
  test("text deploy reports TX020, then points at text build --adapter", async () => {
    const r = await cli("deploy");
    expect(r.code).toBe(1);
    expect(r.stderr).toBe(
      " ⨯ Text.js error TX020: Unknown command deploy. https://textjs.org/errors/TX020\n" +
        "   To deploy, run text build --adapter <static|bun|vercel|cloudflare>.\n",
    );
    expect(r.stdout).toContain("Usage: text <command>");
    expect(r.stdout).toContain("build: static | bun | vercel | cloudflare");
  });

  test("other unknown commands print only the TX020 line", async () => {
    const r = await cli("lint");
    expect(r.code).toBe(1);
    expect(r.stderr).toBe(" ⨯ Text.js error TX020: Unknown command lint. https://textjs.org/errors/TX020\n");
  });

  test("the TX020 reference page says how to deploy", () => {
    const fix = getTxError("TX020")?.fix ?? "";
    expect(fix).toContain("There is no `text deploy`.");
    expect(fix).toContain("[Deploying](/docs/deploying)");
  });
});
