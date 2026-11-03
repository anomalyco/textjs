<!-- s:8f3fd7167d -->
Text.js 的 VS Code 擴充功能會在程式碼旁顯示主控台影格。它會鏡像顯示透過 `text dev` 執行的應用程式，或在沒有應用程式執行時，自行渲染開啟的檔案。它也提供 App Router 骨架產生功能、程式碼片段，以及 `TX###` 錯誤代碼的連結。

<!-- s:98304b8243 -->
安裝

<!-- s:80e247d2f7 -->
從 Visual Studio Marketplace 安裝 [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs)。在 VS Code 中開啟「延伸模組」檢視（`⌘⇧X`），搜尋 `textjs.vscode-textjs`，或執行：

<!-- s:fd2344ec36 -->
只要資料夾包含 Text.js 應用程式，擴充功能就會啟用：其中須有 `text.config.ts`，或有依賴 `@textjs/app` 且含有 `app/` 目錄的套件。含有多個應用程式的 monorepo 也能使用。

<!-- s:74f1530aa8 -->
即時預覽

<!-- s:d9807ea49d -->
開啟 `page.tsx`、`layout.tsx` 或元件，執行 **Text.js: Open Preview**（`⌘K V`），或點擊編輯器標題列的預覽按鈕。面板會使用與瀏覽器主控台相同的 DevTools 介面外框及 Menlo 儲存格繪製影格。

<!-- s:2f69f76b80 -->
預覽會從兩種來源之一取得影格。工具列的標章會顯示目前使用的來源：

<!-- s:f81cef21bf -->
| 來源 | 使用時機 | 顯示內容 |
| :-- | :-- | :-- |
| **即時** | `text dev` 正在執行，且瀏覽器分頁已開啟應用程式 | 實際的應用程式，包含其狀態、資料及網格大小 |
| **無介面** | 沒有開發伺服器，或沒有開啟的分頁 | 開啟的檔案，由擴充功能依面板大小渲染 |

<!-- s:f40888c2bb -->
`auto`（預設值）會在可用時使用即時模式，否則使用無介面模式。透過標章或 `textjs.preview.mode` 可固定使用其中一種。

<!-- s:fd587df6f1 -->
鍵盤

<!-- s:9ce66a1aa7 -->
點擊主控台即可向應用程式傳送按鍵：方向鍵、`Tab`、快速鍵、輸入及貼上都能使用，與瀏覽器中的操作相同。點擊主控台外部即可停止。`⌘P` 和 `⌘⇧P` 等編輯器快速鍵仍會傳給 VS Code。在主控台上捲動會傳送滾輪事件。

<!-- s:0910b5fd48 -->
你可以在網址欄位輸入路由，例如 `/deployments/dpl_a1`，在任一來源中導覽。

<!-- s:4507d73bb4 -->
即時模式

<!-- s:787b87d328 -->
預覽開啟時，開發伺服器會要求已連線的分頁串流傳送影格。分頁只會傳送有變更的列，並在預覽關閉時停止傳送，因此未開啟預覽的應用程式不會產生任何額外負擔。儲存檔案會觸發 Fast Refresh，預覽也會隨分頁更新。

<!-- s:86ae14b746 -->
開啟 **跟隨**（`textjs.preview.followEditor`），讓瀏覽器分頁移至你正在編輯的 `page.tsx` 所對應的路由。

<!-- s:68839106d6 -->
背景分頁不會收到動畫影格，因此通常會維持原有影格，直到再次顯示。預覽正在監看時，背景分頁一收到輸入就會繪製影格，因此在預覽中輸入仍會更新畫面。背景分頁的動畫約每秒更新一次。將應用程式放在獨立視窗中，可讓動畫保持流暢。

<!-- s:1ae6e7077f -->
無介面模式

<!-- s:1cddf967be -->
擴充功能會在你的專案中啟動小型執行器。它透過專案本身的 Vite 和 `@textjs/app` 載入路由檔案，因此別名、TypeScript 和 JSX 的行為都與 `text dev` 相同。它會使用記憶體內的瀏覽紀錄，在開啟檔案的路由掛載 App Router 及其版面配置：

<!-- s:23d9451fef -->
| 檔案 | 預覽 |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id`（動態區段使用自身名稱） |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | 預設匯出，或第一個 PascalCase 匯出，不帶 props |

<!-- s:f111cbfc61 -->
同源的 `fetch("/api/...")` 呼叫會在同一處理程序內執行你的 `route.ts` 處理常式，與 [`text run`](/docs/terminal) 相同。網格會隨面板大小調整，儲存應用程式中的任何檔案都會重新渲染。錯誤會顯示在影格上方，並附上對應 `TX###` 頁面的連結。

<!-- s:36cd3f2bb4 -->
命令

<!-- s:d542a683ff -->
| 命令 | 說明 |
| :-- | :-- |
| Text.js: Start Dev Server | 在終端機執行你的 `dev` 指令碼（或 `text dev`） |
| Text.js: Stop Dev Server | 停止從 VS Code 啟動的開發伺服器 |
| Text.js: Open Preview | 開啟目前檔案的即時預覽 |
| Text.js: Open in Browser Console | 在開發伺服器上開啟目前路由。接著[開啟瀏覽器主控台](/docs/installation#open-the-console) |
| Text.js: New Page | 含有中繼資料及具型別 `params` 的 `app/<route>/page.tsx` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | 含有 `GET` 和 `POST` 的 `app/<route>/route.ts` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`、`error.tsx`、`not-found.tsx` |

<!-- s:87b5f49afb -->
骨架產生命令也可在檔案總管的資料夾快顯功能表中找到。這些命令接受 `settings`、`blog/[slug]`、`docs/[...path]` 和 `(marketing)/about` 等 [App Router](/docs/routing) 區段，並拒絕將 `page` 和 `route.ts` 放在同一區段。JavaScript 專案（沒有 `tsconfig.json`）會產生 `.jsx` 和 `.js` 檔案。

<!-- s:9ba0c1b237 -->
程式碼片段

<!-- s:193db2a68e -->
| 前綴 | 插入內容 |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | 以所在資料夾命名的路由檔案 |
| `txc` | 以檔案命名的主控台元件 |
| `txroute`, `txroutep` | 帶有或不帶參數的路由處理常式 |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | 元件 |
| `input`, `select`, `tabs` | 互動元件 |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hook |
| `metadata`, `txconfig` | 路由中繼資料與 `text.config.ts` |

<!-- s:a6e574a6aa -->
錯誤代碼

<!-- s:5e9e2a4649 -->
將游標停留在任何位置的 `TX###` 代碼上：原始碼、記錄、「輸出」面板或貼上的堆疊追蹤皆可。懸停提示會顯示標題、訊息及套件，並附上 textjs.org 對應頁面的連結。每個代碼本身也是連結（按住 `⌘` 點擊）。

<!-- s:b67d013d7e -->
狀態列

<!-- s:be63ef7ae2 -->
`▼` 項目會顯示開發伺服器狀態及主控台網格大小，例如 `▼ :3000  120×36`。分頁大小每次變更時，都會回報給開發伺服器，即使沒有開啟預覽也一樣。點擊此項目可存取主要命令。

<!-- s:5b827aed4d -->
設定

<!-- s:457ec968c0 -->
| 設定 | 預設值 | 說明 |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`、`live` 或 `headless` |
| `textjs.preview.followEditor` | `false` | 即時模式：跟隨正在編輯的路由 |
| `textjs.preview.fontSize` | `12` | 儲存格字型大小（DevTools 使用 12） |
| `textjs.preview.runtime` | | 無介面預覽使用的 Node.js 二進位檔（預設：VS Code 隨附的版本） |
| `textjs.devServer.url` | | 開發伺服器網址（預設：在連接埠 3000～3010 上探索）。僅使用 `http://` 回送位址 |
| `textjs.devServer.command` | | Start Dev Server 使用的命令 |

<!-- s:ea5e740ef1 -->
工作區信任

<!-- s:ddcdd0b053 -->
預覽和開發伺服器會執行專案的程式碼（Vite 設定、`text.config.*` 及元件）。在受限模式下，擴充功能只提供程式碼片段、骨架產生功能及錯誤連結，並忽略工作區設定中的 `textjs.preview.runtime`、`textjs.devServer.command` 和 `textjs.devServer.url`。信任工作區即可啟用預覽。工作區資料夾以外的檔案一律不會預覽。

<!-- s:5ae438610c -->
運作方式

<!-- s:857bac4692 -->
`text dev` 為編輯器提供三個端點。這些端點只回應以回送主機（`localhost`、`127.0.0.1`、`[::1]`）為目標的回送連線，且請求必須沒有 `Origin`，或來源與開發伺服器本身相同。瀏覽器的跨網站及 `no-cors` 請求都會遭到拒絕：

<!-- s:2345c81baf -->
| 端點 | |
| :-- | :-- |
| `GET /__textjs/status` | 專案根目錄、已連線的分頁、網格大小及目前路由 |
| `GET /__textjs/frames` | 伺服器傳送事件：每次變更傳送一個 `frame` 事件，以列差異編碼 |
| `POST /__textjs/input` | 傳給分頁的按鍵、貼上、IME 或死鍵文字（`text`）、滾輪或導覽。需要 JSON 及 `x-textjs-mirror: 1` 標頭，因此其他網站無法傳送按鍵輸入 |

<!-- s:6693972af6 -->
分頁透過 Vite 的 HMR 通訊端將影格傳送至開發伺服器，此通訊端需要各伺服器專屬的權杖。如果你想建構自己的檢視器，可使用 `@textjs/app/frame-protocol` 匯出的傳輸格式（`FrameEncoder`、`FrameDecoder`、`parseInputMessage`）。`text build` 的輸出不包含上述任何功能。
