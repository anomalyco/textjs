These primitives lay out the cell grid with Yoga flexbox.

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

## Spacer, Divider and Badge

```tsx
<Spacer />
<Divider title="Deployments" />
<Badge variant="success">READY</Badge>
<KeyHint keys="⌘K" label="search" />
```

## Layout helpers

Shorthands for common flex arrangements.

```tsx
<Center>
  <Text>Nothing deployed yet</Text>
</Center>

<Stack gap={1} divider>
  <Overview />
  <Deployments />
</Stack>

<Grid columns={3} gap={1}>
  {metrics.map((m) => <Metric key={m.id} {...m} />)}
</Grid>
```

## `<SplitPane>`

Two panes and a divider. With `resizable`, the divider joins the `Tab` order and `←` `→` resize it (`Shift` for five cells).

```tsx
<SplitPane defaultSize={0.3} resizable minSize={16}>
  <Sidebar />
  <Content />
</SplitPane>
```

`size` is a fraction (`0.3`) or a number of cells (`24`). `direction="column"` stacks the panes.
