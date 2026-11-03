<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) 是開源的程式開發代理程式。**OpenCode Lite** 是以 Text.js 建構的 OpenCode 主控台用戶端。

<!-- s:a0fa47c98f -->
試用

<!-- s:8b5f5ed2de -->
- 在本站：前往 [OpenCode](/opencode) 並開啟 DevTools。
- 在本機：`bunx create-text-app my-app --template opencode`。

<!-- s:db57075dd8 -->
本站執行的沙箱搭配按腳本運作的代理程式。輸入任意提示詞。

<!-- s:867840c638 -->
結構

<!-- s:7b522f9378 -->
| 區域 | 元件 |
| :-- | :-- |
| 對話記錄 | `<ScrollBox stickyScroll>` + `<Markdown>` |
| 工具卡片 | `<Code>` 與 `<Diff>` |
| 提示詞 | `<Textarea>` |
| 命令面板 | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
快速鍵

<!-- s:9bda94e125 -->
| 按鍵 | 動作 |
| :-- | :-- |
| `Enter` | 傳送 |
| `Shift+Tab` | 切換代理程式（build / plan） |
| `Ctrl+P` | 命令 |
| `Ctrl+X` 接著 `L` | 工作階段 |
| `Ctrl+X` 接著 `N` | 新增工作階段 |
| `Esc` 兩次 | 中斷執行中的工作階段 |

<!-- s:b2700ea8eb -->
連線至本機伺服器

<!-- s:a98495bd7f -->
保持橋接程式執行。在 [OpenCode 頁面](/opencode)輸入 `http://127.0.0.1:4096`，按下**連線**，若 Chrome 詢問，請允許本機網路存取。接著輸入橋接程式印出的配對碼。頁面會保持配對，直到橋接程式重新啟動或你按下**中斷連線**。請使用橋接程式的網址，而非服務連接埠：橋接程式會提供服務憑證與 CORS 標頭。使用完畢後，按 Ctrl+C 停止橋接程式。

<!-- s:7c6a89edc5 -->
若前景伺服器已在連接埠 4096 執行，請執行 `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096`，並將頁面連線至連接埠 **4097**。若前景伺服器有密碼保護，請在橋接程式的 shell 中匯出其 `OPENCODE_PASSWORD`；不要將密碼放在瀏覽器網址中。

<!-- s:951b1ef5cb -->
橋接程式是 `@textjs/opencode` 套件。此套件沒有相依套件，也能在 Node 22 或更新版本上以 `npx` 執行。在 Text.js 專案內，`text proxy` 會啟動相同的橋接程式。
