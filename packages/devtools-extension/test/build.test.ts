import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { join } from "node:path";
import { build } from "../scripts/build";
import { renderIcon } from "../scripts/icons";
import { createZip } from "../scripts/zip";

describe("extension build", () => {
  test("produces a minimal-permission MV3 extension with no remote code", async () => {
    const { dist, zip, version } = await build();
    const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe(version);
    expect(manifest.permissions).toBeUndefined();
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.devtools_page).toBe("devtools.html");
    expect(manifest.content_scripts.map((c: { world?: string }) => c.world ?? "ISOLATED")).toEqual(["MAIN", "ISOLATED"]);
    expect(manifest.content_security_policy.extension_pages).toBe("script-src 'self'; object-src 'self'");

    const referenced = [
      manifest.background.service_worker,
      ...manifest.content_scripts.flatMap((c: { js: string[] }) => c.js),
      ...Object.values(manifest.icons as Record<string, string>),
      "devtools.html",
      "devtools.js",
      "panel.html",
      "panel.js",
      "panel.css",
    ];
    for (const f of referenced) expect(existsSync(join(dist, f))).toBe(true);

    for (const f of ["page.js", "content.js", "background.js", "devtools.js", "panel.js"]) {
      const code = readFileSync(join(dist, f), "utf8");
      expect(code).not.toMatch(/\bimport\s*\(|importScripts\(|new Function\(|(?<!\.)\beval\(/);
      expect(code).not.toMatch(/<script[^>]+src=["']https?:/);
    }
    for (const f of ["panel.html", "devtools.html"]) expect(readFileSync(join(dist, f), "utf8")).not.toMatch(/https?:\/\//);
    // Test-only introspection globals are compiled out of release builds.
    expect(readFileSync(join(dist, "background.js"), "utf8")).not.toContain("__textjsDevtools");
    expect(readFileSync(join(dist, "panel.js"), "utf8")).not.toContain("__textjsPanel");
    // Panel detection goes through the service worker, never `inspectedWindow.eval`.
    expect(readFileSync(join(dist, "devtools.js"), "utf8")).not.toMatch(/inspectedWindow\.eval|\.eval\(/);
    // The page-world script carries only the hook and bridge.
    expect(readFileSync(join(dist, "page.js")).length).toBeLessThan(8_000);
    expect(readFileSync(join(dist, "page.js"), "utf8")).not.toContain("react");

    expect(zip).not.toBeNull();
    expect(readFileSync(zip!).subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  }, 30_000);

  test("zip entries round-trip", () => {
    const data = new TextEncoder().encode("▼ ".repeat(200));
    const zip = createZip([{ name: "a.txt", data }]);
    const view = new DataView(zip.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const method = view.getUint16(8, true);
    const size = view.getUint32(18, true);
    const nameLen = view.getUint16(26, true);
    const body = zip.subarray(30 + nameLen, 30 + nameLen + size);
    expect(method).toBe(8);
    expect(new Uint8Array(inflateRawSync(body))).toEqual(data);
  });

  test("icons are valid PNGs", () => {
    const png = renderIcon(32);
    expect(Buffer.from(png.subarray(1, 4)).toString()).toBe("PNG");
    expect(new DataView(png.buffer).getUint32(16)).toBe(32);
  });
});
