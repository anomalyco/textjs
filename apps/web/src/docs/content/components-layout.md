Layout components are the structural primitives of every Text.js application. They map directly onto Yoga flexbox nodes and are painted into the cell buffer with scissor clipping.

## `<Box>`

The fundamental layout container — the `<div>` you no longer need. Accepts every flexbox, spacing, sizing, border and color prop.

```tsx#layout
<Box className="flex-row gap-2 p-1 border rounded">
  <Box className="flex-col grow border rounded px-1 bg-surface">
    <Text bold>Sidebar</Text>
    <Text color="muted">flex-col grow</Text>
  </Box>
  <Box className="flex-col grow border rounded px-1 border-accent">
    <Text color="accent">Content</Text>
  </Box>
</Box>
```

| Prop | Type | Description |
| :-- | :-- | :-- |
| `className` | `string` | Cell utilities, e.g. `"flex-col gap-1 p-1 border rounded"` |
| `flexDirection` | `"row" \| "column"` | Main axis (default `"column"` at the root) |
| `border` | `boolean \| BorderStyle` | `single` `rounded` `double` `heavy` `dashed` `ascii` |
| `title` / `bottomTitle` | `string` | Text inlaid into the top / bottom border |
| `bg` / `fg` | `ColorInput` | Background and inherited text color |
| `focused` | `boolean` | Switches the border to `borderFocus` |
| `zIndex` | `number` | Paint order for overlapping layers |
| `overflow` | `"visible" \| "hidden" \| "scroll"` | Scissor clipping |

## `<Text>`

Rich inline text with wrapping and truncation. Nested `<Text>` elements become styled spans of the outer text — they never break onto new lines on their own.

```tsx
<Text wrap="truncate-end">
  <Text bold>Deployed</Text> to <Text color="accent">production</Text> in 812ms
</Text>
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `color` | `ColorInput` | `fg` | Alias for `fg` |
| `bold` `italic` `underline` `strikethrough` `dim` `inverse` | `boolean` | `false` | Attributes |
| `wrap` | `"wrap" \| "nowrap" \| "truncate-end" \| "truncate-middle" \| "truncate-start"` | `"wrap"` | Overflow behavior |
| `align` | `"left" \| "center" \| "right"` | `"left"` | Alignment within the box |
| `allowLink` | `boolean` | `false` | Allow DevTools to linkify URLs in this span |

Width is measured with `Intl.Segmenter` plus East Asian Width and emoji tables, so `漢字` and `👩‍💻` occupy two cells and never desynchronize the grid.

## `<ScrollBox>`

A clipping, scrollable column with keyboard, wheel and sticky-bottom support. Ideal for logs and chat transcripts.

```tsx#scrollbox
<ScrollBox stickyScroll focusable autoFocus className="border rounded px-1" height={8}>
  {logs.map((line, i) => <Text key={i}>{line}</Text>)}
</ScrollBox>
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `stickyScroll` | `boolean` | `false` | Pin to the bottom as content grows; scrolling up releases |
| `focusable` | `boolean` | `false` | Join Tab order for `↑`/`↓`/`PgUp`/`PgDn`/`g`/`G` |
| `showScrollbar` | `boolean` | `true` | Draw a 1-column `┃` scrollbar |
| `wheel` | `boolean` | `true` | Respond to trackpad and mouse wheel input |
| `ref` | `ScrollBoxHandle` | — | `scrollTo`, `scrollBy`, `scrollToBottom`, `isSticky` |

## `<Modal>`

A centered overlay that dims everything beneath it (`backdropDim`) and traps focus and input. While open, `useInput` handlers outside the modal are inert.

```tsx#modal
<Modal title=" Commands " onClose={() => setOpen(false)} width={48}>
  <Select searchable autoFocus options={commands} onChange={run} />
</Modal>
```

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `open` | `boolean` | `true` | Render the modal |
| `title` / `footer` | `string` | — | Border captions (`footer` defaults to `"esc close"`) |
| `onClose` | `() => void` | — | Called on `Escape` |
| `backdropDim` | `number` | `0.68` | 0..1 dim strength applied to cells beneath |
| `width` / `height` | `Dimension` | `"60%"` | Panel size |
| `zIndex` | `number` | `50` | Layer order |

> **Good to know:** Backdrop dimming is a real per-cell color blend in the `CellBuffer`, not an overlay. The dimmed frame still costs exactly one `console.log`.

## `<Spacer>` and `<Divider>`

```tsx
<Box className="flex-row">
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
<Divider title="Deployments" />
```

`<Spacer />` grows to fill available space (or `size` cells). `<Divider />` draws a full-width `─` rule with an optional inline `title`, or a vertical `│` rule with `vertical`.

## `<Badge>` and `<KeyHint>`

```tsx
<Badge variant="success">READY</Badge>
<Badge variant="outline">prod</Badge>
<KeyHint keys="⌘K" label="search" />
```

| Badge variant | Renders |
| :-- | :-- |
| `default` `accent` `success` `warning` `danger` `info` | Inverse label on the token color |
| `outline` | `[label]` in `muted` |
