<!-- s:88013af27d -->
中介軟體會在請求完成前執行程式碼。它可以重新導向、改寫、設定標頭與 Cookie，或自行回傳回應。

<!-- s:895d99d1b5 -->
慣例

<!-- s:9e6d75b727 -->
在專案根目錄（或 `src/`）中，於 `app/` 旁建立 `middleware.ts`。匯出 `middleware` 函式（或預設匯出），以及選用的 `config`。

<!-- s:a4d39cdaaf -->
在 `text dev`、`text start` 以及每個伺服器[部署配接器](/docs/deploying)上，中介軟體都會先於[路由處理常式](/docs/route-handlers)、靜態檔案和主控台頁面執行。它使用 Web `Request` 和 `Response`，因此同一個檔案可在 Node、Bun、Vercel Edge 和 Cloudflare Workers 上執行。

<!-- s:dda0880da2 -->
比對路徑

<!-- s:1e1ec8c339 -->
未設定 `config.matcher` 時，中介軟體會對每個請求執行。比對規則使用與 Next.js 相同的語法：

<!-- s:473d472bc8 -->
| 比對規則 | 符合的路徑 |
| :-- | :-- |
| `/about` | `/about` 和 `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`、`/docs/a/b` |
| `/a/:rest+` | `/a/b`，不含 `/a` |
| `/user/:id(\\d+)` | `/user/42`，不含 `/user/ada` |
| `/((?!api/).*)` | 除 `/api/*` 以外的所有路徑 |

<!-- s:256aeeefbc -->
使用 `has` 和 `missing` 新增條件（標頭、Cookie、查詢或主機）：

<!-- s:d756420343 -->
比對規則會套用至不含 `basePath` 的路徑名稱。在 `text dev` 中，Vite 本身的模組請求（`/@vite/*`、原始碼檔案）絕不會執行中介軟體。

<!-- s:75cd7297e6 -->
每個主機都會在中介軟體執行前算出一個標準化路徑名稱，並將它用於比對、`request.nextUrl`，以及路由、處理常式和檔案的查找。百分比編碼會先解碼，再以 `new URL()` 的輸出方式重新編碼路徑，解析 `.` 和 `..` 區段，並移除重複和結尾的斜線。`/ad%6din//users/` 會以 `/admin/users` 傳入中介軟體，而 `/café` 則維持為 `/caf%C3%A9`。結尾含斜線的比對規則，例如 `/admin/`，會符合 `/admin`。路徑含有編碼後的斜線或反斜線（`%2F`、`%5C`）、控制字元或無效百分比編碼的請求，會收到 `400`。路由區分大小寫：`/Admin` 不符合 `/admin`，靜態檔案也只會在名稱完全相符時提供。

<!-- s:3f5746eb4e -->
比對檔案實際提供服務的網址，不要只比對檔名。Cloudflare Pages 也會在 `/report` 提供 `report.html`，因此 `/report.html` 的比對規則無法保護 `/report`。請列出兩者，使用 `matcher: ["/report", "/report.html"]`，或將受保護的檔案放在同一個目錄中並比對該目錄，例如以 `/reports/:path*` 比對 `public/reports/` 中的檔案。

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | 效果 |
| :-- | :-- |
| `NextResponse.next()` | 繼續執行路由 |
| `NextResponse.redirect(url, status?)` | 預設為 `307`；`url` 必須是絕對網址 |
| `NextResponse.rewrite(url)` | 提供另一個路徑；外部來源會透過代理處理 |
| `NextResponse.json(body, init?)` | 以 JSON 回應 |
| `new Response(...)` | 以任何內容回應 |

<!-- s:a8292924c3 -->
不回傳任何值，即可維持原樣繼續執行。`next()` 和 `rewrite()` 接受 `{ status }`，可用來變更最終回應的狀態。只有由 `NextResponse.next()` / `NextResponse.rewrite()` 建立的回應會控制路由：其他任何 `Response`，包括 `fetch()` 回傳的回應，都會在移除 `x-middleware-*` 標頭後原樣傳送給用戶端。

<!-- s:583e778785 -->
`request.nextUrl` 的 `pathname` 不包含 `basePath`，但其 `href` 和 `toString()` 會包含。若要維持在應用程式內，請複製它：`const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`。

<!-- s:b618d4732f -->
標頭

<!-- s:37748fa2c3 -->
傳入 `request.headers` 可變更下游處理常式收到的標頭，傳入 `headers` 則可新增回應標頭：

<!-- s:60bf4677c2 -->
中介軟體的回應標頭會加入最終回應，除非路由處理常式設定了相同的標頭。

<!-- s:ef657b8fe3 -->
Cookie

<!-- s:5d3635224b -->
`request.cookies` 讀取 `Cookie` 標頭；`response.cookies` 寫入 `Set-Cookie`。

<!-- s:4a7b6bbf62 -->
在 `next()` 或 `rewrite()` 回應上設定的 Cookie，同一個請求中的路由處理常式也能讀取。

<!-- s:a65a1ce099 -->
背景工作

<!-- s:de593dc070 -->
第二個引數提供 `waitUntil()`，可在回應送出後讓無伺服器執行環境繼續運作：

<!-- s:63e13e87b3 -->
注意事項

<!-- s:971c06c875 -->
- 用戶端渲染的頁面會在瀏覽器中渲染，因此改寫至另一個頁面會變更提供的檔案，不會變更主控台應用程式渲染的路由。改寫至路由處理常式、靜態檔案和外部來源時，行為符合預期。
- 中介軟體可以讀取請求主體；路由處理常式仍會收到該主體。比對規則排除的請求，其主體絕不會被存取。
- `request.url` 一律使用伺服器的來源：`//other.host/x` 這類請求目標的開頭會正規化為單一斜線。
- [靜態配接器](/docs/deploying#static)無法執行中介軟體。
