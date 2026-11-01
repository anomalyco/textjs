/** Renders every artwork file onto one contact sheet (mockups/proof.png) for checking glyphs and layout. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { close, png } from "./render";

const dir = join(import.meta.dir, "..", "artwork");
const files = readdirSync(dir).filter((f) => f.endsWith(".svg")).sort();
const tiles = files
  .map((f) => {
    const svg = readFileSync(join(dir, f), "utf8").replace(/<\?xml[^>]*>/, "");
    const light = f === "mark.svg" || f === "notebook-cover.svg" || f.startsWith("cap") || f.startsWith("hoodie");
    return `<figure style="background:${light ? "#d4d4d4" : "#0a0a0a"}"><div>${svg.replace(/width="[^"]*mm" height="[^"]*mm"/, 'style="max-width:100%;max-height:340px;width:auto;height:auto"')}</div><figcaption>${f}</figcaption></figure>`;
  })
  .join("");
const html = `<!doctype html><style>body{margin:0;background:#222;font:12px ui-monospace;color:#999;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px}figure{margin:0;padding:16px;display:flex;flex-direction:column;gap:8px}figure div{flex:1;display:grid;place-items:center;min-height:360px}figure svg{width:100%}</style>${tiles}`;
writeFileSync(join(import.meta.dir, "..", "mockups", "proof.png"), await png(html, 1500, 1600, 1));
await close();
