<!-- s:b7512b6ff1 -->
在 10 章中，你將建構 **Acme Deploys**，這是一個在 DevTools 主控台中渲染的部署儀表板。每章結尾，應用程式都會以你的程式碼完成時的狀態，在本頁的主控台中即時執行。

<!-- s:630c586fd9 -->
建立應用程式

<!-- s:fd9f176938 -->
`create-text-app` 會建立包含 App Router、TypeScript 和 `text` CLI 的專案骨架。

<!-- s:9eee556b8f -->
開啟 `http://localhost:3000`，接著[開啟瀏覽器主控台](/docs/installation#open-the-console)。頁面會顯示焦點區。你的應用程式會在主控台中渲染。

<!-- s:7d69bcfbda -->
你的第一個頁面

<!-- s:77df233a57 -->
每個路由都是 `app/` 中的一個 `page.tsx`。將起始頁面替換成儀表板的標題卡片：

<!-- s:efd190e3b6 -->
儲存檔案。Fast Refresh 會重繪影格，並保留元件狀態。

<!-- s:f5e9f4301c -->
回應按鍵

<!-- s:a9111ae891 -->
頁面取得焦點時，`useInput` 會接收每次按鍵輸入。計算打招呼的次數：

<!-- s:c766a57c22 -->
這就是一個完整的 Text.js 應用程式。它具備 React 狀態、版面配置方塊，每個變更的影格會呼叫一次 `console.log`，閒置時則不輸出任何記錄。
