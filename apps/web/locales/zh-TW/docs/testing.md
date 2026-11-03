<!-- s:9f5667f5e7 -->
`@textjs/app/testing`（或 `@textjs/react/testing`）會在畫面外渲染你的應用程式、按下按鍵，並以文字回傳影格。測試執行時不需要瀏覽器或 DevTools。

<!-- s:9bc71b1ad2 -->
任何支援 `async` 測試的測試執行器都能使用，包括 Bun、Vitest 和 Jest。

<!-- s:f7898e6b92 -->
渲染

<!-- s:fc969a7928 -->
| 方法 | 說明 |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | 在畫面外掛載（預設 80×24） |
| `lastFrame()` | 純文字形式的影格 |
| `lines()` | 以各列組成陣列的影格 |
| `frames` | 目前為止所有不同的影格 |
| `toAnsi()` | 用於快照的全彩 ANSI |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | 第一個符合項目的 `{ x, y }` |
| `rerender(el)` / `unmount()` | 更新或卸載 |

<!-- s:893f22353a -->
`renderToString(el, options)` 渲染一次並回傳文字。

<!-- s:99a3c4d459 -->
輸入

<!-- s:105149560b -->
每次呼叫都在 `act()` 內執行，並完成產生的影格輸出，因此下一個斷言能取得更新結果。

<!-- s:1f65c071dc -->
時間

<!-- s:ab365d9403 -->
動畫、載入指示器和短暫通知使用真實計時器，因此使用 `wait` 和 `waitFor` 才能可靠地觀察這些效果。

<!-- s:26f93acae3 -->
快照

<!-- s:05724c9883 -->
影格會裁去右側和底部的空白，因此快照不會因空白而反覆變動。
