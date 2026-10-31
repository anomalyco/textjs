/**
 * A real local OpenCode V2 HTTP + SSE server (Bun.serve) speaking the same
 * shapes as `@opencode/client` (`SessionsResponse`, `SessionMessagesResponse`,
 * `{ data: SessionInfo }`, `V2Event` over `text/event-stream`).
 */

type Json = Record<string, unknown>;

export interface MockRequest {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

export interface MockOpenCode {
  url: string;
  requests: MockRequest[];
  sessions: Json[];
  messages: Map<string, Json[]>;
  /** Push a raw `V2Event` to every connected SSE client. */
  emit(event: { type: string; data: Json }): void;
  /** Resolves once at least one SSE client is connected. */
  waitForSubscriber(): Promise<void>;
  stop(): void;
}

const DIR = "/Users/dev/code/storefront";

export function startMockOpenCode(options: { password?: string } = {}): MockOpenCode {
  const now = Date.now();
  const sessions: Json[] = [
    {
      id: "ses_alpha",
      projectID: "prj_1",
      agent: "build",
      model: { id: "claude-opus-5-5", providerID: "anthropic" },
      cost: 0.12,
      tokens: { input: 1000, output: 200, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: now - 3_600_000, updated: now - 120_000, idle: now - 120_000 },
      title: "Refactor auth middleware",
      location: { directory: DIR },
    },
    {
      id: "ses_beta",
      projectID: "prj_1",
      agent: "plan",
      model: { id: "gpt-6.1-terra", providerID: "openai" },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      time: { created: now - 7_200_000, updated: now - 5_400_000 },
      title: "Investigate flaky CI",
      location: { directory: DIR },
    },
  ];
  const messages = new Map<string, Json[]>([
    [
      "ses_alpha",
      [
        { id: "msg_a1", type: "user", text: "Where is the auth middleware?", time: { created: now - 3_500_000 } },
        {
          id: "msg_a2",
          type: "assistant",
          agent: "build",
          model: { id: "claude-opus-5-5", providerID: "anthropic" },
          time: { created: now - 3_490_000, completed: now - 3_480_000 },
          content: [
            { type: "tool", id: "call_1", name: "grep", state: { status: "completed", input: { pattern: "authMiddleware", path: "src" }, content: [{ type: "text", text: "src/middleware.ts:3" }], metadata: { matches: 1 } }, time: { created: now - 3_489_000, completed: now - 3_488_000 } },
            { type: "text", text: "It lives in `src/middleware.ts`." },
          ],
          finish: "stop",
          tokens: { input: 900, output: 120, reasoning: 0, cache: { read: 0, write: 0 } },
          cost: 0.01,
        },
      ],
    ],
    ["ses_beta", [{ id: "msg_b1", type: "user", text: "Why does CI flake on Tuesdays?", time: { created: now - 7_100_000 } }]],
  ]);
  const requests: MockRequest[] = [];
  const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();
  const waiters: Array<() => void> = [];
  const enc = new TextEncoder();
  let n = 0;

  const send = (event: { type: string; data: Json }): void => {
    const frame = enc.encode(`data: ${JSON.stringify({ id: `evt_${++n}`, created: Date.now(), ...event })}\n\n`);
    for (const c of subscribers) {
      try {
        c.enqueue(frame);
      } catch {
        subscribers.delete(c);
      }
    }
  };

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    idleTimeout: 0,
    async fetch(req): Promise<Response> {
      const url = new URL(req.url);
      const path = url.pathname;
      const body = req.method === "GET" ? undefined : await req.text().then((t) => (t ? (JSON.parse(t) as unknown) : undefined));
      requests.push({ method: req.method, path: path + url.search, body, authorization: req.headers.get("authorization") });
      if (options.password && req.headers.get("authorization") !== `Basic ${Buffer.from(`opencode:${options.password}`).toString("base64")}`) {
        return Response.json({ _tag: "UnauthorizedError", message: "Unauthorized" }, { status: 401 });
      }
      const m = /^\/api\/session\/([^/]+)(?:\/(\w+))?$/.exec(path);

      if (path === "/api/info") return Response.json({ version: "2.0.0-mock", pid: 1, urls: [url.origin], paths: { tmp: "/tmp" } });
      if (path === "/api/agent")
        return Response.json({
          location: { directory: DIR },
          data: [
            { id: "build", name: "build", mode: "primary", hidden: false, request: {}, permissions: [] },
            { id: "plan", name: "plan", mode: "primary", hidden: false, request: {}, permissions: [] },
            { id: "explore", name: "explore", mode: "subagent", hidden: false, request: {}, permissions: [] },
          ],
        });
      if (path === "/api/model")
        return Response.json({
          location: { directory: DIR },
          data: [
            { id: "claude-opus-5-5", modelID: "claude-opus-5-5", providerID: "anthropic", name: "Claude Opus 5.5", enabled: true, variants: [{ id: "default" }, { id: "low" }, { id: "high" }], limit: { context: 400000, output: 64000 } },
            { id: "gpt-6.1-terra", modelID: "gpt-6.1-terra", providerID: "openai", name: "GPT-6.1 Terra", enabled: true, limit: { context: 512000, output: 64000 } },
          ],
        });
      if (path === "/api/model/default") return Response.json({ location: { directory: DIR }, data: { id: "claude-opus-5-5", providerID: "anthropic", name: "Claude Opus 5.5" } });
      if (path === "/api/session" && req.method === "GET") {
        const sorted = [...sessions].sort((a, b) => ((b.time as Json).updated as number) - ((a.time as Json).updated as number));
        return Response.json({ data: sorted, cursor: { previous: null, next: null } });
      }
      if (path === "/api/session" && req.method === "POST") {
        const input = (body ?? {}) as Json;
        const t = Date.now();
        const s: Json = { id: `ses_new${sessions.length}`, projectID: "prj_1", agent: input.agent ?? "build", model: input.model, cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, time: { created: t, updated: t }, location: { directory: DIR } };
        sessions.push(s);
        messages.set(s.id as string, []);
        send({ type: "session.created", data: { sessionID: s.id as string } });
        return Response.json({ data: s });
      }
      if (m) {
        const id = decodeURIComponent(m[1] as string);
        const s = sessions.find((x) => x.id === id);
        if (!s) return Response.json({ _tag: "SessionNotFoundError", message: "not found" }, { status: 404 });
        const action = m[2];
        if (!action && req.method === "GET") return Response.json({ data: s });
        if (action === "message") {
          const list = [...(messages.get(id) ?? [])];
          const order = url.searchParams.get("order") ?? "desc";
          return Response.json({ data: order === "desc" ? list.reverse() : list, cursor: { previous: null, next: null } });
        }
        if (action === "view") return new Response(null, { status: typeof (body as Json)?.idle === "number" ? 204 : 400 });
        if (action === "agent" || action === "model") return new Response(null, { status: 204 });
        if (action === "interrupt") return Response.json({ interrupted: true });
        if (action === "prompt") {
          const text = String(((body ?? {}) as Json).text ?? "");
          const inboxID = `msg_u${requests.length}`;
          messages.get(id)?.push({ id: inboxID, type: "user", text, time: { created: Date.now() } });
          return Response.json({ data: { id: inboxID, sessionID: id, time: { created: Date.now() }, type: "user", payload: { text }, delivery: "steer" } });
        }
      }
      if (path === "/api/event") {
        let ctrl: ReadableStreamDefaultController<Uint8Array>;
        const stream = new ReadableStream<Uint8Array>({
          start(c) {
            ctrl = c;
            subscribers.add(c);
            c.enqueue(enc.encode(`data: ${JSON.stringify({ id: "evt_0", type: "server.connected", data: {} })}\n\n`));
            for (const w of waiters.splice(0)) w();
          },
          cancel() {
            subscribers.delete(ctrl);
          },
        });
        req.signal.addEventListener("abort", () => subscribers.delete(ctrl));
        return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
      }
      return Response.json({ message: "not found" }, { status: 404 });
    },
  });

  return {
    url: `http://127.0.0.1:${server.port}`,
    requests,
    sessions,
    messages,
    emit: send,
    waitForSubscriber: () => (subscribers.size > 0 ? Promise.resolve() : new Promise<void>((r) => waiters.push(r))),
    stop() {
      for (const c of subscribers) {
        try {
          c.close();
        } catch {
          // already closed
        }
      }
      subscribers.clear();
      server.stop(true);
    },
  };
}
