<!-- s:3bfcfe41ce -->
`useKeymap` でショートカットを一度宣言します。Text.jsはそれらを振り分け、`?` オーバーレイに一覧表示し、フッターに表示して、コマンドパレットで検索できるようにします。

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| 構文 | 意味 |
| :-- | :-- |
| `ctrl+k` | 修飾キー：`ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` または `Ctrl` のうち、押されているキー |
| `j, down` | いずれかのキー |
| `g g` | キーシーケンス（キー間の間隔は1秒） |
| `G` | 大文字は `Shift` の併用 |
| `?` | 入力文字との一致 |

<!-- s:ef55b4b9de -->
値にはハンドラー、または `label`、`group`、`hint`、`disabled`、`noRepeat` を持つバインディングを指定します。ラベルのないバインディングも動作しますが、ヘルプオーバーレイには表示されません。

<!-- s:01f344cdbe -->
`useKeymapBindings()` は、現在有効なラベル付きバインディングを返し、独自のフッターやメニューに利用できます。

<!-- s:dd8af5eb69 -->
キーマップは `useInput` を通じて実行されるため、通常のルールが適用されます。フォーカスのある入力が優先され、一致したキーは伝播を停止し、開いている `<Modal>` はその外側のバインディングを無効にします。これを変更するには `{ priority, global, isActive }` を渡します。

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
`?` を押すと、ラベル付きのすべてのバインディングがグループ別に表示されます。開いた場所で有効なものが一覧表示されます。

<!-- s:3cebb95bfc -->
`<KeyHints>` と `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` は、`hint: true` が指定されたバインディング、または明示的な `items` を表示します。`<StatusBar>` は `right` スロットを持つ1行のフッターです。

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` は単一のキーを描画します。`formatKeys("ctrl+shift+p")` は、macOSでは `⌃⇧P`、それ以外では `ctrl+shift+P` を返します。

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K`（または `Ctrl+P`）で、独自のコマンドとラベル付きのすべてのバインディングを対象にしたあいまい検索ランチャーが開き、一致した文字が強調表示されます。

<!-- s:e88bab4eab -->
| プロパティ | 説明 |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | 開くためのショートカット（デフォルトは `ctrl+k, ctrl+p`、`null` で無効化） |
| `includeKeymap` | キーマップのバインディングを一覧表示（デフォルトは `true`） |
| `open` / `onOpenChange` | 制御モード |

<!-- s:ddd093fe85 -->
パレットはコマンドを実行する前に閉じるため、コマンドから独自のモーダルを開けます。`fuzzyMatch` と `fuzzyFilter` は、独自のリストで使えるようにエクスポートされています。
