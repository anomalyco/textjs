import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliArgs, successMessage } from "../src/cli";
import { detectPackageManager, runCommand, scaffold, templateFiles, TEMPLATES, toPackageName, validateProjectName, VERSION, type TemplateName } from "../src/index";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const BIN = fileURLToPath(new URL("../bin/create-text-app.ts", import.meta.url));
const TEXT_BIN = join(REPO, "packages/app/bin/text.ts");

let tmp = "";
beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), "create-text-app-"));
});
afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const EXPECTED: Record<TemplateName, string[]> = {
  starter: [".gitignore", "README.md", "app/about/page.tsx", "app/layout.tsx", "app/page.tsx", "package.json", "text.config.ts", "tsconfig.json"],
  dashboard: [".gitignore", "README.md", "app/api/metrics/route.ts", "app/deployments/[id]/page.tsx", "app/layout.tsx", "app/not-found.tsx", "app/page.tsx", "lib/data.ts", "package.json", "text.config.ts", "tsconfig.json"],
  opencode: [".gitignore", "README.md", "app/layout.tsx", "app/page.tsx", "app/session/[id]/page.tsx", "lib/opencode.ts", "package.json", "text.config.ts", "tsconfig.json"],
};

/** Link the workspace `@textjs/app` + React into a scaffolded project (stands in for `bun install`). */
function linkDeps(dir: string): void {
  const nm = join(dir, "node_modules");
  mkdirSync(join(nm, "@types"), { recursive: true });
  mkdirSync(join(nm, "@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/app"), join(nm, "@textjs/app"));
  for (const dep of ["react", "react-dom", "typescript"]) symlinkSync(join(REPO, "node_modules", dep), join(nm, dep));
  for (const t of ["react", "node", "bun"]) if (existsSync(join(REPO, "node_modules/@types", t))) symlinkSync(join(REPO, "node_modules/@types", t), join(nm, "@types", t));
}

describe("helpers", () => {
  test("package names and validation", () => {
    expect(toPackageName("/tmp/My Console App")).toBe("my-console-app");
    expect(toPackageName("./.hidden")).toBe("hidden");
    expect(validateProjectName("my-app")).toBeNull();
    expect(validateProjectName("My App")).not.toBeNull();
    for (const reserved of ["textjs", "react", "react-dom", "node_modules"]) expect(validateProjectName(reserved)).toContain("reserved");
  });

  test("package manager detection and commands", () => {
    expect(detectPackageManager(undefined)).toBe("bun");
    expect(detectPackageManager("pnpm/9.0.0 npm/? node/v22")).toBe("pnpm");
    expect(detectPackageManager("npm/10.0.0 node/v22")).toBe("npm");
    expect(runCommand("bun", "dev")).toBe("bun dev");
    expect(runCommand("npm", "dev")).toBe("npm run dev");
    expect(runCommand("npm", "start")).toBe("npm start");
  });

  test("argument parsing", () => {
    expect(parseCliArgs(["my-app", "--template", "dashboard", "--yes"])).toMatchObject({ dir: "my-app", template: "dashboard", yes: true });
    expect(parseCliArgs(["--template=opencode", "-y", "x"])).toMatchObject({ dir: "x", template: "opencode", yes: true });
  });

  test("completion instructions", () => {
    const msg = successMessage({ dir: "/tmp/my-app", displayDir: "my-app", template: "starter", pm: "bun" });
    expect(msg).toContain("cd my-app");
    expect(msg).toContain("bun install");
    expect(msg).toContain("bun dev");
    expect(msg).toContain("open the browser console");
    expect(msg).toContain("textjs.org/docs/installation#open-the-console");
  });
});

describe("scaffold", () => {
  for (const template of Object.keys(TEMPLATES) as TemplateName[]) {
    test(`${template}: writes every file with valid JSON and TypeScript`, () => {
      expect(templateFiles(template).length).toBe(EXPECTED[template].length);
      const dir = join(tmp, `valid-${template}`);
      const result = scaffold({ dir, template });
      expect(result.files).toEqual(EXPECTED[template]);
      expect(result.name).toBe(`valid-${template}`);
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      expect(pkg.name).toBe(`valid-${template}`);
      expect(pkg.dependencies["@textjs/app"]).toBe(`^${VERSION}`);
      expect(pkg.scripts).toEqual({ dev: "text dev", build: "text build", start: "text start" });
      JSON.parse(readFileSync(join(dir, "tsconfig.json"), "utf8"));
      const tsx = new Bun.Transpiler({ loader: "tsx" });
      for (const f of result.files) {
        const body = readFileSync(join(dir, f), "utf8");
        expect(body).not.toMatch(/\{\{\w+\}\}/);
        if (/\.tsx?$/.test(f)) expect(() => tsx.transformSync(body)).not.toThrow();
      }
      expect(readFileSync(join(dir, ".gitignore"), "utf8")).toContain("node_modules/");
    });
  }

  test("starter has the ▼ TEXT.JS header, counter and <Link> navigation", () => {
    const dir = join(tmp, "valid-starter");
    expect(readFileSync(join(dir, "app/layout.tsx"), "utf8")).toContain('<AsciiFont text="▼ TEXT.JS"');
    expect(readFileSync(join(dir, "app/page.tsx"), "utf8")).toContain("useInput");
    expect(readFileSync(join(dir, "app/page.tsx"), "utf8")).toContain('href="/about"');
    expect(readFileSync(join(dir, "app/about/page.tsx"), "utf8")).toContain('href="/"');
  });

  test("refuses to overwrite a non-empty directory", () => {
    const dir = join(tmp, "occupied");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "keep.txt"), "x");
    expect(() => scaffold({ dir, template: "starter" })).toThrow(/contains files that could conflict/);
    expect(() => scaffold({ dir, template: "nope" as TemplateName })).toThrow(/Unknown template/);
  });
});

describe("create-text-app CLI", () => {
  test("non-interactive --template --yes", async () => {
    const proc = Bun.spawn(["bun", BIN, "cli-app", "--template", "dashboard", "--yes"], { cwd: tmp, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
    const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    expect(err).toBe("");
    expect(code).toBe(0);
    expect(out).toContain("▼ create-text-app");
    expect(out).toContain("Using template: dashboard");
    expect(out).toContain("Success! Created cli-app");
    expect(out).toContain("cd cli-app");
    expect(out).toContain("bun install");
    expect(out).toContain("bun dev");
    expect(out).toContain("open the browser console");
    expect(existsSync(join(tmp, "cli-app/app/deployments/[id]/page.tsx"))).toBe(true);
  });

  test("without a directory, creates my-app (the docs' quickstart says `cd my-app`)", async () => {
    const cwd = join(tmp, "default-name");
    mkdirSync(cwd, { recursive: true });
    const proc = Bun.spawn(["bun", BIN, "--yes"], { cwd, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
    const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    expect(code).toBe(0);
    expect(out).toContain("cd my-app");
    expect(existsSync(join(cwd, "my-app/app/page.tsx"))).toBe(true);
    for (const doc of ["README.md", "packages/app/README.md", "apps/web/src/docs/content/installation.md"]) {
      const text = readFileSync(join(REPO, doc), "utf8");
      if (text.includes("create-text-app@latest\n")) expect(text).toContain("cd my-app");
    }
  });

  test("rejects unknown templates", async () => {
    const proc = Bun.spawn(["bun", BIN, "bad-app", "--template", "nextjs", "--yes"], { cwd: tmp, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
    const [err, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    expect(code).toBe(1);
    expect(err).toContain("Unknown template nextjs");
  });
});

describe("generated projects typecheck and build", () => {
  // Each template builds in its own directory, so the three run at once.
  for (const template of Object.keys(TEMPLATES) as TemplateName[]) {
    test.concurrent(
      `${template}: tsc --noEmit && text build`,
      async () => {
        const dir = join(tmp, `build-${template}`);
        scaffold({ dir, template });
        linkDeps(dir);
        const tsc = Bun.spawn(["bun", join(REPO, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], { cwd: dir, stdout: "pipe", stderr: "pipe" });
        const [tscOut, tscCode] = await Promise.all([new Response(tsc.stdout).text(), tsc.exited]);
        expect(tscOut).toBe("");
        expect(tscCode).toBe(0);
        const build = Bun.spawn(["bun", TEXT_BIN, "build"], { cwd: dir, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
        const [out, err, code] = await Promise.all([new Response(build.stdout).text(), new Response(build.stderr).text(), build.exited]);
        expect(err.trim()).toBe("");
        expect(code).toBe(0);
        expect(out).toContain("✓ Compiled successfully");
        expect(out).toContain("┌ ○ /");
        expect(existsSync(join(dir, "dist/index.html"))).toBe(true);
      },
      120_000,
    );
  }
});
