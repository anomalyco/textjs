# Open Graph fonts

The Open Graph renderer (`scripts/og/`) draws with the site's own Geist subsets from `public/fonts` first. These files cover the characters those subsets leave out, so no glyph falls back to a system font and the images come out the same on any machine. `render.ts` fails the build if a character would still fall back.

| File | Source | Characters |
| --- | --- | --- |
| `geist-og.woff2` | Geist 1.9.0 (`geist` on npm), `Geist-Variable.woff2` | Latin, punctuation, arrows, math, geometric shapes |
| `geist-mono-og.woff2` | Geist 1.9.0, `GeistMono-Variable.woff2` | Latin, punctuation, arrows, math, technical, box drawing, blocks, geometric shapes |
| `noto-symbols-og.woff2` | Noto Sans Symbols 2 (google/fonts) | Arrows, technical (⌘ ⌥ ⌫), geometric shapes (◆), symbols, dingbats, braille |
| `noto-sans-jp-og.woff2` | Noto Sans JP (google/fonts), `NotoSansJP[wght].ttf` | The characters in `locales/ja/messages.json` and `errors.md`, made by `scripts/og/subset-locale-fonts.ts` |
| `noto-sans-kr-og.woff2` | Noto Sans KR (google/fonts), `NotoSansKR[wght].ttf` | The characters in `locales/ko/messages.json` and `errors.md`, made by `scripts/og/subset-locale-fonts.ts` |
| `noto-sans-sc-og.woff2` | Noto Sans SC (google/fonts), `NotoSansSC[wght].ttf` | The characters in `locales/zh-CN/messages.json` and `errors.md`, made by `scripts/og/subset-locale-fonts.ts` |
| `noto-sans-tc-og.woff2` | Noto Sans TC (google/fonts), `NotoSansTC[wght].ttf` | The characters in `locales/zh-TW/messages.json` and `errors.md`, made by `scripts/og/subset-locale-fonts.ts` |

All of them are licensed under the SIL Open Font License 1.1 ([OFL.txt](OFL.txt)).

To add characters, subset again with [fonttools](https://github.com/fonttools/fonttools):

```sh
pyftsubset GeistMono-Variable.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2000-206F,U+2190-21FF,U+2200-22FF,U+2300-23FF,U+2500-25FF" \
  --output-file=geist-mono-og.woff2
pyftsubset Geist-Variable.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2200-22FF,U+25A0-25FF" \
  --output-file=geist-og.woff2
pyftsubset NotoSansSymbols2-Regular.ttf --flavor=woff2 \
  --unicodes="U+2190-21FF,U+2300-23FF,U+25A0-25FF,U+2600-26FF,U+2700-27BF,U+2800-28FF" \
  --output-file=noto-symbols-og.woff2
```
