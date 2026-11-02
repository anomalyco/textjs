/**
 * The Text.js error codes the bridge throws, copied from `@textjs/core` so this
 * package has no dependencies. `test/errors.test.ts` keeps them identical.
 */

export const ERRORS_URL = "https://textjs.org/errors";

export const TX_MESSAGES = {
  TX021: "Use an HTTP(S) server origin without credentials for --target or OPENCODE_SERVER_URL.",
  TX022: "The OpenCode server already uses port %s. Pick another with --port.",
  TX023: "Bridge already running at %s. Connect to %s (or pass --port %s).",
  TX024: "Port %s is already in use. Run bunx @textjs/opencode@latest proxy --port %s and connect to %s.",
} as const;

export type TxCode = keyof typeof TX_MESSAGES;

export interface TextJsError extends Error {
  code: TxCode;
}

function formatTemplate(template: string, args: readonly unknown[]): string {
  let i = 0;
  return template.replace(/%s/g, () => (i < args.length ? String(args[i++]) : "…"));
}

export function txMessage(code: TxCode, ...args: unknown[]): string {
  return `Text.js error ${code}: ${formatTemplate(TX_MESSAGES[code], args)} ${ERRORS_URL}/${code}`;
}

export function txError(code: TxCode, ...args: unknown[]): TextJsError {
  const error = new Error(txMessage(code, ...args)) as TextJsError;
  error.code = code;
  return error;
}
