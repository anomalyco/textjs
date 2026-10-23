/**
 * create-text-app ships with zero dependencies, so it carries its own copies of
 * its `TX###` messages. They mirror `@textjs/core`'s registry (a test keeps them
 * in sync) and link to https://textjs.org/errors.
 */

const MESSAGES = {
  TX025: "Unknown template %s. Available: %s.",
  TX026: "The directory %s contains files that could conflict. Either try using a new directory name, or remove the files.",
  TX027: "Could not create a project called %s: %s",
} as const;

export type CreateTextAppCode = keyof typeof MESSAGES;

export const CREATE_TEXT_APP_MESSAGES: Readonly<Record<CreateTextAppCode, string>> = MESSAGES;

export function txMessage(code: CreateTextAppCode, ...args: unknown[]): string {
  let i = 0;
  const body = MESSAGES[code].replace(/%s/g, () => (i < args.length ? String(args[i++]) : "…"));
  return `Text.js error ${code}: ${body} https://textjs.org/errors/${code}`;
}

export function txError(code: CreateTextAppCode, ...args: unknown[]): Error & { code: CreateTextAppCode } {
  return Object.assign(new Error(txMessage(code, ...args)), { code });
}
