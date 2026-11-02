import { useEffect, useRef, useState } from "react";
import { useClipboard } from "@textjs/app";
import { useStore, useStoreState } from "../lib/store";
import type { Integration, Method, Attempt, Management, Mcp, Plugin } from "../lib/management";
import type { FormAnswer, FormValue } from "../lib/types";
import { formValidateValue, formLabel } from "../lib/form";
import { Choices, PromptDialog } from "./Choices";
import { McpSetup } from "./McpSetup";
const popular = ["opencode-go", "opencode", "openai", "github-copilot", "anthropic", "google"];
const order = (id: string) => (popular.includes(id) ? popular.indexOf(id) : 99);

export function Connections({ kind, dir, close }: { kind: "integrations" | "mcps" | "plugins"; dir?: string; close: () => void }) {
  const store = useStore(),
    api = store.api?.management,
    version = useStoreState((s) => s.managementVersion),
    local = useStoreState((s) => s.ui.hideMcp),
    [providers, setProviders] = useState<Integration[]>([]),
    [mcps, setMcps] = useState<Mcp[]>([]),
    [plugins, setPlugins] = useState<Plugin[]>([]);
  const [provider, select] = useState(""),
    [setup, setSetup] = useState(""),
    [update, confirm] = useState(""),
    [notice, note] = useState(""),
    [revision, refresh] = useState(0),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!api) {
      note("This server does not expose integration management.");
      return;
    }
    let live = true;
    void Promise.all([
      kind !== "plugins"
        ? api.providers(dir).then((v) => {
            if (live) setProviders(v);
          })
        : null,
      kind === "plugins"
        ? api.plugins(dir).then((v) => {
            if (live) setPlugins(v);
          })
        : null,
      kind === "mcps"
        ? api.mcps(dir).then((v) => {
            if (live) setMcps(v);
          })
        : null,
    ]).catch((e) => {
      if (live) note(String(e));
    });
    return () => {
      live = false;
    };
  }, [api, kind, revision, dir, version]);
  const write = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    try {
      await fn();
      if (alive.current) {
        refresh((v) => v + 1);
        store.managementChanged();
      }
    } catch (e) {
      if (alive.current) note(String(e));
    } finally {
      lock.current = false;
    }
  };
  const p = providers.find((p) => p.id === provider);
  if (p && api)
    return (
      <Provider
        key={p.id}
        api={api}
        p={p}
        dir={dir}
        demo={store.api?.kind === "demo"}
        close={() => select("")}
        done={async () => {
          const items = await api.providers(dir);
          if (!alive.current) return;
          setProviders(items);
          select("");
          note(`Connected ${p.name}`);
          refresh((v) => v + 1);
          store.managementChanged();
        }}
        changed={async () => {
          const items = await api.providers(dir);
          if (alive.current) setProviders(items);
        }}
      />
    );
  if (kind === "integrations")
    return (
      <Choices
        title="Connect an integration"
        items={providers
          .filter((p) => p.metadata?.source !== "mcp")
          .sort((a, b) => order(a.id) - order(b.id) || a.name.localeCompare(b.name))
          .map((p) => ({
            id: p.id,
            label: p.name,
            group: popular.includes(p.id) ? "Popular" : "Services",
            hint:
              p.connections.length > 1
                ? `${p.connections.length} connections`
                : p.connections[0]?.type === "credential"
                  ? p.connections[0].label
                  : p.connections[0]?.type === "env"
                    ? `$${p.connections[0].name}`
                    : undefined,
          }))}
        close={close}
        choose={select}
        note={notice}
      />
    );
  if (kind === "mcps") {
    if (api && setup)
      return (
        <McpSetup
          api={api}
          dir={dir}
          remove={setup === "remove"}
          names={mcps.map((m) => m.name)}
          close={() => setSetup("")}
          done={() => {
            setSetup("");
            refresh((v) => v + 1);
            store.managementChanged();
          }}
        />
      );
    const toggle = (id: string) => {
      const m = mcps.find((m) => m.name === id);
      if (!m || !api || m.status.status === "pending") return;
      if (m.status.status === "needs_auth" && m.integrationID) {
        select(m.integrationID);
        return;
      }
      void write(() => api.toggleMcp(id, m.status.status !== "connected", dir));
    };
    return (
      <Choices
        title="MCP servers"
        items={[
          ...mcps.map((m) => ({ id: m.name, label: m.name, hint: m.status.status })),
          ...(api
            ? [
                { id: "\0add", label: "Add MCP server" },
                { id: "\0remove", label: "Remove MCP server" },
              ]
            : []),
        ]}
        close={close}
        choose={(id) => {
          if (id.startsWith("\0")) {
            setSetup(id.slice(1));
            return;
          }
          const m = mcps.find((m) => m.name === id);
          if (m?.integrationID && m.status.status === "needs_auth") select(m.integrationID);
          else note(m?.status.error ?? m?.status.status ?? "");
        }}
        commands={(id) => ({ "dialog.mcp.toggle": () => toggle(id) })}
        note={notice || "space connect/disconnect  enter details"}
      />
    );
  }
  const key = (p: Plugin) => p.id ?? p.source.target ?? p.source.type;
  if (update)
    return (
      <Choices
        title="Update plugin"
        items={[
          { id: "cancel", label: "Cancel" },
          { id: "update", label: `Update ${update}` },
        ]}
        close={() => confirm("")}
        choose={(id) => {
          if (id === "update" && api) void write(() => api.updatePlugin(update, dir));
          confirm("");
        }}
      />
    );
  return (
    <Choices
      title="Plugins"
      items={[
        { id: "local:sidebar-mcp", label: "MCP sidebar", hint: local ? "disabled" : "TUI" },
        ...plugins.map((p) => ({
          id: "server:" + key(p),
          label: key(p),
          detail: p.source.version,
          hint: p.state.status === "failed" ? "failed" : p.source.outdated ? "update available" : "Server",
        })),
      ]}
      choose={(id) => {
        if (id === "local:sidebar-mcp") store.toggle("hideMcp");
        else note("Server plugins are enabled in the OpenCode configuration.");
      }}
      close={close}
      commands={(id) => ({
        "dialog.plugins.check": () => {
          if (api)
            void write(async () => {
              await api.plugins(dir, true);
              note("Checked for updates");
            });
        },
        "dialog.plugins.error": () => note(plugins.find((p) => "server:" + key(p) === id)?.state.error ?? "No plugin error"),
        "dialog.plugins.update": () => {
          const p = plugins.find((p) => "server:" + key(p) === id);
          if (p?.source.outdated && p.source.target) confirm(p.source.target);
          else note("No update available");
        },
      })}
      note={notice || "space view error  ctrl+r check  ctrl+u update"}
    />
  );
}

function Provider({
  api,
  p,
  dir,
  demo,
  done,
  changed,
  close,
}: {
  api: Management;
  p: Integration;
  dir?: string;
  demo: boolean;
  done: () => Promise<void>;
  changed: () => Promise<void>;
  close: () => void;
}) {
  const [stage, go] = useState(p.connections.some((c) => c.type === "credential") ? "accounts" : "methods"),
    [method, select] = useState<Method>(),
    [account, selectAccount] = useState(""),
    [err, fail] = useState("");
  const [answer, setAnswer] = useState<FormAnswer>({}),
    [index, field] = useState(0),
    [multi, tick] = useState<string[]>([]),
    [attempt, wait] = useState<Attempt>();
  const ticket = useRef<{ m: Method; a: Attempt } | null>(null),
    alive = useRef(true),
    busy = useRef(false),
    { copy } = useClipboard();
  const cancel = () => {
    const t = ticket.current;
    ticket.current = null;
    if (t) void api.attempt(p.id, t.m, t.a.attemptID, "cancel", dir).catch(() => {});
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancel();
    };
  }, []);
  function reset() {
    cancel();
    wait(undefined);
    select(undefined);
    fail("");
    go("methods");
  }
  async function action(fn: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    fail("");
    try {
      await fn();
    } catch (e) {
      if (alive.current) fail(String(e));
    } finally {
      busy.current = false;
    }
  }
  async function start(m: Method, ans: FormAnswer, key?: string) {
    await action(async () => {
      const a = await api.connect(p.id, m, dir, Object.keys(ans).length ? ans : undefined, key);
      if (!alive.current) {
        if (a) void api.attempt(p.id, m, a.attemptID, "cancel", dir).catch(() => {});
        return;
      }
      if (!a) {
        await done();
        return;
      }
      ticket.current = { m, a };
      wait(a);
      go("attempt");
    });
  }
  function ready(m: Method, ans: FormAnswer) {
    if (m.type === "key") go("key");
    else if (m.type === "env") go("env");
    else go("confirm");
  }
  function next(m: Method, ans: FormAnswer, i: number) {
    const fs = m.form ?? [];
    while (i < fs.length) {
      const f = fs[i]!;
      if (
        f.type === "external" ||
        (!f.hidden && (!f.when || f.when.every((c) => (c.op === "eq" ? ans[c.key] === c.value : ans[c.key] !== c.value))))
      )
        break;
      i++;
    }
    field(i);
    setAnswer(ans);
    tick([]);
    if (i < fs.length) go("field");
    else ready(m, ans);
  }
  useEffect(() => {
    if (stage !== "attempt" || !attempt || !method || attempt.mode === "code") return;
    let live = true,
      tm: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const r = await api.attempt(p.id, method!, attempt!.attemptID, "status", dir);
        if (!live) return;
        if (r.status === "pending") tm = setTimeout(poll, 700);
        else if (r.status === "complete") {
          ticket.current = null;
          await done();
        } else {
          ticket.current = null;
          go("methods");
          fail(r.status === "expired" ? "Authentication expired" : "Authentication failed");
        }
      } catch (e) {
        if (live) {
          cancel();
          go("methods");
          fail(String(e));
        }
      }
    }
    tm = setTimeout(poll, 500);
    return () => {
      live = false;
      clearTimeout(tm);
    };
  }, [attempt, stage, method, api, dir, p.id]);
  const back = () => {
    if (busy.current) {
      close();
      return;
    }
    if (stage === "accounts" || stage === "methods") close();
    else reset();
  };
  if (stage === "accounts")
    return (
      <Choices
        title={p.name}
        items={[
          { id: "add", label: "Add account" },
          ...p.connections.flatMap((c, i) => (c.type === "credential" ? [{ id: c.id, label: c.label, current: i === 0 }] : [])),
        ]}
        close={close}
        choose={(id) => {
          if (id === "add") go("methods");
          else if (id === p.connections.find((c) => c.type === "credential")?.id) {
            selectAccount(id);
            go("accountActions");
          } else
            void action(async () => {
              await api.account(id, "activate");
              if (alive.current) await changed();
            });
        }}
        commands={(id) => ({
          "dialog.integration.rename": () => {
            if (id && id !== "add") {
              selectAccount(id);
              go("rename");
            }
          },
          "dialog.integration.delete": () => {
            if (id && id !== "add") {
              selectAccount(id);
              go("delete");
            }
          },
        })}
        note={err || "ctrl+r rename  ctrl+d delete"}
      />
    );
  if (stage === "rename")
    return (
      <PromptDialog
        title="Rename account"
        close={() => go("accounts")}
        submit={(s) => {
          if (s.trim())
            void action(async () => {
              await api.account(account, "rename", s.trim());
              if (alive.current) {
                await changed();
                go("accounts");
              }
            });
        }}
        note={err}
      />
    );
  if (stage === "accountActions")
    return (
      <Choices
        title="Account actions"
        items={[
          { id: "rename", label: "Rename account" },
          { id: "delete", label: "Disconnect account" },
        ]}
        choose={go}
        close={() => go("accounts")}
      />
    );
  if (stage === "delete")
    return (
      <Choices
        title="Disconnect account"
        items={[
          { id: "cancel", label: "Cancel" },
          { id: "delete", label: "Disconnect account" },
        ]}
        close={() => go("accounts")}
        choose={(id) => {
          if (id === "cancel") {
            go("accounts");
            return;
          }
          void action(async () => {
            await api.account(account, "delete");
            if (alive.current) {
              await changed();
              go("accounts");
            }
          });
        }}
        note={err}
      />
    );
  if (stage === "methods" || !method)
    return (
      <Choices
        title={`Connect ${p.name}`}
        items={p.methods.map((m, i) => ({ id: String(i), label: m.label ?? (m.type === "env" ? "Environment variable" : "API key") }))}
        close={back}
        choose={(v) => {
          const m = p.methods[Number(v)];
          if (m) {
            select(m);
            fail("");
            next(m, {}, 0);
          }
        }}
        note={err}
      />
    );
  if (stage === "field") {
    const f = method.form![index]!;
    const set = (v: FormValue) => {
      if (f.type !== "external") {
        const e = formValidateValue(f, v);
        if (e) {
          fail(e);
          return;
        }
      }
      fail("");
      next(method, { ...answer, [f.key]: v }, index + 1);
    };
    if (f.type === "external")
      return (
        <Choices
          title={f.title ?? "Open link"}
          items={[
            { id: "open", label: "Open URL" },
            { id: "next", label: "Continue" },
          ]}
          close={back}
          choose={(i) => (i === "open" ? openAuth(f.url) : next(method, answer, index + 1))}
          note={f.url}
        />
      );
    if (f.type === "boolean")
      return (
        <Choices
          title={formLabel(f)}
          items={[
            { id: "true", label: "Yes" },
            { id: "false", label: "No" },
          ]}
          close={back}
          choose={(v) => set(v === "true")}
        />
      );
    if ((f.type === "string" || f.type === "multiselect") && f.options)
      return (
        <Choices
          title={formLabel(f)}
          items={[
            ...f.options.map((o) => ({ id: o.value, label: o.label, current: multi.includes(o.value) })),
            ...(f.type === "multiselect" ? [{ id: "\0done", label: "Continue" }] : []),
          ]}
          close={back}
          choose={(v) => {
            if (f.type === "string") set(v);
            else if (v === "\0done") set(multi);
            else tick((prev) => (prev.includes(v) ? prev.filter((k) => k !== v) : [...prev, v]));
          }}
          note={err}
        />
      );
    return (
      <PromptDialog
        key={f.key}
        title={formLabel(f)}
        initial={String(f.default ?? "")}
        close={back}
        submit={(v) => set(f.type === "string" ? v : Number(v))}
        note={err || f.description}
      />
    );
  }
  if (stage === "env")
    return (
      <Choices
        title={p.name}
        items={[{ id: "ok", label: "OK" }]}
        choose={back}
        close={back}
        note={`Set ${method.names?.join(" or ")} in the server environment.`}
      />
    );
  if (stage === "key")
    return (
      <PromptDialog
        title={method.label ?? `Connect ${p.name}`}
        secret
        close={back}
        submit={(v) => {
          if (v) void start(method, answer, v);
        }}
        note={err || (demo ? "Sandbox: use a test value. No credentials are saved." : "API key")}
      />
    );
  if (stage === "confirm")
    return (
      <Choices
        title={method.label ?? p.name}
        items={[
          { id: "start", label: method.type === "command" ? "Run authentication command" : "Continue" },
          { id: "cancel", label: "Cancel" },
        ]}
        choose={(id) => (id === "start" ? void start(method, answer) : back())}
        close={back}
        note={err || (demo ? "Scripted sandbox authorization" : method.command?.join(" "))}
      />
    );
  if (attempt?.mode === "code")
    return (
      <PromptDialog
        title="Authorization code"
        secret
        close={back}
        submit={(code) =>
          void action(async () => {
            await api.attempt(p.id, method, attempt.attemptID, "complete", dir, code);
            if (alive.current) {
              ticket.current = null;
              await done();
            }
          })
        }
        note={err || [attempt.instructions, attempt.url].filter(Boolean).join("\n")}
      />
    );
  return (
    <Choices
      title={method.label ?? p.name}
      items={
        attempt?.url
          ? [
              { id: "open", label: "Open URL" },
              { id: "copy", label: "Copy authorization details" },
              { id: "cancel", label: "Cancel" },
            ]
          : [{ id: "cancel", label: "Cancel" }]
      }
      close={back}
      choose={(v) => {
        if (v === "cancel") reset();
        else if (v === "copy") void copy([attempt?.instructions, attempt?.url].filter(Boolean).join("\n"));
        else if (attempt?.url) openAuth(attempt.url);
      }}
      note={
        err ||
        [attempt?.instructions, method.type === "command" ? "Waiting for command to finish…" : "Waiting for authorization…"]
          .filter(Boolean)
          .join("\n")
      }
    />
  );
}
function openAuth(raw: string) {
  try {
    const url = new URL(raw);
    if (
      !url.username &&
      !url.password &&
      (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
    )
      globalThis.window?.open(url.href, "_blank", "noopener,noreferrer");
  } catch {
    /* Invalid provider URL. */
  }
}
