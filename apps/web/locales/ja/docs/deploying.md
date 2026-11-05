<!-- s:04615ef523 -->
`text build` は移植可能な `dist/` を生成します。アダプターはそれをプラットフォームが求める出力に変換します。

<!-- s:087f8d3137 -->
アダプター

<!-- s:04908c6c09 -->
| アダプター | 出力 | 実行環境 |
| :-- | :-- | :-- |
| *（なし）* | `dist/` + `dist/.text/server` | `text start`（Node） |
| `static` | `dist/` | 任意の静的ホスト |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel（Build Output API v3） |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
アダプターは `TEXTJS_ADAPTER` でも指定できます。Vercel（`VERCEL=1`）またはCloudflare Pages（`CF_PAGES=1`）で `text build` を実行すると、対応するアダプターが自動的に選択されます。

<!-- s:d671e1ae31 -->
1つのscriptタグで別のサイトにアプリを追加するには、`--embed` を指定してビルドします。すべてのアダプターが対応しています（[埋め込み](/docs/embedding)を参照）。

<!-- s:9d8df946e5 -->
サーバーアダプター（`bun`、`vercel`、`cloudflare`）は `text start` と同じパイプラインを実行します。[ミドルウェア](/docs/middleware)、`rewrites`、[ルートキャッシュ](/docs/caching)を使用する[ルートハンドラー](/docs/route-handlers)、静的アセット、そしてページURL用のコンソールドキュメントの順です。curlなどのターミナルクライアントには、代わりにページの最初のフレームをANSIテキストとして返します。`vercel` と `cloudflare` では、これは静的ページのみが対象です（[curlとターミナルクライアント](/docs/curl)を参照）。サーバーアダプターは `/assets/` 配下のハッシュ付きファイルを `Cache-Control: public, max-age=31536000, immutable` 付きで配信します。

<!-- s:1a5ee098c6 -->
静的配信

<!-- s:9ebd0d2866 -->
GitHub Pages、S3、CDNなど、サーバーのないホストで使用します。`dynamic = "force-static"` または `revalidate` を持つ `GET` ルートハンドラーはファイルにプリレンダリングされ、`app/api/feed.json/route.ts` は `dist/api/feed.json` になります。ディープリンクでコンソールアプリが開くように、`index.html` のコピーが `404.html` に書き込まれます。静的ホストはcurlとブラウザーを区別できないため、curlにはHTMLページが返されます。

<!-- s:1e90536a2a -->
アプリがサーバーを必要とする場合、ビルドはすべての理由を列挙して失敗します。対象は `middleware.ts`、[サーバーレンダリングされるルート](/docs/server-rendering)、動的ルートハンドラー、動的セグメントを持つルートハンドラー、または `GET` 以外のメソッドです。代わりにホスト側で `rewrites` を設定してください。

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
`bun` アダプターは、実行時に `node_modules` を必要としない単一の自己完結型サーバーを書き出します。`PORT`（デフォルトは `3000`）と `HOSTNAME`（デフォルトは `0.0.0.0`）を読み取り、`server.js` や `.text/` は配信しません。長時間稼働するプロセスなので、`text start` と同様に[サーバーレンダリングされるルート](/docs/server-rendering)（`export const runtime = "server"`）とそのライブセッションもホストします。コンテナーで使用するには、次のようにします。

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
または、Vercelに接続されたGitリポジトリーにプッシュします。ビルドで `text build` が実行され、Vercelを検出して `.vercel/output` を書き出します。

<!-- s:3ee6894582 -->
| 出力 | 内容 |
| :-- | :-- |
| `static/` | クライアントのビルド（`basePath` 配下） |
| `functions/_textjs/server.func` | すべてのルートハンドラーをストリーミング付きで処理する1つのNode.js 22関数 |
| `functions/_middleware.func` | Edge Routing Middleware：`middleware.ts` と、すべてのアプリの正規パス |
| `config.json` | アセットヘッダー、ミドルウェアのマッチャー、リライト、ハンドラールート、コンソールドキュメント |

<!-- s:3f3ba93b7d -->
エッジミドルウェアは `x-middleware-next` / `x-middleware-rewrite` プロトコルを使用するため、関数やCDNに到達する前にVercelのルーターでヘッダーの上書きとリライトが処理されます。すべてのマッチャーは1つのルート `src` パターンを共有します。どのマッチャーにも該当しないリクエストは、パスが正規形式でない可能性がある場合（パーセントエスケープ、URLパーサーがエンコードする文字、`//`、`.` または `..` セグメント、末尾のスラッシュ）を除き、ミドルウェアをスキップします。その場合、ミドルウェアは正規パスを照合し、`has` / `missing` を確認し、Vercelが同じ方法でルーティングするようにリクエストをそのパスに書き換えます。`middleware.ts` のないアプリにも同じエッジ関数が含まれ、リライトのみを処理します。すべてのビルドにエッジ関数が含まれるため、ログイン済みのVercelアカウントからデプロイしてください。匿名デプロイ（`vercel deploy --temporary`）ではエッジ関数を受け付けません。

<!-- s:b5af065e25 -->
ハンドラー関数は内部用です。各ハンドラールートは、一致したパスを `x-textjs-path` リクエストヘッダーでこの関数に渡します。このヘッダーはミドルウェアの前後ですべてのリクエストから削除され、エッジミドルウェアも（クライアント由来でも `middleware.ts` 由来でも）転送しないため、設定できるのはハンドラールートだけです。`/_textjs/*` へのリクエストは、ミドルウェアとリライトの前後で、関数を実行せずに `404` を返します。生成されたルートは、ほかのすべてのホストのマッチャーやリライトと同様に、大文字と小文字を区別して照合されます。

<!-- s:5e18b8a450 -->
アダプターのテストでは、この出力をVercelのルーターのローカルエミュレーションで実行します。`src` の照合、`dest` のキャプチャー、ヘッダー変換、`status` ルートの動作は実際のデプロイで検証済みですが、エッジミドルウェアは匿名でデプロイできないため検証していません。

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
出力はPagesのアドバンストモードを使用します。

<!-- s:f72ec91f11 -->
| ファイル | 用途 |
| :-- | :-- |
| `_worker.js` | ミドルウェア、rewrites、ルートハンドラー、コンソールドキュメント。ルートハンドラーがYogaを使用する場合はディレクトリー（`index.js` と `yoga.wasm`） |
| `_routes.json` | すべてのリクエストをワーカーに送信。ミドルウェアも `basePath` もない場合、`/assets/*` はPagesの静的CDNで配信 |
| `_headers` | `/assets/*` のイミュータブルキャッシュ（既存の設定に追記） |
| `404.html` | 存在しないファイルに対して、アプリの代わりに `404` をPagesから返すためのファイル（既存のファイルがあれば保持） |

<!-- s:9bc2b010d1 -->
Pagesはディレクトリーをそのまま公開するため、`.text/`（サーバーバンドルとビルドマニフェスト）は `dist/` から削除されます。

<!-- s:1200dbc88d -->
Pagesプロジェクト（「設定」→「ランタイム」）または `wrangler.toml` で互換性フラグ `nodejs_compat` を有効にしてください。データキャッシュは `AsyncLocalStorage` を使用します。静的ファイルは `ASSETS` バインディングを通じて配信され、バックグラウンドでの再検証には `ctx.waitUntil()` が使用されます。

<!-- s:398bcc3496 -->
ミドルウェアがある場合、ハッシュ付きアセットを含むすべてのリクエストでワーカーが実行されるため、ミドルウェアはファイルにアクセスできるすべてのパスを確認できます。ワーカーを実行するリクエストはそれぞれ1回のFunctions呼び出しとなり、Workersのリクエスト割り当てに計上されます。ページの読み込みでは、ドキュメントと取得する各ファイルが対象です（小規模なテストアプリでは、ドキュメント、1つのJavaScriptバンドル、`yoga-[hash].wasm` の3つです。ファイルが多いアプリではさらに増えます）。Workers Freeプランでは、1日の割り当てを使い切るとPagesがワーカーを介さずに静的ファイルを配信するため、ミドルウェアがスキップされます。ミドルウェアで `dist/` 内の何かを保護している場合は、Settings → Runtime → Fail open / closedを **Fail closed** に設定してください。

<!-- s:24c3dfe433 -->
WebAssembly

<!-- s:72ec3f110c -->
Text.jsアプリは、レイアウトエンジンのYogaを `assets/yoga-[hash].wasm` から読み込みます（72 kB、gzip圧縮時は29 kB）。`text build` はすべてのページでこれをプリロードします。サーバーバンドルと `text run` は、`yoga-layout` のインラインコピーを使用します。Cloudflareワーカーは例外です。ルートハンドラーがYogaを使用する場合、`dist/_worker.js/` には `index.js` とともに `yoga.wasm` が格納されます。

<!-- s:0ca00aa2eb -->
- JavaScriptと同様に、`.wasm` ファイルも圧縮して配信してください。Vercelはデフォルトで `application/wasm` を圧縮します。nginxでは `gzip_types` に `application/wasm` が必要です。ホストがJavaScriptを圧縮しても `.wasm` を圧縮しない場合、ページのダウンロード量はインラインコピーの場合より約32 kB増えます。
- ブラウザーがダウンロード中にファイルをコンパイルできるように、`Content-Type: application/wasm` を送信してください。別のタイプでは、ダウンロード後にコンパイルされます。
- `assets/` 内のほかのハッシュ付きファイルと同様にキャッシュしてください（`Cache-Control: public, max-age=31536000, immutable`）。内容に応じて名前が変わるため、安全にキャッシュできます。ハッシュのないパスには `immutable` を使用しないでください。
- Content Security Policyを設定する場合は、`script-src` に `'wasm-unsafe-eval'` を、`connect-src` にファイルのオリジン（通常は `'self'`）を追加してください。
- 不明なパスが `index.html` にフォールバックする場合は、その書き換えから `/assets/` を除外してください。除外しないと、存在しないファイルに対してHTMLが返され、`initYoga()` が `TX032` で拒否されます。

<!-- s:55fb3b1d03 -->
独自のViteまたはwebpackビルド

<!-- s:df66a10103 -->
`@textjs/core` と `@textjs/react` を自分でバンドルする場合、Yogaはインラインのままで、バンドラーの設定は不要です。Wranglerなど、`workerd` 条件を解決するバンドルでは、代わりに `@textjs/core/yoga.wasm` をモジュールとしてインポートします。ブラウザービルドで `.wasm` ファイルを読み込むには、クライアントビルドに `@textjs/client` 解決条件を追加します。`defaultClientConditions` をエクスポートするVite 6では、開発用プリバンドラーにもこの条件が必要です。

<!-- s:8f580efda1 -->
この条件はbidiエンジンも専用のチャンクに分割し、ページで右から左へのテキストを初めて表示するときにダウンロードします（[bidiエンジンの読み込み](/docs/internationalization#loading-the-bidi-engine)を参照）。

<!-- s:c2349d8226 -->
サーバー、プリレンダリング、テストのビルド（Vitest、jsdom）には、この条件を含めないでください。これらはインラインコピーで問題なく動作します。

<!-- s:600050383d -->
アップグレード

<!-- s:e8733a2bfb -->
`@textjs/app` のセキュリティ修正がデプロイに反映されるのは、再ビルドして再デプロイした後です。

<!-- s:c74adc728a -->
- Vercel：新しい `.vercel/output` をデプロイします。
- Cloudflare Pages：`_worker.js` と `_routes.json` を含む新しい `dist/` をデプロイします。
- Bun：新しい `dist/` 全体（`server.js`、アセット、ライブバンドル）をデプロイし、サーバーを再起動します。
- `text start`：`text build` を実行し、再起動します。

<!-- s:8047727085 -->
古いデプロイは、それぞれのURL（たとえばVercelやCloudflare PagesのプレビューURL）で引き続きアクセス可能です。削除するか、プラットフォームのアクセス保護を適用してください。

<!-- s:f5e077273b -->
サーバーレンダリングされるルート

<!-- s:049ef31493 -->
[サーバーレンダリングされるルート](/docs/server-rendering)は開いているタブごとにセッションを保持するため、長時間稼働するサーバーが必要です。`text start` または `bun` アダプターを使用します。`static`、`vercel`、`cloudflare` アダプターでは、ページが `runtime = "server"` をエクスポートすると、`TX030` でビルドが失敗します。

<!-- s:eb19728e6b -->
プロキシの背後での実行

<!-- s:21a17d0b45 -->
`text start` は `127.0.0.1` にバインドし、ループバックにバインドしている間は `localhost`、`*.localhost`、IPアドレスのホストにのみ応答します（DNSリバインディング対策）。ほかのホストには `TX028` 付きの `403` を返します。公開用の設定を `text.config.ts` に記述してください。

<!-- s:43bd5471c8 -->
`origin` も `trustProxy` もない場合、`request.url` は検証済みの `Host` ヘッダーから `http` で構築されます。

<!-- s:689cebe287 -->
注意点

<!-- s:f45e3fb003 -->
- `text.config.ts` の `proxy` は `text dev` と `text start` でのみ実行され、アダプターには含まれません。すべてのサーバーアダプターが対応する `rewrites` を使用してください。
- サーバーレスインスタンスは、それぞれ独自のインメモリーキャッシュを持ちます。[キャッシュ](/docs/caching#platform-notes)を参照してください。
- 正規表現のグループを直接使用する `rewrites` は、ベストエフォートでVercelのルートに変換されます。名前付きパラメーター（`:slug`、`:path*`）は正確に変換されます。
