<!-- s:674f346b70 -->
Hook 將元件連接到輸入、焦點與檢視區。

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| 欄位 | 說明 |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | 按鍵產生的文字 |
| `ctrl` `meta` `shift` `alt` | 修飾鍵 |
| `stopPropagation()` | 停止執行較低優先順序的處理函式 |

<!-- s:0764796164 -->
`⌘⌥J` 和 `⌘R` 等瀏覽器快速鍵一律不會被攔截。

<!-- s:550c6a7dd5 -->
`usePaste` 和 `useWheel` 接受相同的選項。`ambient` 對 `useWheel` 沒有效果。

<!-- s:9248f9b147 -->
| 選項 | 說明 |
| :-- | :-- |
| `isActive` | `false` 會停用處理函式，但不卸載元件（預設為 `true`） |
| `priority` | 優先順序較高者先執行（預設為 `0`）。取得焦點的元件使用 `FOCUSED_INPUT_PRIORITY`（`10`） |
| `global` | 此元件外的 `<Modal>` 開啟時，繼續接收輸入（預設為 `false`） |
| `ambient` | 不將此處理函式計入[焦點提示](#usepagefocus)的判斷（預設為 `false`） |

<!-- s:e4e842287a -->
開發覆蓋層的快速鍵（`F2` 或 `` Ctrl+` ``）設為 ambient，因此沒有其他鍵盤輸入的頁面不會顯示提示。

<!-- s:617ae1bfe8 -->
`usePaste` 和 `useWheel`

<!-- s:61e72f6177 -->
`useKeyState`（實驗性）

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` 匯出 `useKeyState`，透過 `KeyboardEvent.code`（`"KeyW"`、`"ArrowUp"`、`"ControlLeft"`）追蹤按住的實體按鍵。輪詢 `keys.isDown(code)` 或讀取 `keys.pressed` 不會觸發 React 重新渲染。傳入回呼函式，即可在按鍵按下或放開時即時回應。

<!-- s:d9e1465ae0 -->
頁面失去焦點時，按住的按鍵會自動釋放。實驗性匯出的版本管理方式請見[重大變更](/docs/support-policy#breaking-changes)。

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` 回傳頁面是否具有焦點。只有頁面具有焦點時，按鍵輸入才會傳到應用程式。回傳值與 `useViewport().focused` 相同，但只會在焦點改變時重新渲染。

<!-- s:e1075d4220 -->
當頁面沒有焦點，且應用程式有 `useInput` 或 `usePaste` 處理函式、`useKeyState` Hook，或可透過 Tab 到達的焦點目標時，主控台影格的最後一列會變成琥珀色提示列，顯示「點擊頁面以使用鍵盤」。標記為 [`ambient`](#useinput) 的處理函式不計入判斷。此提示不會出現在終端機、測試或行內鏡像中。每次提示出現時，都會閃爍約 6 秒，除非系統已開啟減少動態效果的設定。若要自行決定顯示時機，請在 `text.config.ts` 或 `createConsoleRoot` 中設定 `focusHint: false`，並渲染 `<FocusHint>`：

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
`window.text` REPL

<!-- s:420cc7f125 -->
每個應用程式都會將輔助函式加入 `window.text`。在 DevTools 提示字元中輸入這些函式。
