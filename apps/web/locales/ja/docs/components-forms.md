<!-- s:7929eb6998 -->
Text.jsにはフォームコントロール、ダイアログ、トーストが含まれています。すべてのコントロールが `Tab` の移動順に入り、`Space` または `Enter` に反応します。

<!-- s:0c4878f82e -->
コントロール

<!-- s:920d5e74e5 -->
| コンポーネント | キー | 値 |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓`（または `←` `→`） | `value` / `onChange` |
| `<Slider>` | `←` `→`、`Shift` ×5、`Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
すべてのコントロールで `autoFocus`、`focused`、`id`、`disabled` を指定できます。制御コンポーネントと非制御コンポーネント（`defaultChecked`、`defaultValue`）の両方に対応しています。

<!-- s:0a2857b66b -->
ボタン

<!-- s:1981291f42 -->
`variant` は `primary`、`secondary`、`ghost`、`danger` のいずれかです。フォーカス時は、ボタンのサイズを変えずにアクセントカラーで塗りつぶします。

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
説明とアクション行を備えた `<Modal>` です。

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
はい、またはいいえで答えます。`y` と `n` で直接回答し、`←` `→` でボタン間を移動します。`destructive` は確認ボタンのスタイルを設定し、最初にキャンセルボタンへフォーカスを移します。

<!-- s:fecae30a60 -->
トースト

<!-- s:76abda6137 -->
`<Toaster />` を1つ描画し、同じルート内の任意の場所で `useToast()` を呼び出します。

<!-- s:d5c6b1208e -->
| オプション | 説明 |
| :-- | :-- |
| `duration` | ミリ秒（デフォルトは `4000`。読み込み中のトーストは表示を維持） |
| `id` | 再利用すると既存のトーストをその場で更新 |
| `position` | `<Toaster>` に指定：`bottom-right`（デフォルト）、`top-center`、… |
| `max` | `<Toaster>` に指定：同時に表示する数（デフォルトは `3`） |

<!-- s:476f42f2b3 -->
トーストはモーダルの上に描画され、フォーカスを奪いません。
