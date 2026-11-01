Declare shortcuts once with `useKeymap`. Text.js routes them, lists them in a `?` overlay, shows them in your footer and makes them searchable in a command palette.

```tsx#keymap
useKeymap(
  {
    "j, down": { label: "Next", run: next, hint: true },
    "k, up": { label: "Previous", run: previous },
    "g g": { label: "Go to top", run: top },
    "ctrl+s": { label: "Save", run: save, hint: true },
  },
  { group: "Navigation" },
);

return (
  <>
    <StatusBar right={<Text color="subtle">main</Text>}>
      <KeyHints />
    </StatusBar>
    <CommandPalette commands={commands} />
    <KeyHelp />
  </>
);
```

## `useKeymap`

| Syntax | Meaning |
| :-- | :-- |
| `ctrl+k` | Modifiers: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` or `Ctrl`, whichever is held |
| `j, down` | Alternatives |
| `g g` | A sequence (1 second between keys) |
| `G` | Uppercase implies `Shift` |
| `?` | Printable keys match the character |

Values are a handler, or a binding with `label`, `group`, `hint`, `disabled` and `noRepeat`. Unlabeled bindings work but stay out of the help overlay.

`useKeymapBindings()` returns the labeled bindings that are live right now, for footers and menus of your own.

Keymaps run through `useInput`, so the usual rules apply: focused inputs win, a matched key stops propagation, and an open `<Modal>` disables bindings outside it. Pass `{ priority, global, isActive }` to change that.

## `<KeyHelp>`

Press `?` for every labeled binding, grouped. It lists what is live where it opened.

```tsx
<KeyHelp keys="?" title="Keyboard shortcuts" />
```

## `<KeyHints>` and `<StatusBar>`

`<KeyHints />` shows bindings marked `hint: true`, or explicit `items`. `<StatusBar>` is a one-row footer with a `right` slot.

```tsx
<StatusBar right={<Text color="subtle">▼ iad1</Text>}>
  <KeyHints items={[{ keys: "ctrl+k", label: "commands" }]} />
</StatusBar>
```

`<Kbd>mod+k</Kbd>` renders a single key. `formatKeys("ctrl+shift+p")` gives `⌃⇧P` on macOS and `ctrl+shift+P` elsewhere.

## `<CommandPalette>`

`Ctrl+K` (or `Ctrl+P`) opens a fuzzy launcher over your commands and every labeled binding, with matched letters highlighted.

```tsx
<CommandPalette
  commands={[{ id: "theme", label: "Toggle theme", group: "View", run: toggleTheme }]}
/>
```

| Prop | Description |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Open shortcut (default `ctrl+k, ctrl+p`; `null` to disable) |
| `includeKeymap` | List keymap bindings (default `true`) |
| `open` / `onOpenChange` | Controlled |

The palette closes before it runs a command, so commands can open modals of their own. `fuzzyMatch` and `fuzzyFilter` are exported for your own lists.
