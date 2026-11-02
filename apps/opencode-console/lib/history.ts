import type { Attachment } from "./types";
export type Draft = { text: string; marks: readonly Attachment[] };
export class PromptHistory {
  entries: Draft[] = [];
  append(entry: Draft) {
    const cost = (e: Draft) => e.text.length + e.marks.reduce((n, a) => n + (a.kind === "file" ? a.uri.length : a.name.length), 0);
    if (cost(entry) > 4_000_000) return;
    const last = this.entries.at(-1);
    if (
      last?.text === entry.text &&
      last.marks.length === entry.marks.length &&
      last.marks.every((a, i) => {
        const b = entry.marks[i]!;
        return (
          a.kind === b.kind &&
          a.name === b.name &&
          a.mention.start === b.mention.start &&
          a.mention.end === b.mention.end &&
          (a.kind !== "file" || (b.kind === "file" && a.uri === b.uri))
        );
      })
    )
      return;
    let bytes = 0;
    this.entries = [entry, ...this.entries.slice().reverse()]
      .slice(0, 500)
      .filter((e) => (bytes += cost(e)) <= 4_000_000)
      .reverse();
  }
  // Only the scripted sandbox persists automatically. Live user prompts stay on their own server.
  save(key: string) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(
          this.entries.filter((e) => e.marks.every((a) => a.kind !== "file" || a.uri.startsWith("file:///sandbox/"))).slice(-500),
        ),
      );
    } catch {
      /* storage denied or full */
    }
  }
  load(key: string) {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (!Array.isArray(value)) return;
      for (const e of value.slice(-500))
        if (
          typeof e?.text === "string" &&
          Array.isArray(e.marks) &&
          e.marks.every(
            (a: Attachment) =>
              a?.mention &&
              Number.isInteger(a.mention.start) &&
              Number.isInteger(a.mention.end) &&
              a.mention.start >= 0 &&
              a.mention.end <= e.text.length &&
              typeof a.name === "string" &&
              ["agent", "file", "skill"].includes(a.kind) &&
              (a.kind !== "file" ||
                (typeof a.mime === "string" && typeof a.uri === "string" && a.uri.startsWith("file:///sandbox/"))) &&
              e.text.slice(a.mention.start, a.mention.end) === a.mention.text,
          )
        )
          this.append(e);
    } catch {
      /* malformed store */
    }
  }
}
