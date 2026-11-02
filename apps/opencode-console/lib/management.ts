import type { Transport } from "./client";
import type { FormAnswer, FormField } from "./types";
export type Method = {
  type: "key" | "oauth" | "command" | "external" | "env";
  id?: string;
  label?: string;
  form?: FormField[];
  command?: string[];
  names?: string[];
};
export type Integration = {
  id: string;
  name: string;
  metadata?: { source?: string };
  methods: Method[];
  connections: ({ type: "credential"; id: string; label: string } | { type: "env"; name: string })[];
};
export type Attempt = { attemptID: string; mode?: "auto" | "code"; url?: string; instructions?: string };
export type Plugin = {
  id?: string;
  source: { type: string; target?: string; version?: string; outdated?: boolean };
  state: { status: string; error?: string };
};
export type Mcp = { name: string; integrationID?: string; status: { status: string; error?: string } };
export interface Management {
  providers(dir?: string): Promise<Integration[]>;
  connect(id: string, m: Method, dir?: string, answer?: FormAnswer, key?: string): Promise<Attempt | undefined>;
  attempt(
    id: string,
    m: Method,
    attempt: string,
    op: "status" | "cancel" | "complete",
    dir?: string,
    code?: string,
  ): Promise<{ status: string; message?: string }>;
  account(id: string, op: "activate" | "rename" | "delete", label?: string): Promise<void>;
  plugins(dir?: string, check?: boolean): Promise<Plugin[]>;
  updatePlugin(target: string, dir?: string): Promise<void>;
  mcps(dir?: string): Promise<Mcp[]>;
  toggleMcp(name: string, connect: boolean, dir?: string): Promise<void>;
}
export function management(t: Transport): Management {
  const loc = (dir?: string) => (dir ? `?${new URLSearchParams({ "location[directory]": dir })}` : ""),
    enc = encodeURIComponent;
  const auth = (id: string, m: Method) => `/api/integration/${enc(id)}/connect/${m.type}`;
  return {
    async providers(dir) {
      return (await t.json<{ data: Integration[] }>("GET", "/api/integration" + loc(dir))).data;
    },
    async connect(id, m, dir, answer, key) {
      if (m.type === "env") throw Error("Set the variable on the OpenCode server");
      const r = await t.json<{ data?: Attempt } | undefined>(
        "POST",
        auth(id, m) + loc(dir),
        m.type === "key" ? { key, answer } : { methodID: m.id, answer },
      );
      return r?.data;
    },
    async attempt(id, m, attempt, op, dir, code) {
      const path = auth(id, m) + "/" + enc(attempt);
      if (op === "status") return (await t.json<{ data: { status: string; message?: string } }>("GET", path + loc(dir))).data;
      if (op === "cancel") await t.json("DELETE", path + loc(dir));
      else await t.json("POST", path + "/complete" + loc(dir), { code });
      return { status: "complete" };
    },
    async account(id, op, label) {
      const path = "/api/credential/" + enc(id);
      if (op === "rename") await t.json("PATCH", path, { label });
      else if (op === "activate") await t.json("POST", path + "/activate");
      else await t.json("DELETE", path);
    },
    async plugins(dir, check) {
      return (
        await t.json<{ data: Plugin[] }>(
          check ? "POST" : "GET",
          `/api/plugin${check ? "/check" : ""}${loc(dir)}`,
          check ? {} : undefined,
        )
      ).data;
    },
    async updatePlugin(target, dir) {
      await t.json("POST", "/api/plugin/update" + loc(dir), { targets: [target] });
    },
    async mcps(dir) {
      return (await t.json<{ data: Mcp[] }>("GET", "/api/mcp" + loc(dir))).data;
    },
    async toggleMcp(name, connect, dir) {
      await t.json("POST", `/api/experimental/mcp/${enc(name)}/${connect ? "connect" : "disconnect"}${loc(dir)}`);
    },
  };
}
export function sandboxManagement(): Management {
  const providers: Integration[] = [
    {
      id: "opencode",
      name: "OpenCode",
      connections: [{ type: "credential", id: "sandbox-main", label: "Sandbox account" }],
      methods: [
        { type: "oauth", id: "device", label: "Device authorization" },
        { type: "key", label: "API key" },
        { type: "command", id: "login", label: "Provider command", command: ["sandbox-login"] },
      ],
    },
    { id: "anthropic", name: "Anthropic", connections: [], methods: [{ type: "key", label: "API key" }] },
    { id: "openai", name: "OpenAI", connections: [], methods: [{ type: "oauth", id: "code", label: "Authorization code" }] },
  ];
  const mcps: Mcp[] = [
    { name: "project-docs", status: { status: "connected" } },
    { name: "design-files", status: { status: "failed", error: "Sandbox connection timed out" } },
  ];
  providers.push(
    {
      id: "notes-login",
      name: "Project notes",
      metadata: { source: "mcp" },
      connections: [],
      methods: [{ type: "oauth", id: "device", label: "Device authorization" }],
    },
    {
      id: "local-cloud",
      name: "Sandbox Cloud",
      connections: [],
      methods: [
        {
          type: "external",
          id: "profile",
          label: "Use a workspace",
          form: [
            { key: "workspace", type: "string", title: "Workspace", required: true },
            {
              key: "region",
              type: "string",
              title: "Region",
              options: [
                { value: "us", label: "US" },
                { value: "eu", label: "Europe" },
              ],
            },
          ],
        },
        { type: "env", names: ["SANDBOX_CLOUD_PROFILE"] },
      ],
    },
  );
  mcps.push({ name: "project-notes", integrationID: "notes-login", status: { status: "needs_auth" } });
  const plugins: Plugin[] = [
    {
      id: "project-tools",
      source: { type: "package", target: "sandbox-project-tools", version: "1.0.0", outdated: true },
      state: { status: "active" },
    },
    { id: "example-plugin", source: { type: "local" }, state: { status: "failed", error: "Sandbox fixture: entrypoint not found" } },
  ];
  let n = 0;
  const attempts = new Map<string, { provider: string; method: string; polls: number }>();
  const connected = (id: string) => {
    providers.find((p) => p.id === id)?.connections.unshift({ type: "credential", id: `acc-${++n}`, label: `Sandbox account ${n}` });
    const m = mcps.find((m) => m.integrationID === id);
    if (m) m.status = { status: "connected" };
  };
  return {
    async providers() {
      return structuredClone(providers);
    },
    async connect(id, m) {
      if (m.type !== "oauth" && m.type !== "command") {
        connected(id);
        return;
      }
      const attemptID = `auth-${++n}`;
      attempts.set(attemptID, { provider: id, method: m.type, polls: 0 });
      return { attemptID, mode: m.id === "code" ? "code" : "auto", instructions: "Scripted approval. No provider is contacted." };
    },
    async attempt(id, m, key, op) {
      const a = attempts.get(key);
      if (a?.provider !== id || a.method !== m.type) throw Error("Authorization expired");
      if (op === "cancel") {
        attempts.delete(key);
        return { status: "expired" };
      }
      if (op === "status" && ++a.polls < 3) return { status: "pending" };
      connected(id);
      attempts.delete(key);
      return { status: "complete" };
    },
    async account(id, op, label) {
      for (const p of providers) {
        const i = p.connections.findIndex((c) => c.type === "credential" && c.id === id),
          c = p.connections[i];
        if (!c || c.type !== "credential") continue;
        if (op === "rename") c.label = label ?? "";
        else {
          p.connections.splice(i, 1);
          if (op === "activate") p.connections.unshift(c);
        }
        return;
      }
      throw Error("Account not found");
    },
    async plugins() {
      return structuredClone(plugins);
    },
    async updatePlugin(target) {
      const p = plugins.find((p) => p.source.target === target);
      if (p) {
        p.source.version = "1.1.0";
        p.source.outdated = false;
      }
    },
    async mcps() {
      return structuredClone(mcps);
    },
    async toggleMcp(name, on) {
      const m = mcps.find((m) => m.name === name);
      if (m) m.status = { status: on ? "connected" : "disabled" };
    },
  };
}
