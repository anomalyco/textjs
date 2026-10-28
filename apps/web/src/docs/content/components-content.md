Markdown, code, diffs and lettering for the cell grid.

## `<Markdown>`

Streaming-safe Markdown. Pass a growing string and the frame stays stable.

```tsx#streaming
const [text, setText] = useState("");
useEffect(() => stream.on("token", (t) => setText((s) => s + t)), []);

return <Markdown>{text}</Markdown>;
```

## `<Code>`

Syntax highlighting for `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` and more.

```tsx
<Code code={source} language="tsx" showLineNumbers maxHeight={12} />
```

| Prop | Description |
| :-- | :-- |
| `language` | Language id |
| `showLineNumbers` | Line gutter |
| `highlightLines` | Lines to tint |
| `maxHeight` | Clip with a "more lines" footer |

## `<Diff>`

Unified diffs, or computed from `{ before, after }`.

```tsx#diff
<Diff patch={{ before, after, filename: "app/page.tsx" }} />
```

## `<Spinner>`

Variants: `dots`, `pulse`, `matrix` and `line`. Timers stop while paused.

```tsx
<Spinner variant="dots" label="Building…" />
```

## `<AsciiFont>`

Big pixel lettering for headers.

```tsx#ascii
<AsciiFont text="▼ TEXT.JS" color="accent" />
```

Use `font="compact"` for a 3-row variant. Pass a FIGlet font from [`@textjs/font`](/docs/fonts), like `font={slant}`, for figlet lettering.
