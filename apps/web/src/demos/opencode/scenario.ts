import type { DemoOptions } from "../../../../opencode-console/lib/demo";
import type { AssistantPart, JsonRecord, SessionInfo, SessionMessage } from "../../../../opencode-console/lib/types";
import { initialSessions, nextId, partsFromSteps, scriptFor, type Part } from "./model";

function content(p: Part): AssistantPart {
  if (p.type !== "tool") return { type: p.type, text: p.text };
  const input: JsonRecord = p.diff ? { path: p.diff.filename, oldString: p.diff.before, newString: p.diff.after } :
    p.tool === "shell" ? { command: p.title } : p.tool === "glob" || p.tool === "grep"
      ? { pattern: p.title.split('"')[1], path: p.title.split('" in ')[1] } : { path: p.title };
  return { type: "tool", id: nextId("call"), name: p.tool, state: { status: "completed", input, content: [{ type: "text", text: p.code ?? p.output ?? "" }] } };
}

/** Preserve the site's Text.js examples without maintaining a second renderer or SSE reducer. */
export const scenario: NonNullable<DemoOptions["scenario"]> = {
  directory: "~/code/textjs",
  paths:["app/page.tsx","app/settings/page.tsx","src/events.ts","src/events.test.ts","packages/core/src/scene.ts","packages/react/src/components/Textarea.tsx","apps/web/src/pages/OpenCode.tsx"],
  script: (text, agent) => partsFromSteps(scriptFor(text, agent === "plan" ? "plan" : "build")).map(content),
  seed(now) {
    const sessions: SessionInfo[] = [];
    const messages = new Map<string, SessionMessage[]>();
    for (const [i, s] of initialSessions().entries()) {
      const created = now - ([120, 3600, 86400, 172800][i] ?? i) * 1000;
      const reply = s.messages[1];
      const [providerID, id] = (reply?.model ?? "anthropic/claude-opus-5-5").split("/");
      const model = { id: id!, providerID: providerID! };
      const agent = reply?.agent ?? "build";
      const time = { created, updated: created + (reply?.durationMs ?? 0) };
      sessions.push({ id: s.id, title: s.title, model, agent, time, directory: scenario.directory });
      messages.set(s.id, s.messages.map((m) => m.role === "user"
        ? { id: m.id, type: "user", text: m.parts.flatMap((p) => p.type === "text" ? [p.text] : []).join("\n"), time: { created } }
        : { id: m.id, type: "assistant", agent, model, time: { created, completed: time.updated }, content: m.parts.map(content) }));
    }
    return { sessions, messages };
  },
};
