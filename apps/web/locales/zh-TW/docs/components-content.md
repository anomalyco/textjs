<!-- s:e580113c76 -->
這些元件在儲存格網格上渲染 Markdown、程式碼、差異和大型文字。

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
支援串流的 Markdown。傳入持續增長的字串，影格仍保持穩定。

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
支援 `ts`、`tsx`、`json`、`bash`、`python`、`rust`、`go` 等語言的語法醒目提示。

<!-- s:e75addc84e -->
| Prop | 說明 |
| :-- | :-- |
| `language` | 語言識別碼 |
| `showLineNumbers` | 行號欄 |
| `highlightLines` | 要標色的行 |
| `maxHeight` | 裁切內容並顯示「更多行」頁尾 |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
統一格式的差異，或由 `{ before, after }` 計算差異。

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
樣式：`dots`、`pulse`、`matrix`、`line` 和 `braille`（用於終端機；Menlo 沒有點字字形）。暫停時，計時器會停止。

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
用於標題的大型像素文字。

<!-- s:d3f90f7b9b -->
使用 `font="compact"` 可切換為 3 行樣式。傳入來自 [`@textjs/font`](/docs/fonts) 的 FIGlet 字型，例如 `font={slant}`，即可顯示 FIGlet 文字。
