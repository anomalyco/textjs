/**
 * VS Code integration test: downloads a VS Code build into `.vscode-test/`
 * (cached), launches it with this extension in development mode on a copy of
 * `examples/dashboard`, and runs `suite.cjs` inside the extension host.
 *
 *   bun run test:integration
 *
 * Needs network access the first time (update.code.visualstudio.com); later
 * runs reuse the cached build. Set VSCODE_EXECUTABLE to use an installed VS Code.
 */

import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runTests } from "@vscode/test-electron";

const here = dirname(fileURLToPath(import.meta.url));
const extensionDevelopmentPath = resolve(here, "../..");
const repo = resolve(extensionDevelopmentPath, "../..");

// A writable copy of the dashboard example so the suite can scaffold files.
const work = mkdtempSync(join(tmpdir(), "textjs-vscode-it-"));
const fixture = join(work, "dashboard");
cpSync(join(repo, "examples/dashboard"), fixture, { recursive: true, filter: (src) => !src.includes("node_modules") && !src.endsWith("/dist") });
mkdirSync(join(fixture, "node_modules/@textjs"), { recursive: true });
symlinkSync(join(repo, "packages/text"), join(fixture, "node_modules/@textjs/next"));
for (const dep of ["react", "react-dom"]) symlinkSync(join(repo, "node_modules", dep), join(fixture, "node_modules", dep));

const userData = join(work, "user-data");
let code = 1;
try {
  code = await runTests({
    version: process.env.VSCODE_VERSION ?? "stable",
    vscodeExecutablePath: process.env.VSCODE_EXECUTABLE && existsSync(process.env.VSCODE_EXECUTABLE) ? process.env.VSCODE_EXECUTABLE : undefined,
    extensionDevelopmentPath,
    extensionTestsPath: join(here, "suite.cjs"),
    launchArgs: [fixture, "--disable-extensions", "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes", `--user-data-dir=${userData}`],
    extensionTestsEnv: { TEXTJS_FIXTURE: fixture },
  });
} catch (error) {
  console.error("▼ integration test failed:", error);
  code = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(code);
