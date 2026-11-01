/**
 * The course certificate as plain text: printed in the console and shown on
 * the page, character for character.
 */

import { ENGINE_NAME, VERSION } from "@textjs/core";

export const CERT_WIDTH = 60;
export const NAME_PLACEHOLDER = "Your Name";

function center(text: string, width: number): string {
  const chars = [...text];
  if (chars.length >= width) return chars.slice(0, width).join("");
  const left = Math.floor((width - chars.length) / 2);
  return " ".repeat(left) + text + " ".repeat(width - chars.length - left);
}

function pad(text: string, width: number): string {
  const n = [...text].length;
  return n >= width ? [...text].slice(0, width).join("") : text + " ".repeat(width - n);
}

export function formatCertificateDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function certificateLines(name: string, date: string): string[] {
  const inner = CERT_WIDTH - 2;
  const row = (s = ""): string => `│${s.length === inner ? s : center(s, inner)}│`;
  const who = name.trim() || NAME_PLACEHOLDER;
  const sig = (left: string, right: string): string => `│      ${pad(left, 22)}      ${pad(right, 22)}  │`;
  return [
    `╭${"─".repeat(inner)}╮`,
    row(),
    row("▼"),
    row(),
    row("C E R T I F I C A T E   O F   C O M P L E T I O N"),
    row(),
    row("This certifies that"),
    row(),
    row(who),
    row("─".repeat(Math.min(inner - 12, Math.max(16, [...who].length + 8)))),
    row(),
    row("has completed Learn Text.js, building Acme Deploys"),
    row("in ten chapters, inside console.log."),
    row(),
    row(),
    sig(date, "▼ Text.js"),
    sig("─".repeat(22), "─".repeat(22)),
    sig("Date", `${ENGINE_NAME} ${VERSION}`),
    row(),
    `╰${"─".repeat(inner)}╯`,
  ];
}

/** LinkedIn's Add to Profile certification form, prefilled (addtoprofile.linkedin.com). */
export function linkedInAddUrl(completedAt: string | null): string | null {
  const d = completedAt ? new Date(completedAt) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: "Learn Text.js",
    organizationName: "Text.js",
    issueYear: String(d.getUTCFullYear()),
    issueMonth: String(d.getUTCMonth() + 1),
    certUrl: "https://textjs.org/learn/certificate",
  });
  return `https://www.linkedin.com/profile/add?${q.toString().replace(/\+/g, "%20")}`;
}
