<!-- s:f70688822a -->
Text.jsの主な変更はすべてこのファイルに記録しています。

<!-- s:1ab5f276ed -->
形式は[変更履歴を記録する](https://keepachangelog.com/en/1.1.0/)に基づき、このプロジェクトは[セマンティックバージョニング](https://semver.org/spec/v2.0.0.html)に従います。リリース0.1.0〜0.4.0はgitでタグ付けされましたが、npmには公開されていません。

<!-- s:2e16922cfc -->
追加

<!-- s:01d85a9a48 -->
- textjs.org：スペイン語、フランス語、ドイツ語、ブラジルポルトガル語、韓国語、簡体字中国語、繁体字中国語は、textjs.org/es、/fr、/de、/pt-br、/ko、/zh-cn、/zh-twで草稿表示を終了しました。フッターの言語選択とブラウザーの言語に応じたボタンは、日本語と同様にこれらの言語を表示し、検索エンジンは翻訳済みのページをインデックスに登録して各ページを英語版と対応付けます。
- textjs.org：イタリア語、ロシア語、トルコ語、ポーランド語、インドネシア語、ベトナム語、ヒンディー語は、textjs.org/it、/ru、/tr、/pl、/id、/vi、/hiで草稿表示を終了しました。フッターの言語選択とブラウザーの言語に応じたボタンは、ほかの言語と同様にこれらの言語を表示し、検索エンジンは翻訳済みのページをインデックスに登録して各ページを英語版と対応付けます。
- textjs.org：アラビア語、ヘブライ語、ペルシア語、ウルドゥー語は、textjs.org/ar、/he、/fa、/urで草稿表示を終了しました。フッターの言語選択とブラウザーの言語に応じたボタンは、ほかの言語と同様にこれらの言語を表示し、検索エンジンは翻訳済みのページをインデックスに登録して各ページを英語版と対応付けます。

<!-- s:5b88618770 -->
変更

<!-- s:33280e468a -->
- `@textjs/react`：`<FocusPad>` と `<ViewportControl>` は、ページに `--mono` フォントスタックが定義されている場合、等幅ラベルにそのフォントスタックを使い、未定義の場合は従来どおりGeist Monoにフォールバックします。アラビア語やヘブライ語のラベルがあるページでは、その文字体系のフォントを `--mono` に追加できます。

<!-- s:afe76b8d59 -->
修正

<!-- s:f0905efd51 -->
- textjs.org：スマートフォンでは、行より長いインラインコードがページの幅を広げずに折り返されます。textjs.org/docs/internationalizationは、390pxの画面で幅が92px超過していました。

<!-- s:f71df9184f -->
- `@textjs/react`: `<FocusPad messages>` で、翻訳されたサイト向けにパッドの組み込み文字列を置き換えられます。すべての行、スクリーンリーダーのラベル、コンソールサイズのコントロールが対象です。`<TextCanvas>` と `<ViewportControl>` も `messages` を受け取ります。`<ViewportControl>` が使うのはサイズコントロールのキーのみです。「次にここをクリックして↑ ↓を押します。」のように値を含む文字列は、文全体を返す関数です。`defaultFocusPadMessages` には英語のテキストが入っています。[フォーカスパッドの翻訳](https://textjs.org/docs/internationalization#translating-the-focus-pad)を参照してください。
- `@textjs/react`: 右から左に書くページでは、フォーカスパッドは⌘ ⌥ Jなどのキーキャップや120×36などのコンソールサイズを左から右のまま表示し、サイズコントロールとステップバーを左右反転します。中国語と日本語のページでは2つの文の間のスペースを削除し、韓国語では残します。
- textjs.org：textjs.org/jaの草稿表示を終了しました。フッターの言語選択で、同じページを英語または日本語で開けます。日本語に設定されたブラウザーには「日本語で読む」ボタンが、textjs.org/jaを開いた英語のブラウザーには「Read in English」ボタンが表示されます。言語を選択するかボタンを閉じると、それ以降は表示されません。検索エンジンは翻訳済みの日本語のページをインデックスに登録し、各ページを英語版と対応付けます。
- textjs.org: textjs.org/jaでは、各デモのキーの下にあるラベルも含め、すべてのページでフォーカスパッドが日本語で表示されます。

<!-- s:27b507a9de -->
- `@textjs/core`：ChromiumとFirefoxのコンソールは、アニメーションするスプライトの出力を4 MBではなく16 MBでクリアするため、textjs.org/doomで「コンソールがクリアされました」と表示される間隔が約4.5秒から約19秒になります。Safariと、`▀` のハーフブロックで描画するスプライトは、4 MBのままです。textjs.org/doomのページのヒープ使用量のピークは、10.8 MBから約12〜13 MBに増えます。
- textjs.org：ドキュメントページは全33ページ分ではなく、そのページのMarkdownのみをダウンロードするため、読み込むJavaScript（gzip）が英語のドキュメントページでは43〜47 KB、/jaのドキュメントページでは60〜64 KB減ります。別のドキュメントページへのリンクにポインターを合わせるかフォーカスすると、そのページを先に取得するため、引き続きすぐに開きます。

<!-- s:b3d1adfa39 -->
- textjs.org/ja：⌘K検索で日本語のドキュメント見出しを表示し、日本語のクエリーで見出しを検索できるようになりました。以前は、日本語のページタイトルの下に英語の見出しを表示していました。英語名でも引き続きページを検索でき、`routing` で「ルーティング」、`open the console` で「コンソールを開く」が見つかります。
- textjs.org：textjs.org/jaのドキュメントの例と、textjs.org/docs/internationalizationの双方向テキストの例で、コンソール内で実行している例の変更が再びページのプレビューに反映されます。コンソール内の例の上にある行は、「▼ Docs › Introduction › Counter」から「▼ Docs › Counter」に変わりました。

<!-- s:125517f5e0 -->
- textjs.org/doomで、Doom独自のステレオパンと距離減衰を使ってDoomの効果音を再生します。音はページ上で最初にクリックするかキーを押すと始まり、ゲームとともに一時停止し、DoomのOptions → Sound VolumeメニューにあるSfx Volumeに従います。音楽はありません。

<!-- s:144aa59e73 -->
- `@textjs/react`, `@textjs/app`: フォーカスのヒント（「キーボードを使うにはページをクリックしてください」）が、すべてのテーマで黒い太字のテキストを載せたアンバー色のバーになりました。以前はテーマの配色を反転していました。表示されるたびに約6秒間で4回点滅し、その後はアンバー色のままになります。視差効果を減らす設定がオンの場合は点滅しません。点滅の各サイクルで、最大8個の追加コンソールフレームをログに出力します。
- textjs.org: Doomをtextjs.org/doomに移動しました。textjs.org/playground/doomはそこにリダイレクトします。

<!-- s:b91de36548 -->
- `@textjs/core`, `@textjs/react`: Chromeの「問題」パネルで、すべてのページに「フォームフィールド要素にはid属性またはname属性が必要です」と報告されなくなりました。キーボード入力用の非表示の `<textarea>` には `textjs-input` という名前が付き、`ViewportControl` のコンソールサイズ用 `<select>`（`FocusPad` の `sizeControl` にも含まれます）には `id` と `textjs-console-size` という名前が付きました。キーボード入力用の `<textarea>` は、1Password、LastPass、Bitwarden、Dashlaneの対象からも除外されます。
- textjs.org: textjs.org/doomのコンソールヘッダーを「Text.js / playground / doom」から「Text.js / doom」に変更しました。
- textjs.org/doom: 幅の狭いウィンドウで、「ソースを表示」の後に不要な「·」が残らなくなりました。
- textjs.org: 幅の狭いウィンドウで、Playgroundのデモ選択欄は最後の項目を単語の途中で切らずに、スクロール先にデモがある側の端でフェードアウトするようになりました。
- textjs.org/doomがDoom本来の毎秒35 ticで動作するようになりました。以前はレベル内で、60Hzディスプレイでは3.8×の速度（毎秒131 tic）、120Hzでは5.5×の速度（192）で動作していました。これは、Doomがレベル描画中に行う追加のクロック読み取りをページがビジーウェイトと誤認し、アニメーションフレームとタイマーのコールバックのたびにDoomのクロックを1 tic進めていたためです。

<!-- s:14d523690c -->
- `@textjs/react`: `<Image renderMode="halfblock">` は、1.3の `<Image>` と同様に、すべての環境で `▀` のハーフブロックを描画します。
- `@textjs/core/experimental`: `drawPixels` は、滑らかなアルファ値と256色を超える色を持つロスレスのスプライト用に `encoding: "rgba"` を受け取り、スプライトを表示できない場所でセルを描画する `fallback` 関数も受け取ります。
- `@textjs/app`: `text dev`、`text start`、および `bun`、`vercel`、`cloudflare` アダプターで、curl、Wget、HTTPie、xhはHTMLページの代わりにページの最初のフレームをトゥルーカラーのANSIテキストとして取得します。`text build` は静的ページのフレームをプリレンダリングします。`text start` と `bun` はリクエスト時に動的ページとサーバーレンダリングのページをレンダリングし、不明なパスにはアプリのnot-foundページと `404` を返します。フレームのデフォルトは80 × 24です。サイズの変更やフレームの無効化には、`text.config.ts` の `ansi` またはページの `export const ansi` を使います。`static` アダプターはcurlにHTMLページを配信します。[curlとターミナルクライアント](https://textjs.org/docs/curl)を参照してください。
- `@textjs/app/ansi` は、`text start` やアダプターを使わないサーバー向けに `wantsAnsi` と `ansiResponse` をエクスポートし、`@textjs/react` は `frameToAnsi` をエクスポートします。
- textjs.org: textjs.org/jaに日本語版の草稿を追加し、はじめに、インストール、ルーティングのドキュメントとサイトのインターフェースから翻訳を始めています。未翻訳の段落は英語で表示します。検索インデックスへの登録と言語選択への追加はまだしていません。

<!-- s:f489f8e451 -->
- `@textjs/react`: `<Image>` がChromiumとFirefoxのコンソールでピクセルスプライトを描画するようになりました。1セルあたり、ピクセルアートでは最大8 × 16ピクセル、写真では4 × 8ピクセルです。これは、マイナーリリース間でフレームの見た目を維持するという[サポートポリシー](https://textjs.org/docs/support-policy)の約束を意図的に破る変更です。1.3のハーフブロックを維持するには、`renderMode="halfblock"` を渡します。Safari、ターミナル（`text run` を含む）、ANSIおよびプレーンテキスト出力、サーバーレンダリングされるページ（`runtime = "server"`）では、引き続きハーフブロックを描画します。
- `@textjs/app`: curl、Wget、HTTPie、xhでページを取得するスクリプトや稼働監視が、ANSIテキストを受け取るようになりました。引き続きHTMLを受け取るには、`Accept: text/html` を送信するか、`text.config.ts` で `ansi: false` を設定します。
- `@textjs/app`: `text build` がページのシェルをプリレンダリングする間、非同期サーバーコンポーネントは実行されなくなりました。従来どおり `<Suspense>` のフォールバックを表示し、ビルド時にデータリクエストを開始しません。
- `@textjs/app`: サーバーレンダリングされるページのフレームプレーヤーが3 KB小さくなり、`examples/dashboard` ではgzip圧縮後のサイズが25.4 KBから22.4 KBになりました。`CellBuffer` の描画メソッド、ボックスの枠線、テキストの切り詰め処理を含まなくなりました。

<!-- s:ba0b1ea778 -->
- `@textjs/core`: Windows 10でチャートとスピナーのグリッドを維持します。コンソールフォントのConsolasには▁▂▃▅▆▇の8分割ブロック、四分割ブロック、点字、▶、✓がなく、代替グリフによって行がフレームの右端を超えていました。`CssConsoleDriver` は、これらのグリフのうちコンソールフォントでセルの5分の1を超えるずれが生じるものを一度測定し、Consolasにある最も近いグリフで描画します。8分割ブロックには `_` `▄` `▌` `█`、四分割ブロックと点字にはハーフブロック、矢印、チェック、バツには `►` `◄` `√` `×` を使います。Windows 11のCascadia MonoやmacOSのMenloなど、グリフが収まるフォントでは元のグリフを描画します。`measureText: false` で無効にできます。
- `@textjs/core`: ChromeとEdgeのDevToolsで、textjs.org/coffeeの「アカウント」や「数量」の横など、隣接する背景の間に1pxの縦の細線が出なくなりました。Chromiumは各 `%c` スパンを個別にデバイスピクセルに合わせるため、2つのスパンが接するピクセルがどちらにも属さない場合がありました。`CssConsoleDriver` は、スパンの背景を右隣の不透明な背景の下まで1px延ばします（`padding-right:1px;margin-right:-1px`）。FirefoxとSafariのフレームは変わりません。
- `@textjs/core`: ChromeとEdgeの `<Image>` スプライトにも、テキストと同じ1pxの規則を適用します。透明なスプライトの左側にあるテキストが、スプライトの左端に1px幅の背景を重ねて描画しなくなり、スプライトの右側も反転テキストを含む不透明なテキストに隙間なく接します。行内にスプライトしかない場合も、上下のテキスト行と同様にフレームの右端まで届きます。
- `@textjs/react`: `<ConsoleMirror>` は、テキストの横にある写真を画像としてではなく、コンソールと同じハーフブロックで描画します。

<!-- s:757b866128 -->
- `@textjs/react/experimental` はライブフレームバッファー用の `<Pixels>` と、押されているキーを扱う `useKeyState` をエクスポートし、`@textjs/core/experimental` は `drawPixels` をエクスポートします。これらはマイナーリリースで変更される場合があります。
- textjs.org/playground/doom: DevToolsコンソールでDoomのシェアウェアエピソードをプレイできます。
- `@textjs/react`、`@textjs/app`: ページにフォーカスがない間、コンソールフレームの最終行に「キーボードを使うにはページをクリックしてください」と表示し、コンソール内のアプリをクリックした訪問者にキーが効かなくなった理由を伝えます。アプリに `useInput` または `usePaste` のハンドラーかフォーカス対象がある場合、サーバーレンダリングされるルートを含め、ブラウザーコンソールでのみ表示します。インラインミラーとVS Codeプレビューには表示しません。無効にするには、`text.config.ts` または `createConsoleRoot` で `focusHint: false` を指定します。
- `@textjs/react`: `usePageFocus()` はページにフォーカスがあるかどうかを返します。アプリがキーボードを必要とするタイミングを自分で決めるには、`focusHint: false` を設定し、`<FocusHint active={…}>` をレンダリングします。`useInput(handler, { ambient: true })` は常時有効なショートカットを示し、それ単独ではヒントを表示しません。

<!-- s:c96685f5e0 -->
- `@textjs/core`: `<Pixels>` スプライトのアニメーション中、`ConsoleRenderer` はChromiumでは51msごとにキーフレームをまとめ、Safariではフレーム間隔を33msに調整し、`CssConsoleDriver` に追加された出力が4 MB（`SPRITE_MAX_BYTES`）に達すると消去します。静的スプライトとテキストのみのアプリでは、既存のフレーム間隔と300フレームの消去上限を維持します。

<!-- s:34e1835d0a -->
- `@textjs/core`: `bindTextSink(element, onText)` は、IMEまたはデッドキーで確定したテキストを非表示のtextareaやinputから読み取ります。読み取りは確定ごとに一度で、変換中には読み取りません。`engine.bindTextSink(element)` は、自分でレンダリングしたtextareaを `InputEngine` に接続します。どちらもリスナーを削除する関数を返します。
- `@textjs/app`: `POST /__textjs/input` は、IMEとデッドキーのテキスト用に `{ type: "text", text }` を受け付けます。`@textjs/app/frame-protocol` の `InputMessage` と `parseInputMessage` にも含まれます。

<!-- s:60239a49b7 -->
- `@textjs/app`: ミドルウェアとルートハンドラーは正規化されたパスを受け取ります。`/docs/` と `/docs//intro` は `/docs` と `/docs/intro` として届くため、末尾のスラッシュを追加するミドルウェアのリダイレクトは無限に繰り返されます。そのリダイレクトを削除してください。動的セグメントにエンコードされたスラッシュは含められず、`/files/a%2Fb` は `400` を返します。
- `@textjs/app`: ミドルウェアがある場合、`--adapter cloudflare` はハッシュ付きアセットを含むすべてのリクエストをワーカーに送り、`basePath` がある場合はベースパス外のリクエストも送ります。ワーカーを実行する各リクエストはFunctionsの呼び出し1回としてWorkersのリクエスト割り当てに数えられます。Workers Freeプランでは、Pagesプロジェクトをフェイルクローズに設定してください（設定→ランタイム→フェイルオープン／クローズ）。設定しない場合、1日の割り当てを使い切ると、Pagesはミドルウェアを通さずにファイルを配信します。

<!-- s:cb257a7494 -->
- textjs.orgのインラインコンソールで、中国語、日本語、韓国語のIMEとデッドキーが動作します。コンソールが変換中にtextareaを消去していたため、アプリには未変換の文字や誤った文字が届いていました。
- `<FocusPad>` はクリック後もアプリのキーボードフォーカスを維持します。以前はすぐにフォーカスが外れたため、中国語、日本語、韓国語のIMEで文字を入力できませんでした。
- 文字を合成しないデッドキー（Windows、およびIMEのないLinux）も、非表示のtextareaにフォーカスがある状態でアプリに届きます。US-Internationalでは、`'` の後に `e` を押すと `é`、`'` の後に `t` を押すと `'t` が入力されます。`InputEngine` がデッドキーを完了するkeydownをブロックしていたため、ブラウザーは何も挿入しませんでした。`@textjs/core` の `DeadKeyTracker` はそのkeydownを通し、VS Codeプレビューもこれを使います。
- VS Codeプレビューは、以前は破棄していたIMEとデッドキーのテキストを届け、デッドキーやIME変換中のキー入力をアプリに転送しなくなりました。`@textjs/app` 1.1.0以前の `text dev` サーバーでは、テキストをキー入力または貼り付けとして送信します。
- `@textjs/core`: `InputEngine.handleTextInput` は、キー入力や貼り付けと同様に、`shouldCapture` が `false` を返す間はテキストを無視します。
- `text dev` は `@textjs/app/live-stub` と `@textjs/app/live-player` を事前にバンドルします。`runtime = "server"` のページがあるアプリでは、最初のページ読み込み後に初めてこれらが見つかり、Viteが読み込み中に再バンドルしていたため、古いチャンクへの404と、Reactの重複による「無効なフック呼び出し」が発生していました。
- Windowsでチャートとスピナーがフレーム内に収まります。Consolasには▁▂▃▅▆▇のブロック、四分割ブロック、点字、▶、✓がないため、Windowsは最大1.8セル幅の代替フォントで描画し、チャートの行がフレームの右端を超えていました。コンソールのフォントスタックは `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace` になり、Windows 11ではフレーム全体をCascadia Monoで描画します。`<ConsoleMirror>`、VS Codeプレビュー、DevTools拡張機能のフレームビューも、Consolasより前にCascadia Monoを指定します。
- `@textjs/opencode`: WindowsのNode環境で、ブリッジが `npm i -g opencode-ai` でインストールされたOpenCodeを見つけます。Nodeはnpmの `opencode.cmd` シムを名前で起動できないため、ブリッジはOpenCodeが未インストールであるかのように動作していました。現在は各 `PATHEXT` 拡張子で `PATH` を検索し、`cmd.exe` 経由で `.cmd` シムを実行します。Bun（`bunx`）ではすでに動作していました。
- Windowsで `text build` が動作します。以前はすべてのテンプレートで `Could not resolve entry module "virtual:textjs/api"` が出るか、エラーメッセージなしで失敗していました。
- `text build` は、コンソールシェルのプリレンダリングやサーバーレンダリングされるルートのビルドが失敗した場合、エラーを表示します。以前はViteの「ビルド失敗」の行の後、理由を表示せずにコード1で終了していました。
- Windowsの `text dev` は、ファイルを編集するとサーバーレンダリングされるルートを再レンダリングし、ページの `runtime` エクスポートが変わるとブラウザーを再読み込みします。
- Windowsの `text dev` は、`/app/page.tsx` などViteがモジュールとして配信するソースファイルに対して `middleware.ts` を実行しなくなり、認証リダイレクトで開発クライアントが壊れなくなりました。
- プロジェクトパスに `C:\Users\RUNNER~1` などのWindows 8.3短縮名が含まれる場合も、`text run` と `text mcp` が動作します。以前はCLIとアプリが `@textjs/app` を二重に読み込むため、「アプリケーションエラー」と表示されていました。
- Windowsでビルドした `dist/` は、LinuxとmacOSでもプリレンダリング済みページを配信します。ライブルートのマニフェストがパスをバックスラッシュで保存していました。
- `text.config.ts` の `vite` オプションで `build.rollupOptions.input` を設定しても、`text build` が動作します。以前はその入力がAPI、サーバーレンダリングされるルート、アダプターの各バンドルのエントリーを置き換え、ビルドが失敗していました。
- ページ読み込み後の最初の数秒間に停止した場合も `text dev` が終了し、`server.close()` が解決します。以前は、新たに検出された依存関係の最適化中にViteを閉じると、終了処理が完了しませんでした（vitejs/vite#22934）。

<!-- s:a4ff72c5e8 -->
セキュリティ

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0以前では、保護されたパスを `/ad%6din`、`/api//admin`、`/admin%2Fx` など別の形式で記述すると、リクエストが `middleware.ts` を回避できました。ミドルウェアは送信されたままのパスを照合する一方、ページ、ルートハンドラー、静的ファイルはデコード後のパスで検索していました（ルートハンドラーでは2回デコード）。これは `text dev`、`text start`、および `--adapter bun`、`vercel`、`cloudflare` のビルドに影響しました。静的ビルドはミドルウェアを使えないため、影響はありません。1.2.0に更新し、再ビルドして再デプロイしてください。Vercelでは `.vercel/output`、Cloudflare Pagesでは `dist/`、Bunでは `dist/` 全体が対象です（サーバーを再起動してください）。独自のURLでまだアクセスできる古いデプロイは削除するか、保護してください。
- すべてのホストがリクエストごとに1つの正規化されたパス名を算出し、マッチャー、`request.nextUrl`、すべての検索に使います。パーセントエスケープをデコードし、`new URL()` と同じ形式でパスを再エンコードし、`.` と `..` のセグメントを解決し、重複するスラッシュと末尾のスラッシュを削除します。`%2F`、`%5C`、または不正なパーセントエンコーディングを含むパスには `400` を返します。`text dev`、`text start`、Bunアダプターは正確な名前でのみ静的ファイルを配信するため、macOSとWindowsで `/ADMIN/report.txt` が `public/admin/report.txt` を配信しなくなりました。
- マッチャー、書き換え元、ルートセグメント、`basePath` はリクエストパスと同じエンコード形式で比較されるため、`matcher: "/café/:path*"` と `"/caf%c3%a9/:path*"` は `/caf%C3%A9` を保護し、`"/ops%40corp/:path*"` は `/ops@corp` を保護します。マッチャーのないミドルウェアは `basePath` の外では実行されません。`/admin/` など末尾にスラッシュがあるマッチャーは `/admin` に一致し、`host` 条件はホスト名の末尾のドットを無視します。
- `runtime = "server"` ルートのライブセッションは、ミドルウェアが `/restricted` から `/login` への書き換えなどで別のパスやクエリーに書き換えたページや、`NextResponse.next({ status: 403 })` などのエラーステータスで応答したページをレンダリングしません。
- `--adapter vercel`: ルートハンドラー関数は、生成されたルートのみが設定するリクエストヘッダーからパスを取得するため、`/api/x/%252e%252e/admin` が `/api/admin` に到達しなくなり、`/_textjs/*` をどのように表記しても関数は実行されません。生成されたルートは大文字と小文字を区別して照合するため、ミドルウェアが検査していない `/LEGACY/x` が `/legacy/:path*` の書き換えに一致しなくなりました。`{` などの未エンコード文字を含む、正規化されていない可能性のあるすべてのパスはエッジミドルウェアを通ります。このミドルウェアはすべてのVercelビルドに含まれ、リクエストを正規化されたパスに書き換えます。
- `--adapter cloudflare`: 静的ファイルはエンコードされたパスで検索されるため、`/x/%252e%252e/admin/report.txt` が `/admin/report.txt` を配信しなくなりました。`basePath` がある場合、その外側のファイルがワーカーを通さずに配信されることもなくなりました。
- `text dev` は、`/public/…` や `/@fs/…` での `public/` ファイルの配信、`middleware.ts` や `text.config.ts` などのサーバー専用ソースの大文字と小文字を変えた指定、エンコードされた `/@fs/` パス、拡張子なしのモジュールリクエスト（`/text.config?import`）、設定による書き換えを通じた配信、および `basePath` 外のルートハンドラーの配信をしません。

<!-- s:a0125c854e -->
- Text.jsはFirefoxとSafariのコンソールでレンダリングします。`CssConsoleDriver` はCSS機能のチェックでブラウザーを検出します。`%c` スパンがインラインのままになる環境では、マージンなしで行高14pxを指定し、ソフトラップを無効にし、`line-height: 100vh` のカーテンを使います。
- レスポンシブなサイズ調整は、Firefoxのソースリンク列のスペースを確保します。Safariではフォントスタックの先頭にMenloを置きます。WebインスペクタではユーザーがインストールしたSF Monoで描画できても、ページからは使えないためです。
- コンソールを選ぶには、`createConsoleRoot`、`ConsoleRenderer`、`CssConsoleDriver` に `browser: "chromium" | "firefox" | "safari"` を渡します。
- プリレンダリングされたシェルには、両方の種類のコンソール用CSSが含まれます。
- `<FocusPad>` は訪問者のブラウザー用のコンソールショートカットを表示します。Firefoxでは⌘⌥KまたはCtrl+Shift+K、Safariでは⌘⌥Cと「Webデベロッパ用の機能を表示」を有効にする案内を表示します。
- プリレンダリングされた `<FocusPad>` は、すべてのブラウザーのショートカットをレンダリングします。最初の描画前に `<html>` に `data-browser`（`firefox` または `safari`）と `data-os`（`mac`）を設定すると、訪問者に合うものだけを表示します。未設定の場合は、ハイドレーションまでChromeのWindows・Linux用ショートカットを表示します。

<!-- s:74de7c87f7 -->
- ⌘⌥KとCtrl+Shift+K（Firefoxのコンソールショートカット）は、アプリに届かずブラウザーに渡されます。
- レスポンシブなサイズ調整は、DevToolsが閉じている間に高さ60px未満のブラウザーツールバー（SafariとFirefox）の高さを学習し、下部にドッキングしたコンソールに収まるすべての行を表示します。`<FocusPad>` は学習した高さでDevToolsがドッキングされているかを判定します。
- `<FocusPad>` はクリック待ちの状態で、WindowsとLinuxのショートカットを `Ctrl+Shift+J` と表示します。

<!-- s:0e572baad1 -->
- `@textjs/opencode`: ブリッジは起動時にペアリングコードを表示し、textjs.org/opencodeは初回接続時にその入力を求めます。ページがコードを送信するまで、ブリッジは許可されたオリジンにも `428` を返し、OpenCodeには何も転送しません。各コードはブリッジの1回の起動中のみ有効で、返されるトークンはペアリングしたオリジンからのみ使え、コードを10回間違えるとブリッジを再起動するまでペアリングがロックされます。
- `@textjs/opencode`: textjs.orgのCloudflare Pagesプレビューデプロイは、デフォルトで許可されなくなりました。使うには `--allow-origin` を渡します。
- textjs.org/opencodeは `@textjs/opencode` 1.0.xのブリッジを拒否します。`bunx @textjs/opencode@latest proxy` を実行してください。
- textjs.orgはContent-Security-Policy、`Strict-Transport-Security`、`Cross-Origin-Opener-Policy`、`Cross-Origin-Resource-Policy` を送信します。OpenCodeページは `127.0.0.1` または `localhost` のサーバーにのみ接続します。

<!-- s:59f86c9edc -->
- OpenCode Lite: ファイルごとの差分の確認、プロンプト履歴の閲覧、リーダーキーのショートカットの設定、プロバイダーアカウントとMCPサーバーの管理に対応します。サンドボックスには、スクリプトで動作するターミナルペインが含まれます。
- OpenCode Lite: `/` を入力するとコマンドを検索し、`@` を入力するとプロジェクトファイルを添付します。Tabはファイルメニューでディレクトリーを開きます。接続中のセッションはサーバーのプロジェクトを検索し、サンドボックスはサンプルリポジトリを検索します。
- textjs.org/coffee: terminal.shopのデモはSSHアプリと同様にコンソールサイズに追従し、小・中・大のレイアウトと、20 × 10未満での「ターミナルが小さすぎます」の表示に対応します。アカウントには、支払い方法、名前を編集できるプロフィール、サブスクリプションの週次スケジュール変更を追加します。サインアウト中も、カートとアカウント内のよくある質問、概要、デバッグ情報をサインインせずに開けます。

<!-- s:d106fb27b3 -->
パフォーマンス

<!-- s:f59d215740 -->
- `@textjs/react`: `Box` と `Text` は、マウント時と更新時にpropsオブジェクトをコピーする代わりに、不要なプロパティーを事前に除去したシーンのpropsをリコンサイラーに渡します。
- `@textjs/core`: `SceneNode.getTextModel()` は、単一文字列の `<Text>` リーフでインラインツリーの走査を省略し、キャッシュされたゼロ初期化済みの `Uint16Array` の `runOf` バッファーを再利用します。`CssConsoleDriver` はスタイルが一致する連続したBMPセルを内部ループで走査し、`ConsoleRenderer` は変更のないフレームで `countYogaNodes()` を省略します。
- textjs.org: ルートとコンソールコンパニオンのタブを、ルートごとのJSとCSSのチャンクに分割しました。ストアの写真は `photos/final` のマスターから再エンコードし、追加の商品写真はホバー時またはスライドの切り替え時に読み込みます。

<!-- s:6909c337fb -->
- `<ViewportControl>` は `20ch` の代わりにピクセル単位の `minWidth` を使い、`<FocusPad>` と同じメトリクスを合わせた代替フォントを指定するため、`Geist Mono` の読み込み時もサイズ選択の幅を維持します。

<!-- s:517ba6caf6 -->
- `@textjs/opencode`: textjs.org/opencodeのブリッジを、依存関係のない独立したパッケージにしました。Vite、React、MCP SDKをインストールせずに起動するには、`bunx @textjs/opencode proxy`（または `npx`）を実行します。`text proxy` も引き続き使え、同じブリッジを実行します。

<!-- s:884a8abcf6 -->
- フレームワークとCLIのパッケージは `@textjs/app` になりました。公式のNext.js統合を示す名前にならないよう、`@textjs/next` から改名しました。`@textjs/next` は `@textjs/app` に置き換えられて非推奨となり、新しいリリースはありません。移行するには、`bun remove @textjs/next && bun add @textjs/app` を実行し、`@textjs/app/link` などのサブパスを含め、インポート内の `@textjs/next` を `@textjs/app` に置き換えます。CLIは引き続き `text` で、create-text-appのテンプレートは `@textjs/app` に依存します。
- コンソール内の `[▼]` ピルとインスペクターの名称はDev Overlayで、インスペクターのタイトルは `▼ Dev Overlay · Turbolog` です。Text.js DevToolsはChrome拡張機能のみの名称です。`<TextDevOverlay>` とそのpropsは変わりません。
- `dynamic = "error"` をエクスポートするルートハンドラーは `TX031` で失敗します。Text.jsは、Next.jsでこの値が意味するリクエスト読み取りの有無の確認をせず、`"force-static"` として扱っていました。`"force-static"` を使ってください。

<!-- s:e21d3058df -->
- `text start` は `text dev` と同様に、ブロックされた `Host` に `TX028` を返します。各サーバーは参照する設定名を示します。`text dev` は `vite.server.allowedHosts`、`text start` は `server.allowedHosts` です。
- textjs.org: 学習コースの公開の章で、`vercel.json` の書き換えを追加するよう案内しなくなりました。VercelとCloudflare Pagesでは、`text build` 自体が `index.html` のフォールバックを書き出します。書き換えの例はNetlifyの `_redirects` を使います。
- `eslint-plugin-textjs`: `route-handler-exports` は `route.ts` での `dynamic` と `revalidate` のエクスポートを許可し、`valid-route-module` はそこでの `dynamic` の値を検査します。

<!-- s:9fc693fec9 -->
- textjs.org: 学習コースの章の動画を再生中にスクロールして通り過ぎると、隅のミニプレーヤーに移動します。各動画の下にある「字幕」ボタンは字幕の表示を切り替え、選択を記憶します。
- `<TextDevOverlay>` は `pill`、`shortcut`、`shell` のpropsを受け取り、App Routerを使わないアプリも独自のキーとテーマ操作でインスペクターをマウントできます。
- `<FocusPad>` は `banner` を受け取り、メッセージの最初の行（アプリのワードマークなど）として、タッチデバイスでは注意書きの上に表示します。

<!-- s:45920d8903 -->
- textjs.org: Playgroundの選択メニューには、ダッシュボード、ストリーミング、スネーク、OpenCode、コーヒー（terminal.shop）が並びます。各デモには独自のURLがあり、OpenCodeは `/opencode`、terminal.shopは `/coffee` で、メッセージの先頭にそれぞれのワードマークを表示します。カウンターとフォームはPlaygroundから移動しましたが、ドキュメントでは引き続きライブサンプルとして動作します。
- `<FocusPad>` のレイアウトを刷新しました。各状態では、3分割の進捗バー、見出し、大きな要素1つ、1行のテキストを表示します。コンソールを開く前は、大きな要素としてDevToolsのショートカットを表示します。クリック待ちではポインターを表示します。動作中はアプリの `hints` をキーキャップとして表示し、キー入力に応じて点灯させ、ヒントのないキーはその下に表示します。ステップのラベル、独立した「動作中」バッジ、「コンソールを見てください。」の行は削除しました。行は状態の変化時にフェードインし、初回描画時にはフェードインせず、`prefers-reduced-motion` では動きを無効にします。補助テキストは両方の外観でWCAG AAのコントラストを満たし、コンソールのサイズ選択にキーボードで移動するとフォーカスリングを表示します。
- textjs.org: Playgroundは新しい `<FocusPad>` レイアウトを使います。選択メニューの現在のデモはキーキャップと同じ背景を使い、OpenCodeのコマンド欄はURL欄と角の形状と文字サイズを揃え、terminal.shopの注記は3行から2行にし、「ソースを表示」はサイズコントロールのベースラインに揃え、パッド内の控えめなテキストはAAコントラストを満たします。

<!-- s:01075dcc87 -->
- `text dev` はすべてのリクエストで `proxy` パスをプロキシ経由で配信します。`fetch()` は `Accept: */*` を送信するため、以前は開発サーバーが先にアプリのHTMLを返し、opencodeテンプレートの初回実行が「予期しないトークン '<'」で失敗していました。
- Viteの依存関係スキャンがサーバー専用ファイルを読んでも、`text dev` はReactを二重に読み込まなくなりました。以前はスキャンがサーバー専用インポートの検査に引っかかり、スタックトレースの後にコンソールへ「無効なフック呼び出し」を出力し、Fast Refreshを壊していました。
- `text dev` は `/?demo` などクエリー文字列付きのページURLを処理します。以前はViteがこれらをプロジェクトフォルダーとして扱ってディスク全体を監視し、Linuxでページが読み込まれませんでした。
- create-text-app: すべてのテンプレートの初期画面で開発用ピルが最初のキーヒントを覆わなくなり、デフォルトのプロジェクト名をドキュメントに合わせて `my-app` にし、テンプレートは `eslint-plugin-textjs` の推奨設定を通過し、dashboardのREADMEでは `--adapter static` ビルドを説明します。
- `<FocusPad>` と `<ViewportControl>` は個別指定プロパティだけで境界線を設定します。以前は開発時にキーヒントが点灯するたび、Reactが「再レンダリング中にスタイルプロパティを更新しています（border）」と警告していました。
- 行の最後のテキストは、短くなっても位置を維持します。以前は `<Spacer>` の後で最長のテキストがあった位置に留まり、はみ出す行に収めるため縮小された兄弟要素も縮小されたままでした。
- `<FocusPad>` は `action` または `hints` が変わるとステップ、サブタイトル、キーの行を置き換えるため、同じパッドでのデモ切り替えがレイアウトシフトとして報告されません。
- `@textjs/react/testing` はインポート時にYogaを読み込むため、テストで最初の `render()` の前に `fetch` をスタブ化できます。

<!-- s:64f8dbac91 -->
最初の安定版リリースです。`▼ Text.js 1.0.0 (Turbolog)`。

<!-- s:4841011fa5 -->
- **破壊的変更：** フレームワークとCLIのパッケージは `@textjs/next` になりました（npmでは `textjs` が使用済みです）。インポートを `textjs` から `@textjs/next` に更新してください。
- OpenCodeブリッジは `bunx @textjs/app proxy` で、どのディレクトリーからでも実行できます。
- コンソールはデフォルトで、ドッキングされたDevToolsパネルに収まります（下・左・右へのドッキング、ページズーム、ツールバーの折り返しに対応）。ドッキングされていないDevToolsでは `120×36` にフォールバックします。パッドにサイズコントロールを追加しました。

<!-- s:dd18fee429 -->
- 自動の `?` ヘルプ画面、キーヒント、`Ctrl+K` コマンドパレットを備えた `useKeymap`。
- データコンポーネント：`List`（仮想化）、`Table`、`Tree`。
- チャート：`LineChart`、`BarChart`、`Sparkline`、`ProgressBar`、および `Gradient` と `Image`。
- コントロール：`Button`、`Checkbox`、`Switch`、`RadioGroup`、`Slider`、`Dialog`、`Confirm`、トースト。
- レイアウト：`Center`、`Stack`、`Grid`、`SplitPane`、`FocusScope`。
- タイマー、アニメーション、計測、ブレークポイント、ストレージ、クリップボード用のフック。
- 右から左へのテキスト。Text.jsはUnicode双方向アルゴリズム（UAX #9、Unicode 18.0）を実装し、`BidiTest.txt` の770,241件と `BidiCharacterTest.txt` の91,707件の全テストに合格します。アラビア文字の字形を整え、`<Text dir>` はスパンを分離します。
- 安定した `TX###` エラーコード。フレームワークのエラーにはコードと `https://textjs.org/errors/<code>` へのリンクが付きます。
- テストでコンポーネントをテキストにレンダリングする `@textjs/react/testing`。
- App Routerアプリを実際のターミナルでレンダリングする `@textjs/react/terminal` と `text run`。
- Model Context Protocol経由でアプリを提供し、コーディングエージェントがブラウザーなしで移動、キー入力、フレームの読み取りをできる `text mcp`。
- コンソールの隣にコンポーネントツリー、フレームインスペクター、タイムラインのパネルを追加するText.js DevTools拡張機能。
- `eslint-plugin-textjs` とライブプレビュー付きのVS Code拡張機能。
- `apps/terminal-shop`: 実際のAPIを使う、コンソール内のterminal.shopストアフロント（デフォルトは開発用サンドボックス、本番環境は二重ロック）。
- textjs.org: コンソールで動く全10章の学習コース。ハイドレーション付きのビルド時プリレンダリング、セルフホストのメトリクスを合わせたフォント、スラッシュなしの `.html` ルート、ライブプレビュー付きの新しいドキュメントページ。

<!-- s:25c8658848 -->
- 消去後のDevToolsのスロットル位相ロックを解消しました。消去するフレームの後、レンダラーは一度だけ110ms待機し、以降のフレームがDevToolsの即時描画経路に入るようにします。表示遅延のp50は63msから10msになりました。
- 変更帯域の部分描画：変更の影響を受けた行の帯域だけを再描画します。
- 行ごとのハッシュのキャッシュ、整数のスタイルID、アロケーションなしのアイドルフレーム。
- ページが非表示またはフォーカスされていない間のアイドルタイマーはゼロ。

<!-- s:2f477ecf74 -->
- 改行位置に不要な空の描画レイヤースパンが生じず、カーテンも二重になりません。
- カーテンを独立した行に置くため、DevToolsのソースリンク（`VM12:1`）が行0を折り返すことはありません。
- デフォルトのスピナーはセルに正確に収まります（Menloには点字グリフがありません）。`braille` バリアントは明示的に選択します。
- Nodeの `text build` はReactの開発用ビルドをバンドルしなくなりました。
- textjs.org: すべてのルートで累積レイアウトシフトが0です。PlaygroundとOpenCodeは同じパッドレイアウトを共有します。
- textjs.org: ドキュメントと学習コースのサイドバーは、長いページの下部でも固定されたままです。
- textjs.org: ファイルタブ、コードブロック、本文の表は横方向にのみスクロールし、iOS Safariでページの縦スワイプを奪いません。
- textjs.org: `scrollbar-gutter: stable` はマウスデバイスにのみ適用します。iOS Safariでは最初のスクロールが飛ぶ原因になっていました。
- textjs.org: スクロールアンカーを無効にしました。iOS Safariではヒーローを固定ヘッダーの下に留めていました。

<!-- s:986367c89f -->
ちらつきのないフレームとサーバーレンダリング。

<!-- s:f92fe85dce -->
- フレームごとの `console.clear()` + `console.log()` の代わりに、フレームを追加します。DevToolsは消去を同期的に適用しますが、新しいメッセージの描画には50msのスロットルがあるため、消去すると15fpsではDevToolsの描画の70.6%、60fpsでは81.1%でコンソールが空白になっていました。先頭の幅ゼロのカーテンスパンが以前のフレームを隠します。コンソールを消去するのは、最初のフレーム、`invalidate()` の後、100フレームが積み重なった後のアイドル時、または300フレーム時だけです。
- 出力するフレームの間隔を最低66ms（約15fps）に調整します。それより速いフレームはDevToolsのスロットルを再開させて破棄されます。60fpsでは、出力した295フレームのうちDevToolsが描画したのは67フレームでした。
- PlaygroundとOpenCodeは全画面のフォーカスパッドです。

<!-- s:79bc055b31 -->
- スパンのCSSを個別指定プロパティのみにし、DevToolsが各行にコピーするプロパティを約33から約7に減らします。16進数カラーと、背景だけをキーにした空白ラン。
- インクリメンタルなMarkdown解析と、メモ化した `Markdown`、`Code`、`Diff` の行。
- 1回の走査で処理するホストprops、必要なpropsのみの更新、テキストサイズが変わり得ない場合のYoga再レイアウトの省略。
- ストリーミングのフレームは0.79msから0.14msに、スピナーの1更新は0.90msから0.056msになりました。出力はビット単位で同一です。

<!-- s:52e989e27d -->
- サーバーレンダリング。`runtime = "server"` をエクスポートするページは、`async function` コンポーネントを含めサーバーでレンダリングし、行単位のセル差分をServer-Sent Events経由でgzip約19 kBのフレームプレーヤーにストリーミングします。
- 部分的プリレンダリング。`text build` は各静的ルートの最初のフレームをHTMLにインライン化し、モジュールの読み込み前にコンソールを描画します。
- `middleware.ts`、ルートセグメント設定（`dynamic`、`revalidate`）、`textjs/cache`（`unstable_cache`、`revalidateTag`、`revalidatePath`）。
- `text build --adapter static|bun|vercel|cloudflare`。
- `bench/devtools`: 実際のDevToolsフロントエンドを操作し、空白の描画、フレームの欠落、表示遅延、DevToolsのCPU使用量を計測するハーネス。

<!-- s:7932537f20 -->
- `path:line`、`//host:port`、`data:` のテキストがDevToolsによってリンク化されなくなりました。
- OpenCodeブリッジは管理対象のデーモン（エフェメラルポート、Basic認証）を見つけ、書き込み時にCSRFヘッダーを送信し、失敗を1行で報告します。

<!-- s:6dddbd2f6c -->
- 個別の入力（キー入力、貼り付け）は、次のアニメーションフレームを待たず、同じタスク内で同期的にレンダリングします。
- 本物に合わせて機能を絞ったOpenCodeのTUI。
- textjs.org全体のモバイル対応とレスポンシブ対応の見直し。

<!-- s:1d66ad9bc5 -->
- `@textjs/font`: `<FigletText>` と `<AsciiFont>` 用の、17フォントを同梱したFIGletフォントパーサーとレンダラー。出力は `figlet` 2.2.5バイナリーから記録した273件の参照結果と一致します。
- `text proxy`: textjs.orgがOpenCodeサーバーと通信するためのローカルCORSブリッジ。

<!-- s:1331e4db42 -->
- `apps/opencode-console`：`console.log` に描画する接続型のOpenCodeクライアントです。サーバーが稼働していない場合はデモにフォールバックします。
- `create-text-app` 用の `opencode` テンプレートです。
- textjs.org：新しいランディングページ、ライブコンソールコンパニオン、Playground、OpenCodeページ、ドキュメントです。
- 静的ルート生成に対応したGitHub Pagesデプロイワークフローです。

<!-- s:a1b0bb2bf5 -->
最初のマイルストーンです。

<!-- s:67e64392c2 -->
- `@textjs/core`: フラットな型付き配列上の `CellBuffer`、Yoga WASMレイアウト、`Intl.Segmenter` によるテキスト計測、`%c` ランレングス符号化ドライバー。変更のあるフレームごとに `console.log` を1回呼び出し、アイドル時は呼び出しなし。
- `@textjs/react`: React 19リコンサイラー、PascalCaseコンポーネント（`Box`、`Text`、`ScrollBox`、`Input`、`Textarea`、`Select`、`Tabs`、`Code`、`Markdown`、`Diff`、`Modal`、`Spinner` など）、セル単位のTailwind風 `className` ユーティリティー、テーマ、DOMの `FocusPad`。
- `textjs`: ファイルシステムベースのApp Router（`layout`、`page`、`loading`、`error`、`not-found`、動的セグメント、ルートハンドラー）、`text dev`、`text build`、`text start`、コンソール内の `[▼]` インスペクター。
- `starter` と `dashboard` テンプレートを備えた `create-text-app`。
