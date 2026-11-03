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
| `noto-sans-devanagari-og.woff2` | Noto Sans Devanagari (google/fonts), `NotoSansDevanagari[wdth,wght].ttf` pinned to `wdth=100` | The characters in `locales/hi/messages.json` and `errors.md` with every conjunct they form, made by `scripts/og/subset-locale-fonts.ts` |
| `noto-naskh-arabic-og.woff2` | Noto Naskh Arabic (google/fonts), `NotoNaskhArabic[wght].ttf` | The characters in `locales/{ar,fa,ur}/messages.json` and `errors.md` with their joining forms and ligatures, made by `scripts/og/subset-locale-fonts.ts`. Naskh, the style of the system Arabic fonts the pages use (Urdu included, which the site sets in Naskh rather than Nastaliq) |

Polish, Turkish and Vietnamese cards draw with the site's `public/fonts/geist-latin-ext.woff2`, and Russian cards with `geist-cyrillic.woff2` (Geist 1.9.0, the ranges in `scripts/i18n/fonts.ts`), the same files those pages preload.

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
# The site's extra Geist subsets (public/fonts), for Polish, Turkish, Vietnamese and Russian pages and cards:
pyftsubset Geist-Variable.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+0100-0130,U+0132-0151,U+0154-024F,U+0259,U+0300-0303,U+0305-0307,U+0309-0328,U+032A-036F,U+1E00-1EFF,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF" \
  --output-file=geist-latin-ext.woff2
pyftsubset Geist-Variable.woff2 --flavor=woff2 --layout-features='*' \
  --unicodes="U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116" --output-file=geist-cyrillic.woff2
# The same two ranges from GeistMono-Variable.woff2 make geist-mono-latin-ext.woff2 and geist-mono-cyrillic.woff2.
# Devanagari: pin the width axis first, then subset-locale-fonts.ts --font hi=NotoSansDevanagari-wdth100.ttf
fonttools varLib.instancer "NotoSansDevanagari[wdth,wght].ttf" wdth=100 -o NotoSansDevanagari-wdth100.ttf
```
