// One command from a fresh capture to the finished cut: film (capture.ts, on the Mac), cut and mix (prepare.ts),
// composite and encode on the exe.dev VM (produce.ts), pull the results back and pause the VM.
//
//   bun media/doom-video/render.ts b [--reuse] [--draft ~/Desktop/doom-video-draft]
//
// --reuse   skip filming and re-edit the existing out/capture/<cut>/
// --draft   also copy the video and its poster into this folder, overwriting earlier copies
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ROOT } from "./lib/site";

const cut = process.argv[2] as "a" | "b" | "c";
const RATIO = { a: "16x9", b: "1x1", c: "9x16" }[cut];
if (!RATIO) throw new Error("usage: render.ts <a|b|c> [--reuse] [--draft <dir>]");
const reuse = process.argv.includes("--reuse");
const draftArg = process.argv.indexOf("--draft");
const draft = draftArg > 0 ? (process.argv[draftArg + 1] as string).replace(/^~(?=\/)/, homedir()) : null;
const VM = process.env.VIDEO_VM ?? join(homedir(), ".config/opencode/skills/exe-video/scripts/video-vm.ts");
const NAME = "video-doom-video";

function step(cmd: string[]): void {
  console.error(`\n$ ${cmd.join(" ")}`);
  const p = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")} exited with ${p.exitCode}`);
}

if (!reuse) step(["bun", "capture.ts", cut]);
step(["bun", "prepare.ts", cut]);
const files = [`doom-${cut}-${RATIO}.mp4`, `doom-${cut}-${RATIO}-poster.jpg`];
try {
  step(["bun", VM, "run", ".", "--name", NAME, "--include", `out/job/${cut}`, "--", "bun", "produce.ts", cut]);
  mkdirSync(join(ROOT, "out/final"), { recursive: true });
  for (const f of files) step(["bun", VM, "pull", ".", `out/final/${f}`, `out/final/${f}`, "--name", NAME]);
  step(["bun", VM, "pull", ".", `out/review/${cut}/`, `out/review/${cut}/`, "--name", NAME]);
} finally {
  step(["bun", VM, "stop", "--name", NAME]);
}
if (draft) {
  mkdirSync(draft, { recursive: true });
  for (const f of files) if (existsSync(join(ROOT, "out/final", f))) copyFileSync(join(ROOT, "out/final", f), join(draft, f));
  console.error(`copied ${files.join(", ")} to ${draft}`);
}
console.log(files.map((f) => join(ROOT, "out/final", f)).join("\n"));
