Style components with `className` utilities or typed props. Text.js apps have no stylesheets.

## Utilities

`className` takes Tailwind-style utilities. One unit is one cell.

```tsx#layout
<Box className="flex-row gap-2 p-1 border rounded">
  <Box className="flex-col grow border rounded px-1 bg-surface">
    <Text bold>p-1 · gap-2</Text>
    <Text color="muted">1 unit = 1 cell</Text>
  </Box>
  <Box className="flex-col grow border rounded px-1 border-accent">
    <Text color="accent">border-accent</Text>
  </Box>
</Box>
```

| Category | Examples |
| :-- | :-- |
| Layout | `flex-row` `grow` `items-center` `gap-1` |
| Spacing | `p-1` `px-2` `mt-1` |
| Borders | `border` `rounded` `border-accent` |
| Color | `bg-surface` `text-muted` |

## Typed props

Every utility has a prop. Props win over `className`.

```tsx
<Box flexDirection="column" padding={1} border="rounded" borderColor="accent">
  <Text bold>Typed props</Text>
</Box>
```

## Colors

Use hex, Tailwind names or theme tokens like `fg`, `muted`, `surface`, `accent`, `success` and `danger`. Tokens follow the active theme.

## Themes

Five presets ship built in: `geistDark`, `geistLight`, `opencodeDark`, `tokyoNight` and `amberCrt`.

```tsx#theme
<ThemeProvider theme="amberCrt">
  <Box className="border rounded p-1">
    <Text color="accent">amberCrt</Text>
  </Box>
</ThemeProvider>
```

```ts
const brand = createTheme({ id: "brand", name: "Brand", accent: "#ffffff" }, "geistDark");
```

## Responsive viewports

Apps fill the docked DevTools console by default (`viewport.responsive`), and resize as you drag the panel. Lay out with flex and read the size when you need it:

```tsx
const { cols } = useViewport();
const sidebar = cols >= 90;
```

The page can only see a docked panel. Undocked DevTools, DevTools zoom and the Console sidebar are invisible to it, so the app uses `viewport.width × viewport.height` (default `120×36`) or a size you pin:

```js
text.resize(120, 36)   // pin a size
text.responsive(true)  // fit the console again
```
