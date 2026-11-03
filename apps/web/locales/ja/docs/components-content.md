<!-- s:e580113c76 -->
これらのコンポーネントは、Markdown、コード、差分、大きな文字をセルグリッド上に描画します。

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
ストリーミングに対応したMarkdownです。長くなり続ける文字列を渡しても、フレームは安定したままです。

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
`ts`、`tsx`、`json`、`bash`、`python`、`rust`、`go` などの構文ハイライトに対応しています。

<!-- s:e75addc84e -->
| プロパティ | 説明 |
| :-- | :-- |
| `language` | 言語ID |
| `showLineNumbers` | 行番号欄 |
| `highlightLines` | 色を付ける行 |
| `maxHeight` | 「残りの行」フッター付きの表示切り詰め |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Unified形式の差分、または `{ before, after }` から計算した差分を表示します。

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
種類は `dots`、`pulse`、`matrix`、`line`、`braille`（ターミナル向け。Menloには点字グリフがありません）です。一時停止中はタイマーが停止します。

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
見出し用の大きなピクセル文字です。

<!-- s:d3f90f7b9b -->
3行の表示には `font="compact"` を使います。FIGlet文字の表示には、`font={slant}` のように [`@textjs/font`](/docs/fonts) のFIGletフォントを渡します。
