import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readCliKeys } from "../src/cli-keys";
test("bridge projects only key settings from its own CLI file and inline overrides", async () => {
  const dir = await mkdtemp(join(tmpdir(), "textjs-cli-keys-"));
  try {
    await mkdir(join(dir, "opencode"));
    await writeFile(
      join(dir, "opencode/cli.json"),
      JSON.stringify({
        plugins: [{ options: { token: "not-for-browser" } }],
        keybinds: {
          leader: "ctrl+space",
          "model.list": ["<leader>z", "f6"],
          "help.show": { key: "f1" },
          "session.new": "not-for-browser",
        },
        leader: { timeout: 800 },
      }),
    );
    expect(await readCliKeys(dir, JSON.stringify({ keybinds: { "help.show": false } }))).toEqual({
      keybinds: { leader: "ctrl+space", "model.list": "<leader>z,f6", "help.show": false },
      timeout: 800,
    });
  } finally {
    await rm(dir, { recursive: true });
  }
});
