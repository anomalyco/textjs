<!-- s:e580113c76 -->
这些组件在单元格网格上渲染 Markdown、代码、差异和大号文字。

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
支持流式输入的 Markdown。传入持续增长的字符串，帧仍保持稳定。

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
支持 `ts`、`tsx`、`json`、`bash`、`python`、`rust`、`go` 等语言的语法高亮。

<!-- s:e75addc84e -->
| Prop | 说明 |
| :-- | :-- |
| `language` | 语言标识符 |
| `showLineNumbers` | 行号栏 |
| `highlightLines` | 要着色的行 |
| `maxHeight` | 裁剪内容，并在底部显示“更多行”提示 |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
显示统一差异，或根据 `{ before, after }` 计算差异。

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
变体：`dots`、`pulse`、`matrix`、`line` 和 `braille`（用于终端；Menlo 没有盲文字形）。暂停期间计时器停止。

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
用于标题的大号像素文字。

<!-- s:d3f90f7b9b -->
使用 `font="compact"` 可选择 3 行高的变体。传入来自 [`@textjs/font`](/docs/fonts) 的 FIGlet 字体，例如 `font={slant}`，即可渲染 FIGlet 文字。
