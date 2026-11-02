import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inlineScriptHashes, inlineScriptSources, withScriptHashes } from "../scripts/csp";
import { VIEWPORT_SOURCE } from "../src/console-companion/viewport-console";

const sha = (s: string): string => `'sha256-${createHash("sha256").update(s).digest("base64")}'`;
const HEADERS = "/*\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'\n\n/assets/*\n  Cache-Control: immutable\n";

describe("Content-Security-Policy script hashes", () => {
  test("hashes inline classic and module scripts, never external ones or data blocks", () => {
    const html = `<script>a()</script><script type="module">b()</script><script src="/x.js"></script><script type="application/ld+json">{"c":1}</script><script type="text/javascript">\nd()\n</script>`;
    expect(inlineScriptSources(html)).toEqual([sha("a()"), sha("b()"), sha("\nd()\n")]);
  });

  test("collects distinct hashes across nested pages", () => {
    const dir = mkdtempSync(join(tmpdir(), "textjs-csp-"));
    try {
      mkdirSync(join(dir, "docs"));
      writeFileSync(join(dir, "index.html"), "<script>a()</script>");
      writeFileSync(join(dir, "docs", "x.html"), "<script>a()</script><script>b()</script>");
      writeFileSync(join(dir, "docs", "x.js"), "<script>c()</script>");
      expect(inlineScriptHashes(dir)).toEqual([sha("a()"), sha("b()")].sort());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("adds the hashes to the /* rule's script-src only", () => {
    const out = withScriptHashes(HEADERS, ["'sha256-A'", "'sha256-B'"]);
    expect(out).toContain("script-src 'self' 'sha256-A' 'sha256-B' 'wasm-unsafe-eval';");
    expect(out.replace(" 'sha256-A' 'sha256-B'", "")).toBe(HEADERS);
  });

  test("fails the build rather than ship a policy that blocks the pages", () => {
    expect(() => withScriptHashes(HEADERS.replace(/  Content-Security-Policy.*\n/, ""), ["'sha256-A'"])).toThrow();
    expect(() => withScriptHashes(HEADERS.replace("script-src 'self' ", "script-src "), ["'sha256-A'"])).toThrow();
    expect(() => withScriptHashes(withScriptHashes(HEADERS, ["'sha256-A'"]), ["'sha256-A'"])).toThrow();
    // Cloudflare Pages ignores the whole line past 2,000 characters.
    expect(() => withScriptHashes(HEADERS, Array.from({ length: 40 }, (_, i) => `'sha256-${String(i).padStart(44, "x")}='`))).toThrow("2000");
  });

  test("the console frames' viewport file is a plain inline script (no eval)", () => {
    expect(inlineScriptSources(`<script>${VIEWPORT_SOURCE}</script>`)).toEqual([sha(VIEWPORT_SOURCE)]);
  });
});
