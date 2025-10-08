Style with utility classes or typed props. No stylesheets.

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

Set `viewport.responsive` to follow the docked DevTools size:

```tsx
const { cols } = useViewport();
const sidebar = cols >= 90;
```
