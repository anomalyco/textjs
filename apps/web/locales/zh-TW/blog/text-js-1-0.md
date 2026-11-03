<!-- s:5a6798e6a5 -->
今天我們發布 Text.js 1.0，這是為網頁打造的主控台框架。

<!-- s:e4787165f5 -->
Text.js 在 Chrome DevTools 主控台中渲染 React 19 應用程式，透過 `console.log` 繪製版面配置、路由、焦點、輸入、表單、圖表和串流 Markdown。

<!-- s:48b184a262 -->
1.0 的功能

<!-- s:7f7f2a9a76 -->
- **App Router。** `layout.tsx`、`page.tsx`、`[param]`、`loading.tsx`、`error.tsx`、`not-found.tsx` 和 `api/*/route.ts`，與 `window.location` 同步。遵循 Next.js App Router 慣例。
- **Turbolog。** Yoga flexbox 配置儲存格網格，具型別陣列 `CellBuffer` 儲存網格內容，再由遊程編碼器轉成單次 `console.log(format, ...css)` 呼叫。閒置影格不會呼叫主控台。
- **元件套件。** `Box`、`Text`、`ScrollBox`、`Input`、`Select`、`Tabs`、`Markdown`、`Diff`、虛擬化 `List`、`Table`、`Tree`、圖表、對話方塊、快顯通知，以及由 `useKeymap` 提供的 `Ctrl+K` 命令選單。
- **附加影格。** 每個影格都附加在前一個影格下方，因此主控台不會在影格之間閃現空白。詳見 [Turbolog：消除閃爍](/blog/turbolog-eliminating-the-flash)。
- **由右至左文字。** 希伯來文和阿拉伯文依視覺順序渲染，並支援阿拉伯文字形塑形，採用的 UAX #9 實作通過了全部 770,241 個 `BidiTest.txt` 測試案例。參閱[主控台中的由右至左文字](/blog/right-to-left-text)。
- **響應式主控台。** Text.js 會配合停駐的 DevTools 面板尺寸，支援頁面縮放和工具列換行。取消停駐時，則改用 `120×36`。
- **`text run`。** 同一個 App Router 應用程式可在真正的終端機中渲染。
- **代理與編輯器工具。** `text mcp` 透過 Model Context Protocol 將應用程式提供給程式設計代理，而 Text.js DevTools 擴充功能會在主控台旁新增面板。`eslint-plugin-textjs` 和 VS Code 擴充功能也包含在 1.0 中。

<!-- s:b71c4a16bc -->
一次更名

<!-- s:b47aa37902 -->
框架套件現在是 `@textjs/next`。`textjs` 這個名稱在 npm 上已有人使用。更新你的匯入：

<!-- s:e4005009f1 -->
**1.0.2 更新：**套件現在是 `@textjs/app`，而 `@textjs/next` 已棄用。若要切換，執行 `bun remove @textjs/next && bun add @textjs/app`，並從 `@textjs/app` 匯入。

<!-- s:5b35a47b90 -->
數據

<!-- s:2ee54da34c -->
在密集的 `100×32` 儀表板上（46 個文字節點、149 個 `%c` span），使用 `packages/core/test/perf.test.ts` 測量：

<!-- s:9729def172 -->
| 影格 | 平均值 |
| :-- | --: |
| 完整重繪（版面配置、繪製、編碼） | 0.163 ms |
| 編輯單列（輸入） | 0.011 ms |
| 閒置 | 0.000 ms，0 次主控台呼叫 |

<!-- s:2fee8c4c3d -->
未變更的影格會在配置字串前回傳，因此閒置影格的測量結果為 0.000 ms。

<!-- s:a0fa47c98f -->
試用

<!-- s:aeb9cc2b5d -->
開啟 [textjs.org](/) 並按下 ⌘⌥J（Windows 和 Linux 使用 Ctrl+Shift+J）。網站會在你的主控台中執行 Text.js 應用程式，每個頁面各有一個檢視畫面。[Playground](/playground) 提供儀表板、串流 Markdown 和貪食蛇。[OpenCode](/opencode) 可連線至你的本機 OpenCode 伺服器。

<!-- s:31dd2e762c -->
完整變更清單請見[更新紀錄](/changelog)，原始碼位於 [GitHub](https://github.com/anomalyco/textjs)。
