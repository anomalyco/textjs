import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { HELP, parseArgs } from "../src/cli/index";

describe("text proxy", () => {
  test("parses bridge flags", () => {
    expect(parseArgs(["proxy", "--port", "4100", "--target", "http://127.0.0.1:4096", "--allow-origin", "https://x.dev"])).toMatchObject({
      command: "proxy",
      port: 4100,
      target: "http://127.0.0.1:4096",
      allowOrigins: ["https://x.dev"],
    });
  });

  test("help lists proxy and points at @textjs/opencode", () => {
    expect(HELP).toMatch(/^\s+proxy\s+Bridge textjs\.org\/opencode/m);
    expect(HELP).toContain("bunx @textjs/opencode proxy");
    expect(HELP).not.toMatch(/^\s+opencode\s/m);
  });

  test("delegates to @textjs/opencode, loaded only when the command runs", () => {
    const src = readFileSync(new URL("../src/cli/index.ts", import.meta.url), "utf8");
    expect(src).toMatch(/case "proxy": \{[\s\S]{0,200}await import\("@textjs\/opencode"\)/);
    expect(src).not.toMatch(/^import .*@textjs\/opencode/m);
    expect(src).not.toContain('case "opencode"');
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies: Record<string, string> };
    expect(manifest.dependencies["@textjs/opencode"]).toBe("workspace:*");
  });
});
