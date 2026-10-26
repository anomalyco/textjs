/**
 * Key input for the `press` tool: `"ctrl+k"`, `"down down enter"`,
 * `["tab", "shift+tab"]`, `"down*3"` (repeat). Every combo is validated before
 * any key is sent, so a typo never leaves the app half-driven.
 */

import type { KeyInputEvent } from "@textjs/core";
import { keyEventFromCombo, parseKeys } from "@textjs/react";

/** Upper bound on keys per `press` call (guards against `down*100000`). */
export const MAX_KEYS_PER_CALL = 500;

export class KeySpecError extends Error {
  readonly code: string | undefined;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "KeySpecError";
    this.code = code;
  }
}

function splitSteps(spec: string): string[] {
  const trimmed = spec.trim();
  // A bare " " means the space bar, matching `@textjs/react/testing`.
  if (trimmed === "") return spec.length > 0 ? ["space"] : [];
  return trimmed.split(/\s+/);
}

/** Expand `keys` into validated key events, in order. */
export function parseKeyInput(keys: string | readonly string[]): KeyInputEvent[] {
  const steps = (typeof keys === "string" ? [keys] : keys).flatMap(splitSteps);
  const out: KeyInputEvent[] = [];
  for (const step of steps) {
    const rep = /^(.+?)\*(\d+)$/.exec(step);
    const combo = rep ? (rep[1] as string) : step;
    const count = rep ? Number(rep[2]) : 1;
    if (count < 1) throw new KeySpecError(`Repeat count must be at least 1 in "${step}".`);
    let event: KeyInputEvent;
    try {
      // `"a,b"` would parse as alternatives; a press is always one concrete stroke.
      if (combo !== "," && parseKeys(combo).length !== 1) throw new Error(`"${combo}" is not a single key stroke.`);
      event = keyEventFromCombo(combo);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as { code?: unknown }).code;
      throw new KeySpecError(message, typeof code === "string" ? code : undefined);
    }
    if (out.length + count > MAX_KEYS_PER_CALL) throw new KeySpecError(`Too many keys in one call (max ${MAX_KEYS_PER_CALL}).`);
    for (let i = 0; i < count; i++) out.push({ ...event });
  }
  if (out.length === 0) throw new KeySpecError("No keys given. Pass combos like \"down\", \"ctrl+k\" or \"tab tab enter\".");
  return out;
}

/** Key events that type `text` character by character (`\n` presses return, `\t` tab). */
export function textToKeyEvents(text: string): KeyInputEvent[] {
  const out: KeyInputEvent[] = [];
  for (const ch of text.replace(/\r\n?/g, "\n")) {
    if (ch === "\n") {
      out.push(keyEventFromCombo("return"));
      continue;
    }
    if (ch === "\t") {
      out.push(keyEventFromCombo("tab"));
      continue;
    }
    const upper = ch.length === 1 && ch >= "A" && ch <= "Z";
    out.push({
      type: "key",
      key: ch === " " ? "space" : ch.toLowerCase(),
      input: ch,
      code: "",
      repeat: false,
      ctrl: false,
      meta: false,
      shift: upper,
      alt: false,
    });
  }
  return out;
}
