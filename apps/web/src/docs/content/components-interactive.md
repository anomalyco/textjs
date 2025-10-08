Keyboard-driven inputs with built-in focus management.

```tsx#form
<Box className="flex-col gap-1 p-1">
  <Input placeholder="my-text-app" autoFocus />
  <Select options={regions} value={region} onChange={setRegion} />
  <Tabs tabs={plans} activeTab={plan} onChange={setPlan} variant="pill" />
</Box>
```

## Focus

`Tab` and `Shift+Tab` cycle focus. `autoFocus` claims focus on mount.

```tsx
const { isFocused } = useFocus({ autoFocus: true });
useFocusManager().focus("search");
```

Focused editors swallow their keys, so typing `1` never triggers a global shortcut.

## `<Input>`

Single-line input with readline-style editing.

| Prop | Description |
| :-- | :-- |
| `value` / `onChange` | Controlled value |
| `onSubmit` | Called on `Enter` |
| `placeholder` | Shown when empty |
| `mask` | Mask character for secrets |

## `<Textarea>`

Multi-line composer. `Enter` submits, `Shift+Enter` adds a newline.

```tsx
<Textarea placeholder="Ask anything…" maxRows={6} onSubmit={send} />
```

## `<Select>`

A keyboard option list with optional fuzzy search.

| Prop | Description |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Called on `Enter` |
| `searchable` | Typing filters options |

## `<Tabs>`

```tsx
<Tabs tabs={[{ id: "home", label: "Home", shortcut: "1" }]} activeTab={tab} onChange={setTab} />
```

## Unfocused cursor

When the page loses focus, cursors freeze and frames stop — so you can select console text while the app runs.
