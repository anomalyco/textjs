<!-- s:98c33b0a07 -->
系統需求

<!-- s:16d53f1055 -->
- [Bun](https://bun.sh) 1.2+ 或 Node.js 22+
- 桌面版 Chrome、Edge、Firefox 或 Safari

<!-- s:d7f4dad213 -->
建立應用程式

<!-- s:b32738e24d -->
選擇範本（`starter`、`dashboard` 或 `opencode`），然後啟動開發伺服器：

<!-- s:21fb743289 -->
開啟主控台

<!-- s:14e4fdc5be -->
前往 `http://localhost:3000` 並開啟主控台。

<!-- s:a370660339 -->
| 瀏覽器 | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome、Edge、Arc、Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | 僅限 macOS |

<!-- s:de7134a591 -->
在 Safari 中，先到「設定」→「進階」開啟 **「顯示網頁開發者功能」**。

<!-- s:8f6c6cf39e -->
點一下頁面使其取得焦點，然後輸入。將 DevTools 停駐在底部可取得最寬的網格。

<!-- s:9807a8b582 -->
主控台設定

<!-- s:803094bd72 -->
在主控台設定中關閉 **「保留記錄」**。Text.js 每個影格附加一則訊息，並清除主控台以釋放舊影格。開啟「保留記錄」時，DevTools 會忽略清除操作，舊影格便會累積。

<!-- s:35e7d1d33e -->
手動設定

<!-- s:ff78ccae69 -->
不使用框架

<!-- s:26f8520062 -->
從現有網站將任意 React 樹掛載到主控台：
