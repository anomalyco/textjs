#!/usr/bin/env node
/**
 * Windows smoke test for what a new user runs from a terminal, against the
 * published npm packages:
 *
 *   create-text-app (bunx and npx) for every template → install → `text build`
 *   → `text dev` (serves `/` and the `/__textjs/status` frame endpoint), then
 *   `@textjs/opencode proxy --help` and a bridge run that prints a pairing code.
 *
 * Every command goes through the platform shell (cmd.exe on Windows), the way
 * a user types it. Runs anywhere; CI runs it on Windows.
 *
 *   node scripts/windows/cli-smoke.mjs [--only starter,dashboard] [--pm bun,npm] [--version latest] [--json out.json]
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const TEMPLATES = (opt("only") ?? "starter,dashboard,opencode").split(",");
const PMS = (opt("pm") ?? "bun,npm").split(",");
const VERSION = opt("version") ?? "latest";
// Commands run through the shell: accept only a semver version or an npm dist-tag.
if (!/^(?:\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?|[a-z][a-z0-9-]{0,31})$/.test(VERSION)) {
  console.error(`--version must be a version (1.2.3) or a dist-tag (latest), got ${JSON.stringify(VERSION)}`);
  process.exit(2);
}
const JSON_OUT = opt("json");
const WIN = process.platform === "win32";

const work = mkdtempSync(join(tmpdir(), "textjs-win-"));
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail.split("\n")[0]}` : ""}`);
  if (!ok && detail) console.log(detail.split("\n").map((l) => `      ${l}`).join("\n"));
}

function sh(cmd, cwd, timeout = 600_000) {
  console.log(`  $ ${cmd}   (${cwd})`);
  const r = spawnSync(cmd, { cwd, shell: true, encoding: "utf8", timeout, env: { ...process.env, NO_COLOR: "1", CI: "1" }, maxBuffer: 64 * 1024 * 1024 });
  const out = stripVTControlCharacters(`${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`);
  return { code: r.status, out };
}

/** Start a long-running command; resolves once `ready` matches its output. */
function start(cmd, cwd, ready, timeout = 90_000) {
  console.log(`  $ ${cmd} &   (${cwd})`);
  const child = spawn(cmd, { cwd, shell: true, env: { ...process.env, NO_COLOR: "1", CI: "1" }, windowsHide: true });
  let out = "";
  const append = (b) => (out += stripVTControlCharacters(String(b)));
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const proc = {
    child,
    output: () => out,
    stop() {
      if (child.exitCode !== null) return;
      if (WIN) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    },
  };
  return new Promise((resolve) => {
    const deadline = setTimeout(() => resolve({ ...proc, match: null }), timeout);
    const check = () => {
      const m = ready.exec(out);
      if (m) {
        clearTimeout(deadline);
        resolve({ ...proc, match: m });
      }
    };
    child.stdout.on("data", check);
    child.stderr.on("data", check);
    child.on("exit", () => {
      clearTimeout(deadline);
      resolve({ ...proc, match: ready.exec(out) });
    });
  });
}

async function get(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    return { status: res.status, body: await res.text() };
  } catch (error) {
    return { status: 0, body: String(error) };
  }
}

const runners = {
  bun: {
    create: (t, dir) => `bunx create-text-app@${VERSION} ${dir} --template ${t} --yes`,
    install: "bun install",
    run: (s) => `bun run ${s}`,
  },
  npm: {
    create: (t, dir) => `npx --yes create-text-app@${VERSION} ${dir} --template ${t} --yes`,
    install: "npm install --no-audit --no-fund",
    run: (s) => `npm run ${s} --`,
  },
};

for (const pm of PMS) {
  const r = runners[pm];
  for (const t of TEMPLATES) {
    const label = `${pm}/${t}`;
    const base = join(work, pm);
    mkdirSync(base, { recursive: true });
    const dir = `app-${t}`;
    const app = join(base, dir);

    const created = sh(r.create(t, dir), base);
    record(`${label} create`, created.code === 0, created.code === 0 ? "" : created.out);
    if (created.code !== 0) continue;

    const installed = sh(r.install, app);
    record(`${label} install`, installed.code === 0, installed.code === 0 ? "" : installed.out);
    if (installed.code !== 0) continue;

    const built = sh(r.run("build"), app);
    const warn = /warn|error|⨯/i.test(built.out.replace(/0 errors?/gi, ""));
    record(`${label} build`, built.code === 0, built.code === 0 ? (warn ? `output mentions a warning:\n${built.out}` : "") : built.out);

    const port = 3100 + results.length;
    const dev = await start(`${r.run("dev")} --port ${port}`, app, /Local:?\s+(http:\/\/\S+)/);
    if (!dev.match) {
      record(`${label} dev`, false, `never printed a Local URL:\n${dev.output()}`);
      dev.stop();
      continue;
    }
    const url = dev.match[1].replace(/\/$/, "");
    const page = await get(`${url}/`);
    // Same-origin request shape the frame mirror accepts (loopback peer and Host).
    const status = await get(`${url}/__textjs/status`, { "sec-fetch-site": "same-origin" });
    let statusOk = false;
    try {
      statusOk = status.status === 200 && typeof JSON.parse(status.body) === "object";
    } catch {}
    const pageOk = page.status === 200 && /<script/i.test(page.body);
    record(`${label} dev /`, pageOk, pageOk ? url : `${page.status} ${page.body.slice(0, 400)}`);
    record(`${label} dev /__textjs/status`, statusOk, statusOk ? status.body.slice(0, 160) : `${status.status} ${status.body.slice(0, 400)}`);
    dev.stop();
    const noisy = /error|warn|⨯/i.test(dev.output());
    if (noisy) record(`${label} dev output clean`, false, dev.output());
  }
}

// @textjs/opencode: help, then a bridge run with nothing to discover.
for (const pm of PMS) {
  const x = pm === "bun" ? `bunx @textjs/opencode@${VERSION}` : `npx --yes @textjs/opencode@${VERSION}`;
  const help = sh(`${x} proxy --help`, work);
  const helpOk = help.code === 0 && /Usage:/.test(help.out);
  record(`${pm} opencode proxy --help`, helpOk, helpOk ? "" : help.out);

  const port = 4196 + PMS.indexOf(pm);
  const bridge = await start(`${x} proxy --port ${port}`, work, /\b([2-9A-HJ-NP-TV-Z]{3}-[2-9A-HJ-NP-TV-Z]{3})\b/);
  record(`${pm} opencode proxy pairing code`, Boolean(bridge.match), bridge.match ? bridge.match[1] : bridge.output());
  if (bridge.match) {
    const probe = await get(`http://127.0.0.1:${port}/__bridge`, { origin: "https://textjs.org" });
    const ok = probe.status === 200 && /"bridge":"textjs"/.test(probe.body);
    record(`${pm} opencode proxy /__bridge`, ok, `${probe.status} ${probe.body.slice(0, 200)}`);
  }
  bridge.stop();
}

if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(results, null, 2));
try {
  rmSync(work, { recursive: true, force: true });
} catch {}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;
