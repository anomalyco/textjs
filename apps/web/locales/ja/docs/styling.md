<!-- s:581711536b -->
`className` ユーティリティーまたは型付きpropsでコンポーネントのスタイルを設定します。Text.jsのアプリにはスタイルシートがありません。

<!-- s:e0ac1db626 -->
ユーティリティー

<!-- s:2de571e2bf -->
`className` はTailwind形式のユーティリティーを受け取ります。1単位は1セルです。

<!-- s:785b2c3db0 -->
| カテゴリー | 例 |
| :-- | :-- |
| レイアウト | `flex-row` `grow` `items-center` `gap-1` |
| 余白 | `p-1` `px-2` `mt-1` |
| 枠線 | `border` `rounded` `border-accent` |
| 色 | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
型付きprops

<!-- s:4963259a42 -->
すべてのユーティリティーに対応するpropがあります。propsは `className` より優先されます。

<!-- s:15a3834a24 -->
色

<!-- s:d333dad27a -->
16進数、Tailwindの色名、または `fg`、`muted`、`surface`、`accent`、`success`、`danger` などのテーマトークンを使います。トークンは現在のテーマに従います。

<!-- s:087abce968 -->
テーマ

<!-- s:abba2a3188 -->
`geistDark`、`geistLight`、`opencodeDark`、`tokyoNight`、`amberCrt` の5つのプリセットが組み込まれています。

<!-- s:5dc490305b -->
レスポンシブビューポート

<!-- s:419fb844db -->
アプリはデフォルトでドッキングされたDevToolsのコンソール全体に表示され（`viewport.responsive`）、パネルをドラッグするとサイズが変わります。flexでレイアウトし、必要に応じてサイズを読み取ります。

<!-- s:3d847eadf9 -->
ページが認識できるのはドッキングされたパネルだけです。別ウィンドウのDevTools、DevToolsのズーム、コンソールのサイドバーは認識できないため、アプリは `viewport.width × viewport.height`（デフォルトは `120×36`）、または固定したサイズを使います。
