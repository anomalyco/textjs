<!-- s:674f346b70 -->
フックはコンポーネントを入力、フォーカス、ビューポートに接続します。

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| フィールド | 説明 |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | キーによって生成されるテキスト |
| `ctrl` `meta` `shift` `alt` | 修飾キー |
| `stopPropagation()` | 優先度の低いハンドラーの停止 |

<!-- s:0764796164 -->
`⌘⌥J` や `⌘R` などのブラウザーのショートカットは、常にそのままブラウザーに渡されます。

<!-- s:550c6a7dd5 -->
`usePaste` と `useWheel` は同じオプションを受け取ります。`ambient` は `useWheel` には影響しません。

<!-- s:9248f9b147 -->
| オプション | 説明 |
| :-- | :-- |
| `isActive` | `false` でアンマウントせずにハンドラーを無効化（デフォルトは `true`） |
| `priority` | 優先度が高い順に実行（デフォルトは `0`）。フォーカスのあるコンポーネントは `FOCUSED_INPUT_PRIORITY`（`10`）を使用 |
| `global` | このコンポーネントの外にある `<Modal>` が開いている間も入力を受信（デフォルトは `false`） |
| `ambient` | このハンドラーを[フォーカスヒント](#usepagefocus)の表示条件から除外（デフォルトは `false`） |

<!-- s:e4e842287a -->
Dev Overlayのショートカット（`F2` または `` Ctrl+` ``）はambientとして扱われるため、ほかにキーボード入力がないページではヒントが表示されません。

<!-- s:617ae1bfe8 -->
`usePaste` と `useWheel`

<!-- s:61e72f6177 -->
`useKeyState`（実験的）

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` は、押されている物理キーを `KeyboardEvent.code`（`"KeyW"`、`"ArrowUp"`、`"ControlLeft"`）で追跡する `useKeyState` をエクスポートします。`keys.isDown(code)` のポーリングや `keys.pressed` の読み取りは、Reactの再レンダリングを引き起こしません。キーが押されたときや離されたときに反応するには、コールバックを渡します。

<!-- s:d9e1465ae0 -->
ページがフォーカスを失うと、押されているキーは自動的に解放されます。実験的なエクスポートのバージョン管理については、[破壊的変更](/docs/support-policy#breaking-changes)を参照してください。

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` は、ページにフォーカスがあるかどうかを返します。キー入力がアプリに届くのは、ページにフォーカスがある間だけです。`useViewport().focused` と同じ値ですが、フォーカスが変わったときにのみ再レンダリングします。

<!-- s:e1075d4220 -->
ページにフォーカスがなく、アプリに `useInput` または `usePaste` ハンドラー、`useKeyState` フック、あるいはTabで移動できるフォーカス対象がある場合、コンソールフレームの最終行は「キーボードを使用するにはページをクリックしてください」と表示する琥珀色のバーになります。[`ambient`](#useinput) が指定されたハンドラーは対象に含みません。このヒントはターミナル、テスト、インラインミラーでは表示されません。システムの視差効果を減らす設定が有効でない限り、ヒントは表示されるたびに約6秒間点滅します。表示のタイミングを自分で制御するには、`text.config.ts` または `createConsoleRoot` で `focusHint: false` を設定し、`<FocusHint>` をレンダリングします。

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
`window.text` のREPL

<!-- s:420cc7f125 -->
すべてのアプリは `window.text` にヘルパーを追加します。DevToolsのプロンプトに入力してください。
