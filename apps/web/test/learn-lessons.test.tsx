/**
 * Checks the Learn chapters' code against Acme Deploys as the course builds it (`test/fixtures/acme-deploys`).
 * The fixture's `app/deployments/page.test.tsx` is the Testing chapter's file and runs with the rest of `bun test`.
 */
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@textjs/react/testing";
import { BROKEN_TEST, TESTING_SUITE } from "../src/learn/apps/chapters";
import { splitChapter } from "../src/learn/ChapterBody";
import { getChapter } from "../src/learn/course";
import { applyDiff, parseDiff } from "../src/learn/DiffCode";
import { resolveAdapter } from "../../../packages/app/src/server/adapters/build-step";
import type { AdapterContext } from "../../../packages/app/src/server/adapters/shared";
import { vercelConfig } from "../../../packages/app/src/server/adapters/vercel";
import { DEPLOYMENTS } from "./fixtures/acme-deploys/lib/deployments";
import DeploymentsPage from "./fixtures/acme-deploys/app/deployments/page";

const APP = join(import.meta.dir, "fixtures/acme-deploys");

function markdown(slug: string): string {
  const chapter = getChapter(slug);
  if (!chapter) throw new Error(`no chapter ${slug}`);
  return chapter.markdown;
}

/** The file the reader has after every code step for `file`. Later steps may only append. */
export function lessonFile(md: string, file: string): string {
  let out = "";
  for (const s of splitChapter(md)) {
    if (s.type !== "diff" || s.file !== file) continue;
    const lines = parseDiff(s.source);
    if (out && lines.some((l) => l.kind !== "add")) throw new Error(`${file}: a later step edits existing lines`);
    out = out ? `${out}\n\n${applyDiff(lines)}` : applyDiff(lines);
  }
  if (!out) throw new Error(`no code steps for ${file}`);
  return `${out}\n`;
}

/** Fenced blocks (not diff steps) as `{ lang, file, source }`. */
function fences(md: string): Array<{ lang: string; file?: string; source: string }> {
  return [...md.matchAll(/^```([a-z-]+)(?:@(\S+))?\n([\s\S]*?)\n```[ \t]*$/gm)].map((m) => ({ lang: m[1] as string, file: m[2], source: m[3] as string }));
}

const fixture = (file: string): string => readFileSync(join(APP, file), "utf8");

describe("Testing chapter", () => {
  afterEach(() => {
    mock.restore();
    return cleanup();
  });

  const source = lessonFile(markdown("testing"), "app/deployments/page.test.tsx");

  test("its test file is the course app's app/deployments/page.test.tsx", () => {
    expect(fixture("app/deployments/page.test.tsx")).toBe(source);
  });

  test("the console's run lists the lesson's tests", () => {
    const names = [...source.matchAll(/^test\("([^"]+)"/gm)].map((m) => m[1] as string);
    expect(names).toEqual(["lists every deployment", "↓ moves the highlight", "4 sorts by build time"]);
    for (const name of names) expect(TESTING_SUITE.map((t) => t.name)).toContain(name);
  });

  test("the console's failure quotes the lesson's assertion and the row the app renders", async () => {
    expect(source).toContain(BROKEN_TEST.assertion);
    spyOn(globalThis, "fetch").mockResolvedValue(Response.json(DEPLOYMENTS));
    const app = await render(<DeploymentsPage />);
    await app.waitForText("feat: stream cells downward");
    expect(app.lines().find((line) => line.includes("›"))).toBe(BROKEN_TEST.received);
  });
});

describe("Terminal chapter", () => {
  const cli = fences(markdown("terminal")).find((f) => f.file === "cli.tsx");

  test("cli.tsx is the course app's cli.tsx", () => {
    expect(cli).toBeDefined();
    expect(fixture("cli.tsx")).toBe(`${cli?.source}\n`);
  });

  test("bun cli.tsx draws the deployments, and Ctrl+C quits", async () => {
    const proc = Bun.spawn([process.execPath, "cli.tsx"], { cwd: APP, stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    const kill = setTimeout(() => proc.kill(), 10_000);
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let out = "";
    while (!out.includes("chore: bump react to 19.3")) {
      const { value, done } = await reader.read();
      if (done) break;
      out += decoder.decode(value, { stream: true });
    }
    reader.releaseLock();
    proc.stdin.write("\x03");
    await proc.stdin.flush();
    const code = await proc.exited;
    clearTimeout(kill);
    for (const d of DEPLOYMENTS) expect(out).toContain(d.commit);
    expect(await new Response(proc.stderr).text()).toBe("");
    expect(code).toBe(0);
  }, 15_000);
});

describe("Shipping chapter", () => {
  const TEXT_CLI = join(import.meta.dir, "../../../packages/app/bin/text.ts");
  const kB = (line: string): number[] => [...line.matchAll(/([\d.]+) kB/g)].map((m) => Number(m[1]));
  // Timings and bundle sizes move with every build; everything else must match the CLI exactly.
  const normalize = (out: string): string =>
    out
      .replace(/Text\.js \d+\.\d+\.\d+/g, "Text.js X.Y.Z")
      .replace(/in [\d.]+s$/gm, "in Xs")
      .replace(/[\d.]+ kB/g, "X kB")
      .replace(/\n+$/, "");

  test("the text build output is what the CLI prints for the course app", () => {
    const shown = fences(markdown("shipping")).find((f) => f.lang === "text")?.source ?? "";
    // As `bun run build` runs it: bun test sets NODE_ENV=test, which would make Vite bundle React's development build.
    const { NODE_ENV: _, ...env } = process.env;
    const r = Bun.spawnSync([process.execPath, TEXT_CLI, "build"], { cwd: APP, env: { ...env, NO_COLOR: "1", FORCE_COLOR: "" } });
    const real = r.stdout.toString();
    expect(r.exitCode).toBe(0);
    expect(normalize(shown)).toBe(normalize(real));
    // Sizes may drift a little between releases, but stay within 10% of the real bundle.
    const shownSizes = kB(shown);
    const realSizes = kB(real);
    expect(shownSizes).toHaveLength(2);
    shownSizes.forEach((size, i) => expect(Math.abs(size / (realSizes[i] ?? 0) - 1)).toBeLessThan(0.1));
  }, 60_000);

  test("static hosting: Vercel and Cloudflare Pages need no rewrite, other hosts get one", () => {
    const md = markdown("shipping");
    expect(md).not.toContain("vercel.json");
    expect(resolveAdapter(undefined, { VERCEL: "1" })).toBe("vercel");
    expect(resolveAdapter(undefined, { CF_PAGES: "1" })).toBe("cloudflare");
    // The vercel adapter's config.json serves index.html for extensionless paths after the filesystem.
    const ctx = { basePath: "", api: [], rewrites: [] } as unknown as AdapterContext;
    const routes = vercelConfig(ctx, null).routes;
    const fallback = routes.slice(routes.findIndex((r) => r.handle === "filesystem") + 1).find((r) => r.dest === "/index.html");
    expect(new RegExp(fallback?.src ?? "$^").test("/deployments/dpl_8fK2")).toBe(true);
    const redirects = splitChapter(md).find((s) => s.type === "diff" && s.file === "public/_redirects");
    expect(redirects && applyDiff(parseDiff(redirects.source))).toBe("/*  /index.html  200");
  });
});
