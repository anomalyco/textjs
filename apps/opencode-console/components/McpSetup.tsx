import { useRef, useState } from "react";
import type { Management, McpDefinition } from "../lib/management";
import { Choices, PromptDialog } from "./Choices";
export function McpSetup({
  api,
  dir,
  remove,
  names,
  close,
  done,
}: {
  api: Management;
  dir?: string;
  remove: boolean;
  names: string[];
  close: () => void;
  done: () => void;
}) {
  const [stage, go] = useState(remove ? "choose" : "name"),
    [name, setName] = useState(""),
    [config, setConfig] = useState<McpDefinition>(),
    [error, fail] = useState("");
  const busy = useRef(false);
  if (stage === "name")
    return (
      <PromptDialog
        title="MCP server name"
        submit={(s) => {
          if (!/^[a-zA-Z0-9_-]+$/.test(s)) {
            fail("Use letters, numbers, hyphens or underscores.");
            return;
          }
          setName(s);
          go("type");
          fail("");
        }}
        close={close}
        note={error}
      />
    );
  if (stage === "type")
    return (
      <Choices
        title="MCP transport"
        items={[
          { id: "remote", label: "Remote HTTP server" },
          { id: "local", label: "Local command" },
        ]}
        choose={go}
        close={close}
      />
    );
  if (stage === "remote" || stage === "local")
    return (
      <PromptDialog
        title={stage === "remote" ? "Server URL" : "Command and arguments (JSON array)"}
        close={close}
        note={error || "Enter no credentials. Configure secret headers and environment variables outside DevTools."}
        submit={(s) => {
          try {
            if (stage === "local") {
              const command: unknown = JSON.parse(s);
              if (
                !Array.isArray(command) ||
                !command.length ||
                !command.every((v) => typeof v === "string" && !v.includes("\0")) ||
                !command[0]
              )
                throw Error("Expected a command and its arguments");
              setConfig({ type: "local", command });
            } else {
              const u = new URL(s);
              if (!["https:", "http:"].includes(u.protocol) || u.username || u.password || u.search || u.hash)
                throw Error("Use an HTTP(S) URL without credentials, query or fragment");
              setConfig({ type: "remote", url: u.href });
            }
            go("confirm");
            fail("");
          } catch (e) {
            fail(String(e));
          }
        }}
      />
    );
  if (stage === "choose")
    return (
      <Choices
        title="Choose a server to remove"
        items={names.map((id) => ({ id, label: id }))}
        choose={(id) => {
          setName(id);
          go("confirm");
        }}
        close={close}
      />
    );
  return (
    <Choices
      title={remove ? "Remove MCP server" : "Register disabled server"}
      items={[
        { id: "cancel", label: "Cancel" },
        { id: "apply", label: (remove ? "Remove " : "Register ") + name },
      ]}
      close={close}
      note={
        error ||
        (remove
          ? `Remove ${name} at ${dir ?? "the active location"}?`
          : (config?.type === "remote" ? config.url : JSON.stringify(config?.command)) + " · Disabled until you connect it.")
      }
      choose={(v) => {
        if (v === "cancel") {
          close();
          return;
        }
        if (busy.current) return;
        busy.current = true;
        void (async () => {
          if (remove) await api.removeMcp(name, dir);
          else if (config) {
            if ((await api.mcps(dir)).some((m) => m.name === name)) throw Error("Name already in use");
            await api.addMcp(name, config, dir);
          }
          done();
        })()
          .catch((e) => fail(String(e)))
          .finally(() => {
            busy.current = false;
          });
      }}
    />
  );
}
