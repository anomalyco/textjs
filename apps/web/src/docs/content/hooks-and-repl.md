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

`usePaste` and `useWheel` take the same options. `ambient` has no effect on `useWheel`.

| Option | Description |
| :-- | :-- |
| `isActive` | `false` turns the handler off without unmounting (default `true`) |
| `priority` | Higher priorities run first (default `0`). Focused components use `FOCUSED_INPUT_PRIORITY` (`10`) |
| `global` | Keep receiving input while a `<Modal>` outside this component is open (default `false`) |
| `ambient` | Don't count this handler toward the [focus hint](#usepagefocus) (default `false`) |

The Dev Overlay's shortcut (`F2` or `` Ctrl+` ``) is ambient, so a page with no other keyboard input doesn't show the hint.

```tsx
useInput((e) => {
  if (e.key === "f2") toggleOverlay();
}, { ambient: true });
```

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

While the page doesn't have focus and the app has a `useInput` or `usePaste` handler, a `useKeyState` hook or a focus target that Tab can reach, the console frame's last row becomes an amber bar that reads "Click the page to use the keyboard". Handlers marked [`ambient`](#useinput) don't count. The hint doesn't appear in a terminal, in tests or in inline mirrors. Each time the hint appears, it blinks for about 6 seconds, unless the system's reduced motion setting is on. To decide yourself when it shows, set `focusHint: false` in `text.config.ts` or `createConsoleRoot` and render `<FocusHint>`:

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

## Loading on console intent (experimental)

`@textjs/core/experimental` exports `onConsoleIntent` for pages that download their console app only when a visitor wants it. It calls your function once, with the reason:

| Reason | When |
| :-- | :-- |
| `dock` | DevTools is docked when the page loads, or docks later. Text.js reads it from the window size |
| `shortcut` | The visitor presses F12 or Ctrl+Shift+J, I, C or K, or ⌘⌥J, I, C or K on a Mac. The browser still opens DevTools |
| `engage` | A primary click on an element matching `engageSelector`, Enter or Space on a `[data-textjs-engage]` button, or a size picked in `<ViewportControl>` before the app starts. Clicks on links, buttons and form fields inside a matching element don't count unless they have `data-textjs-engage` too |
| `session` | One of the above already happened in this tab, so a reload boots at once |
| `manual` | You called `trigger()` on the returned handle |

```ts
import { onConsoleIntent } from "@textjs/core/experimental";

onConsoleIntent(
  async (e) => {
    const { start } = await import("./console");
    start({ focus: e.reason === "engage" });
  },
  { prefetch: () => void import("./console") },
);
```

DevTools opened in its own window from a browser menu doesn't show up in the window size. Those visitors start the app from an `engage` element, and `session` keeps it starting on reloads in that tab.

Nothing fires automatically on touch screens. Call `trigger()` from your own control.

| Option | Description |
| :-- | :-- |
| `engageSelector` | Elements that start the app when clicked (default `[data-textjs-engage], [data-textjs-focus-pad], text-console`). `false` adds no listeners |
| `persist` | Remember intent for the tab in `sessionStorage` under `CONSOLE_INTENT_KEY` (default `true`) |
| `prefetch` | Called at most once, when the pointer or focus enters an `engageSelector` element |
| `idlePrefetch` | Also call `prefetch` when the browser is idle after `load` (default `false`) |

`prefetch` never runs on touch screens, with Data Saver on, or on connections slower than 4G. `canPrefetchConsole()` returns the same check. The handle's `dispose()` removes every listener.

`<ViewportControl>` works before the console root exists. Picking a size saves it, fires `engage` so `onConsoleIntent` starts the app, and applies the size once `root` is set. See [Breaking changes](/docs/support-policy#breaking-changes) for how experimental exports are versioned.
