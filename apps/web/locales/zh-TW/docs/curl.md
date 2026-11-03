<!-- s:5f3abb073d -->
終端機 HTTP 用戶端會取得頁面的第一個影格，格式為真彩色 ANSI 文字，而非 HTML 文件。不需要任何設定。

<!-- s:f501ff55e0 -->
哪些請求會取得影格

<!-- s:3384141bb9 -->
請求符合以下所有條件時，就會取得影格：

<!-- s:05a334e510 -->
- 方法為 `GET` 或 `HEAD`；
- `User-Agent` 以 `curl/`、`Wget/`、`wget2/`、`HTTPie/` 或 `xh/` 開頭；
- 缺少 `Accept` 標頭，或標頭未提及 `text/html`。

<!-- s:4af297e372 -->
瀏覽器、爬蟲和連結預覽會取得 HTML 頁面。若要透過 curl 取得 HTML，請明確要求：

<!-- s:03dba887a9 -->
影格會在原本要提供頁面的階段選定：也就是在 [middleware](/docs/middleware)、`rewrites` 和[路由處理常式](/docs/route-handlers)之後，且絕不適用於檔案或最後一段含有句點的路徑。Middleware 的重新導向、`401`、標頭和重寫對 curl 的作用與瀏覽器相同。`/api/health` 仍會執行其處理常式，`/robots.txt` 也仍會提供檔案。

<!-- s:e0c4f5f416 -->
影格的內容

<!-- s:50fa4581ec -->
影格是頁面的首次渲染，如同[預先渲染的外殼](/docs/server-rendering#partial-prerendering)：每個仍在等待的 `<Suspense>` 邊界都會顯示其 fallback。非同步伺服器元件不會執行，`fetch()` 也永遠不會完成，因此在 effects 中載入的資料會維持載入中的狀態。

<!-- s:08efeec61a -->
- **大小：**80 × 24 個儲存格。使用固定檢視區（`viewport.responsive: false`）的應用程式則採用 `viewport.width × viewport.height`。
- **色彩：**使用應用程式 `viewport.theme` 的 24 位元 SGR 跳脫碼。每列結尾都有重設碼，影格則以換行結尾。
- **狀態：**`200`，或在沒有符合的頁面或頁面呼叫 `notFound()` 時，回傳 `404` 並顯示應用程式的找不到頁面。渲染時呼叫 `redirect()` 的頁面會提供 HTML。

<!-- s:1125803eb1 -->
回應的類型為 `text/plain; charset=utf-8`，並帶有 `Vary: User-Agent, Accept` 和 `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`，因此共用快取不會儲存影格後再提供給瀏覽器。在 curl 會取得影格的路徑上，HTML 頁面也帶有相同的 `Vary` 標頭。

<!-- s:0e2aba0a67 -->
適用環境

<!-- s:d40234848f -->
| 主機 | 靜態頁面 | 動態頁面、未知路徑 |
| :-- | :-- | :-- |
| `text dev` | 收到請求時渲染 | 收到請求時渲染 |
| `text start`, `bun` | 由 `text build` 預先渲染 | 收到請求時渲染 |
| `vercel`, `cloudflare` | 由 `text build` 預先渲染 | HTML 頁面 |
| `static` | HTML 頁面 | HTML 頁面 |

<!-- s:11c905d6a6 -->
伺服器端渲染的頁面需要 `text start` 或 `bun`（請參閱[部署](/docs/deploying#server-rendered-routes)）。

<!-- s:2cdc6d454b -->
靜態主機無法依用戶端提供不同的回應，因此 `static` 轉接器不支援影格。在 Vercel 和 Cloudflare 上，靜態頁面的影格會隨建置產物一同發布。動態頁面（`[id]`、`force-dynamic`）在這些平台上會提供 HTML，因為 `vercel` 和 `cloudflare` 轉接器不會部署渲染器。

<!-- s:022d3d5541 -->
`text start` 和 `bun dist/server.js` 會在收到請求時透過 `.text/server/live.mjs` 渲染其餘頁面，並將最近 128 個影格保留 10 秒。每台伺服器每 10 秒最多渲染 20 個未快取的頁面。超過上限後，curl 會取得 HTML 頁面，直到配額恢復。若伺服器無法載入 `live.mjs`，例如頁面模組在頂層讀取 `window`，這些頁面就會提供 HTML。

<!-- s:2500855fbd -->
`text build` 會回報預先渲染的影格：

<!-- s:37f210b46a -->
設定

<!-- s:ac46338e16 -->
變更整個應用程式的大小，或停用影格：

<!-- s:36fb2e113c -->
頁面可以變更自己的大小，也可以對終端機提供 HTML：

<!-- s:11c75396f6 -->
大小限制為 1–500 個儲存格。在 `text.config.ts` 中設定 `ansi: false` 後，會忽略頁面的匯出設定。

<!-- s:17ae9b44af -->
純 HTTP

<!-- s:e9b0dd23eb -->
除非傳入 `-L`，否則 curl 不會跟隨重新導向。Vercel 會將 `http://` 請求重新導向至 `https://`，啟用**一律使用 HTTPS** 的 Cloudflare 也會如此，因此 `curl http://…` 會印出重新導向，而非影格。請分享 `https://` 網址。

<!-- s:740b32f53f -->
自訂伺服器

<!-- s:144c78c64b -->
`@textjs/app/ansi` 匯出偵測與回應輔助函式，供未執行 `text start` 或轉接器的伺服器與函式使用：

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` 也接受 `(method, headers)`，其中標頭可使用 Web 的 `Headers` 或 Node 的 `IncomingHttpHeaders`。`frameToAnsi(buffer, { theme })` 會以與框架相同的方式，將已渲染的 `CellBuffer` 編碼。
