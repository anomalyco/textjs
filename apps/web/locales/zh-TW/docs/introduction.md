<!-- s:b3d5e86364 -->
Text.js 是 React 框架，用來建構透過 `console.log` 在 DevTools 主控台渲染的應用程式。

<!-- s:34bf1ea7dd -->
預覽可即時互動。點選預覽並按下 `↑`。

<!-- s:0bccbd98be -->
內建功能

<!-- s:d3708efc68 -->
- **React 19**：並行渲染、Suspense 和錯誤邊界。
- **App Router**：版面配置、頁面、動態區段和路由處理常式。
- **Yoga 版面配置**：以 WebAssembly 執行的 flexbox，對齊整數儲存格。
- **Turbolog**：每個有變更的影格呼叫一次 `console.log`。
- **主控台 UI**：頁面只包含焦點區和隱藏的輸入欄位。

<!-- s:5ae438610c -->
運作方式

<!-- s:75f47f9f8c -->
狀態向下傳遞：從 React 到版面配置，再到儲存格緩衝區，最後到主控台。

<!-- s:25c55610d2 -->
未變更的影格會略過，因此應用程式閒置時不會輸出任何記錄。

<!-- s:3a5d9cbc49 -->
後續步驟

<!-- s:b849362c77 -->
- [安裝](/docs/installation)：建立你的第一個應用程式。
- [路由](/docs/routing)：頁面、版面配置和導覽。
- [Turbolog](/docs/turbolog-engine)：影格的編碼方式。
- [OpenCode](/docs/opencode)：使用 Text.js 建構的代理程式 TUI。
