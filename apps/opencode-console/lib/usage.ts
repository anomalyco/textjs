import type { ModelOption, SessionMessage } from "./types";

/** Context is the last measured step's window, not the sum of all turns. */
export function usage(messages: readonly SessionMessage[], models: readonly ModelOption[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.type !== "assistant" || !m.tokens) continue;
    const { input, output, reasoning, cache } = m.tokens;
    const tokens = input + output + reasoning + (cache?.read ?? 0) + (cache?.write ?? 0);
    if (!tokens) continue;
    const max = models.find((v) => v.id === m.model.id && v.providerID === m.model.providerID)?.context;
    return { tokens, percent: max ? Math.round((tokens / max) * 100) : undefined };
  }
}
export const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
