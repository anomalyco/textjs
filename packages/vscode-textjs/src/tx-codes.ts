/** `TX###` error code lookup for hovers and document links. Pure (no `vscode`). */

import { getTxError } from "@textjs/core";

export const TX_PATTERN = /\bTX\d{3}\b/g;
export const ERRORS_BASE_URL = "https://textjs.org/errors";

export interface TxMatch {
  code: string;
  start: number;
  end: number;
}

export function findTxCodes(text: string): TxMatch[] {
  const out: TxMatch[] = [];
  for (const m of text.matchAll(TX_PATTERN)) out.push({ code: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

export function txUrl(code: string): string {
  return `${ERRORS_BASE_URL}/${code}`;
}

export interface TxInfo {
  code: string;
  url: string;
  title: string | null;
  message: string | null;
  package: string | null;
  kind: "error" | "warning" | null;
}

export function txInfo(code: string): TxInfo {
  const doc = getTxError(code);
  return {
    code,
    url: txUrl(code),
    title: doc?.title ?? null,
    message: doc?.message ?? null,
    package: doc?.package ?? null,
    kind: doc?.kind ?? null,
  };
}

/** Hover Markdown for a code. */
export function txHoverMarkdown(code: string): string {
  const info = txInfo(code);
  const lines: string[] = [];
  const head = info.title ? `**▼ ${code}** · ${info.title}` : `**▼ ${code}** · Text.js error`;
  lines.push(head);
  if (info.message) lines.push("", `\`${info.message.replace(/`/g, "'")}\``);
  const meta = [info.package, info.kind].filter(Boolean).join(" · ");
  if (meta) lines.push("", `_${meta}_`);
  lines.push("", `[Read the docs →](${info.url})`);
  return lines.join("\n");
}
