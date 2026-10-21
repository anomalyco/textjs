[OpenCode](https://opencode.ai) is an open source coding agent. **OpenCode Lite** is a console client for it, built with Text.js.

## Try it

- On this site: open DevTools and press `3`, or visit [OpenCode](/opencode).
- Locally: `bunx create-text-app my-app --template opencode`.

The site runs a sandbox with a scripted agent. Type any prompt.

## Anatomy

| Region | Components |
| :-- | :-- |
| Transcript | `<ScrollBox stickyScroll>` + `<Markdown>` |
| Tool cards | `<Code>` and `<Diff>` |
| Prompt | `<Textarea>` |
| Palette | `<Modal>` + `<Select searchable>` |

```tsx@app/sessions/[id]/page.tsx
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
| `Tab` | Toggle build / plan |
| `Ctrl+P` | Sessions and commands |
| `Ctrl+N` | New session |
| `Esc` | Interrupt or leave the prompt |

## Connect a local server

```bash
# From any directory:
opencode service status  # If stopped: opencode service start
bunx @textjs/next proxy
```

Leave the bridge running. On the [OpenCode page](/opencode), enter `http://127.0.0.1:4096`, press **Connect**, and allow local network access if Chrome asks. Use the bridge URL, not the service port: the bridge supplies the service credential and CORS headers. Stop it with Ctrl+C when done.

For a foreground server already on port 4096, run `bunx @textjs/next proxy --port 4097 --target http://127.0.0.1:4096` and connect the page to port **4097**. For a password-protected foreground server, export its `OPENCODE_PASSWORD` in the bridge shell; don't put a password in a browser URL.
