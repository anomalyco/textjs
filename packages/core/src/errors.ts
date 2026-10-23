/**
 * Stable error codes. Every user-facing error and dev warning in Text.js carries
 * a `TX###` code that links to `https://textjs.org/errors/TX###`.
 *
 * Codes are append-only: never renumber, never reuse a retired code. Long-form
 * documentation lives in `error-docs.ts`; this module stays small because it
 * ships in every runtime bundle.
 */

export const ERRORS_URL = "https://textjs.org/errors";

/** Message templates. `%s` placeholders are filled positionally. */
export const TX_MESSAGES = {
  TX001: "Yoga is not initialized. Call `await initYoga()` (or `await createConsoleRoot()`) before rendering.",
  TX002: "Hooks and components must be rendered inside a console root (createConsoleRoot / renderToConsole).",
  TX003: "Unknown host element <%s>. Use the exported components (<Box>, <Text>, …).",
  TX004: "<Box> cannot be nested inside <Text>.",
  TX005: "Cannot render into an unmounted console root.",
  TX006: 'Unknown modifier "%s" in key combo "%s".',
  TX007: 'Unknown key "%s" in key combo "%s".',
  TX008: 'Empty key combo "%s".',
  TX009: '"%s" is not a single key stroke.',
  TX010: "renderToTerminal() found no stdout to write to.",
  TX011: "<Image src> needs a DOM; pass `pixels` instead.",
  TX012: "<Image> could not get a 2D canvas context to decode the image.",
  TX013: '<Image> failed to load "%s".',
  TX014: "%s must be used inside <AppRouter>. Run your app with `text dev`, or wrap it in <AppRouter routes={…}>.",
  TX015: 'The default export is not a React Component in "%s".',
  TX016: "No response is returned from route handler for %s %s. Ensure you return a `Response`.",
  TX017: "Could not find a production build in the '%s' directory. Try building your app with 'text build' before starting the production server.",
  TX018: "No app/ directory found in %s.",
  TX019: "`text run` requires Bun (route files are imported as TypeScript).",
  TX020: "Unknown command %s.",
  TX021: "Use an HTTP(S) server origin without credentials for --target or OPENCODE_SERVER_URL.",
  TX022: "The OpenCode server already uses port %s. Pick another with --port.",
  TX023: "Bridge already running at %s — connect to %s (or pass --port %s).",
  TX024: "Port %s is already in use — run bunx @textjs/next proxy --port %s and connect to %s.",
  TX025: "Unknown template %s. Available: %s.",
  TX026: "The directory %s contains files that could conflict. Either try using a new directory name, or remove the files.",
  TX027: "Could not create a project called %s: %s",
  TX028: "Blocked request. This host (%s) is not allowed. Add it to `vite.server.allowedHosts` in text.config.ts.",
  TX029: "Unknown option %s in %s. It will be ignored.",
} as const;

export type TxCode = keyof typeof TX_MESSAGES;

/** An `Error` with a stable Text.js error code. */
export interface TextJsError extends Error {
  code: TxCode;
}

export function errorUrl(code: TxCode): string {
  return `${ERRORS_URL}/${code}`;
}

/** Fill `%s` placeholders positionally. Missing arguments render as `…`. */
export function formatTemplate(template: string, args: readonly unknown[]): string {
  let i = 0;
  return template.replace(/%s/g, () => (i < args.length ? String(args[i++]) : "…"));
}

/** `Text.js error TX004: <Box> cannot be nested inside <Text>. https://textjs.org/errors/TX004` */
export function txMessage(code: TxCode, ...args: unknown[]): string {
  return `Text.js error ${code}: ${formatTemplate(TX_MESSAGES[code], args)} ${errorUrl(code)}`;
}

export function txError(code: TxCode, ...args: unknown[]): TextJsError {
  const error = new Error(txMessage(code, ...args)) as TextJsError;
  error.code = code;
  return error;
}

const warned = new Set<string>();

/** `console.warn` a coded dev warning once per distinct message. */
export function txWarn(code: TxCode, ...args: unknown[]): void {
  const message = txMessage(code, ...args).replace(/^Text\.js error/, "Text.js warning");
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

/** Forget which warnings were shown (tests). */
export function resetTxWarnings(): void {
  warned.clear();
}

export function isTextJsError(error: unknown): error is TextJsError {
  const code = error instanceof Error ? (error as { code?: unknown }).code : undefined;
  return typeof code === "string" && code in TX_MESSAGES;
}
