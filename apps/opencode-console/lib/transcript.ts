import { v2Message } from "./client";
import type { OpenCodeClient, SessionInfo, SessionMessage } from "./types";
/** Classic native Markdown export, excluding inline media bytes. */
export function markdownTranscript(session: SessionInfo, messages: SessionMessage[], thinking = true, tools = true) {
  const body = messages.flatMap((m) => {
    if (m.type === "user") return [`## User\n\n${m.text}`];
    if (m.type === "shell") return [`## Shell\n\n\`\`\`\n$ ${m.command}\n${m.output ?? ""}\n\`\`\``];
    if (m.type !== "assistant") return [];
    const parts = m.content.flatMap((p) => {
      if (p.type === "text") return [p.text];
      if (p.type === "reasoning") return thinking ? [`_Thinking:_\n\n${p.text}`] : [];
      if (!tools) return [];
      const s = p.state,
        input = typeof s.input === "string" ? s.input : JSON.stringify(s.input, null, 2),
        output =
          s.status === "error"
            ? s.error.message
            : s.status === "completed"
              ? s.content.map((c) => (c.type === "text" ? c.text : (c.name ?? c.mime))).join("\n")
              : "";
      return [`**Tool: ${p.name}**\n\n**Input:**\n\`\`\`json\n${input}\n\`\`\`\n\n${output}`];
    });
    return parts.length ? [`## Assistant\n\n${parts.join("\n\n")}`] : [];
  });
  return `# ${session.title || "New session"}\n\n**Session ID:** ${session.id}\n**Created:** ${new Date(session.time.created).toLocaleString()}\n**Updated:** ${new Date(session.time.updated).toLocaleString()}\n\n---\n\n${body.join("\n\n---\n\n")}\n`;
}
export async function exportMarkdown(api: OpenCodeClient, s: SessionInfo, thinking = true, tools = true) {
  if (api.kind === "v2" && api.exportSession) {
    const r = (await api.exportSession(s.id)) as { messages: unknown[] };
    return markdownTranscript(
      s,
      r.messages.map(v2Message).filter((m): m is SessionMessage => !!m),
      thinking,
      tools,
    );
  }
  return markdownTranscript(s, await api.messages(s.id), thinking, tools);
}
