[OpenCode](https://opencode.ai) is an open source AI coding agent with a beloved terminal UI. **OpenCode Lite** is a faithful console-native client for it, built entirely with Text.js — and it is running in your DevTools right now. Press `⌘⌥J`, then `3`.

## Try it

| Where | How |
| :-- | :-- |
| Your console, on this site | `⌘⌥J`, then press `3` |
| Inline | [textjs.org/opencode](/opencode) |
| Locally, against your own `opencode` | `bunx create-text-app my-opencode --template opencode` |

On textjs.org, OpenCode Lite starts in **Interactive Sandbox Mode**: pre-loaded sessions and a scripted agent that streams realistic multi-step responses with `read`, `edit` and `shell` tool calls. Type any prompt.

## Anatomy

The entire TUI is ordinary React built from Text.js components:

| Region | Components |
| :-- | :-- |
| Header | `<Box>` `<Text>` with truncation and a live connection indicator |
| Session sidebar | `<Box border>` + `<Text wrap="truncate-end">` |
| Transcript | `<ScrollBox stickyScroll>` |
| Assistant text | streaming `<Markdown>` |
| `read` tool card | `<Code showLineNumbers maxHeight>` |
| `edit` tool card | `<Diff patch={{ before, after, filename }}>` |
| `shell` tool card | `<Code language="bash">` |
| Prompt | `<Textarea minRows={1} maxRows={4}>` in a focus-colored border |
| Command palette | `<Modal>` + `<Select searchable>` on `Ctrl+P` |

```tsx@app/sessions/[id]/page.tsx
export default function SessionPage({ params }: PageProps<{ id: string }>) {
  const { messages, send, busy } = useSession(params.id);
  const [agent, setAgent] = useState<"build" | "plan">("build");

  useInput((e) => {
    if (e.key === "tab") setAgent((a) => (a === "build" ? "plan" : "build"));
  }, { priority: 2 });

  return (
    <Box className="flex-col grow">
      <ScrollBox stickyScroll className="grow">
        {messages.map((m) => <MessageView key={m.id} message={m} />)}
      </ScrollBox>
      <Box className="border rounded px-1" title={` ${agent} `} borderColor={agent === "plan" ? "info" : "accent"}>
        <Textarea placeholder="Ask anything…" onSubmit={send} autoFocus />
      </Box>
    </Box>
  );
}
```

## Keyboard

| Key | Action |
| :-- | :-- |
| `Enter` | Send prompt |
| `Shift+Enter` | Newline |
| `Tab` | Toggle `build` / `plan` agent |
| `Ctrl+P` | Command palette: sessions, models, commands |
| `Ctrl+N` | New session |
| `Ctrl+X` | Cycle model |
| `Esc` | Interrupt a running response, or leave the prompt |
| `PgUp` / `PgDn` | Scroll the transcript |

## Connecting to a local server

`opencode` exposes an HTTP API with a server-sent event stream. Start it with:

```bash
opencode serve --port 4096
```

OpenCode Lite talks to it with three endpoints:

| Endpoint | Purpose |
| :-- | :-- |
| `GET /session` | List sessions |
| `POST /session/:id/message` | Send a prompt (`{ agent, parts: [{ type: "text", text }] }`) |
| `GET /event` | SSE stream of `message.part.updated` events |

On [textjs.org/opencode](/opencode), enter your server URL (for example `http://localhost:4096`) under **Connect to Local OpenCode Server**. If your browser can reach it, OpenCode Lite switches from the sandbox to live HTTP + SSE.

> **Warning:** Browsers block cross-origin requests that the server does not allow. If the connection fails, use the template below: its dev server proxies `/api/opencode` to your local `opencode`, so the browser never makes a cross-origin request.

## The local proxy template

```bash
bunx create-text-app my-opencode --template opencode
cd my-opencode
bun dev
```

The template uses `configureServer` to auto-discover a running `opencode` instance (via `opencode service status`) and a `proxy` rule to forward requests — see [Route Handlers](/docs/route-handlers#local-daemon-proxying).
