/**
 * VS Code integration test: downloads a VS Code build into `.vscode-test/`
 * (cached), launches it with this extension in development mode on a copy of
 * `examples/dashboard`, and runs `suite.cjs` inside the extension host. A
 * second launch opens another copy in Restricted Mode (Workspace Trust on,
 * never granted) and runs `suite-untrusted.cjs`.
 *
 *   bun run test:integration
 *
 * Needs network access the first time (update.code.visualstudio.com); later
 * runs reuse the cached build. Set VSCODE_EXECUTABLE to use an installed VS Code.
 */

import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";

const here = dirname(fileURLToPath(import.meta.url));
const extensionDevelopmentPath = resolve(here, "../..");
const repo = resolve(extensionDevelopmentPath, "../..");

const work = mkdtempSync(join(tmpdir(), "textjs-vscode-it-"));

function linkDeps(dir) {
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(repo, "packages/text"), join(dir, "node_modules/@textjs/next"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(repo, "node_modules", dep), join(dir, "node_modules", dep));
}

/** A writable copy of the dashboard example so the suite can scaffold files. */
function copyFixture(name) {
  const dir = join(work, name);
  cpSync(join(repo, "examples/dashboard"), dir, { recursive: true, filter: (src) => !src.includes("node_modules") && !src.endsWith("/dist") });
  linkDeps(dir);
  return dir;
}

/**
 * A complete Text.js app outside the workspace whose config drops a marker
 * file when evaluated: if the preview ever ran it, the marker would appear.
 */
function outsideProject(name, marker) {
  const dir = join(work, name);
  mkdirSync(join(dir, "app"), { recursive: true });
  linkDeps(dir);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name, type: "module", private: true, dependencies: { "@textjs/next": "*" } }));
  writeFileSync(join(dir, "text.config.mjs"), `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marker)}, "ran");\nexport default {};\n`);
  writeFileSync(join(dir, "app/page.tsx"), 'import { Text } from "@textjs/next";\nexport default function Page() { return <Text>outside</Text>; }\n');
  return dir;
}

const version = process.env.VSCODE_VERSION ?? "stable";
const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE && existsSync(process.env.VSCODE_EXECUTABLE) ? process.env.VSCODE_EXECUTABLE : undefined;

/** Like `runTests`, which always passes `--disable-workspace-trust`, but without it. */
async function runTestsWithTrust({ extensionTestsPath, launchArgs, extensionTestsEnv }) {
  const executable = vscodeExecutablePath ?? (await downloadAndUnzipVSCode({ version }));
  const args = [...launchArgs, "--no-sandbox", "--disable-gpu-sandbox", "--disable-updates", "--no-cached-data", `--extensionTestsPath=${extensionTestsPath}`, `--extensionDevelopmentPath=${extensionDevelopmentPath}`];
  return new Promise((resolve) => {
    const child = spawn(executable, args, { env: { ...process.env, ...extensionTestsEnv }, stdio: "inherit" });
    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
const common = ["--disable-extensions", "--skip-welcome", "--skip-release-notes"];

let code = 1;
try {
  const fixture = copyFixture("dashboard");
  const outsideMarker = join(work, "outside-ran");
  const outside = outsideProject("outside", outsideMarker);
  code = await runTests({
    version,
    vscodeExecutablePath,
    extensionDevelopmentPath,
    extensionTestsPath: join(here, "suite.cjs"),
    launchArgs: [fixture, ...common, "--disable-workspace-trust", `--user-data-dir=${join(work, "user-data")}`],
    extensionTestsEnv: { TEXTJS_FIXTURE: fixture, TEXTJS_OUTSIDE: outside, TEXTJS_OUTSIDE_MARKER: outsideMarker },
  });

  if (code === 0) {
    // Restricted Mode: the repo's own settings try to run commands.
    const untrusted = copyFixture("untrusted");
    const marker = join(work, "untrusted-ran");
    const script = join(work, "evil.sh");
    writeFileSync(script, `#!/bin/sh\necho ran > ${JSON.stringify(marker)}\n`, { mode: 0o755 });
    mkdirSync(join(untrusted, ".vscode"), { recursive: true });
    writeFileSync(
      join(untrusted, ".vscode/settings.json"),
      JSON.stringify({ "textjs.preview.runtime": script, "textjs.devServer.command": `${script}`, "textjs.devServer.url": "http://127.0.0.1:9" }, null, 2),
    );
    const userData = join(work, "ud2");
    mkdirSync(join(userData, "User"), { recursive: true });
    writeFileSync(
      join(userData, "User/settings.json"),
      JSON.stringify({ "security.workspace.trust.enabled": true, "security.workspace.trust.startupPrompt": "never", "security.workspace.trust.banner": "never" }),
    );
    code = await runTestsWithTrust({
      extensionTestsPath: join(here, "suite-untrusted.cjs"),
      launchArgs: [untrusted, ...common, `--user-data-dir=${userData}`],
      extensionTestsEnv: { TEXTJS_FIXTURE: untrusted, TEXTJS_MARKER: marker },
    });
  }
} catch (error) {
  console.error("▼ integration test failed:", error);
  code = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
process.exit(code);
