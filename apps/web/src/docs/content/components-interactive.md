Interactive components receive keyboard input through Text.js's input engine: a hidden `<textarea>` sink on the page captures keys, paste, IME composition and wheel events, and dispatches them to focused components at React's discrete priority. Typing feels immediate because it is.

```tsx#form
<Box className="flex-col gap-1 p-1">
  <Input placeholder="my-text-app" autoFocus />
  <Select options={regions} value={region} onChange={setRegion} />
  <Tabs tabs={plans} activeTab={plan} onChange={setPlan} variant="pill" />
</Box>
```

## Focus

Every interactive component registers with the focus manager. `Tab` and `Shift+Tab` cycle focus; `autoFocus` claims focus on mount when nothing else has it. The focused element draws its border in the theme's `borderFocus` color.

```tsx
const { isFocused, focus } = useFocus({ autoFocus: true });
const manager = useFocusManager();
manager.focus("search");
```

> **Good to know:** Focused editors register their input handlers at priority `10` (`FOCUSED_INPUT_PRIORITY`) and stop propagation, so typing `1` in an `<Input>` never triggers a global `1` shortcut.

## `<Input>`

Single-line text input with readline-style editing and horizontal scrolling.

| Prop | Type | Description |
| :-- | :-- | :-- |
| `value` / `defaultValue` | `string` | Controlled or uncontrolled value |
| `onChange` | `(value) => void` | Called on every edit |
| `onSubmit` | `(value) => void` | Called on `Enter` |
| `placeholder` | `string` | Shown when empty |
| `mask` | `string` | Mask character for secrets, e.g. `"•"` |
| `autoFocus` / `focused` / `id` | — | Focus control |
| `cursorBlink` | `boolean` | Blink at 530ms while focused (default: steady block) |

Supported keys: `←` `→` `Home` `End` `⌥←` `⌥→` (word), `⌫` `⌦` `⌥⌫` (word), `Ctrl+A` `Ctrl+E` `Ctrl+U` `Ctrl+K` `Ctrl+W`, and `⌘V` paste.

## `<Textarea>`

Multi-line prompt composer with soft wrapping and cursor-following vertical scroll. `Enter` submits; `Shift+Enter`, `Alt+Enter` and `Ctrl+J` insert a newline.

```tsx
<Textarea placeholder="Ask anything…" minRows={1} maxRows={6} onSubmit={send} />
```

## `<Select>`

A keyboard-driven option list with optional fuzzy filtering and viewport windowing.

| Prop | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `options` | `SelectOption[]` | — | `{ value, label, description?, hint?, badge?, disabled? }` |
| `value` | `V` | — | Selected value (marked `●`) |
| `onChange` | `(value, option) => void` | — | Called on `Enter` |
| `onHighlight` | `(value, option) => void` | — | Called as the highlight moves |
| `searchable` | `boolean` | `false` | Typing narrows the options |
| `limit` | `number` | `8` | Visible rows before windowing |

Navigation: `↑` `↓` `j` `k` `Ctrl+P` `Ctrl+N` `PgUp` `PgDn` `Home` `End`.

## `<Tabs>`

A horizontal tab strip with left/right switching and single-key shortcuts.

```tsx
<Tabs
  tabs={[{ id: "home", label: "Home", shortcut: "1" }, { id: "logs", label: "Logs", shortcut: "2" }]}
  activeTab={tab}
  onChange={setTab}
  variant="pill"
/>
```

## Unfocused cursor freeze (`▯`)

When the page loses focus — for example, because you clicked into DevTools to select text — every cursor freezes into a static hollow block `▯` and all blink timers stop. With no timers running, no frames are emitted, and `console.clear()` stops firing. **You can select and copy console text while your app is running.**

| Page state | Cursor | Frames emitted |
| :-- | :-- | :-- |
| Focused, typing | `█` steady block | On every edit |
| Focused, `cursorBlink` | `█` / ` ` at 530ms | 2 per second |
| Unfocused (DevTools focused) | `▯` hollow | `0` |
| `text.pause()` | unchanged | `0` |
