import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { TX_MESSAGES as CORE_MESSAGES, txMessage as coreTxMessage } from "../../core/src/errors";
import { TX_MESSAGES, txError, txMessage, type TxCode } from "../src/errors";
import { VERSION } from "../src/version";

const root = join(import.meta.dir, "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<string, unknown>;

describe("@textjs/opencode", () => {
  test("inlined error messages match @textjs/core", () => {
    for (const code of Object.keys(TX_MESSAGES) as TxCode[]) {
      expect({ code, message: TX_MESSAGES[code] }).toEqual({ code, message: CORE_MESSAGES[code] });
      expect(txMessage(code, 4097, 4098, "http://127.0.0.1:4098")).toBe(coreTxMessage(code, 4097, 4098, "http://127.0.0.1:4098"));
    }
    expect(txError("TX021").code).toBe("TX021");
  });

  test("every TX code the bridge throws is inlined", () => {
    const src = readdirSync(join(root, "src"))
      .map((f) => readFileSync(join(root, "src", f), "utf8"))
      .join("\n");
    const thrown = new Set([...src.matchAll(/txError\("(TX\d{3})"/g)].map((m) => m[1]));
    expect([...thrown].sort()).toEqual(Object.keys(TX_MESSAGES).sort());
  });

  test("has no runtime dependencies and imports only Node built-ins", () => {
    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.optionalDependencies).toBeUndefined();
    for (const f of readdirSync(join(root, "src"))) {
      const source = readFileSync(join(root, "src", f), "utf8");
      for (const [, spec] of source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)) {
        expect({ file: f, spec, ok: spec!.startsWith("node:") || spec!.startsWith("./") }).toEqual({ file: f, spec, ok: true });
      }
    }
  });

  test("VERSION mirrors package.json", () => {
    expect(VERSION).toBe(manifest.version as string);
  });

  test("ships a single bin that is not named opencode", () => {
    // `bunx @textjs/opencode` runs the only bin; a bin called `opencode` would shadow the OpenCode CLI.
    expect(manifest.bin).toEqual({ "textjs-opencode": "bin/textjs-opencode.js" });
    expect((manifest.engines as Record<string, string>).node).toBe(">=22");
  });
});
