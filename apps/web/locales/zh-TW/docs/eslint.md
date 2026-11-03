<!-- s:df706c7a4d -->
`eslint-plugin-textjs` 會在編輯器中找出 Text.js 錯誤：主控台元件中的 DOM 標籤、文字中的方塊、Menlo 不支援的字形、多餘的 `console.log` 呼叫，以及遭到無聲忽略的 App Router 匯出。

<!-- s:0ecddf15e1 -->
設定

<!-- s:5d60a92733 -->
此外掛支援採用扁平設定的 ESLint 9 和 10。規則以語法為依據，不需要型別資訊或 `parserOptions.project`。任何能解析 TypeScript 和 JSX 的剖析器都適用。

<!-- s:b69abcef52 -->
設定組合

<!-- s:9cfe4adde3 -->
| 設定組合 | 啟用項目 |
| :-- | :-- |
| `textjs.configs.recommended` | 所有正確性規則設為錯誤；主控台、計時器和影格節奏規則設為警告 |
| `textjs.configs.strict` | 所有規則設為錯誤，另將 `prefer-use-keymap` 設為警告 |

<!-- s:6c9781312c -->
也可以個別選用規則：

<!-- s:ec6eb92cf0 -->
主控台檔案

<!-- s:04573fe453 -->
大多數規則只適用於渲染至主控台的檔案：也就是從 `@textjs/app` 或 `@textjs/react` 匯入元件或 Hook（`Box`、`Text`、`useInput` 等）的檔案。匯入 `react-dom` 或 `@textjs/react/dom` 的檔案屬於網頁程式碼，不會受到檢查，因此網站可以在同一個專案中混用 DOM 頁面和主控台應用程式。匯入 `tokenize` 或 `parseMarkdown` 之類的工具函式，不會讓檔案成為主控台檔案。

<!-- s:96e9c86b58 -->
App Router 規則依據任何 `app/` 目錄中的檔名（`page.tsx`、`layout.tsx`、`route.ts` 等）判斷，也包括 `src/app/`。如果你的目錄使用其他名稱，請將 `{ appDir: "routes" }` 傳給 `valid-route-module`、`valid-metadata` 和 `route-handler-exports`。

<!-- s:b66542635d -->
規則

<!-- s:c1b57ad8e2 -->
| 規則 | 建議設定 | 修正 |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | 錯誤 | 建議修正 |
| [`no-box-in-text`](#no-box-in-text) | 錯誤 | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | 錯誤 | 自動修正、建議修正 |
| [`no-console-in-components`](#no-console-in-components) | 警告 | 建議修正 |
| [`prefer-use-interval`](#prefer-use-interval) | 警告 | 建議修正 |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | 警告 | |
| [`prefer-use-keymap`](#prefer-use-keymap) | 僅限嚴格設定 | |
| [`valid-route-module`](#valid-route-module) | 錯誤 | |
| [`valid-metadata`](#valid-metadata) | 錯誤 | |
| [`route-handler-exports`](#route-handler-exports) | 錯誤 | 建議修正 |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
主控台中不存在 `<div>`、`<span>`、自訂元素及其他 DOM 標籤。協調器只辨識自己的宿主節點，遇到其他節點就會拋出 `TX003`。

<!-- s:bd7c3e0318 -->
建議修正會將標籤替換成最接近的元件（`div` → `Box`、`span`/`p` → `Text`、`strong` → `Text bold`、`a` → `Link`、`input` → `Input`、`hr` → `Divider` 等），並加入匯入陳述式。

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` 是一連串帶有樣式的 span，不能包含方塊。巢狀放入 `<Box>` 或任何以方塊為根節點的元件（`<ScrollBox>`、`<Input>`、`<Code>`、`<ProgressBar>`、`<Divider>` 等），會在渲染時拋出 `TX004`。這條規則會提前在編輯器中找出問題，包括 `&&`、三元運算式、Fragment 和 `.map()` 內的情況。

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js 將每個字元排列在固定的儲存格網格中。macOS 上的 DevTools 主控台字型 Menlo 若不支援某個字形，就會改用比儲存格更寬的後備字型渲染，導致後方所有儲存格偏移。

<!-- s:a58a59c2f8 -->
- **點字**（U+2800–U+28FF，經典終端機旋轉指示器影格）：使用區塊或象限字元（`▘▝▗▖`）、`<Spinner variant="dots">`，或在圖表上設定 `marker="quadrant"`。只在終端機中透過 `text run` 執行的應用程式，可設定 `{ allowBraille: true }`。
- **雜項符號和箭頭**（U+2B00–U+2BFF，例如小方塊 U+2B1D）：建議修正會提供 Menlo 中的對應字元（`·`、`●`、`←`）。
- **單一儲存格符號的 Emoji 呈現**（`▶` 或 `↩` 後接 U+FE0F）：變體選擇符會將符號變成佔兩個儲存格的 emoji，但網格只預留一格。自動修正會移除變體選擇符。

<!-- s:8c0c49dfb7 -->
寬版 emoji（`🚀`、`✅`）沒有問題：Text.js 會將其計為兩個儲存格。

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
每個影格都是一次 `console.log`。你自己的記錄會插在影格之間，下一個影格會將記錄捲走，並隱藏在固定於底部的檢視之外。`console.clear()` 會清除應用程式本身。

<!-- s:0011d5dcff -->
使用 `useToast()` 或記錄用的 `<ScrollBox>` 在 UI 中顯示訊息，或在 `[▼]` 開發覆蓋面板（`` Ctrl+` ``）中檢查狀態。設定 `logger` 後，建議修正會將 `console.warn(…)` 改寫為 `log.warn(…)`。測試檔案和 `@textjs/app/testing` 的渲染會略過檢查。

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
在元件中直接使用 `setInterval`，需要 effect、清理函式和 ref，才能避免使用過期的狀態。`useInterval` 會處理這三項工作，傳入 `null` 即可停止。

<!-- s:894ec09a45 -->
製作動畫時，`useAnimationFrame` 會配合渲染器的影格節奏，並在輸出暫停時停止。請參閱[工具 Hook](/docs/utility-hooks)。

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js 每 66 ms 最多輸出一個影格（約 15 fps）。16 ms 的間隔會在每次輸出影格前渲染四次；多餘的影格會合併，只會消耗 CPU。這條規則會回報延遲低於 `minInterval`（預設為 `66`）的 `setInterval`/`useInterval`，以及 `fps` 高於 15 的 `useAnimationFrame`。

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
手動比較 `e.key` 可行，但使用者看不到這些快速鍵。`useKeymap` 會將帶有標籤的按鍵繫結放入 `<KeyHelp>`、`<KeyHints>`（具有 `hint: true` 的繫結）和命令選單，處理 `g g` 之類的按鍵序列，並阻止相符按鍵的事件繼續傳播。這條規則會回報比較兩個以上按鍵字面值（`minKeys`）的 `useInput` 處理常式，並略過讀取 `e.input` 以處理文字輸入的處理常式。

<!-- s:05d39412dc -->
請參閱[鍵盤快速鍵](/docs/keyboard)。

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- `page`、`layout`、`loading`、`error` 和 `not-found` 檔案必須以預設匯出提供元件（`TX015`）。
- `export const dynamic` 必須是 `"auto"`、`"force-static"` 或 `"force-dynamic"`（`TX031`）。Text.js 不支援 Next.js 的 `"error"`。此設定會從頁面、版面配置和路由處理常式讀取。在頁面和版面配置中，請寫成純字串字面值：`text build` 會直接從原始碼讀取，不會執行模組。

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata 會先從版面配置合併，再合併頁面（或 `not-found`）的內容。這條規則會回報路由器原本會無聲忽略的項目：

<!-- s:fe9ebcbc0c -->
- `loading` 或 `error` 檔案中的 `metadata` 或 `generateMetadata`
- 同一個檔案中的兩種匯出
- `async generateMetadata`：呼叫採同步方式，因此 Promise 無法設定標題
- 不是字串或 `{ default, template?, absolute? }` 的 `title`，或拼錯的鍵名
- 缺少 `%s` 的 `title.template`，或位於頁面中而不會生效的 `title.template`
- 非字串的 `description`

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
`route.ts` 檔案只回應其匯出的 HTTP 方法：`GET`、`HEAD`、`POST`、`PUT`、`PATCH`、`DELETE` 和 `OPTIONS`。小寫的 `get` 或 `Post` 永遠不會被呼叫（請求會收到 `405`）；修正建議會將其重新命名。預設匯出、非函式的處理常式及其他匯出都會被回報，但 `dynamic` 和 `revalidate` [路由區段設定](/docs/caching) 除外。將共用程式碼移至 `lib/`，或使用 `{ allow: [...] }` 列出額外允許的名稱。
