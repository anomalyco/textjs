<!-- s:c351b288ae -->
`text mcp` 在處理程序內以無介面模式執行你的 `app/` 目錄，並透過 [Model Context Protocol](https://modelcontextprotocol.io) 提供服務，讓程式開發代理程式不必使用 DevTools 就能操作。代理程式可以導覽、按鍵、以純文字讀取影格，以及呼叫路由處理常式。

<!-- s:c66b3eaae7 -->
`text mcp` 需要 Bun。若以 Node 啟動，且 `PATH` 中有 `bun`，就會改用 Bun 重新執行，否則會失敗並回報 `TX019`。MCP 用戶端會替你啟動，因此很少需要手動執行。

<!-- s:0ecddf15e1 -->
設定

<!-- s:91bda9ef42 -->
每個用戶端都會從你的專案目錄啟動 `text mcp`。使用 `bunx --bun`，讓路由檔案以 TypeScript 執行。

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
或將設定提交到版本控制，供團隊使用：

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
若專案位於子目錄，請附加路徑：`["--bun", "text", "mcp", "apps/console"]`。

<!-- s:0b27734b46 -->
工具

<!-- s:93ae76f73d -->
| 工具 | 說明 |
| :-- | :-- |
| `list_routes` | `app/` 中的頁面與路由處理常式，以及目前位置 |
| `navigate` | 推入或取代路徑，或執行 `back` / `forward` |
| `read_frame` | 純文字影格，含路由、尺寸、焦點與游標。`styles: true` 會為每個 span 加入顏色與屬性 |
| `press` | 按鍵組合：`"down"`、`"ctrl+k"`、`"shift+tab"`、`"tab tab enter"`、`"down*3"` |
| `type` | 逐字元按鍵輸入文字（最多 2000 個字元；更多請用 `paste`）。`submit: true` 會在輸入後按下 Enter |
| `paste` | 單次貼上事件，如 `⌘V` |
| `scroll` | 以滑鼠滾輪捲動 `rows`（及 `cols`）。`<ScrollBox>` 不需取得鍵盤焦點就能用滾輪捲動 |
| `resize` | 設定網格的欄數與列數 |
| `inspect_tree` | 元件樹及其畫面邊界，以及所有可聚焦的 id |
| `find` | 每個符合項目的邊界，以及其下方的元件 |
| `wait_for` | 等待文字出現或消失，或應用程式進入閒置狀態 |
| `logs` | 擷取的 `console.*` 輸出與 React 錯誤 |
| `fetch` | 在處理程序內呼叫 `route.ts` 處理常式。內文最多讀取 `maxBytes`；事件串流讀取 `streamMs` 後取消 |
| `reload` | 編輯檔案後重新匯入應用程式 |

<!-- s:526235e5c5 -->
輸入工具會回傳新的影格，因此代理程式不需要在每次按鍵後另外呼叫 `read_frame`。目前影格與路由清單也可透過 `text://frame` 和 `text://routes` 資源取得。

<!-- s:c30236f97d -->
典型的互動流程：

<!-- s:45e18bfa25 -->
影格與閒置狀態

<!-- s:f2e8fe0f06 -->
任何工具讀取影格前，都會等待應用程式進入閒置狀態：沒有排程中的影格、沒有進行中的 `fetch`，且已連續 50 ms 沒有提交或影格。因此代理程式看到的是輸入後的結果，而非更新到一半的影格。

<!-- s:fbad6f5c1a -->
`<Spinner>` 或每秒更新一次的圖表，在兩次更新之間仍視為閒置，因此有動畫的頁面也能保持可讀。渲染間隔短於 50 ms 的應用程式永遠不會進入閒置狀態。讀取會在 1.5 秒後停止等待（可用 `settleMs` 調整），輸出最新影格並標記為 `busy`。未指定文字的 `wait_for` 會依自身的 `quietMs` 等待閒置，若始終未進入閒置狀態，就會回傳錯誤。

<!-- s:c5250c2f7a -->
座標以從零起算的儲存格表示：`x` 是欄，`y` 是列。CJK 字元與 emoji 等寬字元會占用兩欄。

<!-- s:7ff82431c5 -->
錯誤與記錄

<!-- s:6e07cf8702 -->
stdout 用於傳輸協定。應用程式的 `console.*` 輸出、額外的 `process.stdout.write` 呼叫和 React 錯誤都會改送到 `logs`，並附上編號，讓代理程式能用 `since` 只要求新的項目。若上次讀取後有錯誤記錄，下一個影格的標頭會註明。

<!-- s:9102068439 -->
失敗會以工具錯誤回傳，不會造成當機。逾時的工具會在下一次呼叫執行前取消，因此緩慢的呼叫不會在下一次呼叫的影格中輸入。帶有 Text.js 代碼的錯誤會保留代碼，例如未知按鍵的 `TX007`。若應用程式載入失敗，每個工具都會說明原因。修正檔案後呼叫 `reload`。

<!-- s:d3ad6f781e -->
選項

<!-- s:c9c30c0da4 -->
| 選項 | 說明 |
| :-- | :-- |
| `--path <pathname>` | 初始路由（預設為 `/`） |
| `--cols` / `--rows` | 網格大小（預設使用 `text.config.ts` 中的 `viewport`，未設定時為 100×32） |
| `--theme <name>` | 主題預設集 |
| `--no-config` | 忽略 `text.config.ts` |
| `--verbose` | 同時將擷取的記錄寫入 stderr |

<!-- s:5ae438610c -->
運作方式

<!-- s:7c71219a13 -->
`text mcp` 以與 [`text run`](/docs/terminal) 相同的方式執行應用程式：預先匯入所有路由模組，App Router 使用記憶體中的歷史記錄，同源的 `fetch("/api/…")` 呼叫則在處理程序內執行處理常式。影格會送到離屏的儲存格網格，而非終端機。伺服器端渲染的頁面（`export const runtime = "server"`）及其 `async function` 元件會如同在 `text dev` 中一樣，於處理程序內渲染，並在完成後讀取影格。

<!-- s:c965dcc0e4 -->
`reload` 會卸載應用程式，從 Bun 的模組快取中清除所有專案模組（包括 `app/` 之外的檔案），再次掃描 `app/`，並在目前位置重新掛載。

<!-- s:19d6f0da69 -->
若要將伺服器嵌入自己的處理程序，或使用其他傳輸方式：

<!-- s:68c8d3995f -->
限制

<!-- s:910af21777 -->
- 應用程式在 Bun 中執行，不在瀏覽器中執行。`window` 和 `document` 如同在 `text run` 中一樣未定義。
- 每個伺服器執行一個應用程式，使用一個網格。每個 MCP 用戶端都會啟動自己的伺服器。
- `text mcp` 會執行自己的無介面應用程式副本。無法連接到以 `text dev` 開啟的瀏覽器分頁。
