[OpenCode](https://opencode.ai) is an open source coding agent. **OpenCode Lite** is a console client for it, built with Text.js.

## Try it

- On this site: visit [OpenCode](/opencode) and open DevTools.
- Locally: `bunx create-text-app my-app --template opencode`.

The site runs a sandbox with a scripted agent. Type any prompt.

## Anatomy

| Region | Components |
| :-- | :-- |
| Transcript | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Tool cards | `<Code>` and `<Diff>` |
| Prompt | `<Textarea>` |
| Palette | `<Modal>` + `<Select searchable>` |

```tsx@app/session/[id]/page.tsx
export default function SessionPage({ params }: PageProps<{ id: string }>) {
  const { messages, send } = useSession(params.id);
  return (
    <Box className="flex-col grow">
      <ScrollBox stickyScroll className="grow">
        {messages.map((m) => <MessageView key={m.id} message={m} />)}
      </ScrollBox>
      <Textarea placeholder="Ask anything…" onSubmit={send} autoFocus />
    </Box>
  );
}
```

## Keys

| Key | Action |
| :-- | :-- |
| `Enter` | Send |
| `Shift+Tab` | Switch agent (build / plan) |
| `Ctrl+P` | Commands |
| `Ctrl+X` then `L` | Sessions |
| `Ctrl+X` then `N` | New session |
| `Esc` twice | Interrupt the running session |

## Connect a local server

```bash
# From any directory:
opencode service status  # If stopped: opencode service start
bunx @textjs/opencode@latest proxy
```

Leave the bridge running. On the [OpenCode page](/opencode), enter `http://127.0.0.1:4096`, press **Connect**, and allow local network access if Chrome asks. Then enter the pairing code the bridge printed. The page stays paired until the bridge restarts or you press **Disconnect**. Use the bridge URL, not the service port: the bridge supplies the service credential and CORS headers. Stop it with Ctrl+C when done.

For a foreground server already on port 4096, run `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096` and connect the page to port **4097**. For a password-protected foreground server, export its `OPENCODE_PASSWORD` in the bridge shell; don't put a password in a browser URL.

The bridge is the `@textjs/opencode` package. It has no dependencies and also runs with `npx` on Node 22 or later. Inside a Text.js project, `text proxy` starts the same bridge.
