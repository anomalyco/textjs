<!-- s:e9f791b208 -->
`text run` 在終端機中渲染 App Router 應用程式。版面配置、元件、按鍵對應與路由處理常式皆與瀏覽器共用。輸出採用全彩 ANSI，而非 `%c` span。

<!-- s:7d8aa376e3 -->
按 `Ctrl+C` 結束。`text run` 需要 Bun。

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` 匯入 `app/` 中的每個檔案，使用記憶體內的歷程記錄掛載 App Router，並以全螢幕繪製。`<Link>`、`useRouter()`、`notFound()` 和 `redirect()` 不需修改即可運作。

<!-- s:75b65c161d -->
同源的 `fetch("/api/...")` 呼叫會在同一處理程序內執行你的 `route.ts` 處理常式，行為與 `text dev` 提供服務時完全相同。其他網址則透過網路存取。

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
用於單一元件或你自己的 CLI：

<!-- s:e62e62bfaa -->
`useApp().exit()` 會卸載並還原終端機。

<!-- s:082b75dda7 -->
| 選項 | 說明 |
| :-- | :-- |
| `stdin` / `stdout` | 預設為 `process.stdin` / `process.stdout` |
| `cols` / `rows` | 固定尺寸（預設：隨終端機調整） |
| `altScreen` | 結束時還原捲動記錄（預設為 `true`） |
| `mouse` | 滾輪捲動（預設為 `true`） |
| `exitOnCtrlC` | 預設為 `true` |
| `fps` | 影格率上限（預設為 `60`） |
| `patchConsole` | 暫存 `console.*` 輸出直到結束（預設為 `true`） |
| `theme` / `transparent` | 與 `createConsoleRoot` 相同 |

<!-- s:e34e364b9c -->
輸出

<!-- s:2ac174afda -->
每個影格都會逐列比對差異。只寫入有變更的列，並以同步輸出標記包住，讓支援這些標記的終端機不會顯示繪製到一半的影格。閒置的應用程式不會寫入任何內容。

<!-- s:99a3c4d459 -->
輸入

<!-- s:4a9817d820 -->
原始模式的 stdin 會解析為與瀏覽器產生的相同事件：搭配修飾鍵的方向鍵和功能鍵、`Alt` 組合鍵、括號貼上、SGR 滑鼠滾輪及 kitty 鍵盤協定。若你需要在其他地方使用，套件也匯出了 `TerminalInputParser` 和 `parseTerminalInput`。

<!-- s:6b688e229b -->
差異

<!-- s:56ed51fed3 -->
| 功能 | DevTools | 終端機 |
| :-- | :-- | :-- |
| 影格節奏 | 約 15 fps | 最高為 `fps` |
| 網格大小 | 停駐的主控台 | 終端機視窗 |
| `<Image src>` | 透過 canvas 載入 | 使用 `pixels` |
| `console.log` | 你的影格 | 暫存直到結束 |
