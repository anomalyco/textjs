/**
 * Chart glyphs for `glyph-shot.ts`: eighth blocks, quadrants, braille, ▶ and ✓
 * in a bordered frame, logged in a chosen console font stack with and without
 * stand-ins, plus a canvas table of which glyphs each font draws off the cell.
 */
import { CellBuffer, CssConsoleDriver, createNode, createRawText, initYoga, paintScene, type SceneNode, type SceneNodeProps } from "../../packages/core/src/index";

declare global {
  interface Window {
    __glyphReady?: boolean;
    __glyphEmit?: (fontFamily: string, standIns: boolean) => void;
    __glyphWidths?: (families: string[]) => Record<string, { cell: number; misfits: string[] }>;
  }
}

export const GLYPHS = "▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐▀▔▕▖▗▘▙▚▛▜▝▞▟░▒▓⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣿⣀▶▸◀◂▾▴▼▲►◄✓✔✗✘✕✖◆◇●○◦▪▬→←↑↓";

function box(props: SceneNodeProps, ...children: SceneNode[]): SceneNode {
  const n = createNode("box", props);
  for (const c of children) n.appendChild(c);
  return n;
}

function text(props: SceneNodeProps, ...content: string[]): SceneNode {
  const n = createNode("text", props);
  for (const c of content) n.appendChild(createRawText(c));
  return n;
}

const COLS = 48;
const ROWS = 10;

function scene(title: string): SceneNode {
  const row = (name: string, content: string, fg = "#fafafa") =>
    box({ flexDirection: "row", height: 1, flexShrink: 0 }, text({ fg: "#71717a", width: 9, flexShrink: 0 }, name), text({ fg, flexGrow: 1 }, content));
  return box(
    { flexDirection: "column", width: COLS, height: ROWS, border: true, borderStyle: "rounded", borderColor: "#3f3f46", title: ` ${title} `, titleColor: "#fafafa", bg: "#09090b" },
    row("ascii", "0123456789".repeat(4).slice(0, COLS - 11), "#52525b"),
    row("spark", "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇", "#22c55e"),
    row("bar", "██████████████████▋               ", "#3b82f6"),
    row("eighths", "▉▊▋▌▍▎▏ ▔▕▐▀", "#a855f7"),
    row("quads", "▖▗▘▙▚▛▜▝▞▟ ▖▗▘▙▚▛▜▝▞▟", "#eab308"),
    row("braille", "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ ⣿⣀⡇⢸⣿⣀⡇⢸", "#f97316"),
    row("marks", "▶ run ✓ ok ✗ no ▸ ◀ ✔ ✘ ◆", "#fafafa"),
    row("ascii", "abcdefghijklmnopqrstuvwxyz0123456789!", "#52525b"),
  );
}

// Bun.build doesn't emit `new URL(…, import.meta.url)` assets, so the harness serves yoga.wasm itself.
await initYoga({ wasm: "/yoga.wasm" });

function frameFor(title: string): CellBuffer {
  const root = scene(title);
  root.calculateLayout(COLS, ROWS, true);
  const buf = new CellBuffer(COLS, ROWS);
  paintScene(root, buf);
  return buf;
}

window.__glyphEmit = (fontFamily, standIns) => {
  console.clear();
  // `measureText: false` turns stand-ins off: the glyphs as Text.js drew them before.
  const driver = new CssConsoleDriver({ console, clear: "never", typography: { fontFamily }, ...(standIns ? {} : { measureText: false }) });
  driver.render(frameFor(`${fontFamily.split(",")[0]} · ${standIns ? "stand-ins" : "raw"}`), { force: true });
};

window.__glyphWidths = (families) => {
  const c = document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D;
  const out: Record<string, { cell: number; misfits: string[] }> = {};
  for (const family of families) {
    c.font = `12px ${family}`;
    const cell = c.measureText("M".repeat(32)).width / 32;
    const misfits = [...GLYPHS].map((g) => [g, c.measureText(g).width / cell] as const).filter(([, r]) => Math.abs(r - 1) > 0.01).map(([g, r]) => `${g}${r.toFixed(2)}`);
    out[family] = { cell: +cell.toFixed(4), misfits };
  }
  return out;
};

window.__glyphReady = true;
document.getElementById("status")!.textContent = "ready";
