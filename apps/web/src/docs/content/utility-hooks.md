Text.js includes hooks for timers, animation, measurement and persistence. Timers and animations follow the renderer's frame pacing.

## Timers

```tsx
useInterval(refresh, live ? 1000 : null);
useTimeout(() => setHint(false), 3000);
```

Both always call the latest callback. `null` stops them.

## `useAnimationFrame`

```tsx
useAnimationFrame((delta, elapsed) => setPhase(elapsed / 1000), { isActive: playing });
```

Ticks once per frame slot. DevTools paints about 15 frames a second, so animating faster spends CPU on frames that are never painted. Loops share one timer per rate and stop while output is paused.

## `useTween` and `useSpring`

```tsx
const width = useTween(open ? 32 : 0, { duration: 240, easing: "easeOutCubic" });
const offset = useSpring(selected * 2);
```

Both return a number that animates toward the target and stop ticking once they settle. `easings` holds `linear`, `easeOutCubic`, `easeInOutCubic`, `easeOutExpo` and others.

## `useMeasure`

```tsx
const [ref, { width, height }] = useMeasure();
return <Box ref={ref} className="grow">{width > 80 ? <Wide /> : <Narrow />}</Box>;
```

Layout runs after React commits, so sizes arrive one frame later. It re-renders only when the size changes.

## `useBreakpoint`

```tsx
const { breakpoint, up } = useBreakpoint();
return up("md") ? <TwoColumns /> : <OneColumn />;
```

| Breakpoint | Columns |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

Columns are cells, not pixels. Pass your own thresholds as an argument.

## `useLocalStorage`

```tsx
const [theme, setTheme] = useLocalStorage("theme", "geistDark");
```

JSON in `localStorage`, in memory outside the browser. Hooks sharing a key stay in sync, across tabs too.

## `useClipboard`

```tsx
const { copy, copied } = useClipboard();
useKeymap({ y: { label: "Copy id", run: () => copy(deployment.id) } });
return <Text color="muted">{copied ? "Copied" : deployment.id}</Text>;
```

## `<FocusScope>`

An invisible focus boundary. With `trap`, `Tab` and `useInput` stay inside it, exactly like a `<Modal>` without the overlay.

```tsx
<FocusScope trap={editing}>
  <Input autoFocus />
</FocusScope>
```
