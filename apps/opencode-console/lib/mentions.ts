import type { Attachment, FileOption, PromptOptions } from "./types";

/** Only paths returned by file search become attachments. No local filesystem reads. */
export function fileOption(root: string, path: string, directory: boolean): FileOption | undefined {
  if (!root.startsWith("/") || path.startsWith("/") || path.split("/").includes("..") || !path || path.includes("\0")) return;
  const uri = "file://" + `${root.replace(/\/+$/, "")}/${path}`.split("/").map(encodeURIComponent).join("/");
  return { path, uri, directory };
}

export function trigger(value: string, cursor: number) {
  const before = value.slice(0, cursor);
  if (/^\/[^\s]*$/u.test(before)) return { mode: "slash" as const, start: 0, query: before.slice(1) };
  const match = /(?:^|\s)@([^@\s]*)$/u.exec(before);
  if (match) return { mode: "mention" as const, start: before.lastIndexOf("@"), query: match[1]! };
}

export function lineRange(query: string) {
  const match = /^(.+)#([1-9]\d*)(?:-(\d*))?$/u.exec(query);
  return match
    ? { base: match[1]!, start: match[2], end: Number(match[3]) > Number(match[2]) ? match[3] : undefined }
    : { base: query };
}

/** Edits before a mark shift it. Edits through it detach it, even if another copy of its text exists. */
export function rebaseMarks(marks: readonly Attachment[], before: string, after: string, caret: number) {
  if (before === after || !marks.length) return marks;
  // The caret disambiguates deleting one of two identical adjacent strings.
  let start = 0,
    tail = 0;
  while (tail < before.length - caret && tail < after.length && before.at(-1 - tail) === after.at(-1 - tail)) tail++;
  while (start < before.length - tail && start < after.length - tail && before[start] === after[start]) start++;
  const delta = after.length - before.length;
  return marks.flatMap((a) =>
    a.mention.end <= start
      ? [a]
      : a.mention.start >= before.length - tail
        ? [{ ...a, mention: { ...a.mention, start: a.mention.start + delta, end: a.mention.end + delta } }]
        : [],
  );
}

export function v2Parts(options?: PromptOptions, offset = 0) {
  const marks = options?.attachments ?? [];
  const mention = (a: Attachment) => ({ ...a.mention, start: a.mention.start - offset, end: a.mention.end - offset });
  const files = marks.flatMap((a) => (a.kind === "file" ? [{ uri: a.uri, name: a.name, mention: mention(a) }] : []));
  const agents = marks.flatMap((a) => (a.kind === "agent" ? [{ name: a.name, mention: mention(a) }] : []));
  const skills = marks.flatMap((a) => (a.kind === "skill" ? [{ id: a.name, mention: mention(a) }] : []));
  return {
    ...(files.length && { files }),
    ...(agents.length && { agents }),
    ...(skills.length && { skills }),
    ...(options?.delivery && { delivery: options.delivery }),
  };
}

export function v1Parts(marks: readonly Attachment[] = []) {
  return marks.flatMap((a): Record<string, unknown>[] =>
    a.kind === "agent"
      ? [{ type: "agent", name: a.name, source: { value: a.mention.text, start: a.mention.start, end: a.mention.end } }]
      : a.kind === "file"
        ? [
            {
              type: "file",
              url: a.uri,
              filename: a.name,
              mime: a.mime,
              ...(a.uri.startsWith("file:") && {
                source: {
                  type: "file",
                  path: decodeURIComponent(new URL(a.uri).pathname),
                  text: { value: a.mention.text, start: a.mention.start, end: a.mention.end },
                },
              }),
            },
          ]
        : [],
  );
}
