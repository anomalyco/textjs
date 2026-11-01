/** Contact sheet of image files: bun scripts/sheet.ts <out.png> <cols> <file…> */
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { close, png } from "./render";

const [out, cols, ...files] = process.argv.slice(2);
if (!out || !cols) throw new Error("usage: sheet.ts <out.png> <cols> <file…>");
const html = `<!doctype html><style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;padding:4px;font:11px monospace;color:#aaa}img{width:100%;display:block}</style>${files.map((f) => `<figure style="margin:0"><img src="data:image/png;base64,${readFileSync(f).toString("base64")}"><figcaption>${basename(f)}</figcaption></figure>`).join("")}`;
writeFileSync(out, await png(html, 1600, 2400, 1));
await close();
