<!-- s:5a6798e6a5 -->
本日、Web向けコンソールフレームワークText.js 1.0をリリースします。

<!-- s:e4787165f5 -->
Text.jsはChrome DevToolsのコンソール内でReact 19アプリをレンダリングし、レイアウト、ルーティング、フォーカス、入力、フォーム、チャート、ストリーミングMarkdownを `console.log` で描画します。

<!-- s:48b184a262 -->
1.0の内容

<!-- s:7f7f2a9a76 -->
- **App Router。** `layout.tsx`、`page.tsx`、`[param]`、`loading.tsx`、`error.tsx`、`not-found.tsx`、`api/*/route.ts` が `window.location` と同期します。Next.jsのApp Routerの規約に従います。
- **Turbolog。** Yoga flexboxがセルグリッドをレイアウトし、型付き配列の `CellBuffer` がそれを保持し、ランレングスエンコーダーが1回の `console.log(format, ...css)` 呼び出しに変換します。アイドル状態のフレームではコンソールを呼び出しません。
- **コンポーネントキット。** `Box`、`Text`、`ScrollBox`、`Input`、`Select`、`Tabs`、`Markdown`、`Diff`、仮想化された `List`、`Table`、`Tree`、チャート、ダイアログ、トースト、そして `useKeymap` による `Ctrl+K` コマンドパレットを備えています。
- **フレームの追記。** フレームは前のフレームの下に追記されるため、フレーム間でコンソールが一瞬空になることはありません。詳しくは[Turbolog：ちらつきの解消](/blog/turbolog-eliminating-the-flash)をご覧ください。
- **右から左へのテキスト。** `BidiTest.txt` の全770,241ケースに合格するUAX #9の実装により、ヘブライ語とアラビア語を視覚的な順序でレンダリングし、アラビア語の字形処理にも対応します。[コンソールでの右から左へのテキスト](/blog/right-to-left-text)をご覧ください。
- **レスポンシブなコンソール。** Text.jsはドッキングされたDevToolsパネルに合わせて表示を調整し、ページのズームやツールバーの折り返しにも対応します。ドッキングされていない場合は `120×36` にフォールバックします。
- **`text run`。** 同じApp Routerアプリを実際のターミナルでレンダリングします。
- **エージェントとエディター向けのツール。** `text mcp` はModel Context Protocol経由でコーディングエージェントにアプリを提供し、Text.js DevTools拡張機能はコンソールの隣にパネルを追加します。`eslint-plugin-textjs` とVS Code拡張機能も1.0に含まれます。

<!-- s:b71c4a16bc -->
1つの名前変更

<!-- s:b47aa37902 -->
フレームワークのパッケージ名は `@textjs/next` になりました。`textjs` という名前はnpmで使用済みでした。インポートを更新してください。

<!-- s:e4005009f1 -->
**1.0.2での更新：** パッケージ名は `@textjs/app` になり、`@textjs/next` は非推奨です。切り替えるには、`bun remove @textjs/next && bun add @textjs/app` を実行し、`@textjs/app` からインポートしてください。

<!-- s:5b35a47b90 -->
計測値

<!-- s:2ee54da34c -->
高密度の `100×32` ダッシュボード（46テキストノード、149個の `%c` スパン）で、`packages/core/test/perf.test.ts` を使って計測しました。

<!-- s:9729def172 -->
| フレーム | 平均 |
| :-- | --: |
| 全体の再描画（レイアウト、描画、エンコード） | 0.163ms |
| 1行の編集（文字入力） | 0.011ms |
| アイドル状態 | 0.000ms、コンソール呼び出し0回 |

<!-- s:2fee8c4c3d -->
変更のないフレームは文字列を割り当てる前に処理を返すため、アイドル状態のフレームの計測値は0.000msです。

<!-- s:a0fa47c98f -->
試す

<!-- s:aeb9cc2b5d -->
[textjs.org](/)を開き、⌘⌥J（WindowsとLinuxではCtrl+Shift+J）を押してください。このサイトはコンソール内でText.jsアプリを実行し、ページごとに1つのビューを表示します。[Playground](/playground)にはダッシュボード、ストリーミングMarkdown、スネークゲームがあります。[OpenCode](/opencode)はローカルのOpenCodeサーバーに接続します。

<!-- s:31dd2e762c -->
変更の全一覧は[変更履歴](/changelog)に、ソースコードは[GitHub](https://github.com/anomalyco/textjs)にあります。
