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

<!-- s:195573d803 -->
依主控台使用意圖載入（實驗性）

<!-- s:97014ecad1 -->
`@textjs/core/experimental` 匯出 `onConsoleIntent`，供網頁在訪客有意使用主控台應用程式時才下載。它會呼叫你的函式一次，並傳入原因：

<!-- s:444b1ebdd7 -->
| 原因 | 時機 |
| :-- | :-- |
| `dock` | DevTools 在網頁載入時已停駐，或之後才停駐。Text.js 從視窗大小判斷停駐狀態 |
| `shortcut` | 訪客按下 F12 或 Ctrl+Shift+J、I、C 或 K，或在 Mac 上按下 ⌘⌥J、I、C 或 K。瀏覽器仍會開啟 DevTools |
| `engage` | 以主要按鈕點擊符合 `engageSelector` 的元素、在 `[data-textjs-engage]` 按鈕上按下 Enter 或 Space，或在應用程式啟動前於 `<ViewportControl>` 選擇大小。點擊符合條件元素內的連結、按鈕與表單欄位不計入，除非這些元素也有 `data-textjs-engage` |
| `session` | 此分頁已發生上述其中一種情況，因此重新載入時會立即啟動 |
| `manual` | 你對回傳的控制代碼呼叫了 `trigger()` |

<!-- s:894b97fac4 -->
從瀏覽器選單在獨立視窗開啟 DevTools，不會反映在視窗大小上。這些訪客透過 `engage` 元素啟動應用程式，而 `session` 會讓該分頁在重新載入時繼續啟動應用程式。

<!-- s:06cdcf713e -->
觸控螢幕不會自動觸發任何事件。請從你自己的控制項呼叫 `trigger()`。

<!-- s:d7006796c2 -->
| 選項 | 說明 |
| :-- | :-- |
| `engageSelector` | 點擊後會啟動應用程式的元素（預設為 `[data-textjs-engage], [data-textjs-focus-pad], text-console`）。設為 `false` 時不新增監聽器 |
| `persist` | 在 `sessionStorage` 中以 `CONSOLE_INTENT_KEY` 記住該分頁的使用意圖（預設為 `true`） |
| `prefetch` | 當指標或焦點進入 `engageSelector` 元素時呼叫，最多一次 |
| `idlePrefetch` | 在 `load` 之後，瀏覽器閒置時也呼叫 `prefetch`（預設為 `false`） |

<!-- s:4460da3205 -->
`prefetch` 不會在觸控螢幕、開啟數據節省模式或連線速度低於 4G 時執行。`canPrefetchConsole()` 會回傳相同的檢查結果。控制代碼的 `dispose()` 會移除所有監聽器。

<!-- s:9128a9d98f -->
`<ViewportControl>` 在主控台根節點建立前就能運作。選擇大小會儲存該大小，並觸發 `engage`，讓 `onConsoleIntent` 啟動應用程式，待 `root` 設定後便會套用該大小。實驗性匯出的版本管理方式請參閱[重大變更](/docs/support-policy#breaking-changes)。
