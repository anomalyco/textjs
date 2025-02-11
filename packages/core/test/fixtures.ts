import { createNode, createRawText, type ConsoleTarget, type SceneNode, type SceneNodeProps } from "../src/index";

export class FakeConsole implements ConsoleTarget {
  clears = 0;
  logs: unknown[][] = [];
  clear(): void {
    this.clears++;
  }
  log(...args: unknown[]): void {
    this.logs.push(args);
  }
  get last(): { format: string; args: string[] } {
    const l = this.logs[this.logs.length - 1] ?? [];
    return { format: String(l[0] ?? ""), args: l.slice(1) as string[] };
  }
}

export function box(props: SceneNodeProps = {}, ...children: SceneNode[]): SceneNode {
  const n = createNode("box", props);
  for (const c of children) n.appendChild(c);
  return n;
}

export function text(props: SceneNodeProps, ...content: Array<string | SceneNode>): SceneNode {
  const n = createNode("text", props);
  for (const c of content) n.appendChild(typeof c === "string" ? createRawText(c) : c);
  return n;
}

export interface DashboardScene {
  root: SceneNode;
  input: SceneNode;
  status: SceneNode;
}

/** A dense 100×32 TUI resembling a coding-agent console. */
export function buildDashboard(): DashboardScene {
  const sidebarItems: SceneNode[] = [];
  for (let i = 0; i < 24; i++) {
    sidebarItems.push(
      text(
        { wrap: "truncate-end", fg: i === 3 ? "#fafafa" : "#a1a1aa", bg: i === 3 ? "#27272a" : undefined, bold: i === 3 },
        `${i === 3 ? "▶" : " "} session-${i.toString().padStart(2, "0")} · refactor the renderer pipeline`,
      ),
    );
  }
  const messages: SceneNode[] = [];
  for (let i = 0; i < 18; i++) {
    messages.push(
      text(
        { fg: "#d4d4d8" },
        text({ fg: i % 2 ? "#22c55e" : "#3b82f6", bold: true }, i % 2 ? "assistant " : "user "),
        `Message ${i}: Updated packages/core/src/scene.ts — 100% of frames now render in one console.log call `,
        text({ fg: "#f59e0b", italic: true }, "(+42 −7)"),
        " 你好 🚀",
      ),
    );
  }
  const input = createRawText("> type here");
  const status = createRawText("▼ Text.js 1.0.0 (Turbolog)  ·  ready");
  const root = box(
    { flexDirection: "column", width: "100%", height: "100%", bg: "#09090b" },
    box(
      { height: 1, flexDirection: "row", justifyContent: "space-between", bg: "#18181b", paddingX: 1 },
      text({ bold: true, fg: "#fafafa" }, "▼ OpenCode Lite"),
      text({ fg: "#71717a" }, "anthropic/claude · 42.1k tokens · $0.12"),
    ),
    box(
      { flexGrow: 1, flexBasis: 0, flexDirection: "row" },
      box(
        { width: 30, flexDirection: "column", border: "rounded", borderColor: "#3f3f46", title: "Sessions", titleColor: "#a1a1aa", overflow: "hidden" },
        ...sidebarItems,
      ),
      box(
        { flexGrow: 1, flexDirection: "column", border: "single", borderColor: "#3f3f46", title: "Conversation", overflow: "scroll", scrollY: 4, paddingX: 1 },
        ...messages,
      ),
    ),
    box({ height: 3, border: "rounded", borderColor: "#22c55e", paddingX: 1 }, text({ fg: "#fafafa" }, input)),
    box({ height: 1, bg: "#27272a", paddingX: 1 }, text({ fg: "#a1a1aa" }, status)),
  );
  return { root, input, status };
}
