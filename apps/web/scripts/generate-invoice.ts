/**
 * Generates `public/enterprise/sample-invoice.pdf`: a hand-written PDF 1.4 (US Letter) using only
 * the standard Helvetica and Courier fonts, so it embeds nothing and stays a few KB.
 *
 *   bun scripts/generate-invoice.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "public", "enterprise", "sample-invoice.pdf");

type Font = "F1" | "F2" | "F3";
const ops: string[] = [];
const esc = (s: string): string => s.replace(/[\\()]/g, (c) => `\\${c}`);
const gray = (g: number): void => void ops.push(`${g} g`);

function text(x: number, y: number, s: string, font: Font = "F1", size = 10): void {
  ops.push(`BT /${font} ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`);
}

/** Courier is monospaced (600/1000 em), so right-aligning is exact. */
function mono(right: number, y: number, s: string, size = 10): void {
  text(right - s.length * size * 0.6, y, s, "F3", size);
}

/** Helvetica-Bold advance widths (1/1000 em) for the right-aligned column headings. */
const HB: Record<string, number> = { Q: 778, t: 333, y: 556, U: 722, n: 611, i: 278, " ": 278, p: 611, r: 389, c: 556, e: 556, A: 722, m: 889, o: 611, u: 611 };

function boldRight(right: number, y: number, s: string, size: number): void {
  const w = [...s].reduce((sum, c) => sum + (HB[c] ?? 556), 0) * (size / 1000);
  text(Math.round((right - w) * 100) / 100, y, s, "F2", size);
}

function rule(y: number, weight = 0.5): void {
  ops.push(`${weight} w 72 ${y} m 540 ${y} l S`);
}

const L = 72;
const R = 400;

gray(0);
text(L, 712, "Anomaly", "F2", 20);
text(R, 712, "INVOICE", "F2", 20);
gray(0.4);
text(L, 696, "anoma.ly");
text(R, 696, "SAMPLE", "F2", 10);

text(L, 640, "Bill to", "F1", 9);
text(R, 640, "Date", "F1", 9);
gray(0);
text(R, 626, "October 31, 2026");

ops.push("0.8 G");
rule(580);
gray(0.4);
text(L, 566, "Description", "F2", 9);
boldRight(338, 566, "Qty", 9);
boldRight(444, 566, "Unit price", 9);
boldRight(540, 566, "Amount", 9);
rule(556);
gray(0);
text(L, 538, "Text.js 1.0.0, Open Source plan (MIT)");
mono(338, 538, "1");
mono(444, 538, "$0.00");
mono(540, 538, "$0.00");
rule(524);

for (const [i, [label, bold]] of ([["Subtotal", false], ["Tax", false], ["Total due", true]] as const).entries()) {
  const y = 500 - i * 18;
  text(R - 10, y, label, bold ? "F2" : "F1");
  mono(540, y, "$0.00");
}

text(L, 420, "Due on receipt.");

const content = `${ops.join("\n")}\n`;
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> /Contents 4 0 R >>",
  `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
  "<< /Title (Sample invoice) /Author (Anomaly) /Subject (Text.js Open Source plan) /CreationDate (D:20261031000000Z) >>",
];

let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets: number[] = [];
for (const [i, body] of objects.entries()) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

mkdirSync(join(OUT, ".."), { recursive: true });
writeFileSync(OUT, Buffer.from(pdf, "latin1"));
console.log(`wrote ${OUT} (${Buffer.byteLength(pdf, "latin1")} bytes)`);
