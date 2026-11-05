<!-- s:7e7d3cb07e -->
`text build --embed` は、マーケティングページ、ドキュメントサイト、WordPressやWebflowのページ、React 18アプリなど、別のサイトが1つのscriptタグで追加できる形にアプリをビルドします。DevToolsを開いた訪問者には、コンソールにアプリが表示されます。それ以外の訪問者は、ページに `<text-console>` がない限り、`embed.js`（gzipで約3 kB）以外はダウンロードしません。

<!-- s:2aa1d07d89 -->
埋め込みは実験的な機能です。`text build --embed`、`embed` オプション、`<text-console>`、`@textjs/app/experimental` のエクスポートは、マイナーリリースで変更される可能性があります。[破壊的変更](/docs/support-policy#breaking-changes)を参照してください。

<!-- s:6d2aa784de -->
サイトへのアプリの追加

<!-- s:f296ccaeef -->
アプリをビルドします。

<!-- s:2198c52791 -->
`dist/` を任意の静的ホストやCDNにアップロードするか、サイトの `public/` フォルダーにコピーしてから、サイトのページにタグを1つ追加します。

<!-- s:aa94ef1985 -->
`embed.js` は自身のURLを基準にほかのファイルを読み込むため、`dist/` はどのパスやオリジンでも動作します。含まれるのは `embed.js` と `assets/` のみで、サイト自身のファイルを置き換える可能性がある `index.html` や `404.html` は含まれません。[サーバーレンダリングされるルート](#server-rendered-routes)、ルートハンドラー、ミドルウェアを持つアプリには、静的ファイルのアップロードではなくサーバーが必要です。`vercel` と `cloudflare` アダプターはルートハンドラーとミドルウェアを実行し、サーバーレンダリングされるルートには `text start` または `bun` アダプターが必要です。

<!-- s:5c139759a2 -->
訪問者にアプリの場所を示すには、ページ内の任意の場所に [`<text-console>`](#text-console) を追加します。`data-textjs-engage` を持つ要素も、押すとアプリを起動します。

<!-- s:6a70ec16e1 -->
ローカルで試すには、`text dev --embed` を実行します。リクエストごとに新しい最初のフレームを含む `/embed.js` と、別のサイトと同じ方法でそれを読み込むプレビューページを `/`（`standalone` を使用する場合は `/__textjs/embed`）で配信します。別のローカルポートのサイトからも `http://localhost:3000/embed.js` を読み込めます。

<!-- s:37f210b46a -->
設定

<!-- s:aa9630bf92 -->
`text build --embed` は、`text.config.ts` の `embed: true` と同じです。デフォルトを変更するには、オブジェクトを渡します。

<!-- s:fbe8efc9f4 -->
| オプション | デフォルト | 説明 |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | コンソールを開いたときのルート。`/` で始まる必要あり |
| `globalName` | `"text"` | アプリの起動後にコンソールAPIを登録するグローバル名。`false` では登録なし |
| `initialClear` | `false` | 最初のフレームの前にページのコンソールをクリア。デフォルトでは、ページが以前に出力したログをアプリの上に保持 |
| `standalone` | `false` | `embed` なしの `text build` と同様に、アプリ自身のページ（`index.html`）もビルド |
| `allowOrigins` | `[]` | このサーバーのサーバーレンダリングされるルートをページから実行できるサイト。[サーバーレンダリングされるルート](#server-rendered-routes)を参照 |
| `credentials` | `false` | Cookieと `Authorization` を破棄せず、`allowOrigins` からのライブセッションリクエストで、このサーバーに対するブラウザーの認証情報を送信。完全一致のオリジンが必要 |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height`（デフォルトは120 × 36）は最初のフレームのサイズです。`title`、`hints`、`action` は `<text-console>` のデフォルトです。誰でも `embed.js` をダウンロードできるため、`ppr: false` の場合や `middleware.ts` が `initialPath` に一致する可能性がある場合、`embed.js` にプリレンダリングされた最初のフレームは含まれません。ミラーはアプリが描画するまで空白のままです。

<!-- s:7ca27066c7 -->
動作

<!-- s:1fe89ec57c -->
- **[コンソールの利用意図](/docs/hooks-and-repl#loading-on-console-intent-experimental)が検出されるまで、ほかには何も読み込みません。** `embed.js` はプリレンダリングされた最初のフレームをログに出力して待機します。DevToolsがドッキングされたとき（読み込み時またはその後）、訪問者がページ上でDevToolsのショートカット（F12、Ctrl+Shift+J、I、C、K、Macでは⌘⌥J、I、C、K）を押したとき、または `<text-console>` や `[data-textjs-engage]` 要素を押したときに、アプリを読み込みます。その後、同じタブで再読み込みすると、すぐに起動します。別ウインドウのDevToolsはページのサイズを変えないため、メニューから開いた訪問者には、これらの要素を押すまで最初のフレームが表示されます。
- **タッチスクリーンではアプリは起動しません。** `(hover: none) and (pointer: coarse)` に一致するデバイスでは、`embed.js` はログを出力せず、リスナーも追加しません。読み込むファイルは、ミラー用の `<text-console>` のファイルのみです。
- **キー入力がアプリに届くのは、訪問者が操作を開始した後だけです。** 操作を開始するには、`<text-console>` または `[data-textjs-engage]` 要素を押すか、ページ（リンク、ボタン、入力欄以外）をクリックしてDevToolsからフォーカスを戻します。ページ自身の入力欄や `[data-textjs-bypass]` 要素への入力はアプリに届かず、ホイールは常にページをスクロールします。
- **ページのURL、履歴、タイトルは変わりません。** ルート、`<Link>`、`useRouter()` はコンソール内で移動します。クライアントでレンダリングされるアプリでは、絶対URLは新しいタブで開きます。
- **ページ上のText.jsアプリが優先されます。** そのアプリが起動すると、実行中の埋め込みはアンマウントされ、キー入力の読み取りを停止し、自身のグローバルを削除します。別のアプリがコンソールを使用している間に読み込まれた埋め込みは、警告を1件出力し、起動しません。
- **埋め込みには専用のReact 19がバンドルされています。** `react-dom` やベアインポートがないため、ページのReactのバージョン、`react` のインポートマップ、React DevToolsの影響を受けません。

<!-- s:5bd6dcbe49 -->
読み込まれるファイルとタイミング

<!-- s:631a37c837 -->
| ファイル | 読み込みタイミング | gzip |
| :-- | :-- | --: |
| `embed.js` | ページと同時 | 2.9 kB |
| `assets/text-console-[hash].js` | ページに `<text-console>` がある場合 | 4.0 kB |
| `assets/embed-client-[hash].js` と `assets/yoga-[hash].wasm` | コンソールの利用意図の検出時 | 112.8 kB + 29.0 kB |
| `assets/embed-player-[hash].js` | [サーバーレンダリングされるルート](#server-rendered-routes)で、コンソールの利用意図の検出時にクライアントの代わりに読み込み | 22.7 kB |
| `assets/bidi-[hash].js` | アプリが右から左へのテキストを初めて表示するとき（[bidiエンジンの読み込み](/docs/internationalization#loading-the-bidi-engine)を参照） | 10.1 kB |

<!-- s:d86aa9b2e1 -->
サイズは120 × 36の枠線付きステータスボックスのものです。`text build --embed` はアプリのサイズを出力します。`assets/embed-[hash].js` は、名前が変わらない `embed.js` のコピーです（[デプロイ](#deploys)を参照）。

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` は `<text-console>` を定義し、ページ上に存在する場合のみそのファイルを読み込みます。Shadow DOMを使用するため、ページのCSSは内部に影響せず、`style-src 'self'` ポリシーを変更する必要もありません。

<!-- s:9ceead3eca -->
属性がない場合は1行のバーです。ブラウザーでコンソールを開くショートカットを表示し、次にクリックを促し、その後アプリのキーを一覧表示します。キーはアプリに届くと点灯します。Safariでは、最初の手順でSafariの「設定」にある「Webデベロッパ用の機能を表示」をオンにするよう案内します。

<!-- s:899e0c7fe3 -->
`mirror` を指定すると、ページ上にアプリのフレームを表示します。ほかの読み込みが始まる前はプリレンダリングされた最初のフレーム、その後は実行中のアプリを表示します。押すとアプリが起動し、訪問者のキー入力が送られるため、DevToolsを閉じたままでも動作します。`chrome` はミラーの周囲にDevToolsウインドウを描画し、`mirror` も有効にします。

<!-- s:fefcb3e495 -->
| 属性 | 説明 |
| :-- | :-- |
| `mirror` | アプリのフレームを表示 |
| `chrome` | DevToolsウインドウ内にフレームを表示 |
| `title` | バーのタイトル（デフォルトは `text.config.ts` の `title`） |
| `hints` | `"← →:switch region, Enter:open"` のように一覧表示するキー（デフォルトは `text.config.ts` の `hints`） |
| `action` | 「ここをクリックして…」と表示する最初の操作（デフォルトは `text.config.ts` の `action`、または最初のヒントのキーを押す操作） |

<!-- s:392012169b -->
タッチスクリーンでは、ミラーはアプリを起動せずに最初のフレームを表示し、バーは非表示になります。要素のテキストは英語です。

<!-- s:13ff4ec1f4 -->
表示領域の確保

<!-- s:0f4e2c234d -->
`text build --embed` は、アプリのグリッド用のCSSを1行出力します。ページのスタイルシートに貼り付けてください。要素のファイルが読み込まれる前に `<text-console>` のサイズを設定するため、ファイルが届いてもページ内の要素は移動しません。デフォルトの120 × 36のグリッドでは、次の行です。

<!-- s:a2d2741417 -->
バーの高さは58pxです。ミラーはグリッドの縦横比を保ち、本来の幅（120列で885px）まで広がり、`chrome` は43pxを追加します。サイズはフォントに依存しません。`@textjs/app/experimental` の `reserveCss(cols, rows)` は同じ行を返します。

<!-- s:a1260c10c3 -->
ファーストビュー内のミラーは通常ページ内で最大の要素なので、ページのLargest Contentful Paint（LCP）を決定します。最初のフレームは、`embed.js`、続いて要素のファイルが順に読み込まれた後に描画されます。ページのほかの部分は、埋め込みがない場合と同じように描画されます。ページの下方にあるミラーはLCPに影響しません。Reactアプリなど、独自の遅延スクリプトを持つページでは、`<script type="module" async src="…">` がそれらを待たずに `embed.js` を実行するため、ファーストビュー内のミラーをより早く描画できます。

<!-- s:4206a424a5 -->
スタイル設定

<!-- s:834fbf40e6 -->
ミラーを中央に配置するには、インライン方向のマージンをautoに設定します。

<!-- s:6dde2b2766 -->
デフォルトは暗い配色です。明るい配色には `color-scheme: light` を設定するか、ほかのすべての色合いの混合元になる2色を設定します。`::part(frame)` はフレーム自体のスタイルを設定します。`chrome` はDevTools自身の背景を維持します。

<!-- s:f5e077273b -->
サーバーレンダリングされるルート

<!-- s:eb293d9fb4 -->
`initialPath` が `export const runtime = "server"` を持つルートの場合、`embed.js` はクライアントランタイムの代わりにフレームプレーヤーを読み込みます。`embed.js` の配信元サーバーからフレームをストリーミングするため、`text start` または `bun` アダプターを実行してください。ほかのアダプターではビルドが失敗します。[サーバーレンダリング](/docs/server-rendering)を参照してください。

<!-- s:e2bdd4dbb7 -->
別のサイトのページがライブセッションを開けるのは、そのオリジンが `allowOrigins` に含まれる場合のみです。

<!-- s:6ec7048857 -->
- セッションは、それを開いたオリジンにのみ応答します。
- デフォルトでは、Text.jsは別のサイトからのセッションのCookieと `Authorization` ヘッダーを破棄するため、[ミドルウェア](/docs/middleware)は訪問者をサインアウト状態として扱います。`credentials: true` はそれらを保持し、完全一致のオリジンが必要です。ページとサーバーが登録可能なドメインを共有し（`www.example.com` と `console.example.com`）、Cookieがサーバーを対象に含む場合（`Domain=example.com`、または `console.example.com` で設定）、ブラウザーはそれらを送信します。別のサイトからは `SameSite=None; Secure` で設定されたCookieのみを送信し、サードパーティーCookieをブロックするブラウザーは何も送信しません。
- ライブセッションは、接続直後と再接続時に `/__textjs/live` へ `OPTIONS` プリフライトを送信します。プリフライトにはCookieも `Authorization` も含まれないため、そのパスに一致するミドルウェアは、サインインなしで `OPTIONS` リクエストを通す必要があります。
- リバースプロキシやCDNの背後では、`server.trustProxy` を設定してください（[プロキシの背後](/docs/deploying#behind-a-proxy)を参照）。設定しない場合、すべての訪問者がプロキシのアドレスを持つため、全員で1つのクライアント単位のセッション上限を共有します。

<!-- s:f739524722 -->
`text dev` は、`credentials` が設定されていない限り、`allowOrigins` なしで `localhost`、`127.0.0.1`、`[::1]` の任意のポートのページを受け入れます。

<!-- s:d5df7bf60f -->
ホスティング

<!-- s:4bef54c1c0 -->
`text start` と `bun`、`vercel`、`cloudflare` アダプターは、これらのヘッダーを付けて埋め込みビルドを配信します。`static` アダプターは、Cloudflare PagesとNetlifyが読み取る `_headers` に書き込みます。ストレージバケットやサイト自身の `public/` フォルダーなど、ほかのホストでは自分で設定してください。

<!-- s:be81a4c5ec -->
| パス | ヘッダー |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| サイトが別のオリジンにある場合は両方 | `Access-Control-Allow-Origin: *` と `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
ブラウザーはモジュールスクリプトとWebAssemblyをCORSで取得するため、別のオリジンのファイルには `Access-Control-Allow-Origin` が必要です。`yoga-[hash].wasm` は `application/wasm` として圧縮して配信してください（[WebAssembly](/docs/deploying#webassembly)を参照）。

<!-- s:1bb976fcdc -->
デプロイ

<!-- s:01b888e293 -->
`embed.js` はページの読み込みごとに再検証されるため、新しい訪問者には新しいデプロイがすぐに配信されます。以前の `embed.js` を読み込んだタブでは、訪問者が数時間後にコンソールを開いた場合でも、以前のビルドのファイルをインポートします。以前のデプロイの `assets/` はオンラインで保持してください。削除を伴う同期ではなく、新しいファイルを古いファイルに上書きコピーし、古いファイルは1〜2日後に削除します。ビルドを固定するには、そのビルドの `assets/embed-[hash].js` をタグに指定します。そのビルドのファイルもオンラインで保持する必要があります。

<!-- s:b748b07652 -->
ファイルがなくなると、`embed.js` は訪問者に再読み込みを求める警告を1件出力し、アプリの起動もページの再読み込みもしません。

<!-- s:fce19037b3 -->
コンテンツセキュリティーポリシー

<!-- s:de8e30a920 -->
`embed.js` にインラインスクリプトやインラインスタイルは不要です。ホストページのポリシーに以下を追加し、`dist/` が同一オリジンにある場合はオリジンを `'self'` に置き換えます。

<!-- s:2da4077ce0 -->
| ディレクティブ | 値 | 用途 |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` とそのチャンク |
| `script-src` | `'wasm-unsafe-eval'` | クライアントレンダリングされるアプリのYoga |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`、およびサーバーレンダリングされるルートの `/__textjs/live` |
| `img-src` | `data:` | アプリが `<Image>` または `<Pixels>` を描画する `<text-console mirror>` のみ |

<!-- s:4ce5dcc4cb -->
独自の方法でのアプリの読み込み

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` は、独自の方法でアプリを読み込むページ向けに、`embed.js` の構成要素をエクスポートしています。

<!-- s:238cbf53ee -->
| エクスポート | 説明 |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | 最初のフレームを出力し、コンソールを使う意思の検出を待ってから `boot` を呼び出す、`embed.js` の実行処理 |
| `bootEmbedClient(options)` | メモリー内ルーティングと、ページ向けに受け付けを制御したキーボード入力を備えた、クライアントレンダリングされるアプリの起動 |
| `bootEmbedPlayer(options)` | サーバーレンダリングされるルート用のフレームプレーヤーの起動 |
| `createHostInput(options)` | 上記のルールに従うキーボード入力 |
| `createTextConsoleMount(config)` | `<text-console>` 用の `mount(element, shell?)` 関数の返却 |
| `reserveCss(cols, rows)` | `<text-console>` のスペースを確保するCSS |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` と `BYPASS_SELECTOR` は、それぞれアプリを起動する要素と、キー入力を自身で処理する要素のセレクターです。
