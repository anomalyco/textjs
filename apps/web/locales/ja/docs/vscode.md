<!-- s:8f3fd7167d -->
VS Code向けのText.js拡張機能は、コードの隣にコンソールのフレームを表示します。`text dev` で実行中のアプリをミラーリングし、何も実行されていない場合は開いているファイル自体をレンダリングします。App Routerのひな形作成、スニペット、`TX###` エラーコードへのリンクも追加します。

<!-- s:98304b8243 -->
インストール

<!-- s:80e247d2f7 -->
Visual Studio Marketplaceから[Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs)をインストールします。VS Codeで「拡張機能」ビュー（`⌘⇧X`）を開いて `textjs.vscode-textjs` を検索するか、次のコマンドを実行します。

<!-- s:fd2344ec36 -->
Text.jsアプリを含むフォルダーで有効になります。`text.config.ts` があるか、`@textjs/app` に依存し `app/` ディレクトリーを持つパッケージがあるフォルダーが対象です。複数のアプリを含むモノレポにも対応しています。

<!-- s:74f1530aa8 -->
ライブプレビュー

<!-- s:d9807ea49d -->
`page.tsx`、`layout.tsx`、またはコンポーネントを開き、**Text.js: Open Preview**（`⌘K V`）を実行するか、エディターのタイトルバーにあるプレビューボタンをクリックします。パネルはブラウザーのコンソールと同じDevToolsの外観とMenloのセルでフレームを描画します。

<!-- s:2f69f76b80 -->
プレビューは2つのソースのいずれかからフレームを取得します。ツールバーのバッジに、使用中のソースが表示されます。

<!-- s:f81cef21bf -->
| ソース | 条件 | 表示内容 |
| :-- | :-- | :-- |
| **ライブ** | `text dev` が実行中で、ブラウザーのタブでアプリを開いている | 状態、データ、グリッドサイズを含む実際のアプリ |
| **ヘッドレス** | 開発サーバーがない、またはタブを開いていない | 拡張機能がパネルのサイズでレンダリングした、開いているファイル |

<!-- s:f40888c2bb -->
`auto`（デフォルト）は、可能な場合はライブ、それ以外はヘッドレスを使用します。バッジまたは `textjs.preview.mode` で、どちらかに固定できます。

<!-- s:fd587df6f1 -->
キーボード

<!-- s:9ce66a1aa7 -->
コンソールをクリックするとアプリにキー入力を送信できます。矢印キー、`Tab`、ショートカット、文字入力、貼り付けはすべてブラウザーと同様に動作します。停止するにはコンソールの外側をクリックします。`⌘P` や `⌘⇧P` などのエディターのショートカットは、引き続きVS Codeに送られます。コンソール上でスクロールするとホイールイベントが送信されます。

<!-- s:0910b5fd48 -->
アドレス欄に `/deployments/dpl_a1` などのルートを入力すると、どちらのソースでも移動できます。

<!-- s:4507d73bb4 -->
ライブモード

<!-- s:787b87d328 -->
プレビューが開いている間、開発サーバーは接続中のタブにフレームのストリーミングを要求します。タブは変更された行だけを送信し、プレビューが閉じると送信を停止するため、プレビューを開いていないアプリには負荷がかかりません。ファイルを保存するとFast Refreshが実行され、プレビューもタブとともに更新されます。

<!-- s:86ae14b746 -->
**追従**（`textjs.preview.followEditor`）を有効にすると、編集中の `page.tsx` のルートにブラウザーのタブが移動します。

<!-- s:68839106d6 -->
バックグラウンドのタブにはアニメーションフレームが届かないため、通常は再び表示されるまでフレームを保持します。プレビューが監視している間は、バックグラウンドのタブも入力が届くとすぐにフレームを描画するため、プレビューで文字を入力しても更新されます。バックグラウンドのタブのアニメーションは約1秒ごとに更新されます。滑らかな動きを保つには、アプリを専用のウィンドウに配置します。

<!-- s:1ae6e7077f -->
ヘッドレスモード

<!-- s:1cddf967be -->
拡張機能はプロジェクト内で小さなランナーを起動します。プロジェクト自身のViteと `@textjs/app` を通じてルートファイルを読み込むため、エイリアス、TypeScript、JSXは `text dev` と同じように動作します。メモリー内の履歴を使い、開いているファイルのルートに、レイアウトとともにApp Routerをマウントします。

<!-- s:23d9451fef -->
| ファイル | プレビュー |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id`（動的セグメントにはその名前を使用） |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | デフォルトエクスポート、または最初のPascalCaseのエクスポートをpropsなしで表示 |

<!-- s:f111cbfc61 -->
同一オリジンの `fetch("/api/...")` 呼び出しは、[`text run`](/docs/terminal)と同様に `route.ts` ハンドラーを同一プロセス内で実行します。グリッドはパネルのサイズに追従し、アプリ内のいずれかのファイルを保存すると再レンダリングされます。エラーはフレームの上に表示され、対応する `TX###` ページへのリンクが付きます。

<!-- s:36cd3f2bb4 -->
コマンド

<!-- s:d542a683ff -->
| コマンド | 説明 |
| :-- | :-- |
| Text.js: Start Dev Server | ターミナルで `dev` スクリプト（または `text dev`）を実行します |
| Text.js: Stop Dev Server | VS Codeから起動した開発サーバーを停止します |
| Text.js: Open Preview | アクティブなファイルのライブプレビューを開きます |
| Text.js: Open in Browser Console | 開発サーバーで現在のルートを開きます。その後、[ブラウザーのコンソールを開きます](/docs/installation#open-the-console) |
| Text.js: New Page | メタデータと型付きの `params` を持つ `app/<route>/page.tsx` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | `GET` と `POST` を持つ `app/<route>/route.ts` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`、`error.tsx`、`not-found.tsx` |

<!-- s:87b5f49afb -->
ひな形作成コマンドは、エクスプローラーのフォルダーのコンテキストメニューにもあります。`settings`、`blog/[slug]`、`docs/[...path]`、`(marketing)/about` などの[App Router](/docs/routing)のセグメントを受け付け、同じセグメントに `page` と `route.ts` を配置することは拒否します。JavaScriptプロジェクト（`tsconfig.json` がない場合）では、`.jsx` と `.js` ファイルが作成されます。

<!-- s:9ba0c1b237 -->
スニペット

<!-- s:193db2a68e -->
| プレフィックス | 挿入内容 |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | フォルダー名に基づく名前のルートファイル |
| `txc` | ファイル名に基づく名前のコンソールコンポーネント |
| `txroute`, `txroutep` | パラメーターあり、またはなしのルートハンドラー |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | コンポーネント |
| `input`, `select`, `tabs` | 対話型コンポーネント |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | フック |
| `metadata`, `txconfig` | ルートのメタデータと `text.config.ts` |

<!-- s:a6e574a6aa -->
エラーコード

<!-- s:5e9e2a4649 -->
ソース、ログ、「出力」パネル、貼り付けたスタックトレースなど、どこにある `TX###` コードでもポインターを重ねてください。ホバー表示にはタイトル、メッセージ、パッケージと、textjs.orgの対応ページへのリンクが表示されます。各コード自体もリンクになっています（`⌘` を押しながらクリック）。

<!-- s:b67d013d7e -->
ステータスバー

<!-- s:be63ef7ae2 -->
`▼` 項目は、開発サーバーの状態とコンソールのグリッドサイズを、たとえば `▼ :3000  120×36` のように表示します。タブはサイズが変わるたびに、プレビューが開いていなくても開発サーバーにサイズを報告します。項目をクリックすると主なコマンドが表示されます。

<!-- s:5b827aed4d -->
設定

<!-- s:457ec968c0 -->
| 設定 | デフォルト | 説明 |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`、`live`、または `headless` |
| `textjs.preview.followEditor` | `false` | ライブモード：編集中のルートに追従 |
| `textjs.preview.fontSize` | `12` | セルのフォントサイズ（DevToolsは12を使用） |
| `textjs.preview.runtime` | | ヘッドレスプレビュー用のNode.jsバイナリー（デフォルト：VS Codeに同梱のもの） |
| `textjs.devServer.url` | | 開発サーバーのURL（デフォルト：ポート3000〜3010で検出）。`http://` のループバックアドレスのみを使用 |
| `textjs.devServer.command` | | Start Dev Server用のコマンド |

<!-- s:ea5e740ef1 -->
ワークスペースの信頼

<!-- s:ddcdd0b053 -->
プレビューと開発サーバーは、プロジェクトのコード（Viteの設定、`text.config.*`、コンポーネント）を実行します。「制限モード」では、拡張機能はスニペット、ひな形作成、エラーへのリンクのみを提供し、ワークスペース設定の `textjs.preview.runtime`、`textjs.devServer.command`、`textjs.devServer.url` を無視します。プレビューを有効にするには、ワークスペースを信頼してください。ワークスペースのフォルダー外にあるファイルはプレビューされません。

<!-- s:5ae438610c -->
動作の仕組み

<!-- s:857bac4692 -->
`text dev` はエディター向けに3つのエンドポイントを提供します。ループバックホスト（`localhost`、`127.0.0.1`、`[::1]`）宛てのループバック接続のみを受け付け、`Origin` がないリクエスト、または開発サーバー自身のオリジンからのリクエストにのみ応答します。ブラウザーのクロスサイトリクエストと `no-cors` リクエストは拒否されます。

<!-- s:2345c81baf -->
| エンドポイント | |
| :-- | :-- |
| `GET /__textjs/status` | プロジェクトルート、接続中のタブ、グリッドサイズ、現在のルート |
| `GET /__textjs/frames` | Server-Sent Events：変更ごとに1つの `frame` イベントを行の差分としてエンコード |
| `POST /__textjs/input` | タブへのキー入力、貼り付け、IMEまたはデッドキーのテキスト（`text`）、ホイール、ナビゲーション。JSONと `x-textjs-mirror: 1` ヘッダーが必須のため、他のサイトからのキー入力送信は不可 |

<!-- s:6693972af6 -->
タブはViteのHMRソケットを通じて開発サーバーにフレームを送信し、この接続にはサーバーごとのトークンが必要です。独自のビューアーを作成できるように、通信形式は `@textjs/app/frame-protocol`（`FrameEncoder`、`FrameDecoder`、`parseInputMessage`）からエクスポートされています。これらはすべて `text build` の出力には含まれません。
