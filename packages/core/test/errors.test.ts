import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { errorUrl, formatTemplate, getTxError, isTextJsError, resetTxWarnings, TX_ERRORS, TX_MESSAGES, TX_PACKAGES, txError, txMessage, txWarn, type TxCode } from "../src";
import { CREATE_TEXT_APP_MESSAGES } from "../../create-text-app/src/errors";

const PACKAGES = join(import.meta.dir, "..", "..");
const CODES = Object.keys(TX_MESSAGES) as TxCode[];
const REGISTRY_FILES = new Set([join("core", "src", "errors.ts"), join("core", "src", "error-docs.ts"), join("create-text-app", "src", "errors.ts")]);

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "test" || name === "templates") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

/** `code → files` for every `txError("TX…")` / `txWarn` / `txMessage` call outside the registries. */
function usages(): Map<string, string[]> {
  const used = new Map<string, string[]>();
  for (const file of sources(PACKAGES)) {
    const rel = file.slice(PACKAGES.length + 1);
    if (REGISTRY_FILES.has(rel)) continue;
    for (const m of readFileSync(file, "utf8").matchAll(/\btx(?:Error|Warn|Message)\(\s*"(TX\d{3})"/g)) {
      const code = m[1] as string;
      used.set(code, [...(used.get(code) ?? []), rel]);
    }
  }
  return used;
}

describe("error codes", () => {
  afterEach(() => resetTxWarnings());

  test("codes are TX### and contiguous from TX001 (append-only, never reused)", () => {
    CODES.forEach((code, i) => expect<string>(code).toBe(`TX${String(i + 1).padStart(3, "0")}`));
    expect(new Set(CODES).size).toBe(CODES.length);
    expect(new Set(Object.values(TX_MESSAGES)).size).toBe(CODES.length);
  });

  test("every code is documented", () => {
    expect(TX_ERRORS.map((e) => e.code)).toEqual(CODES);
    for (const e of TX_ERRORS) {
      expect(TX_PACKAGES).toContain(e.package);
      expect(e.title.length).toBeGreaterThan(3);
      expect(e.title).not.toMatch(/\.$/);
      expect(e.cause.length).toBeGreaterThan(40);
      expect(e.fix).toContain("~~~");
      expect(e.fix.split("~~~").length % 2).toBe(1);
      expect(e.message).toBe(TX_MESSAGES[e.code]);
      expect(e.url).toBe(`https://textjs.org/errors/${e.code}`);
    }
    expect(new Set(TX_ERRORS.map((e) => e.title)).size).toBe(TX_ERRORS.length);
    expect(getTxError("TX004")?.title).toContain("<Box>");
    expect(getTxError("TX999")).toBeUndefined();
  });

  test("every registered code is raised somewhere, and every raised code is registered", () => {
    const used = usages();
    for (const code of CODES) expect({ code, used: used.has(code) }).toEqual({ code, used: true });
    for (const code of used.keys()) expect(CODES).toContain(code as TxCode);
  });

  test("messages name the code and link to its page", () => {
    expect(txMessage("TX004")).toBe("Text.js error TX004: <Box> cannot be nested inside <Text>. https://textjs.org/errors/TX004");
    expect(txMessage("TX006", "hyper", "hyper+k")).toBe('Text.js error TX006: Unknown modifier "hyper" in key combo "hyper+k". https://textjs.org/errors/TX006');
    expect(formatTemplate("%s and %s", ["a"])).toBe("a and …");
    expect(errorUrl("TX010")).toBe("https://textjs.org/errors/TX010");
    for (const code of CODES) expect(txMessage(code)).toEndWith(` https://textjs.org/errors/${code}`);
  });

  test("txError returns a coded Error", () => {
    const error = txError("TX003", "div");
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("TX003");
    expect(error.message).toContain("Unknown host element <div>.");
    expect(isTextJsError(error)).toBe(true);
    expect(isTextJsError(new Error("nope"))).toBe(false);
    expect(() => {
      throw error;
    }).toThrow(/TX003/);
  });

  test("txWarn warns once per distinct message", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      txWarn("TX029", '"basepath"', "text.config.ts");
      txWarn("TX029", '"basepath"', "text.config.ts");
      txWarn("TX029", '"pages"', "text.config.ts");
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn.mock.calls[0]?.[0]).toBe('Text.js warning TX029: Unknown option "basepath" in text.config.ts. It will be ignored. https://textjs.org/errors/TX029');
    } finally {
      warn.mockRestore();
    }
  });

  test("create-text-app's zero-dependency copies match the registry", () => {
    for (const [code, message] of Object.entries(CREATE_TEXT_APP_MESSAGES)) {
      expect<string>(TX_MESSAGES[code as TxCode]).toBe(message);
      expect(getTxError(code)?.package).toBe("create-text-app");
    }
    const owned = TX_ERRORS.filter((e) => e.package === "create-text-app").map((e) => e.code);
    expect(Object.keys(CREATE_TEXT_APP_MESSAGES).sort()).toEqual(owned);
  });
});
