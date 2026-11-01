---
title: Keyboard shortcuts with useKeymap
date: 2026-08-25
author: Adam
summary: Declare a binding once with useKeymap, and Text.js routes the key, lists it in a ? help screen, shows it in the footer and adds it to a Ctrl+K command palette.
---

Until now, a Text.js app handled keys in `useInput` and listed them a second time, by hand, in a `<KeyHint>` footer. `useKeymap` replaces both with one declaration.

```tsx
import { CommandPalette, KeyHelp, KeyHints, StatusBar, Text, useKeymap } from "@textjs/react";

export default function Sessions() {
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
}
```

Pressing `j` runs `next`. On macOS, `<KeyHints>` shows `j/↓ Next` and `⌃S Save` in the footer, because those bindings set `hint`. `?` opens a help screen with all four, grouped under Navigation, and `Ctrl+K` opens a palette that can search them.

## Key syntax

| Syntax | Meaning |
| :-- | :-- |
| `ctrl+k` | Modifiers: `ctrl`, `alt`, `shift`, `meta` and `mod` |
| `mod+k` | `⌘` or `Ctrl`, whichever is held |
| `j, down` | Alternatives |
| `g g` | A sequence, with up to 1 second between keys |
| `G` | Uppercase implies `Shift` |
| `?` | Printable keys match the character |

A binding is a handler, or an object with `label`, `group`, `hint`, `command`, `disabled` and `noRepeat`. `command: false` keeps a labeled binding out of the palette. Unlabeled bindings work, but they stay out of the help screen and the palette.

## Routing

Each keymap registers one `useInput` handler, so the existing input rules apply. A focused `<Input>` handles keys first, because editors listen at priority 10 and keymaps at 0. A matched key stops propagation. An open `<Modal>` disables bindings outside it, unless the keymap passes `global: true`.

Sequences are matched inside that handler. A key that starts a sequence is held as pending and stops propagation, and the sequence resets when the next key arrives more than `sequenceTimeout` (1,000ms by default) later:

```ts
if (p.events.length > 0 && now - p.at > sequenceTimeout) p.events = [];
```

## One registry per root

Labeled bindings are published to a registry that belongs to the console root. `<KeyHelp>`, `<KeyHints>` and `<CommandPalette>` read from it, and so can your own components through `useKeymapBindings()`. While a modal is open, the registry returns only the bindings inside it, so the help screen lists the keys that work right now.

Keymaps are usually written inline, which creates a new object on every render. To keep that cheap, a keymap republishes its labels only when their visible shape changes:

```ts
// Publish labels only when the visible shape changes (inline keymap objects are fine).
const signature = compiled
  .map((c) => `${c.keys}\u0000${c.binding.label ?? ""}\u0000${c.binding.group ?? ""}\u0000${c.binding.hint ? 1 : 0}${c.binding.command === false ? 0 : 1}\u0000${c.binding.disabled ? 1 : 0}`)
  .join("\u0001");
```

Handlers are read from a ref when a key arrives, so a new closure on each render is never stale.

## The help screen and the palette

`<KeyHelp>` opens on `?` and lists every live labeled binding by group. `keys` and `title` change the trigger and the heading.

`<CommandPalette>` opens on `Ctrl+K` or `Ctrl+P`. It fuzzy-matches over your `commands` and every labeled binding, and highlights the matched letters. It closes before it runs a command, so a command can open a modal of its own.

`formatKeys` renders a binding for display. `formatKeys("ctrl+shift+p")` returns `⌃⇧P` on macOS and `ctrl+shift+P` elsewhere, and `<Kbd>` renders a single key with the same formatting.

`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` and `<CommandPalette>` ship in Text.js 1.0. The reference is in [Keyboard](/docs/keyboard).
