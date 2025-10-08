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
bunx textjs proxy
```

The bridge finds your running opencode daemon and serves it on `http://127.0.0.1:4096` with the CORS and Private Network Access headers browsers require. Then press Connect on the [OpenCode page](/opencode).

`opencode serve --port 4096 --cors https://textjs.org` works too.
