Text.js supports two complementary ways to style your application: **cell-grid utility classes** via `className`, and **typed props**. Both resolve to the same scene properties, and both are compiled into `%c` CSS by Turbolog. You will not write a stylesheet.

## Cell-grid utilities

`className` accepts a Tailwind-compatible utility vocabulary where the unit is one **cell** — one character column wide, one line tall:

```tsx#layout
<Box className="flex-row gap-2 p-1 border rounded">
  <Box className="flex-col grow border rounded px-1 bg-surface">
    <Text bold>p-1 · gap-2</Text>
    <Text color="muted">1 unit = 1 cell</Text>
  </Box>
  <Box className="flex-col grow border rounded px-1 border-accent">
    <Text color="accent">border-accent</Text>
    <Text className="text-subtle">grow basis-0</Text>
  </Box>
</Box>
```

| Category | Utilities |
| :-- | :-- |
| Flexbox | `flex-row` `flex-col` `grow` `shrink-0` `basis-0` `items-center` `justify-between` `flex-wrap` |
| Spacing | `p-1` `px-2` `py-1` `m-1` `mt-1` `gap-1` `gap-x-2` |
| Sizing | `w-full` `h-1` `w-[40]` `min-w-10` `max-h-20` |
| Borders | `border` `border-0` `rounded` `border-double` `border-heavy` `border-accent` |
| Color | `bg-surface` `text-muted` `fg-accent` `bg-red-500` `text-zinc-400` |
| Type | `font-bold` `italic` `underline` `line-through` `truncate` `whitespace-nowrap` |
| Position | `absolute` `inset-0` `top-1` `z-50` |
| Overflow | `overflow-hidden` `overflow-scroll` |

Class strings are parsed once and memoized, so re-rendering with the same `className` costs a single `Map` lookup.

> **Good to know:** Half-cells do not exist. `p-0.5` rounds to the nearest integer cell. Yoga runs with `pointScaleFactor = 1`, so every layout edge lands on a character boundary.

## Typed props

Every utility has a typed prop equivalent. Explicit props take precedence over `style`, which takes precedence over `className`:

```tsx
<Box flexDirection="column" padding={1} border="rounded" borderColor="accent" bg="surface">
  <Text bold color="accent">Typed props</Text>
</Box>
```

## Colors and tokens

Colors accept hex strings (`"#0070f3"`), packed `0xRRGGBBAA` numbers, Tailwind palette names (`"emerald-400"`) or **semantic theme tokens**:

| Token | Purpose |
| :-- | :-- |
| `fg` `muted` `subtle` | Text hierarchy |
| `bg` `surface` `panel` `elevated` | Surfaces, from app background to floating layers |
| `border` `borderFocus` | Hairlines and focus rings |
| `accent` `accentFg` | Brand color and text drawn on it |
| `success` `warning` `danger` `info` | Status |
| `selection` `codeBg` `diffAddBg` `diffRemoveBg` | Component surfaces |

Prefer tokens: they follow the active theme.

## Themes

Wrap any subtree in `ThemeProvider`, or set `viewport.theme` in `text.config.ts`. Five presets ship with Text.js:

```tsx#theme
<ThemeProvider theme="amberCrt">
  <Box className="border rounded p-1">
    <Text color="accent">amberCrt</Text>
  </Box>
</ThemeProvider>
```

| Theme | Appearance | Accent |
| :-- | :-- | :-- |
| `geistDark` | dark | `#0070f3` |
| `geistLight` | light | `#0070f3` |
| `opencodeDark` | dark | `#fab283` |
| `tokyoNight` | dark | `#7aa2f7` |
| `amberCrt` | dark | `#ffcc00` |

Create your own with `createTheme`:

```ts
import { createTheme } from "textjs";

export const vercel = createTheme({ id: "vercel", name: "Vercel", accent: "#ffffff", accentFg: "#000000" }, "geistDark");
```

Read and switch the app theme at runtime with `useAppTheme()`:

```tsx
const { themeName, setTheme } = useAppTheme();
```

## Responsive viewports

By default the grid is a fixed `100×32` cells. Set `viewport.responsive` to follow the docked DevTools size, and read the current size with `useViewport()`:

```tsx
const { cols, rows } = useViewport();
const sidebar = cols >= 90;
```

Text.js estimates the docked console size from `window.outerWidth - innerWidth` (side dock) or `outerHeight - innerHeight` (bottom dock), measured against the console's monospace cell width.

| Breakpoint | Grid | Typical layout |
| :-- | :-- | :-- |
| Compact | `80×24` | Single column |
| Default | `100×32` | Sidebar + content |
| Wide | `120×38` | Sidebar + content + inspector |
