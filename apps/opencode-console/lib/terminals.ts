export type Term = { id: string; title: string; cwd: string; status: string };
export interface Terminals {
  list: (session: string) => Promise<Term[]>;
  snapshot: (id: string) => Promise<string>;
  create?: (session: string) => Promise<Term>;
  input?: (id: string, line: string) => Promise<string>;
}
/** Deliberately a fixture interpreter. Never pass the input to a host shell or fetch a URL. */
export function scriptedTerminals(cwd: string, paths: readonly string[]): Terminals {
  const panes = new Map<string, { info: Term; session: string; lines: string[] }>();
  let seq = 0;
  return {
    async list(s) {
      return [...panes.values()].filter((p) => p.session === s).map((p) => ({ ...p.info }));
    },
    async create(session) {
      const n = ++seq,
        id = `pty_sandbox_${n}`;
      const info = { id, title: `Terminal ${n}`, cwd, status: "running" };
      panes.set(id, { session, info, lines: ["Scripted sandbox terminal. Type help for commands."] });
      return { ...info };
    },
    async snapshot(id) {
      return panes.get(id)?.lines.join("\n") ?? "";
    },
    async input(id, line) {
      const p = panes.get(id);
      if (!p || p.info.status !== "running") throw Error("Terminal exited");
      p.lines.push("$ " + line);
      switch (line.trim()) {
        case "clear":
          p.lines = [];
          break;
        case "help":
          p.lines.push("pwd  ls  git status  bun test  clear  exit");
          break;
        case "pwd":
          p.lines.push(cwd);
          break;
        case "ls":
          p.lines.push([...new Set(paths.map((p) => p.split("/")[0]))].join("  "));
          break;
        case "git status":
          p.lines.push("On branch main", "nothing to commit, working tree clean");
          break;
        case "bun test":
          p.lines.push("bun test", " 3 pass", " 0 fail");
          break;
        case "exit":
          p.info.status = "exited";
          p.lines.push("Process exited with code 0");
          break;
        default:
          p.lines.push("Command not in this sandbox. Type help for commands.");
      }
      p.lines = p.lines.slice(-500);
      return p.lines.join("\n");
    },
  };
}
