<!-- s:7e7d3cb07e -->
`text build --embed` 會建置應用程式，讓其他網站透過一個 script 標籤加入，例如行銷頁面、文件網站、WordPress 或 Webflow 頁面，或 React 18 應用程式。開啟 DevTools 的訪客會在主控台看到你的應用程式。其他訪客只會下載 `embed.js`（gzip 壓縮後約 3 kB），除非頁面有 `<text-console>`。

<!-- s:2aa1d07d89 -->
嵌入功能仍在實驗階段。`text build --embed`、`embed` 選項、`<text-console>` 和 `@textjs/app/experimental` 的匯出項目可能在次要版本中變更。請參閱[重大變更](/docs/support-policy#breaking-changes)。

<!-- s:6d2aa784de -->
將應用程式加入網站

<!-- s:f296ccaeef -->
建置應用程式：

<!-- s:2198c52791 -->
將 `dist/` 上傳至任何靜態託管服務或 CDN，或複製到網站的 `public/` 資料夾，然後在網站頁面加入一個標籤：

<!-- s:aa94ef1985 -->
`embed.js` 會以自身網址為基準載入其他檔案，因此 `dist/` 可放在任何路徑或來源。裡面只有 `embed.js` 和 `assets/`，沒有可能取代網站原有檔案的 `index.html` 或 `404.html`。具備[伺服器端渲染的路由](#server-rendered-routes)、路由處理常式或中介軟體的應用程式需要伺服器，不能只上傳靜態檔案。`vercel` 和 `cloudflare` 轉接器會執行路由處理常式與中介軟體，而伺服器端渲染的路由需要 `text start` 或 `bun` 轉接器。

<!-- s:5c139759a2 -->
若要向訪客顯示應用程式的位置，請在頁面任意位置加入 [`<text-console>`](#text-console)。按下任何帶有 `data-textjs-engage` 的元素也會啟動應用程式：

<!-- s:6a70ec16e1 -->
若要在本機試用，請執行 `text dev --embed`。它會提供 `/embed.js`，每次請求都產生新的第一個影格，並在 `/` 提供預覽頁面（使用 `standalone` 時為 `/__textjs/embed`），以其他網站的方式載入它。使用其他本機連接埠的網站也能載入 `http://localhost:3000/embed.js`。

<!-- s:37f210b46a -->
設定

<!-- s:aa9630bf92 -->
`text build --embed` 等同於在 `text.config.ts` 中設定 `embed: true`。傳入物件即可變更預設值：

<!-- s:fbe8efc9f4 -->
| 選項 | 預設值 | 說明 |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | 主控台開啟時的路由。必須以 `/` 開頭 |
| `globalName` | `"text"` | 應用程式啟動後，用來安裝主控台 API 的全域名稱。設為 `false` 則不安裝 |
| `initialClear` | `false` | 在第一個影格前清除頁面的主控台。預設會將頁面先前記錄的內容保留在應用程式上方 |
| `standalone` | `false` | 同時建置應用程式本身的頁面（`index.html`），與不使用 `embed` 的 `text build` 相同 |
| `allowOrigins` | `[]` | 頁面可執行此伺服器所提供之伺服器端渲染路由的網站。請參閱[伺服器端渲染的路由](#server-rendered-routes) |
| `credentials` | `false` | 隨 `allowOrigins` 來源的即時工作階段請求傳送此伺服器的瀏覽器憑證，不捨棄 Cookie 和 `Authorization`。需要指定確切來源 |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height`（預設為 120 × 36）是第一個影格的尺寸。`title`、`hints` 和 `action` 是 `<text-console>` 的預設值。設定 `ppr: false`，或 `middleware.ts` 可能符合 `initialPath` 時，`embed.js` 不會包含預先渲染的第一個影格，因為任何人都能下載 `embed.js`。鏡像會保持空白，直到應用程式繪製。

<!-- s:7ca27066c7 -->
運作方式

<!-- s:1fe89ec57c -->
- **在[主控台使用意圖](/docs/hooks-and-repl#loading-on-console-intent-experimental)出現前，不會載入其他內容。**`embed.js` 會記錄預先渲染的第一個影格，然後等待。當 DevTools 停駐在視窗內（載入時或之後）、訪客在頁面按下 DevTools 快速鍵（F12、Ctrl+Shift+J、I、C 或 K，Mac 上則為 ⌘⌥J、I、C 或 K），或按下 `<text-console>` 或 `[data-textjs-engage]` 元素時，應用程式才會載入。之後在同一分頁重新載入時，應用程式會立即啟動。獨立視窗中的 DevTools 不會改變頁面尺寸，因此從選單開啟 DevTools 的訪客會一直看到第一個影格，直到按下上述任一元素。
- **在觸控螢幕上，應用程式不會啟動。**在符合 `(hover: none) and (pointer: coarse)` 的裝置上，`embed.js` 不會記錄任何內容，也不會加入監聽器。唯一載入的是用於鏡像的 `<text-console>` 檔案。
- **只有訪客開始操作後，按鍵才會傳送至應用程式。**訪客可按下 `<text-console>` 或 `[data-textjs-engage]` 元素，或點擊頁面（不是連結、按鈕或欄位），將焦點從 DevTools 移回來。在頁面本身的欄位或 `[data-textjs-bypass]` 元素中輸入的內容絕不會傳送至應用程式，而滾輪一律捲動頁面。
- **頁面的網址、歷史記錄與標題絕不改變。**路由、`<Link>` 和 `useRouter()` 會在主控台內導覽。在用戶端渲染的應用程式中，絕對網址會在新分頁開啟。
- **頁面上的 Text.js 應用程式具有優先權。**它啟動時，執行中的嵌入應用程式會卸載、停止讀取按鍵，並移除其全域物件。若另一個應用程式占用主控台時載入嵌入應用程式，後者會記錄一則警告，且不會啟動。
- **嵌入應用程式內含自己的 React 19。**它不含 `react-dom` 或裸匯入，因此頁面的 React 版本、`react` 的匯入對應表和 React DevTools 都不會影響它。

<!-- s:5bd6dcbe49 -->
各檔案的載入時機

<!-- s:631a37c837 -->
| 檔案 | 載入時機 | gzip |
| :-- | :-- | --: |
| `embed.js` | 隨頁面載入 | 2.9 kB |
| `assets/text-console-[hash].js` | 頁面有 `<text-console>` 時 | 4.0 kB |
| `assets/embed-client-[hash].js` 和 `assets/yoga-[hash].wasm` | 出現主控台使用意圖時 | 112.8 kB + 29.0 kB |
| `assets/embed-player-[hash].js` | 出現主控台使用意圖時，針對[伺服器端渲染的路由](#server-rendered-routes)載入，取代用戶端 | 22.7 kB |
| `assets/bidi-[hash].js` | 應用程式首次顯示從右至左的文字時（請參閱[載入 bidi 引擎](/docs/internationalization#loading-the-bidi-engine)） | 10.1 kB |

<!-- s:d86aa9b2e1 -->
這些大小以 120 × 36 的有框線狀態方塊為準。`text build --embed` 會輸出你的應用程式大小。`assets/embed-[hash].js` 是 `embed.js` 的副本，名稱固定不變（請參閱[部署](#deploys)）。

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` 會定義 `<text-console>`，且只在頁面上有此元素時載入其檔案。它使用 Shadow DOM，因此頁面的 CSS 不會影響內部，`style-src 'self'` 政策也無須變更。

<!-- s:9ceead3eca -->
沒有屬性時，它是一個單行工具列。它會先顯示瀏覽器開啟主控台的快速鍵，接著要求點擊，再列出應用程式的按鍵，按鍵傳送至應用程式時會亮起。在 Safari 中，第一步會要求在 Safari 設定中開啟「顯示網頁開發者功能」。

<!-- s:899e0c7fe3 -->
加上 `mirror` 後，它會在頁面顯示應用程式的影格：其他內容載入前顯示預先渲染的第一個影格，之後顯示執行中的應用程式。按下它會啟動應用程式，並傳送訪客的按鍵，因此關閉 DevTools 也能使用應用程式。`chrome` 會在鏡像周圍繪製 DevTools 視窗，並隱含啟用 `mirror`。

<!-- s:fefcb3e495 -->
| 屬性 | 說明 |
| :-- | :-- |
| `mirror` | 顯示應用程式的影格 |
| `chrome` | 在 DevTools 視窗中顯示影格 |
| `title` | 工具列的標題（預設為 `text.config.ts` 中的 `title`） |
| `hints` | 要列出的按鍵，格式為 `"← →:switch region, Enter:open"`（預設為 `text.config.ts` 中的 `hints`） |
| `action` | 首先要執行的動作，顯示為「點擊這裡並……」（預設為 `text.config.ts` 中的 `action`，或按下第一個提示按鍵） |

<!-- s:392012169b -->
在觸控螢幕上，鏡像會顯示第一個影格，但不啟動應用程式，工具列則會隱藏。元素的文字為英文。

<!-- s:13ff4ec1f4 -->
預留空間

<!-- s:0f4e2c234d -->
`text build --embed` 會為應用程式的格線輸出一行 CSS。將它貼到頁面的樣式表中。它會在元素檔案載入前設定 `<text-console>` 的尺寸，因此檔案載入時頁面內容不會移動。預設 120 × 36 格線所需的 CSS 如下：

<!-- s:a2d2741417 -->
工具列高度為 58 px。鏡像會維持格線的長寬比，最大寬度為其原始寬度（120 欄時為 885 px），而 `chrome` 會增加 43 px。尺寸不受字型影響。`@textjs/app/experimental` 的 `reserveCss(cols, rows)` 會回傳同一行 CSS。

<!-- s:a1260c10c3 -->
首屏中的鏡像通常是頁面最大的元素，因此會決定頁面的最大內容繪製（LCP）。`embed.js` 與元素檔案依序載入後，才會繪製第一個影格。頁面其餘部分的繪製方式與未嵌入時相同。位於頁面下方的鏡像不會影響 LCP。在有自身延遲執行指令碼的頁面上，例如 React 應用程式，`<script type="module" async src="…">` 會執行 `embed.js`，不等待那些指令碼，因此首屏中的鏡像會更早繪製。

<!-- s:4206a424a5 -->
樣式

<!-- s:834fbf40e6 -->
若要將鏡像置中，請將行內方向的邊界設為 auto：

<!-- s:6dde2b2766 -->
預設使用深色。設定 `color-scheme: light` 可使用淺色，或設定用來混合出其他所有色調的兩種顏色。`::part(frame)` 可設定影格本身的樣式。`chrome` 會保留 DevTools 本身的背景。

<!-- s:f5e077273b -->
伺服器端渲染的路由

<!-- s:eb293d9fb4 -->
當 `initialPath` 是帶有 `export const runtime = "server"` 的路由時，`embed.js` 會載入影格播放器，取代用戶端執行環境。它會從提供 `embed.js` 的伺服器串流傳送影格，因此請執行 `text start` 或 `bun` 轉接器。其他轉接器會導致建置失敗。請參閱[伺服器端渲染](/docs/server-rendering)。

<!-- s:e2bdd4dbb7 -->
其他網站的頁面只有在來源列於 `allowOrigins` 時，才能開啟即時工作階段：

<!-- s:6ec7048857 -->
- 工作階段只會回應開啟它的來源。
- 預設情況下，Text.js 會捨棄其他網站工作階段的 Cookie 和 `Authorization` 標頭，因此[中介軟體](/docs/middleware)會將訪客視為未登入。`credentials: true` 會保留這些資料，且需要指定確切來源。當頁面與伺服器共用可註冊網域（`www.example.com` 與 `console.example.com`），且 Cookie 涵蓋該伺服器（`Domain=example.com`，或在 `console.example.com` 設定）時，瀏覽器會傳送這些資料。來自其他網站時，只會傳送設有 `SameSite=None; Secure` 的 Cookie，而封鎖第三方 Cookie 的瀏覽器不會傳送任何 Cookie。
- 即時工作階段會在連線建立後立即向 `/__textjs/live` 傳送 `OPTIONS` 預檢請求，重新連線時也會傳送。預檢請求不含 Cookie 或 `Authorization`，因此符合該路徑的中介軟體必須允許 `OPTIONS` 請求在未登入時通過。
- 在反向代理或 CDN 後方執行時，請設定 `server.trustProxy`（請參閱[在代理伺服器後方執行](/docs/deploying#behind-a-proxy)）。若未設定，每位訪客都會使用代理伺服器的位址，因此所有訪客會共用同一個用戶端工作階段上限。

<!-- s:f739524722 -->
除非設定了 `credentials`，否則 `text dev` 不需要 `allowOrigins` 就能接受 `localhost`、`127.0.0.1` 和 `[::1]` 上任何連接埠的頁面。

<!-- s:d5df7bf60f -->
託管

<!-- s:4bef54c1c0 -->
`text start` 和 `bun`、`vercel`、`cloudflare` 轉接器會以這些標頭提供嵌入建置。`static` 轉接器會將它們寫入 `_headers`，供 Cloudflare Pages 和 Netlify 讀取。使用其他託管服務時，例如儲存空間或網站本身的 `public/` 資料夾，請自行設定：

<!-- s:be81a4c5ec -->
| 路徑 | 標頭 |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| 網站位於其他來源時，兩者皆需設定 | `Access-Control-Allow-Origin: *` 和 `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
瀏覽器會透過 CORS 擷取模組指令碼和 WebAssembly，因此其他來源的檔案需要 `Access-Control-Allow-Origin`。請以 `application/wasm` 提供壓縮過的 `yoga-[hash].wasm`（請參閱 [WebAssembly](/docs/deploying#webassembly)）。

<!-- s:1bb976fcdc -->
部署

<!-- s:01b888e293 -->
每次載入頁面時都會重新驗證 `embed.js`，因此新訪客會立即取得新部署。已載入前一版 `embed.js` 的分頁，在訪客開啟主控台時，仍會匯入前一次建置的檔案，即使已過了數小時。讓前一次部署的 `assets/` 保持在線上：將新檔案複製到舊檔案上，不要使用會刪除檔案的同步方式，並在一兩天後移除舊檔案。若要固定使用某次建置，將該次建置的 `assets/embed-[hash].js` 放入標籤中。該次建置的檔案也必須保持在線上。

<!-- s:b748b07652 -->
當檔案已移除時，`embed.js` 會記錄一則警告，請訪客重新載入，但不會自行啟動應用程式或重新載入頁面。

<!-- s:fce19037b3 -->
內容安全政策

<!-- s:de8e30a920 -->
`embed.js` 不需要行內指令碼或樣式。將以下項目加入宿主頁面的政策；若 `dist/` 與頁面同源，則以 `'self'` 取代來源：

<!-- s:2da4077ce0 -->
| 指令 | 值 | 用途 |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` 及其分塊 |
| `script-src` | `'wasm-unsafe-eval'` | 用戶端渲染應用程式中的 Yoga |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`，以及伺服器端渲染的路由使用的 `/__textjs/live` |
| `img-src` | `data:` | 僅用於應用程式會繪製 `<Image>` 或 `<Pixels>` 的 `<text-console mirror>` |

<!-- s:4ce5dcc4cb -->
自行載入應用程式

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` 匯出組成 `embed.js` 的各個部分，供頁面以自己的方式載入應用程式：

<!-- s:238cbf53ee -->
| 匯出項目 | 說明 |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | `embed.js` 執行的流程：記錄第一個影格，等待使用主控台的意圖，再呼叫 `boot` |
| `bootEmbedClient(options)` | 啟動用戶端渲染的應用程式，使用記憶體內路由，並依頁面互動狀態控制鍵盤輸入 |
| `bootEmbedPlayer(options)` | 啟動伺服器端渲染的路由的影格播放器 |
| `createHostInput(options)` | 遵循上述規則的鍵盤輸入 |
| `createTextConsoleMount(config)` | 回傳供 `<text-console>` 使用的 `mount(element, shell?)` 函式 |
| `reserveCss(cols, rows)` | 為 `<text-console>` 預留空間的 CSS |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` 和 `BYPASS_SELECTOR` 分別是啟動應用程式的元素與保留自身按鍵輸入的元素所用的選取器。
