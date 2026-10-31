import type { JsonRecord, ToolPart } from "./types";

export const record = (v: unknown): JsonRecord => typeof v === "object" && v !== null && !Array.isArray(v) ? v as JsonRecord : {};
export const string = (v: unknown): string | undefined => typeof v === "string" ? v : undefined;
export const finite = (v: unknown): number | undefined => typeof v === "number" && Number.isFinite(v) ? v : undefined;
export const metadata = (part: ToolPart): JsonRecord => part.state.status === "streaming" ? {} : part.state.metadata ?? {};

/** V2 edit/write/patch report the actual applied changes in metadata.files.
 * Prefer that projection over inventing a diff from model-supplied input. */
export function patchFiles(part: ToolPart) {
  const files = metadata(part).files;
  if (!Array.isArray(files)) return [];
  return files.flatMap((x) => {
    const f = record(x);
    const path = string(f.file) ?? string(f.relativePath);
    const additions = finite(f.additions), deletions = finite(f.deletions);
    if (!path || typeof f.patch !== "string" || additions === undefined || deletions === undefined) return [];
    return [{ path, patch: f.patch, additions, deletions, kind: string(f.type) ?? string(f.status) }];
  });
}

export function todoLines(input: JsonRecord): string[] {
  if (!Array.isArray(input.todos)) return [];
  return input.todos.flatMap((item) => {
    const todo = record(item);
    if (!string(todo.content)) return [];
    const marker = todo.status === "completed" ? "[✓]" : todo.status === "in_progress" ? "[•]" : todo.status === "cancelled" ? "[-]" : "[ ]";
    return [`${marker} ${todo.content}`];
  });
}

export function questionLines(input: JsonRecord, meta: JsonRecord): string[] {
  if (!Array.isArray(input.questions) || !Array.isArray(meta.answers)) return [];
  const answers = meta.answers;
  return input.questions.flatMap((q, i) => {
    const title = string(record(q).question);
    const a: unknown = answers[i];
    return title ? [title, (Array.isArray(a) && a.filter((v) => typeof v === "string").join(", ")) || "(no answer)"] : [];
  });
}
