# Brand images

- `og-preview.png`: fifteen of the per-page Open Graph images the build writes to `apps/web/dist/og/` (one per route, 115 in total).
- `og-unfurls.png`: three of them at the size X and Slack show them, with the area X covers with its domain label.
- `og-directions.png`: the three layouts tried for the cards in November 2026, at 600px and 500px wide, and the one the build uses.
- `share/`: images for posting on X, at 1600×900, plus 1200×1200 squares of options 1 and 5. `share/options.png` shows them side by side. The site doesn't use them.

To regenerate, from `apps/web`:

```sh
bun run build          # per-page images, cached in apps/web/.cache/og
bun run og:preview     # og-preview.png and og-unfurls.png (needs the build)
bun run og:share       # share/
```
