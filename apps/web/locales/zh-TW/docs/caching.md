<!-- s:5b67b32177 -->
快取路由處理常式的回應與資料，再定時或依需求重新驗證。執行一次背景更新時，立即提供過期的項目。

<!-- s:be697310c8 -->
路由處理常式

<!-- s:e85fc29fe2 -->
`GET` 路由處理常式預設為動態。使用路由區段設定啟用快取：

<!-- s:e4ccf65c67 -->
| 匯出 | 行為 |
| :-- | :-- |
| *（無）* | 每次請求都執行 |
| `dynamic = "force-static"` | 快取至重新驗證為止 |
| `revalidate = N` | 快取；`N` 秒後過期 |
| `revalidate = 0` 或 `dynamic = "force-dynamic"` | 每次請求都執行 |

<!-- s:274c053db6 -->
其他 `dynamic` 值會觸發 `TX031` 錯誤。這也包括 Next.js 的 `"error"`，因為 Text.js 無法偵測處理常式何時讀取請求。

<!-- s:0fae4045f6 -->
快取的處理常式會為每個路徑名稱建立一個項目，其 `request` 如同建構時的請求：沒有查詢字串、標頭、Cookie 或主體。請改在動態處理常式中讀取這些內容。只有 `GET` 和 `HEAD` 會快取。帶有 `5xx` 狀態、`Set-Cookie` 標頭或 `Cache-Control: private` / `no-store` 的回應會回傳，但絕不儲存。

<!-- s:b618d4732f -->
標頭

<!-- s:c0a6cf7351 -->
快取的回應帶有：

<!-- s:b5f8cfecb4 -->
| 標頭 | 值 |
| :-- | :-- |
| `x-textjs-cache` | `MISS`、`HIT` 或 `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`，或在 `force-static` 時使用 `s-maxage=31536000` |

<!-- s:c1fb73c64a -->
當[中介軟體](/docs/middleware)為請求設定 cookie、重寫或覆寫請求標頭時，產生的標頭會變成 `private, no-cache, no-store, max-age=0, must-revalidate`，因此共用快取不會重複使用針對個別訪客做出的決定。處理常式設定的 `Cache-Control` 標頭會保留。

<!-- s:ae27ba22c7 -->
在 `text dev` 中，區段設定仍然生效，但不會儲存任何內容，因此每次請求都會執行處理常式。

<!-- s:64841df645 -->
資料快取

<!-- s:2187e2262b -->
使用 `@textjs/app/cache` 的 `unstable_cache` 快取任何非同步函式：

<!-- s:4c26e099ff -->
快取鍵由鍵的組成部分加上引數組成，依值編碼（`undefined` 與 `null`、`Map`、`Set`、`Date` 和 `URL` 引數各自保持區別）。未提供鍵的組成部分時，會以函式的原始碼與建立位置識別函式；只要函式透過閉包擷取值，就應傳入鍵的組成部分，例如為每次請求建立函式或在迴圈中建立函式時。結果會以 JSON 序列化，因此每次呼叫都會回傳新的副本（而 `Date` 物件會以字串回傳）；無法序列化的結果會擲回錯誤。`cache(fn, { key, tags, revalidate })` 透過選項物件接受相同設定。

<!-- s:608eee0e9b -->
在快取的路由處理常式中，資料項目會將標籤與最短的 `revalidate` 傳遞給路由：重新驗證 `"posts"` 也會更新 `/api/posts`。帶有 `revalidate: 0` 的資料呼叫會使路由變為動態。

<!-- s:5537f337ee -->
重新驗證期間提供過期資料

<!-- s:7d23e84252 -->
當項目的存留時間超過 `revalidate` 時：

<!-- s:d4dd1966dd -->
1. 下一個請求會立即收到過期值（`STALE`）。
2. 背景執行一次更新；並行請求共用這次更新。
3. 如果更新擲回錯誤，會繼續提供過期值並記錄錯誤。

<!-- s:e6db7819cc -->
在 Vercel 和 Cloudflare 上，背景更新會透過 `waitUntil()` 註冊。超過一年的項目一律在前景重新計算。

<!-- s:5854b096d2 -->
依需求重新驗證

<!-- s:686aa7f2f3 -->
| 呼叫 | 失效範圍 |
| :-- | :-- |
| `revalidateTag("posts")` | 所有標記為 `posts` 的項目；下一個請求會重新計算 |
| `revalidateTag("posts", "max")` | 標記為過期；下一個請求會在更新期間收到過期值 |
| `revalidatePath("/api/feed")` | 該路徑 |
| `revalidatePath("/api/posts/[id]")` | 動態路由的每個路徑 |
| `revalidatePath("/api", "layout")` | `/api` 底下的所有內容 |

<!-- s:b132bd50eb -->
兩者都會回傳 Promise。使用記憶體儲存區時會立即失效；若[自訂儲存區](#custom-cache-stores) 為非同步，請使用 `await` 等待完成。

<!-- s:2aab4b4d00 -->
自訂快取儲存區

<!-- s:7bee24a364 -->
預設儲存區是每個伺服器執行個體各自的記憶體 LRU（1000 個項目，約 50 MB）。若要跨執行個體共用快取，請將 `cacheHandler` 指向預設匯出 `CacheStore` 的模組：

<!-- s:593c57fca5 -->
項目採用純 JSON 格式。也可以使用 `setCacheStore(store)` 在執行階段安裝儲存區。

<!-- s:fe2404de51 -->
平台注意事項

<!-- s:5418a08901 -->
- 每個無伺服器執行個體（Vercel functions、Cloudflare isolates）都有自己的記憶體內快取。`Cache-Control: s-maxage` 也能讓平台 CDN 快取回應；隨需重新驗證不會清除 CDN 快取。當 `revalidateTag` 必須涵蓋每個執行個體時，請使用共用的 `cacheHandler`。
- Cloudflare 需要啟用 `nodejs_compat` 旗標（快取使用 `AsyncLocalStorage`）。請參閱[部署](/docs/deploying)。
