/**
 * Captures screens of the real `ssh terminal.shop` for the side-by-side shots in this folder.
 * Browsing only: it sends the navigation keys you list and nothing else.
 *
 *   XTERM=/path/to/node_modules/@xterm/headless/lib-headless/xterm-headless.mjs \
 *   SSH_KEY=/tmp/throwaway bun parity/capture-ssh.ts --size 80x30 --keys 'down,down' --out parity/ssh/shop-80x30.json
 *
 * Use a throwaway key (`ssh-keygen -t ed25519 -f /tmp/throwaway`), never your own: the shop
 * creates an account for every new key. `enter` is refused, so nothing can be bought, and
 * the session is closed with ctrl+c once the screen is captured.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { toText, type Grid } from "./grid";

const args = process.argv.slice(2);
const option = (name: string, fallback = ""): string => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? (args[i + 1] as string) : fallback;
};

const KEYS: Record<string, string> = {
  up: "\x1b[A",
  down: "\x1b[B",
  right: "\x1b[C",
  left: "\x1b[D",
  tab: "\t",
  esc: "\x1b",
  pgdown: "\x1b[6~",
  pgup: "\x1b[5~",
};
const ALLOWED_LETTERS = new Set(["s", "a", "c", "m", "j", "k", "h", "l", "r"]);

/** xterm's 256-color palette as hex. */
function paletteHex(n: number): string {
  const base = ["000000", "cd0000", "00cd00", "cdcd00", "0000ee", "cd00cd", "00cdcd", "e5e5e5", "7f7f7f", "ff0000", "00ff00", "ffff00", "5c5cff", "ff00ff", "00ffff", "ffffff"];
  if (n < 16) return `#${base[n]}`;
  if (n < 232) {
    const i = n - 16;
    const v = [0, 95, 135, 175, 215, 255];
    const hx = (x: number): string => (v[x] as number).toString(16).padStart(2, "0");
    return `#${hx(Math.floor(i / 36))}${hx(Math.floor(i / 6) % 6)}${hx(i % 6)}`;
  }
  const g = (8 + (n - 232) * 10).toString(16).padStart(2, "0");
  return `#${g}${g}${g}`;
}

async function main(): Promise<void> {
  const [cols, rows] = option("size", "80x30").split("x").map(Number) as [number, number];
  const keys = option("keys")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  for (const k of keys) if (!KEYS[k] && !ALLOWED_LETTERS.has(k)) throw new Error(`refusing key "${k}": browsing keys only`);
  const out = option("out");
  const key = process.env.SSH_KEY;
  const host = option("host", "terminal.shop");
  if (!key) throw new Error("set SSH_KEY to a throwaway key");
  if (!process.env.XTERM) throw new Error("set XTERM to @xterm/headless's xterm-headless.mjs");
  const { Terminal } = (await import(process.env.XTERM)) as { Terminal: new (o: object) => any };
  const term = new Terminal({ cols, rows, allowProposedApi: true });

  const proc = Bun.spawn(
    ["ssh", "-tt", "-F", "/dev/null", "-o", "IdentitiesOnly=yes", "-o", "IdentityAgent=none", "-o", "BatchMode=yes", "-o", "SendEnv=COLORTERM", "-o", "StrictHostKeyChecking=accept-new", "-o", `UserKnownHostsFile=${key}.known_hosts`, "-i", key, host],
    { env: { ...process.env, TERM: "xterm-256color", COLORTERM: "truecolor" }, terminal: { cols, rows, data: (_t: unknown, d: Uint8Array) => term.write(d) } } as never,
  ) as unknown as { terminal: { write(s: string): void }; kill(): void; exited: Promise<number> };
  // The shop asks the terminal for its colors and cursor position (OSC 10/11, DSR) before drawing.
  term.onData((d: string) => proc.terminal.write(d));

  await Bun.sleep(Number(option("wait", "6000")));
  for (const k of keys) {
    proc.terminal.write(KEYS[k] ?? k);
    await Bun.sleep(Number(option("gap", "500")));
  }
  await Bun.sleep(800);

  const buf = term.buffer.active;
  const grid: Grid = { cols, rows, cells: [] };
  for (let y = 0; y < rows; y++) {
    const line = buf.getLine(buf.viewportY + y);
    const row: Grid["cells"][number] = [];
    for (let x = 0; x < cols; x++) {
      const c = line?.getCell(x);
      if (!c) {
        row.push([" ", null, null, false]);
        continue;
      }
      if (c.getWidth() === 0) continue;
      const color = (rgb: boolean, pal: boolean, v: number): string | null => (rgb ? `#${v.toString(16).padStart(6, "0")}` : pal ? paletteHex(v) : null);
      const fg = color(c.isFgRGB(), c.isFgPalette(), c.getFgColor());
      const bg = color(c.isBgRGB(), c.isBgPalette(), c.getBgColor());
      row.push([c.getChars() || " ", fg, bg, !!c.isBold()]);
    }
    grid.cells.push(row);
  }
  proc.terminal.write("\x03");
  await Bun.sleep(300);
  proc.kill();

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(grid));
  }
  console.log(toText(grid));
  process.exit(0);
}

await main();
