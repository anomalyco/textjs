/** Contact sheet of every mockup master (mockups/contact.png), for review. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { close, png } from "./render";

const dir = join(import.meta.dir, "..", "mockups");
const files = readdirSync(dir).filter((f) => /-\d\.png$/.test(f)).sort();
const html = `<!doctype html><style>body{margin:0;background:#000;display:grid;grid-template-columns:repeat(${process.argv[2] ?? 4},1fr);gap:6px;padding:6px}img{width:100%;display:block}</style>${files.map((f) => `<img src="data:image/png;base64,${readFileSync(join(dir, f)).toString("base64")}">`).join("")}`;
writeFileSync(join(dir, "contact.png"), await png(html, 1600, 1500, 1));
await close();
