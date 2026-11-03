<!-- s:c88a0b9074 -->
成功

<!-- s:232761cbc8 -->
未發生錯誤。

<!-- s:0dbfdefc62 -->
無需採取任何動作。

<!-- s:5278892fa4 -->
Yoga 尚未初始化

<!-- s:3cc543df2e -->
版面配置由 Yoga 執行，Yoga 以 WebAssembly 形式提供，必須在第一個影格前完成實例化。某處在 `initYoga()` 完成前，同步建立了場景節點或根節點。

<!-- s:08db9c8a11 -->
使用非同步根節點輔助函式，自動初始化 Yoga：

<!-- s:0cc02c96a3 -->
若需要直接使用 `createConsoleRootSync()` 或核心場景圖，請在啟動時等待 `initYoga()` 完成一次：

<!-- s:0f5cc351a1 -->
使用 `text dev` 啟動的應用程式不會遇到此錯誤。

<!-- s:cebca37b05 -->
在主控台根節點外渲染

<!-- s:c3b259f977 -->
Text.js Hook 或元件（`useInput`、`<ScrollBox>` 等）在非主控台根節點的 React 根節點下渲染，最常見的情況是使用 `react-dom` 渲染主控台專用元件。

<!-- s:6f1ee54e3e -->
透過 `renderToConsole`（或 `createConsoleRoot`）渲染主控台元件，不要使用 `react-dom`：

<!-- s:c7cb019122 -->
若要在頁面上顯示相同的 UI，請使用 `@textjs/react/dom` 的 `<TextCanvas>`，它會建立自己的主控台根節點。

<!-- s:b657e4704a -->
未知的宿主元素

<!-- s:a8bb5bc9a5 -->
協調器只支援 `tx-box` 和 `tx-text` 這兩種內建元素。它收到了 `<div>` 或 `<span>` 這類小寫元素。

<!-- s:407e421c11 -->
改用匯出的元件：

<!-- s:2381168639 -->
<Box> 巢狀置於 <Text> 內

<!-- s:2e17219271 -->
`<Text>` 用於排列一段行內文字，不能包含 Flexbox 容器。某個 `<Box>`（或會渲染 `<Box>` 的元件，例如 `<Spacer>` 或 `<Divider>`）在 `<Text>` 內渲染。

<!-- s:cd12727fb7 -->
將 `<Box>` 移到外面，並將同層文字並排放在同一列：

<!-- s:0346a73e37 -->
巢狀的 `<Text>` 沒有問題，會渲染為行內 span。

<!-- s:32864d644a -->
卸載後渲染

<!-- s:c194b81d64 -->
在主控台根節點呼叫 `root.unmount()` 後，又呼叫了 `root.render()`。已卸載的根節點已釋放渲染器和輸入事件監聽器。

<!-- s:4d43c601c1 -->
建立新的根節點，或保持根節點掛載並渲染不同的樹：

<!-- s:41d1a6160d -->
在測試中，從非同步回呼渲染前，先檢查 `root.unmounted`。

<!-- s:c5d7700094 -->
組合鍵包含未知的修飾鍵

<!-- s:7729dd7762 -->
組合鍵中最後一個 `+` 之前的每個部分都必須是修飾鍵：`ctrl`、`alt`（`option`）、`shift`、`meta`（`cmd`）或 `mod`（Apple 上為 `⌘`，其他平台為 `Ctrl`）。

<!-- s:d5ba2b08ed -->
組合鍵包含未知的按鍵

<!-- s:a68eb32bc2 -->
組合鍵的最後一部分必須是單一字元、具名按鍵（`enter`、`escape`、`tab`、`up`、`pagedown`、`space` 等）或功能鍵（`f1`–`f12`）。

<!-- s:69f231367c -->
按鍵序列以空格分隔各次按鍵（`"g g"`）。替代按鍵以逗號分隔（`"j, down"`）。

<!-- s:92663abe8d -->
空的組合鍵

<!-- s:aa16466cb6 -->
組合鍵結尾缺少按鍵，例如 `"ctrl+"` 或 `""`。

<!-- s:13284de673 -->
指定按鍵。若要綁定加號鍵本身，請寫成 `"ctrl++"`：

<!-- s:f329e5f580 -->
預期為單次按鍵

<!-- s:95712ddbf5 -->
一次按鍵操作代表一個具體的按鍵動作。`keyEventFromCombo()` 收到了 `"g g"` 之類的序列，或 MCP 的 `press` 工具收到了 `"a,b"` 之類的替代按鍵。

<!-- s:0348879743 -->
為每次按鍵建立一個事件。測試中的 `app.press()` 和 MCP 的 `press` 工具會自動拆分以空格分隔的序列：

<!-- s:467193a3d5 -->
renderToTerminal 沒有 stdout

<!-- s:76fa9d629b -->
`renderToTerminal()` 預設會將 ANSI 影格寫入 `process.stdout`。目前的執行環境沒有 `process.stdout`（例如瀏覽器、worker），也未傳入 `stdout` 選項。

<!-- s:90c3d0ac1f -->
在 Bun 或 Node 下執行，或傳入可寫入串流：

<!-- s:d3a77e5829 -->
在瀏覽器中，請改用 `renderToConsole`。

<!-- s:f201fe8e80 -->
<Image src> 缺少 DOM

<!-- s:b9f409f560 -->
`<Image src>` 透過 `<img>` 和 canvas 解碼圖片。目前的環境沒有 `document`（終端機、伺服器、測試），因此無法載入該網址。

<!-- s:3c284cd278 -->
自行解碼圖片並傳入 RGBA 像素：

<!-- s:775d3d31e6 -->
<Image> 無法使用 2D 畫布

<!-- s:7da15f3e88 -->
瀏覽器拒絕提供 `2d` 畫布繪圖環境，通常是因為政策或防指紋追蹤功能停用了畫布，或頁面的 GPU 記憶體不足。

<!-- s:59ad35999f -->
傳入在其他地方解碼的 `pixels`，或渲染 `alt` 替代內容。`<Image>` 載入失敗時就會顯示 `alt` 文字：

<!-- s:ca446b6432 -->
<Image> 載入失敗

<!-- s:f11b7bffe8 -->
圖片請求失敗：可能是 404、網路錯誤，或跨來源伺服器未傳送 `Access-Control-Allow-Origin`。像素是從畫布讀取的，因此跨來源圖片需要 CORS。

<!-- s:5e5daf0ad8 -->
從自己的來源（`public/`）提供圖片，或在圖片主機上啟用 CORS：

<!-- s:aca80fe237 -->
在 <AppRouter> 外使用

<!-- s:0fca8db90b -->
`useRouter`、`usePathname`、`useParams`、`useSearchParams`、`useAppTheme` 和 `<Link>` 會讀取 `<AppRouter>` 提供的狀態。元件在其外部渲染，通常出現在獨立的 `renderToConsole` 呼叫或單元測試中。

<!-- s:0dd134139b -->
使用 `text dev`、`text start` 或 `text run` 執行應用程式，這些指令會掛載 `<AppRouter>`。手動渲染時（測試、嵌入），請掛載路由器，而非頁面：

<!-- s:f72dd41076 -->
路由檔案沒有預設元件

<!-- s:bb105b223b -->
`page`、`layout`、`loading`、`error` 和 `not-found` 檔案必須以 `export default` 匯出 React 元件。這個檔案沒有預設匯出，或匯出的內容不是函式。

<!-- s:737da9f930 -->
路由處理常式未回傳 Response

<!-- s:cb8f799843 -->
`route.ts` 處理常式解析為 `undefined`（或其他非 `Response` 值），通常是因為某個分支缺少 `return`。

<!-- s:ec7e161fb3 -->
在每個分支回傳 `Response`：

<!-- s:62e5198b56 -->
沒有正式環境建置

<!-- s:6668a2f9b4 -->
`text start` 提供 `text build` 的輸出，但輸出目錄（`outDir`，預設為 `dist`）中沒有建置結果。

<!-- s:498f1313ed -->
如果你在 `text.config.ts` 中變更了 `outDir`，請從同一個專案根目錄執行這兩個指令。

<!-- s:dfda64bc1d -->
沒有 app/ 目錄

<!-- s:38ac920023 -->
`text run` 會在終端機中渲染 App Router，但找不到路由目錄。

<!-- s:6853e006ef -->
從專案根目錄執行，或傳入專案目錄：

<!-- s:5a6362131f -->
text run / text mcp 需要 Bun

<!-- s:773405124b -->
`text run` 和 `text mcp` 會直接匯入 `.tsx` 路由檔案，因此需要 Bun 原生的 TypeScript 載入器。以 Node 啟動時，若 `PATH` 中有 `bun`，CLI 會使用 Bun 重新執行；這個錯誤表示找不到 `bun`。

<!-- s:6f7a84fdc6 -->
安裝 [Bun](https://bun.sh)，或直接使用 Bun 執行指令：

<!-- s:c6dc53e7c3 -->
`text dev`、`text build` 和 `text start` 可在 Node 上執行。

<!-- s:89a2fef8aa -->
未知的 CLI 指令

<!-- s:eba41925ed -->
`text` CLI 有 6 個指令：`dev`、`build`、`start`、`run`、`proxy` 和 `mcp`。

<!-- s:8399f0df32 -->
沒有 `text deploy` 指令。使用 `text build --adapter <name>` 為你的平台建置，再使用該平台的 CLI 部署輸出。請參閱[部署](/docs/deploying)。

<!-- s:ca76fd96a5 -->
無效的 OpenCode 伺服器網址

<!-- s:486a7eb67b -->
`--target`（或 `OPENCODE_SERVER_URL`）必須是純 HTTP(S) 來源網址。提供的值包含路徑、查詢、片段或憑證。網址中的憑證會留在記錄和瀏覽器歷史紀錄中。

<!-- s:a2f7bb7ff8 -->
請改用 `OPENCODE_PASSWORD` 設定伺服器密碼。

<!-- s:f606233e6c -->
橋接器連接埠與 OpenCode 衝突

<!-- s:8780127b8f -->
橋接器設定要監聽的本機連接埠，與其代理的 OpenCode 伺服器相同。

<!-- s:0b359d8121 -->
橋接器已在執行

<!-- s:76e9990092 -->
另一個橋接器（`bunx @textjs/opencode@latest proxy` 或 `text proxy`）已在監聽這個連接埠。你可以連線至該橋接器，不必再啟動一個。

<!-- s:d5c7dd3e92 -->
連線至執行中的橋接器，或在另一個連接埠啟動第二個橋接器：

<!-- s:20a5f0b929 -->
橋接器連接埠使用中

<!-- s:4fb3fcf34c -->
有其他程式正在監聽指定的連接埠，且不是 Text.js 橋接器。

<!-- s:4a35b098e4 -->
或找出另一個處理程序：`lsof -i :4096`。

<!-- s:f694899be6 -->
未知的範本

<!-- s:13309ae8df -->
`--template` 必須指定內附範本之一：`starter`、`dashboard` 或 `opencode`。

<!-- s:162e762178 -->
目標目錄不是空的

<!-- s:24518256d0 -->
create-text-app 只會在新目錄或空目錄中建立專案，因此不會覆寫你的檔案。目錄中可以有 `.git` 目錄和編輯器資料夾（`.vscode`、`.idea`）。

<!-- s:2d505908ff -->
選擇新的目錄名稱：

<!-- s:0c1a816fb9 -->
無效的專案名稱

<!-- s:46e6e56ab7 -->
目錄名稱會成為 `package.json` 中的名稱，必須是有效的 npm 套件名稱：使用小寫、適用於網址、最多 214 個字元，且不能是 `textjs`、`react`、`react-dom`、`node_modules` 或 `favicon.ico`。

<!-- s:5aa32a2677 -->
主機遭到封鎖

<!-- s:7c7e94bc6b -->
`text dev`，以及綁定至回送位址時的 `text start`（預設行為），只會回應傳送至 `localhost`、`*.localhost` 名稱或 IP 位址的請求。這可防止 DNS 重新綁定攻擊。收到的請求帶有其他 `Host` 標頭，通常來自通道、反向代理或區域網路主機名稱。

<!-- s:8caece973a -->
在 `text.config.ts` 中允許該主機。`text dev` 讀取 Vite 的 `vite.server.allowedHosts`，而 `text start` 讀取 `server.allowedHosts`。開頭的 `.` 表示允許子網域：

<!-- s:2c7d7369a1 -->
`text start --host` 使用回送位址以外的任何位址時，會略過檢查。請參閱[在代理後方執行](/docs/deploying#behind-a-proxy)。

<!-- s:5bb33b3415 -->
未知的 text.config 選項

<!-- s:5117146873 -->
`text.config.ts` 匯出了 Text.js 不會讀取的鍵，通常是拼字錯誤（將 `basePath` 寫成 `basepath`），或將 Vite 選項放在最上層。

<!-- s:31ae46d91d -->
修正拼字，或將 Vite 選項移至 `vite` 下：

<!-- s:7f45c35d94 -->
`defineConfig` 會檢查設定的型別，並在編輯器中找出這些問題。

<!-- s:d1de5d5931 -->
伺服器端渲染的路由需要持續運作的伺服器

<!-- s:d06541fc12 -->
頁面匯出了 `runtime = "server"`：頁面會在伺服器上渲染，並透過與分頁存續時間相同的工作階段，將影格串流傳送至每個開啟的分頁。靜態託管服務、Vercel Functions 和 Cloudflare Workers 無法維持這些工作階段，因此 `text build --adapter static|vercel|cloudflare` 會拒絕建置此應用程式，避免發布無法渲染的路由。

<!-- s:27f8e0c99e -->
使用持續運作的伺服器部署：

<!-- s:3ba9e63872 -->
或移除匯出，改在瀏覽器中渲染路由：

<!-- s:b39194c0e6 -->
無效的 dynamic 匯出

<!-- s:218844a290 -->
路由處理常式匯出的 `dynamic` 值不受 Text.js 支援。Next.js 也接受 `"error"`，這會靜態渲染路由，並在路由讀取請求資料時讓建置失敗。Text.js 無法偵測請求讀取，因此不接受 `"error"`。

<!-- s:78a6bdcb90 -->
使用 `"force-static"` 快取處理常式。快取的處理常式收到的請求不含查詢字串、標頭、Cookie 或主體：

<!-- s:95d0435b57 -->
如果處理常式會讀取請求，請使用 `"force-dynamic"`，或移除匯出。請參閱[快取](/docs/caching)。
