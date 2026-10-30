/**
 * Server-only code never reaches the client bundle: `runtime` exports are read
 * with a parser, server-only segments' layouts and boundaries are stubbed, and
 * client code importing `*.server.*` / `node:*` fails the build.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/cli/build";
import { replaceWithMap } from "../src/server/live-dev";
import { readRuntimeExport } from "../src/server/live-routes";
import { createFixture } from "./server-fixture";

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("runtime export detection", () => {
  const dir = mkdtempSync(join(tmpdir(), "textjs-runtime-"));
  dirs.push(dir);
  const file = (name: string, body: string): string => {
    const p = join(dir, name);
    writeFileSync(p, body);
    return p;
  };

  test("real exports in every spelling", () => {
    expect(readRuntimeExport(file("a.tsx", 'export const runtime: "server" = "server";\nexport default () => <x />;'))).toBe("server");
    expect(readRuntimeExport(file("b.tsx", "export const runtime = `server`;"))).toBe("server");
    expect(readRuntimeExport(file("c.ts", 'export const runtime = "server" as const;'))).toBe("server");
    expect(readRuntimeExport(file("d.ts", 'const r = "server";\nexport { r as runtime };'))).toBe("server");
    file("shared.ts", 'export const runtime = "server";\nexport const other = "server";');
    expect(readRuntimeExport(file("e.tsx", 'export { runtime } from "./shared";'))).toBe("server");
    expect(readRuntimeExport(file("f.tsx", 'export { other as runtime } from "./shared";'))).toBe("server");
  });

  test("comments, strings and other names don't count", () => {
    expect(readRuntimeExport(file("g.tsx", '// export const runtime = "server";\nexport default 1;'))).toBeUndefined();
    expect(readRuntimeExport(file("h.tsx", 'const doc = `export const runtime = "server"`;\nexport default doc;'))).toBeUndefined();
    expect(readRuntimeExport(file("i.tsx", 'export const runtime = "client";'))).toBe("client");
    expect(readRuntimeExport(file("j.tsx", 'export const runtimeX = "server";'))).toBeUndefined();
  });
});

const SECRET = "sk_live_SERVER_ONLY_7f3a";

describe("client bundle", () => {
  test(
    "server pages, their server-only layouts and *.server modules stay out of dist/assets",
    async () => {
      const dir = createFixture({
        "text.config.ts": 'import { defineConfig } from "@textjs/next";\nexport default defineConfig({ title: "Leak Fixture" });\n',
        "app/page.tsx": 'import { Text } from "@textjs/next";\nexport default function Home() { return <Text>home</Text>; }\n',
        "lib/secret.server.ts": `export const secret = () => "${SECRET}";\n`,
        "app/ops/layout.tsx": 'import type { ReactNode } from "react";\nimport { Box, Text } from "@textjs/next";\nimport { secret } from "../../lib/secret.server";\nexport default function OpsLayout({ children }: { children?: ReactNode }) { return <Box flexDirection="column"><Text>{secret()}</Text>{children}</Box>; }\n',
        "app/ops/loading.tsx": 'import { Text } from "@textjs/next";\nimport { secret } from "../../lib/secret.server";\nexport default function L() { return <Text>{secret()}</Text>; }\n',
        // A typed export the old regex missed.
        "app/ops/page.tsx": 'import { Text } from "@textjs/next";\nimport { secret } from "../../lib/secret.server";\nexport const runtime: "server" = "server";\nexport default function Ops() { return <Text>{secret()}</Text>; }\n',
      });
      dirs.push(dir);
      await buildApp({ root: dir, log: false });
      const assets = join(dir, "dist/assets");
      for (const f of readdirSync(assets)) expect({ f, leaked: readFileSync(join(assets, f), "utf8").includes(SECRET) }).toEqual({ f, leaked: false });
    },
    120_000,
  );

  test(
    "client code importing *.server or node:* fails the build with a clear error",
    async () => {
      const dir = createFixture({
        "text.config.ts": 'import { defineConfig } from "@textjs/next";\nexport default defineConfig({ title: "Guard Fixture" });\n',
        "lib/db.server.ts": 'export const db = () => "rows";\n',
        "app/page.tsx": 'import { Text } from "@textjs/next";\nimport { db } from "../lib/db.server";\nexport default function Home() { return <Text>{db()}</Text>; }\n',
      });
      dirs.push(dir);
      await expect(buildApp({ root: dir, log: false })).rejects.toThrow(/app\/page\.tsx imports "\.\.\/lib\/db\.server", which only runs on the server/);
      mkdirSync(join(dir, "app/x"), { recursive: true });
      writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nimport { readFileSync } from "node:fs";\nexport default function Home() { return <Text>{String(readFileSync)}</Text>; }\n');
      await expect(buildApp({ root: dir, log: false })).rejects.toThrow(/"node:fs", which only runs on the server/);
    },
    120_000,
  );
});

describe("server JSX runtime rewrite", () => {
  test("only import specifiers are rewritten, with JSON-escaped paths and a column-exact source map", () => {
    const re = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])react\/(jsx-runtime|jsx-dev-runtime)\2/g;
    const code = 'import { jsx } from "react/jsx-runtime"; const s = "react/jsx-runtime";\nconst x = 1;';
    const out = replaceWithMap(code, re, (m) => `${m[1]}${JSON.stringify('/a "b"/jsx.ts')}`, "page.tsx");
    expect(out?.code).toBe('import { jsx } from "/a \\"b\\"/jsx.ts"; const s = "react/jsx-runtime";\nconst x = 1;');
    // Line 1: col 0 → 0, then the code after the specifier → its original column; line 2 identity.
    expect(out?.map.mappings).toBe("AAAA,qCAAuC;AACvC");
    expect(replaceWithMap("const s = 'react/jsx-runtime';", re, () => "x", "a.ts")).toBeNull();
  });
});
