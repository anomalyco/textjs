import { afterAll, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findExecutable, opencodeCommand } from "../src/proxy";

const root = mkdtempSync(join(tmpdir(), "find-opencode-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

function dir(name: string, files: string[]): string {
  const d = join(root, name);
  mkdirSync(d, { recursive: true });
  for (const f of files) {
    writeFileSync(join(d, f), "");
    chmodSync(join(d, f), 0o755);
  }
  return d;
}

describe("finding opencode", () => {
  test.skipIf(process.platform === "win32")("POSIX: the bare name in PATH order", () => {
    const a = dir("posix-a", []);
    const b = dir("posix-b", ["opencode"]);
    const c = dir("posix-c", ["opencode"]);
    const plain = dir("posix-plain", []);
    writeFileSync(join(plain, "opencode"), "");
    mkdirSync(join(a, "opencode"));
    expect(findExecutable("opencode", { PATH: ["", a, plain, b, c].join(":") }, "darwin")).toEqual([`${b}/opencode`, `${c}/opencode`]);
  });

  // npm's global bin holds `opencode` (a shell script), `opencode.cmd` and `opencode.ps1`.
  test("Windows: PATHEXT extensions, never the bare shell script", () => {
    const npm = dir("npm", ["opencode", "opencode.cmd", "opencode.ps1"]);
    const scoop = dir("scoop", ["opencode.exe"]);
    const env = { Path: `;"${npm}\\";${scoop}`, PATHEXT: ".COM;.EXE;.BAT;.CMD;.JS;..\\x" };
    // Separators are mixed on macOS/Linux, where "\\" isn't one; existsSync still resolves the files on Windows.
    if (process.platform === "win32") expect(findExecutable("opencode", env, "win32")).toEqual([`${npm}\\opencode.cmd`, `${scoop}\\opencode.exe`]);
    else expect(findExecutable("opencode", env, "win32")).toEqual([]);
    expect(findExecutable("opencode", { Path: "", PATHEXT: "" }, "win32")).toEqual([]);
  });

  test("shims run through cmd.exe, executables directly", () => {
    expect(opencodeCommand("C:\\bin\\opencode.exe", ["service", "status"])).toEqual({ file: "C:\\bin\\opencode.exe", args: ["service", "status"], verbatim: false });
    expect(opencodeCommand("C:\\Users\\A B\\AppData\\Roaming\\npm\\opencode.cmd", ["service", "get", "password"], { ComSpec: "C:\\Windows\\system32\\cmd.exe" })).toEqual({
      file: "C:\\Windows\\system32\\cmd.exe",
      args: ["/d", "/v:off", "/s", "/c", '""C:\\Users\\A B\\AppData\\Roaming\\npm\\opencode.cmd" service get password"'],
      verbatim: true,
    });
    expect(() => opencodeCommand("opencode.CMD", ["a&b"])).toThrow();
    expect(opencodeCommand("C:\\100%USERNAME%\\npm\\opencode.cmd", ["service", "status"])).toBeNull();
  });
});
