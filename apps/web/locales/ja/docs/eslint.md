<!-- s:df706c7a4d -->
`eslint-plugin-textjs` は、コンソールコンポーネント内のDOMタグ、テキスト内のボックス、Menloにないグリフ、余分な `console.log` 呼び出し、暗黙に無視されるApp Routerのエクスポートなど、Text.jsの誤りをエディターで検出します。

<!-- s:0ecddf15e1 -->
セットアップ

<!-- s:5d60a92733 -->
このプラグインは、フラット設定のESLint 9と10をサポートします。ルールは構文ベースで、型情報や `parserOptions.project` は不要です。TypeScriptとJSXを解析できるパーサーなら使えます。

<!-- s:b69abcef52 -->
設定

<!-- s:9cfe4adde3 -->
| 設定 | 有効になるルール |
| :-- | :-- |
| `textjs.configs.recommended` | 正しさに関するすべてのルールをエラー、コンソール、タイマー、フレーム間隔のルールを警告として有効化 |
| `textjs.configs.strict` | すべてをエラーとして有効化し、さらに `prefer-use-keymap` を警告として追加 |

<!-- s:6c9781312c -->
代わりに、ルールを個別に選択できます。

<!-- s:ec6eb92cf0 -->
コンソールファイル

<!-- s:04573fe453 -->
ほとんどのルールは、コンソールに描画するファイルにのみ適用されます。対象は、`@textjs/app` または `@textjs/react` からコンポーネントやフック（`Box`、`Text`、`useInput`、…）をインポートするファイルです。`react-dom` または `@textjs/react/dom` をインポートするファイルはページのコードとして扱われ、検査されないため、1つのプロジェクトでDOMページとコンソールアプリを混在させられます。`tokenize` や `parseMarkdown` のようなユーティリティーをインポートしても、コンソールファイルにはなりません。

<!-- s:96e9c86b58 -->
App Routerのルールは、`src/app/` を含む任意の `app/` ディレクトリー内で、ファイル名（`page.tsx`、`layout.tsx`、`route.ts`、…）に基づいて適用されます。別のディレクトリー名を使っている場合は、`valid-route-module`、`valid-metadata`、`route-handler-exports` に `{ appDir: "routes" }` を渡してください。

<!-- s:b66542635d -->
ルール

<!-- s:c1b57ad8e2 -->
| ルール | 推奨設定 | 修正 |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | エラー | 提案 |
| [`no-box-in-text`](#no-box-in-text) | エラー | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | エラー | 自動修正、提案 |
| [`no-console-in-components`](#no-console-in-components) | 警告 | 提案 |
| [`prefer-use-interval`](#prefer-use-interval) | 警告 | 提案 |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | 警告 | |
| [`prefer-use-keymap`](#prefer-use-keymap) | strictのみ | |
| [`valid-route-module`](#valid-route-module) | エラー | |
| [`valid-metadata`](#valid-metadata) | エラー | |
| [`route-handler-exports`](#route-handler-exports) | エラー | 提案 |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
`<div>`、`<span>`、カスタム要素などのDOMタグはコンソールには存在しません。リコンサイラーは独自のホストノードのみを認識し、それ以外には `TX003` をスローします。

<!-- s:bd7c3e0318 -->
修正提案は、タグを最も近いコンポーネント（`div` → `Box`、`span`/`p` → `Text`、`strong` → `Text bold`、`a` → `Link`、`input` → `Input`、`hr` → `Divider`、…）に置き換え、インポートを追加します。

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` はスタイル付きスパンの連なりで、ボックスを含められません。`<Box>` や、ルートがボックスのコンポーネント（`<ScrollBox>`、`<Input>`、`<Code>`、`<ProgressBar>`、`<Divider>`、…）を入れ子にすると、描画時に `TX004` がスローされます。このルールは、`&&`、三項演算子、フラグメント、`.map()` の内部も含め、エディター上で検出します。

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.jsは、すべての文字を固定セルのグリッドに配置します。macOSのDevToolsコンソールフォントであるMenloにないグリフは、セルより幅が広いフォールバックフォントで描画されるため、それ以降のすべてのセルがずれます。

<!-- s:a58a59c2f8 -->
- **点字**（U+2800〜U+28FF、従来のターミナルスピナーのフレーム）。ブロック文字や四分割文字（`▘▝▗▖`）、`<Spinner variant="dots">`、またはチャートの `marker="quadrant"` を使ってください。ターミナルで `text run` のみを使って実行するアプリでは、`{ allowBraille: true }` を設定してください。
- **その他の記号および矢印**（U+2B00〜U+2BFF、小さい四角のU+2B1Dなど）。修正提案にはMenloの対応する文字（`·`、`●`、`←`）が表示されます。
- **1セル記号の絵文字表示**（`▶` または `↩` の後にU+FE0Fが続くもの）。グリッドは1セルを確保しますが、異体字セレクターによって2セルの絵文字になります。自動修正でこのセレクターを削除します。

<!-- s:8c0c49dfb7 -->
幅の広い絵文字（`🚀`、`✅`）は問題ありません。Text.jsは2セルとして計測します。

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
各フレームは1回の `console.log` です。独自のログはフレームの間に入り、次のフレームによってスクロールされ、最下部に追従する表示では見えなくなります。`console.clear()` はアプリ自体を消去します。

<!-- s:0011d5dcff -->
`useToast()` やログ用の `<ScrollBox>` でUIにメッセージを表示するか、`[▼]` Dev Overlay（`` Ctrl+` ``）で状態を確認します。`logger` を指定すると、修正候補は `console.warn(…)` を `log.warn(…)` に書き換えます。テストファイルと `@textjs/app/testing` によるレンダリングは対象外です。

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
コンポーネント内で `setInterval` を直接使う場合、古い状態の参照を避けるためにエフェクト、クリーンアップ、refが必要です。`useInterval` はこの3つを処理し、`null` で停止します。

<!-- s:894ec09a45 -->
アニメーションでは、`useAnimationFrame` がレンダラーのフレーム間隔に従い、出力の一時停止中は停止します。[ユーティリティーフック](/docs/utility-hooks)を参照してください。

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.jsは66msごとに最大1フレーム（約15fps）を出力します。16ms間隔では、出力される1フレームにつき4回描画されます。余分なフレームはまとめられ、CPUを消費するだけです。`setInterval`/`useInterval` の遅延が `minInterval`（デフォルトは `66`）未満の場合と、`useAnimationFrame` の `fps` が15を超える場合に報告します。

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
`e.key` を手動で比較しても動作しますが、ショートカットは表示されません。`useKeymap` は、ラベル付きの割り当てを `<KeyHelp>`、`<KeyHints>`（`hint: true` の割り当て）、コマンドパレットに表示し、`g g` のようなシーケンスを処理し、一致したキーの伝播を停止します。2つ以上のキーリテラル（`minKeys`）を比較する `useInput` ハンドラーを報告し、文字入力のために `e.input` を読み取るハンドラーはスキップします。

<!-- s:05d39412dc -->
[キーボードショートカット](/docs/keyboard)を参照してください。

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- `page`、`layout`、`loading`、`error`、`not-found` ファイルは、コンポーネントをデフォルトエクスポートする必要があります（`TX015`）。
- `export const dynamic` は `"auto"`、`"force-static"`、`"force-dynamic"` のいずれかである必要があります（`TX031`）。Text.jsはNext.jsの `"error"` をサポートしません。ページ、レイアウト、ルートハンドラーから読み取られます。ページとレイアウトでは、通常の文字列リテラルで記述してください。`text build` はモジュールを実行せずにソースから読み取ります。

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadataはレイアウトから順に、最後にページ（または `not-found`）からマージされます。このルールは、ルーターが暗黙に無視するものを報告します。

<!-- s:fe9ebcbc0c -->
- `loading` または `error` ファイル内の `metadata` または `generateMetadata`
- 1つのファイル内の両方のエクスポート
- `async generateMetadata`（同期的に呼び出されるため、Promiseではタイトルが設定されません）
- 文字列でも `{ default, template?, absolute? }` でもない `title`、またはスペルを誤ったキー
- `%s` のない `title.template`、または効果のないページ内の `title.template`
- 文字列ではない `description`

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
`route.ts` ファイルは、エクスポートしたHTTPメソッド（`GET`、`HEAD`、`POST`、`PUT`、`PATCH`、`DELETE`、`OPTIONS`）にのみ応答します。小文字を含む `get` や `Post` は呼び出されません（リクエストには `405` が返ります）。修正提案で名前を変更します。`dynamic` と `revalidate` の[ルートセグメント設定](/docs/caching)を除き、デフォルトエクスポート、関数ではないハンドラー、その他のエクスポートを報告します。共通コードは `lib/` に移動するか、追加の名前を `{ allow: [...] }` で指定してください。
