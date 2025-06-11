Hooks connect your components to the console runtime: keyboard and paste input, wheel scrolling, focus, viewport size and live renderer telemetry. All hooks must be called inside a console root.

## `useInput`

Subscribe to keyboard input. Handlers run at React's discrete (synchronous) priority, so state updates from keystrokes commit in the same frame.

```tsx
useInput((e) => {
  if (e.key === "up") setIndex((i) => i - 1);
  if (e.ctrl && e.key === "p") setPaletteOpen(true);
  if (e.input === "q") exit();
});
```

| Field | Type | Description |
| :-- | :-- | :-- |
| `key` | `string` | `"up"` `"return"` `"escape"` `"tab"` `"space"` `"f2"`… or the lowercased character |
| `input` | `string` | Text produced by the key (empty for non-printing keys) |
| `ctrl` `meta` `shift` `alt` | `boolean` | Modifiers |
| `stopPropagation()` | `() => void` | Prevent lower-priority handlers from receiving the event |

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `isActive` | `boolean` | `true` | Disable without unmounting |
| `priority` | `number` | `0` | Higher priorities run first |
| `global` | `boolean` | `false` | Keep receiving input while a `<Modal>` is open |

> **Good to know:** Browser and DevTools shortcuts always pass through: `⌘⌥J`, `F12`, `⌘R`, `⌘L`, `⌘T`, `⌘W`. Text.js will never trap your users in their own console.

## `usePaste` and `useWheel`

```tsx
usePaste((e) => insert(e.text));
useWheel((e) => scrollBy(e.rows));
```

Wheel deltas are normalized to text rows (`e.rows`) and columns (`e.cols`) regardless of `deltaMode`.

## `useFocus` and `useFocusManager`

```tsx
const { isFocused, focus, blur } = useFocus({ id: "search", autoFocus: true });
const { focusNext, focusPrevious, focus: focusId, activeId } = useFocusManager();
```

## `useViewport`

Reactive grid size, page focus and pause state:

```tsx
const { cols, rows, focused, paused, dock, resize, setResponsive } = useViewport();
```

| Field | Description |
| :-- | :-- |
| `cols` `rows` | Current grid size in cells |
| `responsive` | Following the docked DevTools size |
| `dock` | `"right"` `"bottom"` `"undocked"` `"fixed"` |
| `focused` | The page has keyboard focus |
| `paused` | Output paused (`text.pause()`) |

## `useConsoleStats`

Throttled renderer telemetry. Displaying stats never re-triggers itself, so a mounted HUD cannot feed an infinite render loop:

```tsx
const { fps, totalMs, spanCount, frameCount, skippedFrames } = useConsoleStats({ interval: 250 });
return <Text color="subtle">{`${totalMs.toFixed(2)}ms · ${spanCount} spans`}</Text>;
```

## `useApp`

```tsx
const { exit, pause, resume, resize, renderer } = useApp();
```

`exit()` unmounts the app and disposes the renderer; `root.waitUntilExit()` resolves afterwards.

## The `window.text` console REPL

Every Text.js app registers a REPL helper on `window.text`. Type these directly into the DevTools console prompt — beneath the app that is rendering above it.

```js
text.help()                 // list commands
text.resize(120, 38)        // pin the grid size
text.responsive(true)       // follow the docked DevTools size
text.pause()                // freeze output: select & copy freely
text.resume()
text.stats()                // { fps, totalMs, spanCount, dirtyRows, … }
text.wireframe()            // toggle the Yoga layout wireframe overlay
text.copyText()             // copy the current frame as plain text
```

> **Good to know:** On textjs.org, `window.text` controls the live companion app. Open DevTools and try `text.wireframe()`.

| Command | Returns | Description |
| :-- | :-- | :-- |
| `resize(cols, rows)` | `RendererStats` | Pin the console grid size |
| `responsive(on?)` | `RendererStats` | Follow docked DevTools size |
| `pause()` / `resume()` | `void` | Freeze / resume output |
| `stats()` | `RendererStats` | Frame telemetry |
| `copyText()` | `string` | Plain-text frame (also copied to the clipboard) |
| `wireframe(on?)` | `boolean` | Toggle the layout wireframe |
| `help()` | `string` | Print help |
