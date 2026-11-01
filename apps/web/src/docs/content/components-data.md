`<List>`, `<Table>` and `<Tree>` display large data sets. Only visible rows are rendered.

```tsx#table
<Table
  columns={[
    { key: "name", header: "Service" },
    { key: "region", header: "Region", width: 8 },
    { key: "p95", header: "p95", width: 7, align: "right" },
  ]}
  rows={services}
  sortable
  selectionMode="multiple"
  onSelect={(s) => router.push(`/services/${s.name}`)}
/>
```

## Navigation

`<List>`, `<Table>` and `<Tree>` share one keyboard model.

| Keys | Action |
| :-- | :-- |
| `↑` `↓` / `j` `k` | Move |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | Page, half page |
| `Home` `End` / `g` `G` | First, last |
| `↵` | `onSelect` |
| Wheel | Move the cursor |

They fill their parent by default. Pass `height` for a fixed number of rows.

## `<List>`

A virtualized list. Rows are one cell tall.

```tsx
<List
  items={requests}
  getLabel={(r) => `${r.method} ${r.path}`}
  onSelect={open}
/>
```

| Prop | Description |
| :-- | :-- |
| `items` | Any array |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | Skipped by the cursor |
| `height` | Visible rows (default: fill) |
| `highlightedIndex` / `onHighlight` | Controlled cursor |
| `vimKeys` | `j` `k` `g` `G` (default `true`) |

## `<Table>`

Columns share the remaining width unless they set `width`. Headers and cells use the same flex rules, so they always line up.

| Column field | Description |
| :-- | :-- |
| `key` | Id and default accessor |
| `width` / `grow` | Fixed cells or share of the rest |
| `align` | `left` `right` `center` |
| `value` | Display and sort value |
| `render` | Custom cell content |
| `compare` | Custom sort |

### Sorting

With `sortable`, press a column's number to sort by it (again to flip), `s` to cycle columns and `S` to flip direction. Sorting is stable. Control it with `sort` and `onSortChange`.

### Selection

`selectionMode="multiple"` adds a check column; `Space` toggles the highlighted row. Use `selectedKeys` and `onSelectionChange` to control it, and `getRowKey` for stable keys.

## `<Tree>`

An expandable tree with guides.

```tsx#tree
<Tree
  data={[{ id: "app", label: "app", children: [{ id: "page", label: "page.tsx", hint: "2.8 kB" }] }]}
  defaultExpanded={["app"]}
  onSelect={(node) => open(node.id)}
/>
```

`→` expands or steps into a branch. `←` collapses or jumps to the parent. `Space` toggles. `flattenTree(data, expanded)` exposes the visible rows if you need your own renderer.
