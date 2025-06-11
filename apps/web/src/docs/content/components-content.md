Content components render rich documents into the cell grid: Markdown, syntax-highlighted code, unified diffs, activity indicators and pixel lettering.

## `<Markdown>`

Renders CommonMark-style Markdown: headings, emphasis, inline code, links, lists, task lists, block quotes, tables, rules and fenced code blocks.

The parser is **streaming-safe**: incomplete constructs — an unclosed code fence, a dangling `**` — degrade gracefully instead of throwing or swallowing the remainder of the document. Pass a growing string on every token and the frame stays stable.

```tsx#streaming
const [text, setText] = useState("");
useEffect(() => stream.on("token", (t) => setText((s) => s + t)), []);

return <Markdown>{text}</Markdown>;
```

| Prop | Type | Description |
| :-- | :-- | :-- |
| `children` / `content` | `string` | Markdown source |
| `codeMaxHeight` | `number` | Clip fenced code blocks to this many rows |
| `codeLineNumbers` | `boolean` | Show line numbers in fenced code |

## `<Code>`

Syntax-highlighted source with optional line numbers and highlighted lines. The tokenizer is dependency-free and supports `ts` `tsx` `js` `jsx` `json` `bash` `css` `md` `python` `rust` and `go`.

```tsx
<Code code={source} language="tsx" showLineNumbers highlightLines={[3, 4]} maxHeight={12} />
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `code` | `string` | — | Source text |
| `language` | `string` | — | Language id |
| `showLineNumbers` | `boolean` | `false` | Gutter with `│` separator |
| `highlightLines` | `number[]` | — | 1-based lines tinted with `selection` |
| `maxHeight` | `number` | — | Clip with a "… N more lines" footer |
| `wrap` | `WrapMode` | `"nowrap"` | Long line handling |

## `<Diff>`

Renders unified diffs, or computes one in place from `{ before, after }`. Lines are syntax-highlighted using the filename's extension, with add/remove row tints from the theme.

```tsx#diff
<Diff patch={{ before, after, filename: "app/page.tsx" }} />
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `patch` | `string \| { before, after, filename? }` | — | Unified diff or texts to compare |
| `showLineNumbers` | `boolean` | `true` | Old / new line gutters |
| `context` | `number` | `3` | Context lines around changes |
| `maxHeight` | `number` | — | Clip to this many rows |

## `<Spinner>`

```tsx#spinner
<Spinner variant="dots" label="Building…" />
```

| Variant | Frames | Interval |
| :-- | :-- | :-- |
| `dots` | `⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏` | 80ms |
| `pulse` | `▼ ▼ ▽ ▽` | 220ms |
| `matrix` | `▪⬝⬝ ⬝▪⬝ ⬝⬝▪` | 140ms |
| `line` | `─ \ │ /` | 100ms |

Spinner timers stop while the console is paused, so an idle spinner on a paused app costs nothing.

## `<AsciiFont>`

Big pixel lettering for headers and splash screens. Supports `A–Z`, `0–9`, `. - / :`, space and `▼`.

```tsx#ascii
<AsciiFont text="▼ TEXT.JS" color="accent" />
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `text` | `string` | — | Text to render |
| `font` | `"block" \| "compact"` | `"block"` | 5-row blocks or 3-row half-blocks |
| `letterSpacing` | `number` | `1` | Columns between glyphs |
