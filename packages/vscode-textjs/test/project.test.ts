import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devCommand, detectPackageManager, findProjectRoot, isInside, isProjectRoot, previewPath, previewTargetForFile, previewTargetInFolder, routeFileInfo, usesTypeScript } from "../src/project";
import { formatStatus } from "../src/status-format";
import { findTxCodes, txHoverMarkdown, txInfo, txUrl } from "../src/tx-codes";
import { SseParser } from "../src/sse";
import { createNonce, previewHtml } from "../src/webview-html";

let dir = "";
let app = "";

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "textjs-vscode-"));
  app = join(dir, "apps/shop");
  mkdirSync(join(app, "app/(store)/items/[id]"), { recursive: true });
  mkdirSync(join(app, "app/api/health"), { recursive: true });
  mkdirSync(join(app, "app/_lib"), { recursive: true });
  mkdirSync(join(app, "components"), { recursive: true });
  writeFileSync(join(dir, "bun.lock"), "");
  writeFileSync(join(app, "package.json"), JSON.stringify({ name: "shop", scripts: { dev: "text dev" }, dependencies: { "@textjs/app": "^1.0.0" } }));
  writeFileSync(join(app, "tsconfig.json"), "{}");
  for (const f of ["app/page.tsx", "app/(store)/items/[id]/page.tsx", "app/api/health/route.ts", "app/_lib/page.tsx", "components/Card.tsx"]) writeFileSync(join(app, f), "");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("project detection", () => {
  test("finds the nearest Text.js app", () => {
    expect(isProjectRoot(app)).toBe(true);
    expect(isProjectRoot(dir)).toBe(false);
    expect(findProjectRoot(join(app, "components/Card.tsx"))).toBe(app);
    expect(findProjectRoot(join(dir, "bun.lock"))).toBeNull();
  });

  test("stopAt keeps the search inside the workspace folder", () => {
    // A project above the workspace folder is never picked up.
    const nested = join(app, "components");
    expect(findProjectRoot(join(nested, "Card.tsx"), nested)).toBeNull();
    expect(findProjectRoot(join(app, "components/Card.tsx"), app)).toBe(app);
    expect(findProjectRoot(join(app, "components/Card.tsx"), dir)).toBe(app);
    // Files outside the folder have no project, even when one exists above them.
    const outside = join(dir, "outside");
    mkdirSync(join(outside, "app"), { recursive: true });
    writeFileSync(join(outside, "text.config.mjs"), "");
    writeFileSync(join(outside, "app/page.tsx"), "");
    expect(findProjectRoot(join(outside, "app/page.tsx"))).toBe(outside);
    expect(findProjectRoot(join(outside, "app/page.tsx"), app)).toBeNull();
    expect(previewTargetInFolder(join(outside, "app/page.tsx"), app)).toBeNull();
    expect(previewTargetInFolder(join(outside, "app/page.tsx"), undefined)).toBeNull();
    expect(previewTargetInFolder(join(app, "app/page.tsx"), app)?.root).toBe(app);
    expect(isInside(join(app, "x"), app)).toBe(true);
    expect(isInside(app, app)).toBe(true);
    expect(isInside(`${app}-evil/x`, app)).toBe(false);
    expect(isInside(join(app, "../x"), app)).toBe(false);
  });

  test("text.config.* alone marks a project", () => {
    const other = join(dir, "cfg");
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, "text.config.ts"), "");
    expect(isProjectRoot(other)).toBe(true);
  });

  test("package manager and dev command", () => {
    expect(detectPackageManager(app)).toBe("bun");
    expect(devCommand(app)).toBe("bun run dev");
    expect(devCommand(app, 3005)).toBe("bun run dev --port 3005");
    expect(usesTypeScript(app)).toBe(true);
    const npmApp = join(dir, "npm-app");
    mkdirSync(npmApp, { recursive: true });
    writeFileSync(join(npmApp, "package.json"), "{}");
    writeFileSync(join(npmApp, "package-lock.json"), "{}");
    expect(devCommand(npmApp)).toBe("npx text dev");
  });
});

describe("preview targets", () => {
  test("route files map to concrete preview paths", () => {
    expect(routeFileInfo(app, join(app, "app/(store)/items/[id]/page.tsx"))).toEqual({ kind: "page", segments: ["(store)", "items", "[id]"] });
    expect(previewPath(["(store)", "items", "[id]"])).toBe("/items/id");
    expect(previewPath(["docs", "[...slug]"])).toBe("/docs/slug");
    expect(previewPath(["docs", "[[...slug]]"])).toBe("/docs");
    expect(previewPath([])).toBe("/");
  });

  test("pages, components and non-previewable files", () => {
    expect(previewTargetForFile(join(app, "app/page.tsx"))).toEqual({ kind: "route", root: app, path: "/", file: join(app, "app/page.tsx") });
    expect(previewTargetForFile(join(app, "components/Card.tsx"))).toEqual({ kind: "component", root: app, file: join(app, "components/Card.tsx") });
    expect(previewTargetForFile(join(app, "app/api/health/route.ts"))).toBeNull();
    // Private folders are not routes: preview the file as a component.
    expect(previewTargetForFile(join(app, "app/_lib/page.tsx"))?.kind).toBe("component");
    expect(previewTargetForFile(join(dir, "bun.lock"))).toBeNull();
  });
});

describe("TX codes", () => {
  test("finds codes and links to textjs.org", () => {
    expect(findTxCodes("Error TX015 then TX001, not XTX0012 or TX12")).toEqual([
      { code: "TX015", start: 6, end: 11 },
      { code: "TX001", start: 17, end: 22 },
    ]);
    expect(txUrl("TX015")).toBe("https://textjs.org/errors/TX015");
  });

  test("hover markdown uses the error catalog", () => {
    const info = txInfo("TX001");
    expect(info.title).toBeTruthy();
    expect(info.package).toBe("@textjs/core");
    const md = txHoverMarkdown("TX001");
    expect(md).toContain("**▼ TX001**");
    expect(md).toContain("[Read the docs →](https://textjs.org/errors/TX001)");
    expect(txHoverMarkdown("TX999")).toContain("Text.js error");
  });
});

describe("status bar", () => {
  test("formats running, starting and stopped states", () => {
    const running = formatStatus({ server: "running", url: "http://localhost:3000", tabs: 1, grid: { width: 120, height: 36 }, gridSource: "browser", path: "/logs" });
    expect(running.text).toBe("$(triangle-down) :3000  $(terminal) 120×36");
    expect(running.tooltip).toContain("Dev server running at [http://localhost:3000]");
    expect(running.tooltip).toContain("1 browser tab · `/logs`");
    expect(formatStatus({ server: "starting", url: null, tabs: 0, grid: null, gridSource: null, path: null }).text).toBe("$(loading~spin) Text.js");
    const stopped = formatStatus({ server: "stopped", url: null, tabs: 0, grid: { width: 90, height: 30 }, gridSource: "preview", path: null });
    expect(stopped.text).toBe("$(triangle-down) Text.js  $(terminal) 90×30");
    expect(stopped.tooltip).toContain("(preview)");
  });
});

describe("SseParser", () => {
  test("parses events split across chunks", () => {
    const p = new SseParser();
    expect(p.push("retry: 1000\n\nevent: sta")).toEqual([]);
    expect(p.push('tus\ndata: {"a":1}\n\n: comment\n\nevent: frame\r\ndata: x\r\ndata: y\r\n\r\n')).toEqual([
      { event: "status", data: '{"a":1}' },
      { event: "frame", data: "x\ny" },
    ]);
    expect(p.push("data: plain\n\n")).toEqual([{ event: "message", data: "plain" }]);
  });

  test("a CRLF split across chunks is one line break", () => {
    const p = new SseParser();
    // Previously the trailing \r and the leading \n became two line breaks: an empty line that ended the event early.
    expect(p.push("event: frame\r")).toEqual([]);
    expect(p.push("\ndata: one\r")).toEqual([]);
    // A CR alone already ends a line, so this completes the event…
    expect(p.push("\ndata: two\r\n\r")).toEqual([{ event: "frame", data: "one\ntwo" }]);
    // …and the LF finishing that CRLF is not a second (empty) line.
    expect(p.push("\nevent: status\r")).toEqual([]);
    expect(p.push("\ndata: s\r\n\r\n")).toEqual([{ event: "status", data: "s" }]);
    // Bare CR line endings still work, including across chunks.
    expect(p.push("data: a\r")).toEqual([]);
    expect(p.push("\r")).toEqual([{ event: "message", data: "a" }]);
    // Every split point of a CRLF stream yields the same events.
    const stream = "event: frame\r\ndata: x\r\n\r\nevent: gone\r\ndata: y\r\n\r\n";
    for (let i = 1; i < stream.length; i++) {
      const q = new SseParser();
      expect([...q.push(stream.slice(0, i)), ...q.push(stream.slice(i))]).toEqual([
        { event: "frame", data: "x" },
        { event: "gone", data: "y" },
      ]);
    }
  });

  test("an unterminated event can't grow the buffer without bound", () => {
    const p = new SseParser(1024);
    expect(p.push(`data: ${"x".repeat(1000)}`)).toEqual([]);
    expect(() => p.push("x".repeat(100))).toThrow(/overflow/);
    expect(p.push("data: ok\n\n")).toEqual([{ event: "message", data: "ok" }]);
  });
});

describe("webview document", () => {
  test("CSP nonce comes from the CSPRNG and the policy locks base and form targets", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => createNonce()));
    expect(nonces.size).toBe(200);
    for (const n of nonces) expect(n).toMatch(/^[A-Za-z0-9_-]{32}$/);
    const html = previewHtml({ cspSource: "vscode-resource:", scriptUri: "s.js", styleUri: "s.css", nonce: "abc" });
    const csp = /content="([^"]+)"/.exec(html)?.[1] ?? "";
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'nonce-abc'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(html).toContain('<script nonce="abc" src="s.js">');
  });
});
