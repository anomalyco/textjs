<!-- s:f70688822a -->
此檔案記錄 Text.js 的所有重要變更。

<!-- s:1ab5f276ed -->
格式以 [維護變更記錄](https://keepachangelog.com/en/1.1.0/) 為基礎，本專案遵循 [語意化版本](https://semver.org/spec/v2.0.0.html)。0.1.0 至 0.4.0 版本已在 git 加上標籤，未發布至 npm。

<!-- s:2e16922cfc -->
新增

<!-- s:c5e3c4b381 -->
- textjs.org：西班牙文、法文、德文、巴西葡萄牙文、韓文、簡體中文和繁體中文版已結束草稿階段，分別位於 textjs.org/es、/fr、/de、/pt-br、/ko、/zh-cn 和 /zh-tw。語言選單和瀏覽器語言按鈕會像提供日文一樣提供這些語言，搜尋引擎也會索引其翻譯頁面。

<!-- s:f71df9184f -->
- `@textjs/react`：`<FocusPad messages>` 可替換面板的任何內建字串，供翻譯網站使用。涵蓋每一行文字、螢幕閱讀器標籤和主控台尺寸控制項。`<TextCanvas>` 和 `<ViewportControl>` 也接受 `messages`。`<ViewportControl>` 只使用尺寸控制項的鍵。包含值的字串，例如「接著點擊這裡並按 ↑ ↓。」，是回傳完整句子的函式。`defaultFocusPadMessages` 提供英文文字。請參閱[翻譯焦點面板](https://textjs.org/docs/internationalization#translating-the-focus-pad)。
- `@textjs/react`：在由右至左的頁面中，焦點面板會讓 ⌘ ⌥ J 等按鍵圖示和 120×36 等主控台尺寸維持由左至右顯示，並將尺寸控制項和步驟列鏡像排列。在中文和日文頁面中，會移除兩個句子之間的空格；韓文則保留空格。
- textjs.org：textjs.org/ja 已結束草稿階段。頁尾的語言選單可開啟同一頁面的英文版或日文版。設為日文的瀏覽器會顯示「日本語で読む」按鈕，英文瀏覽器在 textjs.org/ja 則會顯示「Read in English」。選擇語言或關閉按鈕後，按鈕就不再出現。搜尋引擎會索引翻譯後的日文頁面，並將各頁與對應的英文版配對。
- textjs.org：在 textjs.org/ja 上，每個頁面的焦點面板都以日文顯示，包括各個示範的按鍵下方標籤。

<!-- s:5b88618770 -->
變更

<!-- s:27b507a9de -->
- `@textjs/core`：Chromium 和 Firefox 主控台會在動畫精靈輸出達到 16 MB 時清除，而非 4 MB，因此 textjs.org/doom 約每 19 秒顯示一次「主控台已清除」，而非每 4.5 秒。Safari 以及以 `▀` 半區塊繪製的精靈仍維持 4 MB。textjs.org/doom 頁面的堆積記憶體峰值從 10.8 MB 增至約 12～13 MB。
- textjs.org：文件頁面只下載自己的 Markdown，而非全部 33 頁，因此英文文件頁面少載入 43～47 KB 的 JavaScript（gzip），/ja 文件頁面則少載入 60～64 KB。將游標停在其他文件頁面的連結上，或讓連結取得焦點時，會提前擷取該頁面，因此仍能立即開啟。

<!-- s:afe76b8d59 -->
修正

<!-- s:b3d1adfa39 -->
- textjs.org/ja：⌘K 搜尋會顯示日文文件標題，並以日文查詢比對這些標題。先前會在日文頁面標題下列出英文標題。英文名稱仍可找到頁面：`routing` 可找到「ルーティング」，`open the console` 可找到「コンソールを開く」。
- textjs.org：在 textjs.org/ja 上，以及 textjs.org/docs/internationalization 的雙向文字範例中，主控台內執行的文件範例，其變更現在會再次顯示於頁面預覽。主控台中範例上方的文字現在是「▼ Docs › Counter」，不再是「▼ Docs › Introduction › Counter」。

<!-- s:125517f5e0 -->
- textjs.org/doom 會播放 Doom 的音效，採用 Doom 本身的立體聲左右定位與距離衰減。音效會在你首次點擊頁面或按鍵時開始，隨遊戲暫停，並遵循 Doom 的「選項 → 音量」選單中的「音效音量」設定。沒有音樂。

<!-- s:144aa59e73 -->
- `@textjs/react`、`@textjs/app`：焦點提示（「點擊頁面以使用鍵盤」）在每個主題中都採用琥珀色橫條與粗黑字。先前使用主題的反轉配色。每次出現時，會在約 6 秒內閃爍 4 次，然後維持琥珀色。開啟減少動態效果時不會閃爍。每個閃爍週期最多額外記錄 8 個主控台影格。
- textjs.org：Doom 已移至 textjs.org/doom。textjs.org/playground/doom 會重新導向該處。

<!-- s:b91de36548 -->
- `@textjs/core`、`@textjs/react`：Chrome 的「問題」面板不再於每個頁面回報「表單欄位元素應有 id 或 name 屬性」。隱藏的鍵盤 `<textarea>` 名稱為 `textjs-input`，而 `ViewportControl` 的主控台尺寸 `<select>`（也用於 `FocusPad` 的 `sizeControl`）具有 `id`，名稱為 `textjs-console-size`。鍵盤 `<textarea>` 也會排除 1Password、LastPass、Bitwarden 和 Dashlane。
- textjs.org：textjs.org/doom 的主控台標頭顯示「Text.js / doom」，而非「Text.js / playground / doom」。
- textjs.org/doom：窄視窗中「檢視原始碼」後方不再留下多餘的「·」。
- textjs.org：在窄視窗中，Playground 範例選擇器會在仍有更多範例可捲動的邊緣淡出，不再從字詞中間截斷最後一個範例。
- textjs.org/doom 以 Doom 的每秒 35 個遊戲刻執行。先前在關卡中，60 Hz 螢幕上的執行速度為 3.8 倍（每秒 131 個遊戲刻），120 Hz 則為 5.5 倍（192），原因是頁面將 Doom 繪製關卡時額外讀取時鐘的動作誤判為忙碌等待，並在每個動畫影格與計時器回呼中將 Doom 的時鐘提前一個遊戲刻。

<!-- s:14d523690c -->
- `@textjs/react`：`<Image renderMode="halfblock">` 會在所有環境繪製 `▀` 半區塊，如同 1.3 的 `<Image>`。
- `@textjs/core/experimental`：`drawPixels` 接受 `encoding: "rgba"`，可產生具有柔和透明度且超過 256 色的無損精靈，也接受 `fallback` 函式，在無法顯示精靈的位置繪製儲存格。
- `@textjs/app`：在 `text dev`、`text start` 及 `bun`、`vercel`、`cloudflare` 轉接器上，curl、Wget、HTTPie 和 xh 會取得頁面第一個影格的真彩色 ANSI 文字，而非 HTML 頁面。`text build` 會為靜態頁面預先渲染影格。`text start` 和 `bun` 會在收到請求時渲染動態頁面與伺服器端渲染的頁面，並以應用程式的找不到頁面及 `404` 回應未知路徑。影格預設為 80 × 24。使用 `text.config.ts` 中的 `ansi` 或頁面中的 `export const ansi`，可變更尺寸或停用影格。`static` 轉接器會向 curl 提供 HTML 頁面。請參閱 [curl 與終端機用戶端](https://textjs.org/docs/curl)。
- `@textjs/app/ansi` 匯出 `wantsAnsi` 和 `ansiResponse`，供未使用 `text start` 或轉接器的伺服器使用，`@textjs/react` 則匯出 `frameToAnsi`。
- textjs.org：textjs.org/ja 提供日文版草稿，從簡介、安裝、路由文件及網站介面開始翻譯。尚未翻譯的段落會顯示英文。目前尚未建立索引，也未列入語言選擇器。

<!-- s:f489f8e451 -->
- `@textjs/react`：`<Image>` 現在會在 Chromium 和 Firefox 主控台繪製像素精靈，像素藝術每個儲存格最多 8 × 16 像素，照片則為 4 × 8。這項變更刻意打破 [支援政策](https://textjs.org/docs/support-policy) 中次要版本之間影格外觀相同的承諾。傳入 `renderMode="halfblock"` 可保留 1.3 的半區塊。Safari、終端機（包括 `text run`）、ANSI 與純文字輸出，以及伺服器端渲染的頁面（`runtime = "server"`）仍繪製半區塊。
- `@textjs/app`：使用 curl、Wget、HTTPie 或 xh 擷取頁面的指令碼與運作時間檢查，現在會取得 ANSI 文字。若要繼續取得 HTML，請傳送 `Accept: text/html`，或在 `text.config.ts` 設定 `ansi: false`。
- `@textjs/app`：`text build` 預先渲染頁面外殼時，不再執行非同步伺服器元件。這些元件會如同先前顯示 `<Suspense>` 的替代內容，但不會在建置時啟動資料請求。
- `@textjs/app`：伺服器端渲染頁面的影格播放器縮小了 3 KB，`examples/dashboard` 的 gzip 大小從 25.4 KB 降至 22.4 KB。不再隨附 `CellBuffer` 的繪圖方法、方框邊框或文字截斷功能。

<!-- s:ba0b1ea778 -->
- `@textjs/core`：圖表和載入指示器在 Windows 10 上會維持格線對齊。其主控台字型 Consolas 沒有 ▁▂▃▅▆▇ 八分之一區塊、象限、點字、▶ 或 ✓，替代字形會讓文字列超出影格右緣。`CssConsoleDriver` 現在會測量一次，找出主控台字型繪製時偏差超過五分之一儲存格的字形，並以 Consolas 最接近的字形繪製：八分之一區塊使用 `_` `▄` `▌` `█`，象限和點字使用半區塊，箭頭、勾號與叉號使用 `►` `◄` `√` `×`。能正確容納這些字形的字型，例如 Windows 11 的 Cascadia Mono 和 macOS 的 Menlo，會繪製原始字形。`measureText: false` 可停用此功能。
- `@textjs/core`：Chrome 和 Edge DevTools 中相鄰背景之間不再出現 1 px 的垂直細線，例如 textjs.org/coffee 的「帳戶」和「數量」旁。Chromium 會將每個 `%c` span 分別對齊裝置像素，可能使兩個 span 交界的像素不屬於任何一方。`CssConsoleDriver` 現在會將 span 背景向右延伸 1 px，置於不透明的相鄰區域下方（`padding-right:1px;margin-right:-1px`）。Firefox 和 Safari 的影格不變。
- `@textjs/core`：Chrome 和 Edge 中的 `<Image>` 精靈遵循與文字相同的 1 px 規則。透明精靈左側的文字不再將 1 px 背景條繪製到精靈左緣上，精靈也會與右側不透明文字緊密銜接，包括反色文字。單獨佔用文字列的精靈現在會延伸至影格右緣，如同上下方的文字列。
- `@textjs/react`：`<ConsoleMirror>` 會如同主控台，以半區塊繪製文字旁的照片，而非顯示影像。

<!-- s:757b866128 -->
- `@textjs/react/experimental` 匯出用於即時影格緩衝區的 `<Pixels>`，以及用於按住按鍵的 `useKeyState`；`@textjs/core/experimental` 匯出 `drawPixels`。這些 API 可能在次要版本中變更。
- textjs.org/playground/doom：在 DevTools 主控台遊玩 Doom 的共享軟體章節。
- `@textjs/react`、`@textjs/app`：頁面沒有焦點時，主控台影格的最後一列會顯示「點擊頁面以使用鍵盤」，讓在主控台中點擊應用程式的訪客知道按鍵為何失效。當應用程式具有 `useInput` 或 `usePaste` 處理常式或焦點目標時便會顯示，僅限瀏覽器主控台，也包括伺服器端渲染的路由。內嵌鏡像與 VS Code 預覽不會顯示。在 `text.config.ts` 或 `createConsoleRoot` 中使用 `focusHint: false` 可停用。
- `@textjs/react`：`usePageFocus()` 回傳頁面是否具有焦點。若要自行決定應用程式何時需要鍵盤，請設定 `focusHint: false` 並渲染 `<FocusHint active={…}>`。`useInput(handler, { ambient: true })` 會標記持續啟用的快速鍵，該快速鍵本身不會觸發提示。

<!-- s:c96685f5e0 -->
- `@textjs/core`：`<Pixels>` 精靈播放動畫時，`ConsoleRenderer` 在 Chromium 每 51 ms 批次處理關鍵影格，在 Safari 將影格間隔控制為 33 ms，並在 `CssConsoleDriver` 的附加輸出達 4 MB（`SPRITE_MAX_BYTES`）時清除。靜態精靈與純文字應用程式維持既有的影格節奏與 300 個影格清除上限。

<!-- s:34e1835d0a -->
- `@textjs/core`：`bindTextSink(element, onText)` 從隱藏的 textarea 或 input 讀取 IME 或死鍵提交的文字，每次提交只讀取一次，絕不在組字途中讀取。`engine.bindTextSink(element)` 將你自行渲染的 textarea 連接至 `InputEngine`。兩者都回傳用來移除監聽器的函式。
- `@textjs/app`：`POST /__textjs/input` 接受 `{ type: "text", text }`，用於 IME 與死鍵文字。`@textjs/app/frame-protocol` 中的 `InputMessage` 和 `parseInputMessage` 已包含此類型。

<!-- s:60239a49b7 -->
- `@textjs/app`：中介軟體與路由處理常式會取得標準化路徑。`/docs/` 和 `/docs//intro` 抵達時會成為 `/docs` 和 `/docs/intro`，因此透過重新導向加上結尾斜線的中介軟體現在會無限重新導向。請移除該重新導向。動態區段不能包含編碼過的斜線：`/files/a%2Fb` 會回傳 `400`。
- `@textjs/app`：使用中介軟體時，`--adapter cloudflare` 會將每個請求傳送至 worker，包括帶有雜湊的資源；設有 `basePath` 時，也會傳送基底路徑以外的請求。每個執行 worker 的請求都是一次 Functions 呼叫，並計入你的 Workers 請求配額。在 Workers Free 方案中，請將 Pages 專案設為失敗時關閉（設定 → 執行階段 → 失敗時開啟／關閉），否則每日配額耗盡後，Pages 會略過中介軟體提供你的檔案。

<!-- s:cb257a7494 -->
- 中文、日文、韓文 IME 與死鍵可在 textjs.org 的內嵌主控台使用。先前主控台會在組字途中清空 textarea，導致應用程式收到原始字母或錯誤字元。
- `<FocusPad>` 在點擊後會將鍵盤焦點保留在應用程式上。先前會立即失去焦點，導致中文、日文與韓文 IME 無法組字。
- 隱藏的 textarea 取得焦點時，不組字的死鍵（Windows，以及未使用 IME 的 Linux）會傳送至應用程式。在美式國際鍵盤配置上，先按 `'` 再按 `e` 會產生 `é`，先按 `'` 再按 `t` 則產生 `'t`。`InputEngine` 先前會封鎖完成死鍵輸入的 keydown，導致瀏覽器未插入任何內容。`@textjs/core` 中的 `DeadKeyTracker` 會放行該 keydown，VS Code 預覽也使用此功能。
- VS Code 預覽現在會傳送先前丟棄的 IME 與死鍵文字，且不再將死鍵或 IME 組字按鍵轉送至應用程式。搭配 `@textjs/app` 1.1.0 或更早版本的 `text dev` 伺服器時，會以按鍵或貼上的方式傳送文字。
- `@textjs/core`：`shouldCapture` 回傳 `false` 時，`InputEngine.handleTextInput` 會忽略文字，與既有的按鍵和貼上輸入行為一致。
- `text dev` 會預先打包 `@textjs/app/live-stub` 和 `@textjs/app/live-player`。具有 `runtime = "server"` 頁面的應用程式先前要在首次載入頁面後才會發現這些模組，導致 Vite 在載入途中再次打包，造成過期區塊出現 404，以及兩份 React 引發的「無效的 Hook 呼叫」。
- 圖表和載入指示器在 Windows 上會符合影格尺寸。Consolas 沒有 ▁▂▃▅▆▇ 區塊、象限、點字、▶ 或 ✓，因此 Windows 會以寬度最高達 1.8 個儲存格的替代字型繪製，造成圖表列超出影格右緣。主控台字型堆疊現在為 `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`，Windows 11 會以 Cascadia Mono 繪製整個影格。`<ConsoleMirror>`、VS Code 預覽與 DevTools 擴充功能的影格檢視，也都將 Cascadia Mono 排在 Consolas 之前。
- `@textjs/opencode`：在 Windows 的 Node 環境中，橋接器能找到以 `npm i -g opencode-ai` 安裝的 OpenCode。Node 無法依名稱啟動 npm 的 `opencode.cmd` shim，因此橋接器先前會表現得像未安裝 OpenCode。現在會使用每個 `PATHEXT` 副檔名搜尋 `PATH`，並透過 `cmd.exe` 執行 `.cmd` shim。在 Bun（`bunx`）下原本就能運作。
- `text build` 可在 Windows 上運作。先前所有範本都會失敗，出現 `Could not resolve entry module "virtual:textjs/api"` 或沒有錯誤訊息。
- `text build` 在預先渲染主控台外殼或建置伺服器端渲染路由失敗時會印出錯誤。先前會在 Vite 的「建置失敗」之後以代碼 1 結束，未提供原因。
- Windows 上的 `text dev` 會在你編輯檔案時重新渲染伺服器端渲染的路由，並在頁面的 `runtime` 匯出變更時重新載入瀏覽器。
- Windows 上的 `text dev` 不再為 Vite 以模組提供的原始檔執行 `middleware.ts`，例如 `/app/page.tsx`，因此驗證重新導向不再破壞開發用戶端。
- 專案路徑包含 Windows 8.3 短檔名時，例如 `C:\Users\RUNNER~1`，`text run` 和 `text mcp` 可以運作。先前因 CLI 與應用程式載入了兩次 `@textjs/app`，而顯示「應用程式錯誤」。
- 在 Windows 建置的 `dist/` 可在 Linux 和 macOS 提供預先渲染的頁面。先前即時路由資訊清單以反斜線儲存路徑。
- `text.config.ts` 的 `vite` 選項設定 `build.rollupOptions.input` 時，`text build` 可以運作。先前該輸入會取代 API、伺服器端渲染路由與轉接器套件的進入點，導致建置失敗。
- 在頁面載入後的最初幾秒停止 `text dev` 時，程序會結束，`server.close()` 也會完成。先前在 Vite 最佳化新發現的相依套件時關閉它，永遠不會完成（vitejs/vite#22934）。

<!-- s:a4ff72c5e8 -->
安全性

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 及更早版本允許請求以另一種寫法表示受保護路徑，藉此略過 `middleware.ts`，例如 `/ad%6din`、`/api//admin` 或 `/admin%2Fx`。中介軟體依傳入的路徑比對，但頁面、路由處理常式與靜態檔案則在解碼後查找（路由處理常式會解碼兩次）。這影響 `text dev`、`text start` 以及 `--adapter bun`、`vercel` 和 `cloudflare` 建置。靜態建置無法使用中介軟體，因此不受影響。請升級至 1.2.0，再重新建置與部署：Vercel 使用 `.vercel/output`，Cloudflare Pages 使用 `dist/`，Bun 使用整個 `dist/`（並重新啟動伺服器）。請刪除仍可透過各自網址存取的舊部署，或加以保護。
- 每個主機現在會為每個請求計算一個標準化路徑名稱，並用於比對器、`request.nextUrl` 及所有查找。它會解碼百分比跳脫序列，依照 `new URL()` 的寫法重新編碼路徑，解析 `.` 和 `..` 區段，並移除重複與結尾的斜線。包含 `%2F`、`%5C` 或無效百分比編碼的路徑會收到 `400`。`text dev`、`text start` 與 Bun 轉接器只會以完全相符的名稱提供靜態檔案，因此在 macOS 和 Windows 上，`/ADMIN/report.txt` 不再提供 `public/admin/report.txt`。
- 比對器、重寫來源、路由區段與 `basePath` 會以和請求路徑相同的編碼形式比較，因此 `matcher: "/café/:path*"` 和 `"/caf%c3%a9/:path*"` 會保護 `/caf%C3%A9`，`"/ops%40corp/:path*"` 則會保護 `/ops@corp`。沒有比對器的中介軟體不會在 `basePath` 以外執行。帶有結尾斜線的比對器，例如 `/admin/`，會比對 `/admin`，而 `host` 條件會忽略主機名稱結尾的句點。
- `runtime = "server"` 路由的即時工作階段，不會渲染中介軟體重寫至其他路徑或查詢的頁面，例如從 `/restricted` 重寫至 `/login`，也不會渲染以錯誤狀態回應的頁面，例如 `NextResponse.next({ status: 403 })`。
- `--adapter vercel`：路由處理常式函式會從僅由產生的路由設定的請求標頭取得路徑，因此 `/api/x/%252e%252e/admin` 不再抵達 `/api/admin`，任何寫法的 `/_textjs/*` 也都不會執行該函式。產生的路由會區分大小寫，因此 `/LEGACY/x` 不再命中中介軟體未檢查的 `/legacy/:path*` 重寫。每個可能尚未標準化的路徑，包括 `{` 這類原始字元，都會經過邊緣中介軟體；每次 Vercel 建置現在都會隨附該中介軟體，並將請求重寫為標準化路徑。
- `--adapter cloudflare`：靜態檔案會以編碼後的路徑查找，因此 `/x/%252e%252e/admin/report.txt` 不再提供 `/admin/report.txt`。設有 `basePath` 時，其範圍外的檔案不再略過 worker 提供。
- `text dev` 不會在 `/public/…` 或 `/@fs/…` 下提供 `public/` 檔案，不會透過不同大小寫、編碼過的 `/@fs/` 路徑、無副檔名的模組請求（`/text.config?import`）或設定重寫，提供 `middleware.ts` 和 `text.config.ts` 等僅限伺服器的原始檔，也不會提供 `basePath` 以外的路由處理常式。

<!-- s:a0125c854e -->
- Text.js 可在 Firefox 和 Safari 主控台渲染。`CssConsoleDriver` 透過 CSS 功能檢查偵測瀏覽器。在 `%c` span 維持行內排列的環境中，會寫入無外邊距的 14 px 行高、停用自動換行，並使用 `line-height: 100vh` 遮幕。
- 響應式尺寸會為 Firefox 的原始碼連結欄保留空間。Safari 將 Menlo 放在字型堆疊首位：其頁面無法使用使用者安裝的 SF Mono，但 Web Inspector 可能會以該字型繪製。
- 將 `browser: "chromium" | "firefox" | "safari"` 傳入 `createConsoleRoot`、`ConsoleRenderer` 或 `CssConsoleDriver`，即可選擇主控台。
- 預先渲染的外殼會攜帶兩類主控台的 CSS。
- `<FocusPad>` 會顯示訪客瀏覽器的主控台快速鍵：Firefox 為 ⌘⌥K 或 Ctrl+Shift+K，Safari 為 ⌘⌥C，並附註須開啟「顯示網頁開發者功能」。
- 預先渲染的 `<FocusPad>` 會渲染所有瀏覽器的快速鍵。在首次繪製前，於 `<html>` 設定 `data-browser`（`firefox` 或 `safari`）與 `data-os`（`mac`），即可只顯示訪客適用的快速鍵；未設定時，在 hydration 完成前會顯示 Chrome 的 Windows 和 Linux 快速鍵。

<!-- s:74de7c87f7 -->
- ⌘⌥K 和 Ctrl+Shift+K（Firefox 的主控台快速鍵）會傳遞至瀏覽器，不再送至應用程式。
- 響應式尺寸會在 DevTools 關閉時學習高度低於 60 px 的瀏覽器工具列（Safari 和 Firefox），使停駐於底部的主控台能容納所有放得下的列。`<FocusPad>` 會使用學習到的高度判斷 DevTools 是否停駐。
- `<FocusPad>` 在等待點擊的狀態中，會將 Windows 和 Linux 快速鍵寫為 `Ctrl+Shift+J`。

<!-- s:0e572baad1 -->
- `@textjs/opencode`：橋接器啟動時會印出配對碼，textjs.org/opencode 會在首次連線時要求輸入。在頁面傳送配對碼前，即使來源已獲允許，橋接器仍會回應 `428`，且不會轉送任何內容至 OpenCode。每個配對碼僅對當次橋接器執行有效，回傳的權杖只能由已配對的來源使用，輸入 10 次錯誤代碼後會鎖定配對，直到橋接器重新啟動。
- `@textjs/opencode`：預設不再允許 textjs.org 的 Cloudflare Pages 預覽部署。傳入 `--allow-origin` 才能使用。
- textjs.org/opencode 會拒絕來自 `@textjs/opencode` 1.0.x 的橋接器。請執行 `bunx @textjs/opencode@latest proxy`。
- textjs.org 會傳送 Content-Security-Policy、`Strict-Transport-Security`、`Cross-Origin-Opener-Policy` 和 `Cross-Origin-Resource-Policy`。OpenCode 頁面只會連線至 `127.0.0.1` 或 `localhost` 上的伺服器。

<!-- s:59f86c9edc -->
- OpenCode Lite：檢閱各檔案差異、瀏覽提示詞歷史記錄、設定前導鍵快速鍵，以及管理供應商帳戶與 MCP 伺服器。沙箱包含依指令碼運作的終端機窗格。
- OpenCode Lite：輸入 `/` 搜尋指令，或輸入 `@` 附加專案檔案。Tab 會在檔案選單中開啟目錄。已連線的工作階段會搜尋伺服器專案；沙箱則搜尋範例儲存庫。
- textjs.org/coffee：terminal.shop 範例如同 SSH 應用程式，會隨主控台尺寸調整，提供小、中、大版面配置，低於 20 × 10 時顯示「你的終端機太小」。帳戶新增付款方式、可編輯名稱的個人資料，以及訂閱每週排程變更。登出時，購物車與帳戶的常見問題、關於和偵錯資訊皆可在不登入的情況下開啟。

<!-- s:d106fb27b3 -->
效能

<!-- s:f59d215740 -->
- `@textjs/react`：`Box` 和 `Text` 將預先移除多餘屬性的場景 props 傳給協調器，不再於掛載和更新時複製 props 物件。
- `@textjs/core`：`SceneNode.getTextModel()` 對只有單一字串的 `<Text>` 葉節點略過行內樹狀結構走訪，並重複使用已快取且歸零的 `Uint16Array` `runOf` 緩衝區。`CssConsoleDriver` 在內層迴圈中掃描樣式相同的連續 BMP 儲存格，`ConsoleRenderer` 則在影格未變更時略過 `countYogaNodes()`。
- textjs.org：路由和主控台伴隨面板的分頁拆分為各路由獨立的 JS 和 CSS 區塊。商店照片從 `photos/final` 原始檔重新編碼，次要商品照則在游標停留或切換投影片時載入。

<!-- s:6909c337fb -->
- `<ViewportControl>` 使用像素值的 `minWidth` 取代 `20ch`，並與 `<FocusPad>` 一樣列出度量相符的替代字型，因此尺寸選擇器會在 `Geist Mono` 載入時維持寬度。

<!-- s:517ba6caf6 -->
- `@textjs/opencode`：將 textjs.org/opencode 橋接器獨立為無相依套件的套件。執行 `bunx @textjs/opencode proxy`（或 `npx`），即可啟動，無須安裝 Vite、React 和 MCP SDK。`text proxy` 仍可使用，並執行相同的橋接器。

<!-- s:884a8abcf6 -->
- 框架與 CLI 套件現為 `@textjs/app`，由 `@textjs/next` 更名，避免名稱暗示官方 Next.js 整合。`@textjs/next` 已棄用，改用 `@textjs/app`，且不再發布新版本。若要切換，請執行 `bun remove @textjs/next && bun add @textjs/app`，並將匯入中的 `@textjs/next` 替換為 `@textjs/app`，包括 `@textjs/app/link` 等子路徑。CLI 仍為 `text`，create-text-app 範本則依賴 `@textjs/app`。
- 主控台內的 `[▼]` 膠囊按鈕與檢查器稱為開發覆蓋層，檢查器標題為 `▼ Dev Overlay · Turbolog`。Text.js DevTools 僅為 Chrome 擴充功能的名稱。`<TextDevOverlay>` 及其 props 不變。
- 匯出 `dynamic = "error"` 的路由處理常式會以 `TX031` 失敗。Text.js 先前將其視為 `"force-static"`，未檢查處理常式是否讀取請求，而這才是該值在 Next.js 中的意義。請使用 `"force-static"`。

<!-- s:e21d3058df -->
- `text start` 與 `text dev` 一樣，會以 `TX028` 回應遭封鎖的 `Host`。各伺服器會指出讀取的設定名稱：`text dev` 為 `vite.server.allowedHosts`，`text start` 為 `server.allowedHosts`。
- textjs.org：學習課程的部署章節不再要求你新增 `vercel.json` 重寫。在 Vercel 和 Cloudflare Pages 上，`text build` 會自行寫入 `index.html` 替代頁面。重寫範例現在使用 Netlify 的 `_redirects`。
- `eslint-plugin-textjs`：`route-handler-exports` 允許在 `route.ts` 中匯出 `dynamic` 和 `revalidate`，`valid-route-module` 則會檢查其中的 `dynamic` 值。

<!-- s:9fc693fec9 -->
- textjs.org：學習章節的影片播放中，當你捲動超過影片位置時，會移至角落的迷你播放器。每段影片下方的「字幕」按鈕可開關字幕，並記住選擇。
- `<TextDevOverlay>` 接受 `pill`、`shortcut` 和 `shell` props，使未使用 App Router 的應用程式也能以自己的按鍵與主題控制項掛載檢查器。
- `<FocusPad>` 接受 `banner`，顯示於訊息的第一列（例如應用程式的文字標誌），在觸控裝置上則顯示於通知上方。

<!-- s:45920d8903 -->
- textjs.org：Playground 選擇器列出儀表板、串流、貪食蛇、OpenCode 和咖啡（terminal.shop）。每個範例都有專屬網址：OpenCode 位於 `/opencode`，terminal.shop 位於 `/coffee`，訊息開頭會顯示各自的文字標誌。計數器和表單已移出 Playground；文件仍將兩者作為即時範例執行。
- `<FocusPad>` 採用新版面配置。每個狀態會顯示三段式進度列、標題、一個大型元素及一列文字。開啟主控台前，大型元素是 DevTools 快速鍵。等待點擊時則是指標。啟用後，會以鍵帽顯示應用程式的 `hints`，在收到按鍵時亮起，沒有提示的按鍵則會顯示於下方。步驟標籤、獨立的「即時」徽章和「查看主控台。」文字已移除。列只會在狀態變更時淡入，首次繪製不會，並在 `prefers-reduced-motion` 下停用動態效果。次要文字在兩種外觀中皆符合 WCAG AA 對比度，主控台尺寸選擇器以鍵盤選取時會顯示焦點外框。
- textjs.org：Playground 使用新的 `<FocusPad>` 版面配置。選擇器目前的範例使用鍵帽表面樣式，OpenCode 指令欄位的圓角與字級和網址欄位一致，terminal.shop 註記從三列改為兩列，「檢視原始碼」與尺寸控制項的基準線對齊，面板中的低調文字也符合 AA 對比度。

<!-- s:01075dcc87 -->
- `text dev` 會針對每個請求透過代理提供 `proxy` 路徑。`fetch()` 會傳送 `Accept: */*`，因此開發伺服器先前優先回應應用程式的 HTML，導致 opencode 範本首次執行時出現「未預期的符記 '<'」而失敗。
- Vite 的相依套件掃描讀取僅限伺服器的檔案時，`text dev` 不再載入第二份 React。先前掃描會觸發僅限伺服器的匯入檢查，印出堆疊追蹤，接著在主控台顯示「無效的 Hook 呼叫」，並破壞 Fast Refresh。
- `text dev` 可處理帶有查詢字串的頁面網址，例如 `/?demo`。Vite 先前將其視為專案資料夾並監看整個磁碟，導致 Linux 上的頁面永遠無法載入。
- create-text-app：開發膠囊按鈕不再遮住任何範本首屏的第一個按鍵提示，預設專案名稱改為 `my-app` 以符合文件，範本通過 `eslint-plugin-textjs` 的建議設定，儀表板 README 也說明了 `--adapter static` 建置。
- `<FocusPad>` 和 `<ViewportControl>` 僅使用完整屬性設定邊框。先前開發模式下每次按鍵提示閃爍，React 都會警告「重新渲染時更新樣式屬性（border）」。
- 位於列尾的文字現在縮短時會保持原位。先前位於 `<Spacer>` 後方時，會停留在最長文字留下的位置，而為了容納溢出列而縮小的同層元素也會維持縮小狀態。
- `<FocusPad>` 會在 `action` 或 `hints` 變更時替換步驟、副標題與按鍵列，因此在同一個面板中切換範例不會被回報為版面配置位移。
- `@textjs/react/testing` 會在匯入時載入 Yoga，因此測試可在首次 `render()` 前為 `fetch` 設定替身。

<!-- s:64f8dbac91 -->
首個穩定版本。`▼ Text.js 1.0.0 (Turbolog)`。

<!-- s:4841011fa5 -->
- **重大變更：**框架與 CLI 套件現為 `@textjs/next`（`textjs` 已在 npm 被使用）。請將匯入從 `textjs` 更新為 `@textjs/next`。
- OpenCode 橋接器為 `bunx @textjs/app proxy`，可從任何目錄執行。
- 主控台預設會符合停駐的 DevTools 面板尺寸（底部、左側或右側停駐、頁面縮放、工具列換行）。未停駐的 DevTools 會使用備用尺寸 `120×36`。面板新增尺寸控制項。

<!-- s:dd18fee429 -->
- `useKeymap`，具備自動 `?` 說明畫面、按鍵提示與 `Ctrl+K` 指令面板。
- 資料元件：`List`（虛擬化）、`Table`、`Tree`。
- 圖表：`LineChart`、`BarChart`、`Sparkline`、`ProgressBar`，以及 `Gradient` 和 `Image`。
- 控制項：`Button`、`Checkbox`、`Switch`、`RadioGroup`、`Slider`、`Dialog`、`Confirm` 與快顯通知。
- 版面配置：`Center`、`Stack`、`Grid`、`SplitPane`、`FocusScope`。
- 用於計時器、動畫、測量、中斷點、儲存與剪貼簿的 Hook。
- 由右至左的文字。Text.js 實作 Unicode 雙向演算法（UAX #9，Unicode 18.0），並通過全部 770,241 個 `BidiTest.txt` 與 91,707 個 `BidiCharacterTest.txt` 測試案例。阿拉伯文會完成字形塑形，`<Text dir>` 則可隔離 span。
- 穩定的 `TX###` 錯誤代碼。框架錯誤附有代碼與指向 `https://textjs.org/errors/<code>` 的連結。
- `@textjs/react/testing`，用於在測試中將元件渲染為文字。
- `@textjs/react/terminal` 與 `text run`，可在真正的終端機中渲染 App Router 應用程式。
- `text mcp`，透過 Model Context Protocol 提供應用程式，讓程式設計代理無須瀏覽器即可導覽、按鍵與讀取影格。
- Text.js DevTools 擴充功能，在主控台旁提供面板，內含元件樹、影格檢查器與時間軸。
- `eslint-plugin-textjs` 與具備即時預覽的 VS Code 擴充功能。
- `apps/terminal-shop`：主控台中的 terminal.shop 商店前台，串接真實 API（預設使用開發沙箱，正式環境設有雙重鎖定）。
- textjs.org：學習課程，共 10 章，在主控台執行。提供建置時預先渲染與 hydration、自行託管且度量相符的字型、不含斜線的 `.html` 路由，以及具備即時預覽的新文件頁面。

<!-- s:25c8658848 -->
- 解除清除後 DevTools 節流的相位鎖定。執行清除的影格之後，渲染器會等待 110 ms 一次，使後續影格進入 DevTools 的立即處理路徑。顯示延遲 p50 從 63 ms 降至 10 ms。
- 受損列帶局部繪製：只重繪變更觸及的列帶。
- 快取每列雜湊、整數樣式 ID，以及零配置的閒置影格。
- 頁面隱藏或未取得焦點時，閒置計時器數量為零。

<!-- s:2f477ecf74 -->
- 換列處不再出現幽靈般的空白繪製層 span，也不再有雙重遮幕。
- 遮幕獨佔一列，因此 DevTools 原始碼連結（`VM12:1`）不會使第 0 列換行。
- 預設載入指示器精確符合儲存格（Menlo 沒有點字字形）。`braille` 變體需自行啟用。
- Node 上的 `text build` 不再打包 React 的開發版本。
- textjs.org：每個路由的累計版面配置位移皆為 0。Playground 和 OpenCode 共用同一種面板版面配置。
- textjs.org：文件與學習側邊欄會在長頁面底部維持固定。
- textjs.org：檔案分頁、程式碼區塊與內文表格僅支援水平捲動，因此 iOS Safari 不會攔截頁面的垂直滑動。
- textjs.org：`scrollbar-gutter: stable` 僅套用於滑鼠裝置。先前在 iOS Safari 上會造成首次捲動跳動。
- textjs.org：停用捲動錨定。先前在 iOS Safari 上會將主視覺固定於黏附式頁首下方。

<!-- s:986367c89f -->
無閃爍影格與伺服器端渲染。

<!-- s:f92fe85dce -->
- 影格改為附加，不再每個影格都執行 `console.clear()` + `console.log()`。DevTools 會同步清除，但以 50 ms 節流繪製新訊息，因此清除會使主控台在 15 fps 時有 70.6% 的 DevTools 繪製呈現空白，60 fps 時則為 81.1%。前置的零寬度遮幕 span 會隱藏先前影格。主控台只會在第一個影格、`invalidate()` 之後、堆疊達 100 個影格且閒置時，或達 300 個影格時清除。
- 輸出影格的間隔至少為 66 ms（約 15 fps）。更快的影格會重新啟動 DevTools 節流並遭丟棄：在 60 fps 時，DevTools 只繪製了 295 個輸出影格中的 67 個。
- Playground 和 OpenCode 為全螢幕焦點面板。

<!-- s:79bc055b31 -->
- span CSS 僅使用完整屬性，將 DevTools 複製到每一列的屬性數量從約 33 個減至約 7 個。使用十六進位色彩，空白連續區段僅以背景作為索引鍵。
- 增量 Markdown 解析，以及記憶化的 `Markdown`、`Code` 和 `Diff` 列。
- 單次處理宿主 props、稀疏 props 更新，以及文字尺寸不可能改變時不重新執行 Yoga 版面配置。
- 串流影格從 0.79 ms 降至 0.14 ms，載入指示器的一次更新從 0.90 ms 降至 0.056 ms。輸出逐位元相同。

<!-- s:52e989e27d -->
- 伺服器端渲染。匯出 `runtime = "server"` 的頁面會在伺服器上渲染，包括 `async function` 元件，並透過伺服器傳送事件，將逐列的儲存格差異串流傳送至 gzip 壓縮後約 19 kB 的影格播放器。
- 部分預先渲染。`text build` 會將每個靜態路由的第一個影格內嵌至 HTML，讓主控台在任何模組載入前繪製畫面。
- `middleware.ts`、路由區段設定（`dynamic`、`revalidate`）和 `textjs/cache`（`unstable_cache`、`revalidateTag`、`revalidatePath`）。
- `text build --adapter static|bun|vercel|cloudflare`。
- `bench/devtools`：驅動實際 DevTools 前端的測試工具，可測量空白繪製、遺失影格、顯示延遲和 DevTools CPU 使用量。

<!-- s:7932537f20 -->
- DevTools 不再將 `path:line`、`//host:port` 和 `data:` 文字轉為連結。
- OpenCode 橋接器會找到受管理的常駐程式（臨時連接埠、基本驗證），在寫入時傳送 CSRF 標頭，並以一行回報失敗。

<!-- s:6dddbd2f6c -->
- 離散輸入（按鍵、貼上）會在同一個工作中同步渲染，不再等待下一個動畫影格。
- 精簡版 OpenCode TUI，介面與實際版本一致。
- 全面調整 textjs.org 的行動裝置與響應式介面。

<!-- s:1d66ad9bc5 -->
- `@textjs/font`：FIGlet 字型剖析器與渲染器，內附 17 種字型，供 `<FigletText>` 和 `<AsciiFont>` 使用。輸出與從 `figlet` 2.2.5 二進位檔記錄的 273 份參考結果一致。
- `text proxy`：本機 CORS 橋接器，讓 textjs.org 能與你的 OpenCode 伺服器通訊。

<!-- s:1331e4db42 -->
- `apps/opencode-console`：在 `console.log` 中渲染的連線式 OpenCode 用戶端，沒有伺服器執行時會改用示範模式。
- 適用於 `create-text-app` 的 `opencode` 範本。
- textjs.org：全新首頁、即時主控台輔助介面、Playground、OpenCode 頁面與文件。
- 具備靜態路由產生功能的 GitHub Pages 部署工作流程。

<!-- s:a1b0bb2bf5 -->
第一個里程碑。

<!-- s:67e64392c2 -->
- `@textjs/core`：以扁平型別陣列實作的 `CellBuffer`、Yoga WASM 版面配置、`Intl.Segmenter` 文字測量，以及 `%c` 遊程編碼驅動程式。每個有變更的影格呼叫一次 `console.log`，閒置時不呼叫。
- `@textjs/react`：React 19 協調器、PascalCase 元件（`Box`、`Text`、`ScrollBox`、`Input`、`Textarea`、`Select`、`Tabs`、`Code`、`Markdown`、`Diff`、`Modal`、`Spinner` 等）、儲存格層級的 Tailwind 風格 `className` 工具、主題和 DOM `FocusPad`。
- `textjs`：以檔案系統為基礎的 App Router（`layout`、`page`、`loading`、`error`、`not-found`、動態區段、路由處理常式）、`text dev`、`text build`、`text start`，以及主控台內的 `[▼]` 檢查器。
- `create-text-app`，含 `starter` 和 `dashboard` 範本。
