Hooks connect components to input, focus and the viewport.

## `useInput`

```tsx
useInput((e) => {
  if (e.key === "up") setIndex((i) => i - 1);
  if (e.ctrl && e.key === "p") setPaletteOpen(true);
});
```

| Field | Description |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | Text produced by the key |
| `ctrl` `meta` `shift` `alt` | Modifiers |
| `stopPropagation()` | Stop lower-priority handlers |

Browser shortcuts like `⌘⌥J` and `⌘R` always pass through.

## `usePaste` and `useWheel`

```tsx
usePaste((e) => insert(e.text));
useWheel((e) => scrollBy(e.rows));
```

## `useKeyState` (experimental)

`@textjs/react/experimental` exports `useKeyState` to track held physical keys by `KeyboardEvent.code` (`"KeyW"`, `"ArrowUp"`, `"ControlLeft"`). Polling `keys.isDown(code)` or reading `keys.pressed` does not trigger React re-renders. Pass a callback to react to key presses and releases as they happen.

```tsx
import { useKeyState } from "@textjs/react/experimental";

const keys = useKeyState((e) => {
  if (e.code === "Space" && e.down) fire();
});
```

Held keys are released automatically when the page loses focus. See [Breaking changes](/docs/support-policy#breaking-changes) for how experimental exports are versioned.

## `useViewport`

```tsx
const { cols, rows, focused, paused } = useViewport();
```

## `usePageFocus`

`usePageFocus()` returns whether the page has focus. Keystrokes reach the app only while it does. It's the same value as `useViewport().focused`, but it re-renders only when focus changes.

```tsx
const focused = usePageFocus();
```

While the page doesn't have focus and the app has a `useInput` or `usePaste` handler or a focus target, the console frame's last row reads "Click the page to use the keyboard". It doesn't appear in a terminal, in tests or in inline mirrors. To decide yourself when it shows, set `focusHint: false` in `text.config.ts` or `createConsoleRoot` and render `<FocusHint>`:

```tsx
<FocusHint active={editing} />
```

## `useConsoleStats`

```tsx
const { totalMs, spanCount } = useConsoleStats({ interval: 250 });
```

## `useApp`

```tsx
const { exit, pause, resume } = useApp();
```

## The `window.text` REPL

Every app adds helpers to `window.text`. Type them in the DevTools prompt.

```js
text.help()
text.resize(120, 36)   // pin the grid size
text.responsive(true)  // fit the docked console again
text.pause()
text.stats()
text.wireframe()
text.copyText()
```
