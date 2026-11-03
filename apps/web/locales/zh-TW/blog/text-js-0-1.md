<!-- s:00c66df67a -->
Text.js 0.1 已加上版本標籤。這是首個具備全部三層的版本：`@textjs/core` 將影格繪製到主控台，`@textjs/react` 將 React 19 渲染到這些影格中，而 `textjs` 加入 App Router 與 CLI。

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
路由是 `app/` 中的資料夾，遵循 Next.js App Router 慣例。這是 `create-text-app` 的 `dashboard` 範本：

<!-- s:18fa0019a3 -->
版面配置包住底下的每個頁面，並在導覽時保留狀態。`<Link>` 接受 `shortcut`，按一個鍵就能前往連結，而 `activeClassName` 則設定指向目前路由的連結樣式：

<!-- s:5587be498a -->
動態區段的運作方式與 Next.js 相同。`[id]` 會成為參數，`[...slug]` 會擷取路徑的其餘部分，而 `[[...slug]]` 也會匹配父層。靜態區段的優先順序高於動態區段，而像 `(marketing)` 這樣的路由群組可用來組織檔案，不會增加網址的層級。

<!-- s:3a9a93d850 -->
`loading.tsx` 與 `error.tsx` 分別以 Suspense 邊界和錯誤邊界包住區段。錯誤元件會收到錯誤與一個 `reset` 函式：

<!-- s:142b529e3f -->
路由處理常式位於 `app/api`，並回傳標準的 `Response`：

<!-- s:fe0c29445c -->
路由器透過 `history.pushState` 同步 `window.location`，因此上一頁、下一頁與深層連結都能運作，並將 `metadata.title` 寫入 `document.title`。應用程式在主控台繪製，頁面則放置用來收集輸入的焦點輸入區。

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` 啟動支援 React Fast Refresh 的 Vite。儲存檔案會就地更新主控台。
- `text build` 輸出應用程式及其路由處理常式的正式環境建置產物。
- `text start` 提供建置產物與路由處理常式的服務。

<!-- s:1e1161891f -->
`create-text-app` 以 `starter` 或 `dashboard` 範本建立專案骨架。

<!-- s:e2a33d088a -->
檢查器

<!-- s:cdb3155210 -->
在執行中的應用程式按下 `` Ctrl+` `` 或 `F2`，即可開啟主控台內的 `[▼]` 檢查器。檢查器會顯示匹配的路由及其參數、影格尺寸、span 數量與各階段耗時，以及 dirty gate 略過的影格數量。`W` 會以線框繪製 Yoga 版面配置。

<!-- s:c2600ceabc -->
0.1 的其他功能

<!-- s:289b0a9973 -->
`@textjs/react` 隨附 PascalCase 元件（`Box`、`Text`、`ScrollBox`、`Input`、`Textarea`、`Select`、`Tabs`、`Code`、`Markdown`、`Diff`、`Modal`、`Spinner`）、以儲存格為單位的 Tailwind 風格 `className` 工具類別，以及 themes。版面配置由 WebAssembly 中的 Yoga 執行。

<!-- s:8ad0f2154c -->
完整清單請見[更新紀錄](/changelog#v0-1-0)。
