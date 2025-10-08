Structural primitives, backed by Yoga flexbox.

## `<Box>`

The layout container.

```tsx#layout
<Box className="flex-row gap-2 p-1 border rounded">
  <Box className="flex-col grow border rounded px-1 bg-surface">
    <Text bold>Sidebar</Text>
  </Box>
  <Box className="flex-col grow border rounded px-1 border-accent">
    <Text color="accent">Content</Text>
  </Box>
</Box>
```

| Prop | Description |
| :-- | :-- |
| `className` | Cell utilities |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | Text inlaid in the top border |
| `bg` / `fg` | Background and text color |
| `overflow` | `hidden` or `scroll` |

## `<Text>`

Inline text. Nested `<Text>` becomes styled spans.

```tsx
<Text wrap="truncate-end">
  <Text bold>Deployed</Text> to <Text color="accent">production</Text>
</Text>
```

| Prop | Description |
| :-- | :-- |
| `color` | Text color |
| `bold` `italic` `underline` `dim` | Attributes |
| `wrap` | `wrap` `nowrap` `truncate-end` |

## `<ScrollBox>`

A scrollable column. `stickyScroll` pins to the bottom as content grows.

```tsx#scrollbox
<ScrollBox stickyScroll focusable className="border rounded px-1" height={8}>
  {logs.map((line, i) => <Text key={i}>{line}</Text>)}
</ScrollBox>
```

## `<Modal>`

A centered overlay that dims what's beneath and traps focus.

```tsx#modal
<Modal title=" Commands " onClose={() => setOpen(false)} width={48}>
  <Select searchable autoFocus options={commands} onChange={run} />
</Modal>
```

## Small pieces

```tsx
<Spacer />
<Divider title="Deployments" />
<Badge variant="success">READY</Badge>
<KeyHint keys="⌘K" label="search" />
```
