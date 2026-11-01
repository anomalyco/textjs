# Turbolog logo concepts

Six candidate marks for Turbolog, the Text.js render engine. Each one has a mark and a "Turbolog" lockup. `concepts.png` compares them side by side.

![Turbolog logo concepts](./concepts.png)

| | Concept | Idea |
| :-- | :-- | :-- |
| A | Append | The ▼ cut into three appended frames, with the newest at the bottom. |
| B | Runs | The ▼ drawn in character cells, with its top row encoded as one `%c` span. At 16px and 32px every row is merged into a run. |
| C | Descent | The ▼ with motion lines, moving down the console like appended frames. |
| D | Percent | A % sign whose dots are the ▼ and a character cell, as in `%c`. |
| E | Gate | The ▼ inside a diamond gate, for the row-hash check that stops unchanged frames. |
| F | Cursor | T and L sharing a stem on a 4×4 cell grid, with a block cursor in the last cell. |

## Files

Each concept folder (`a-append/` to `f-cursor/`) contains:

- `mark.svg`: the mark in `currentColor`, with the accent gradient on one part
- `mark-mono.svg`: the mark in `currentColor` only
- `mark-small.svg`: hinted geometry for 16px and 32px (B only)
- `lockup.svg` and `lockup-mono.svg`: the mark with the wordmark

Marks are drawn on a 32-unit grid with edges on even units, so they land on whole pixels at 16px. The wordmark is outlined Geist SemiBold (A, B, C, E) or Geist Mono (D, F) with tight tracking, so the SVGs render without fonts installed. The accent gradient runs from `#00d68f` to `#f5e14a`, away from the blue-to-red of Turbopack and Turborepo. Every mark also works in one colour.

## Rebuilding

```sh
cd merch && bun install
bun brand/turbolog/build.ts
```

`build.ts` writes the SVGs and renders `concepts.png` with headless Chromium. It reuses the outlined-Geist helpers in `merch/scripts/lib.ts`.

## Where the chosen mark would go

Nothing is wired into the site yet. Each of these is a small change:

- **Landing page:** the Turbolog section eyebrow, `<p className="eyebrow">Turbolog</p>` in `apps/web/src/pages/home/Turbolog.tsx`. The sheet mocks this at 18px tall.
- **Docs:** the header of the Turbolog engine page, `<h1 className="docs-title">` in `apps/web/src/pages/Docs.tsx` (only when the slug is `turbolog-engine`).
- **Status page:** `<h1>Turbolog Status</h1>` in `apps/web/src/pages/Status.tsx`, and the mark next to "Turbolog encoder" in `apps/web/src/pages/status-components.ts`.
- **Blog:** the header of `apps/web/src/blog/turbolog-eliminating-the-flash.md`, through `apps/web/src/pages/BlogPost.tsx`.

The site draws its own marks as inline React SVG in `currentColor` (see `apps/web/src/site/brand-marks.tsx`), so the chosen `lockup.svg` would move there as a component.
