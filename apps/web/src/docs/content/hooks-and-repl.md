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

## `useViewport`

```tsx
const { cols, rows, focused, paused } = useViewport();
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
text.resize(120, 38)
text.pause()
text.stats()
text.wireframe()
text.copyText()
```
