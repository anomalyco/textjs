<!-- s:00c66df67a -->
Text.js 0.1のタグを付けました。3つのレイヤーがすべて揃った最初のバージョンです。`@textjs/core` がコンソールにフレームを描画し、`@textjs/react` がそのフレームにReact 19をレンダリングし、`textjs` がApp RouterとCLIを追加します。

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
ルートはNext.jsのApp Routerの規約に従う、`app/` 内のフォルダーです。以下は `create-text-app` の `dashboard` テンプレートです。

<!-- s:18fa0019a3 -->
レイアウトは配下のすべてのページを包み、画面遷移をまたいで状態を保持します。`<Link>` は `shortcut` を受け取り、1つのキーでリンク先に移動でき、`activeClassName` は現在のルートへのリンクにスタイルを適用します。

<!-- s:5587be498a -->
動的セグメントはNext.jsと同じように動作します。`[id]` はパラメーターになり、`[...slug]` はパスの残りを取得し、`[[...slug]]` は親にも一致します。静的セグメントは動的セグメントより優先され、`(marketing)` のようなルートグループはURLに追加せずにファイルを整理します。

<!-- s:3a9a93d850 -->
`loading.tsx` と `error.tsx` は、セグメントをそれぞれSuspenseバウンダリーとエラーバウンダリーで包みます。エラーコンポーネントはエラーと `reset` 関数を受け取ります。

<!-- s:142b529e3f -->
ルートハンドラーは `app/api` に配置し、標準の `Response` を返します。

<!-- s:fe0c29445c -->
ルーターは `history.pushState` を通じて `window.location` を同期するため、「戻る」、「進む」、ディープリンクが機能し、`metadata.title` は `document.title` に書き込まれます。アプリはコンソールに描画し、ページには入力を収集するフォーカスパッドを配置します。

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` はReact Fast Refreshを有効にしてViteを起動します。ファイルを保存すると、その場でコンソールが更新されます。
- `text build` はアプリとそのルートハンドラーの本番ビルドを書き出します。
- `text start` はビルドとルートハンドラーを配信します。

<!-- s:1e1161891f -->
`create-text-app` は `starter` または `dashboard` テンプレートからプロジェクトのひな形を生成します。

<!-- s:e2a33d088a -->
インスペクター

<!-- s:cdb3155210 -->
実行中のアプリで `` Ctrl+` `` または `F2` を押すと、コンソール内に `[▼]` インスペクターが開きます。一致したルートとそのパラメーター、フレームのサイズ、スパン数、各フェーズの所要時間、dirty gateがスキップしたフレーム数を表示します。`W` はYogaのレイアウトをワイヤーフレームとして描画します。

<!-- s:c2600ceabc -->
0.1のその他の機能

<!-- s:289b0a9973 -->
`@textjs/react` には、PascalCaseのコンポーネント（`Box`、`Text`、`ScrollBox`、`Input`、`Textarea`、`Select`、`Tabs`、`Code`、`Markdown`、`Diff`、`Modal`、`Spinner`）、セル単位で機能するTailwind風の `className` ユーティリティー、テーマが含まれます。レイアウトはWebAssembly上のYogaで動作します。

<!-- s:8ad0f2154c -->
全一覧は[変更履歴](/changelog#v0-1-0)にあります。
