<!-- s:04615ef523 -->
`text build` 會產生可攜的 `dist/`。配接器會將它轉換為平台預期的輸出。

<!-- s:087f8d3137 -->
配接器

<!-- s:04908c6c09 -->
| 配接器 | 輸出 | 執行環境 |
| :-- | :-- | :-- |
| *（無）* | `dist/` + `dist/.text/server` | `text start`（Node） |
| `static` | `dist/` | 任何靜態託管平台 |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel（Build Output API v3） |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
也可以透過 `TEXTJS_ADAPTER` 指定配接器。在 Vercel（`VERCEL=1`）或 Cloudflare Pages（`CF_PAGES=1`）上執行 `text build` 時，會自動選擇對應的配接器。

<!-- s:9d8df946e5 -->
伺服器配接器（`bun`、`vercel` 和 `cloudflare`）執行的處理流程與 `text start` 相同：先執行[中介軟體](/docs/middleware)、`rewrites`、搭配[路由快取](/docs/caching)的[路由處理常式](/docs/route-handlers)，接著提供靜態資源，最後為頁面網址提供主控台文件。curl 等終端機用戶端則會收到以 ANSI 文字呈現的頁面第一個影格。在 `vercel` 和 `cloudflare` 上，這僅適用於靜態頁面（請參閱 [curl 與終端機用戶端](/docs/curl)）。伺服器配接器會為 `/assets/` 下帶有雜湊值的檔案設定 `Cache-Control: public, max-age=31536000, immutable`。

<!-- s:1a5ee098c6 -->
靜態部署

<!-- s:9ebd0d2866 -->
適用於沒有伺服器的託管平台，例如 GitHub Pages、S3 或 CDN。設定 `dynamic = "force-static"` 或 `revalidate` 的 `GET` 路由處理常式會預先渲染為檔案：`app/api/feed.json/route.ts` 會變成 `dist/api/feed.json`。建置會將 `index.html` 複製到 `404.html`，讓深層連結能開啟主控台應用程式。靜態託管平台無法區分 curl 與瀏覽器，因此 curl 會收到 HTML 頁面。

<!-- s:1e90536a2a -->
如果應用程式需要伺服器，建置就會失敗並列出所有原因：`middleware.ts`、[伺服器端渲染的路由](/docs/server-rendering)、動態路由處理常式、含有動態區段的路由處理常式，或非 `GET` 方法。請改在託管平台上設定 `rewrites`。

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
`bun` 配接器會產生單一且自給自足的伺服器，執行時不需要 `node_modules`。它會讀取 `PORT`（預設為 `3000`）和 `HOSTNAME`（預設為 `0.0.0.0`），且絕不提供 `server.js` 或 `.text/`。這是長時間執行的程序，因此也會像 `text start` 一樣，託管[伺服器端渲染的路由](/docs/server-rendering)（`export const runtime = "server"`）及其即時工作階段。在容器中使用：

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
或推送至已連接 Vercel 的 Git 儲存庫：建置會執行 `text build`，偵測 Vercel 並寫入 `.vercel/output`。

<!-- s:3ee6894582 -->
| 輸出 | 內容 |
| :-- | :-- |
| `static/` | 用戶端建置產物（位於 `basePath` 下） |
| `functions/_textjs/server.func` | 處理所有路由處理常式並支援串流的單一 Node.js 22 函式 |
| `functions/_middleware.func` | Edge 路由中介軟體：`middleware.ts`，以及每個應用程式的正規路徑 |
| `config.json` | 資源標頭、中介軟體比對器、重寫規則、處理常式路由與主控台文件 |

<!-- s:3f3ba93b7d -->
邊緣中介軟體使用 `x-middleware-next` / `x-middleware-rewrite` 協定，因此標頭覆寫和重寫會在請求抵達函式或 CDN 前，於 Vercel 的路由器中完成。所有比對器共用一個路由 `src` 模式。沒有任何比對器涵蓋的請求會略過中介軟體，除非路徑可能不是正規形式（百分比編碼、網址剖析器會編碼的字元、`//`、`.` 或 `..` 區段、結尾斜線）。中介軟體接著會比對正規路徑，檢查 `has` / `missing`，並將請求重寫為該路徑，讓 Vercel 以相同方式路由請求。沒有 `middleware.ts` 的應用程式也會取得相同的邊緣函式，但只執行重寫。由於每次建置都包含 Edge 函式，請使用已登入的 Vercel 帳號部署：匿名部署（`vercel deploy --temporary`）不接受 Edge 函式。

<!-- s:b5af065e25 -->
處理常式函式僅供內部使用。每個處理常式路由會透過 `x-textjs-path` 請求標頭，將比對到的路徑傳給該函式。每個請求在中介軟體執行前後都會移除該標頭，且邊緣中介軟體絕不轉送該標頭（無論來自用戶端或 `middleware.ts`），因此只有處理常式路由能設定它。在中介軟體和重寫執行前後，對 `/_textjs/*` 的請求都會回傳 `404`，不執行函式。產生的路由會區分大小寫，與其他託管平台上的比對器和重寫規則相同。

<!-- s:5e18b8a450 -->
配接器的測試會將這些輸出交由本機模擬的 Vercel 路由器執行。`src` 比對、`dest` 擷取、標頭轉換和 `status` 路由的行為已透過實際部署驗證；Edge 中介軟體則未經驗證，因為無法匿名部署。

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
輸出使用 Pages 進階模式：

<!-- s:9f0923168f -->
| 檔案 | 用途 |
| :-- | :-- |
| `_worker.js` | 中介軟體、重寫規則、路由處理常式與主控台文件 |
| `_routes.json` | 將每個請求傳送至 worker。沒有中介軟體或 `basePath` 時，`/assets/*` 仍由 Pages 的靜態 CDN 提供 |
| `_headers` | `/assets/*` 的不可變快取設定（附加至你的設定） |
| `404.html` | 讓 Pages 在找不到檔案時回傳 `404`，而非應用程式（若你已有此檔案則保留） |

<!-- s:9bc2b010d1 -->
由於 Pages 會原樣發布目錄，`.text/`（伺服器套件組與建置資訊清單）會從 `dist/` 移除。

<!-- s:1200dbc88d -->
在 Pages 專案（設定 → 執行階段）或 `wrangler.toml` 中啟用 `nodejs_compat` 相容性旗標；資料快取會使用 `AsyncLocalStorage`。靜態檔案透過 `ASSETS` 繫結提供，背景重新驗證則使用 `ctx.waitUntil()`。

<!-- s:0bb76cfebb -->
使用中介軟體時，每個請求都會執行 worker，包括帶有雜湊值的資源，讓中介軟體能看見所有可存取檔案的路徑。每個執行 worker 的請求都算一次 Functions 呼叫，並計入 Workers 請求配額。載入一個頁面時，這包含文件與擷取的每個檔案（只有一個 JavaScript 套件組的小型測試應用程式為 2 次；檔案越多的應用程式次數越多）。在 Workers Free 方案中，每日配額用完後，Pages 會不經 worker 提供靜態檔案，因此略過中介軟體。如果中介軟體保護 `dist/` 中的任何內容，請將「設定 → 執行階段 → Fail open / closed」設為 **Fail closed**。

<!-- s:600050383d -->
升級

<!-- s:e8733a2bfb -->
只有在重新建置並重新部署後，部署內容才會套用 `@textjs/app` 的安全性修正：

<!-- s:c74adc728a -->
- Vercel：部署新的 `.vercel/output`。
- Cloudflare Pages：部署新的 `dist/`，包含 `_worker.js` 和 `_routes.json`。
- Bun：部署完整的新 `dist/`（`server.js`、資源與即時套件組），然後重新啟動伺服器。
- `text start`：執行 `text build` 並重新啟動。

<!-- s:8047727085 -->
舊版部署仍可透過各自的網址存取（例如 Vercel 和 Cloudflare Pages 的預覽網址）。請刪除舊版部署，或使用平台的存取保護功能加以保護。

<!-- s:f5e077273b -->
伺服器端渲染的路由

<!-- s:049ef31493 -->
[伺服器端渲染的路由](/docs/server-rendering)會為每個開啟的分頁維持一個工作階段，因此需要長時間執行的伺服器：`text start` 或 `bun` 配接器。當頁面匯出 `runtime = "server"` 時，`static`、`vercel` 和 `cloudflare` 配接器會使建置失敗，並回報 `TX030`。

<!-- s:eb19728e6b -->
在 Proxy 後方執行

<!-- s:21a17d0b45 -->
`text start` 會繫結至 `127.0.0.1`，且繫結至回送位址時，只回應 `localhost`、`*.localhost` 和 IP 位址主機（DNS 重新繫結防護）。其他主機會收到 `403` 和 `TX028`。將對外設定放入 `text.config.ts`：

<!-- s:43bd5471c8 -->
未設定 `origin` 或 `trustProxy` 時，`request.url` 會以通過驗證的 `Host` 標頭搭配 `http` 建立。

<!-- s:689cebe287 -->
注意事項

<!-- s:f45e3fb003 -->
- `text.config.ts` 中的 `proxy` 只在 `text dev` 和 `text start` 中執行；配接器不包含此功能。請使用每個伺服器配接器都支援的 `rewrites`。
- 每個無伺服器執行個體都有自己的記憶體內快取。請參閱[快取](/docs/caching#platform-notes)。
- 使用原始正規表示式群組的 `rewrites` 會盡可能轉換為 Vercel 路由；具名參數（`:slug`、`:path*`）則會精確轉換。
