/**
 * Captures every reference screen in `shots.ts` from the real `ssh terminal.shop` into
 * parity/ssh/ (browsing only; see capture-ssh.ts). Connections are spaced out so the shop's
 * rate limiting doesn't kick in.
 *
 *   XTERM=… SSH_KEY=<throwaway key> bun parity/capture-all.ts [shot-id…]
 */

import { SHOTS, shotId } from "./shots";

const only = process.argv.slice(2);
const gap = Number(process.env.GAP ?? 8) * 1000;
for (const s of SHOTS) {
  const id = shotId(s);
  if (only.length && !only.includes(id) && !only.includes(s.name)) continue;
  console.log(`▸ ${id} ${s.ssh.join(",")}`);
  const proc = Bun.spawn(["bun", new URL("./capture-ssh.ts", import.meta.url).pathname, "--size", `${s.cols}x${s.rows}`, "--keys", s.ssh.join(","), "--out", new URL(`./ssh/${id}.json`, import.meta.url).pathname], { stdout: "ignore", stderr: "inherit" });
  if ((await proc.exited) !== 0) console.log("  failed");
  await Bun.sleep(gap);
}
