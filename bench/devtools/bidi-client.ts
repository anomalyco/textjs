/**
 * Bidi showcase frame for `bidi-shot.ts`: Hebrew, Arabic and mixed lines inside
 * a bordered box, logged once unpinned (cells as-is, so DevTools re-applies
 * bidi) and once as the shipping driver emits it (RTL spans pinned with LRO…PDF).
 */
import { CellBuffer, CssConsoleDriver, createNode, createRawText, hasRtl, initYoga, paintScene, type SceneNode, type SceneNodeProps } from "../../packages/core/src/index";

declare global {
  interface Window {
    __bidiReady?: boolean;
    __bidiEmit?: (mode: "pinned" | "unpinned" | "both" | "latin" | "nofit") => void;
  }
}

function box(props: SceneNodeProps, ...children: SceneNode[]): SceneNode {
  const n = createNode("box", props);
  for (const c of children) n.appendChild(c);
  return n;
}

function text(props: SceneNodeProps, ...content: Array<string | SceneNode>): SceneNode {
  const n = createNode("text", props);
  for (const c of content) n.appendChild(typeof c === "string" ? createRawText(c) : c);
  return n;
}

const COLS = 64;
const ROWS = 21;

function scene(title: string): SceneNode {
  const label = (s: string) => text({ fg: "#71717a", width: 9, flexShrink: 0 }, s);
  const row = (name: string, content: SceneNode) => box({ flexDirection: "row", height: 1, flexShrink: 0 }, label(name), content);
  const cells = ["م", "ر", "ح", "ب", "ا", " ", "ب", "ا", "ل", "ع", "ا", "ل", "م"].map((c, i) =>
    text({ fg: "#fafafa", bg: i % 2 === 0 ? "#1e3a8a" : "#7c2d12" }, c),
  );
  return box(
    { flexDirection: "column", width: COLS, height: ROWS, border: true, borderStyle: "rounded", borderColor: "#3f3f46", title: ` ▼ ${title} `, titleColor: "#fafafa", bg: "#09090b" },
    row("ruler", text({ fg: "#52525b" }, "0123456789".repeat(6).slice(0, COLS - 11))),
    row("hebrew", text({ flexGrow: 1, fg: "#fafafa", bg: "#18181b" }, "שלום עולם! זהו טקסט בעברית.")),
    row("arabic", text({ flexGrow: 1, fg: "#fafafa", bg: "#18181b" }, "مرحبا بالعالم! هذا نص عربي.")),
    row("mixed", text({ flexGrow: 1, fg: "#a1a1aa" }, "Order #1234 (", text({ fg: "#facc15" }, "שלום"), ") total: 25.50 ₪")),
    row("mixed", text({ flexGrow: 1, fg: "#a1a1aa" }, "המחיר: 25.50 ₪ (כולל מע״מ) – version 2.0")),
    row("numbers", text({ flexGrow: 1, fg: "#a1a1aa" }, "العدد ١٢٣٤ والسعر 99.5$ [نهائي]")),
    row("isolate", text({ flexGrow: 1, fg: "#a1a1aa" }, "user ", text({ dir: "auto", fg: "#22c55e" }, "שלום!"), " replied 3 times")),
    row("cells", text({ flexGrow: 1, textAlign: "left" }, ...cells)),
    row("dir=rtl", text({ flexGrow: 1, dir: "rtl", fg: "#a1a1aa" }, "hello, world!")),
    row("ltr", text({ flexGrow: 1, fg: "#a1a1aa" }, "Plain LTR text: (a) [b] {c} 100% ─│▼")),
    row("emoji", text({ flexGrow: 1, fg: "#fafafa", bg: "#18181b" }, "שלום 👨‍👩‍👧‍👦 עולם ❤️ 1️⃣ סוף")),
    box(
      { flexDirection: "row", height: 7, marginTop: 1, flexShrink: 0 },
      label("wrap"),
      box(
        { width: 26, border: true, borderStyle: "single", borderColor: "#3f3f46", paddingX: 1, title: "עברית (1)", titleColor: "#fafafa" },
        text({ fg: "#fafafa" }, "זהו משפט ארוך בעברית שעובר גלישה לשורות, עם מספר 42 ו-(סוגריים)."),
      ),
      box(
        { width: 26, border: true, borderStyle: "single", borderColor: "#3f3f46", paddingX: 1, marginLeft: 1, title: "العربية", titleColor: "#fafafa" },
        text({ fg: "#fafafa" }, "هذه جملة طويلة باللغة العربية تلتف على عدة أسطر مع رقم ٤٢."),
      ),
    ),
  );
}

await initYoga();

function frameFor(title: string): CellBuffer {
  const root = scene(title);
  root.calculateLayout(COLS, ROWS, true);
  const buf = new CellBuffer(COLS, ROWS);
  paintScene(root, buf);
  return buf;
}

window.__bidiEmit = (mode) => {
  console.clear();
  if (mode === "unpinned" || mode === "both") {
    // Strip the LRO…PDF pins to show what DevTools does to visual-order cells on its own.
    const unpinned = { clear() {}, log: (f: string, ...a: string[]) => console.log(f.replace(/[\u202d\u202c]/g, ""), ...a) };
    new CssConsoleDriver({ console: unpinned as never, clear: "never" }).render(frameFor("unpinned: DevTools re-applies bidi"), { force: true });
  }
  if (mode === "latin") {
    // Control: the same cells with every RTL glyph replaced by "x" (identical span geometry, no bidi).
    const buf = frameFor("control: RTL glyphs replaced by x");
    for (let i = 0; i < buf.chars.length; i++) {
      const ch = buf.cellText(i);
      if (hasRtl(ch)) buf.chars[i] = 0x78;
    }
    new CssConsoleDriver({ console: console, clear: "never" }).render(buf, { force: true });
  }
  if (mode === "nofit") {
    new CssConsoleDriver({ console: console, clear: "never", measureText: false }).render(frameFor("pinned, no width fitting"), { force: true });
  }
  if (mode === "pinned" || mode === "both") {
    new CssConsoleDriver({ console: console, clear: "never" }).render(frameFor("Text.js bidi (shipping driver)"), { force: true });
  }
};
window.__bidiReady = true;
document.getElementById("status")!.textContent = "ready";
