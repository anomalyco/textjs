<!-- s:f9337b40e7 -->
Text.js 提供計時器、動畫、測量與資料持久化的 Hook。計時器與動畫會配合渲染器的影格節奏。

<!-- s:43bb49a7a4 -->
計時器

<!-- s:15335858dd -->
兩者一律呼叫最新的回呼函式。`null` 會停止計時器。

<!-- s:dc96b9db35 -->
`useAnimationFrame`

<!-- s:58c49546c3 -->
`useAnimationFrame` 在每個影格時段觸發一次。Text.js 每秒輸出約 15 個影格，因此加快動畫只會將 CPU 資源花在永遠不會記錄的影格上。相同頻率的迴圈共用一個計時器，並在輸出暫停時停止。

<!-- s:faffc1716f -->
`useTween` 與 `useSpring`

<!-- s:e1a9665d36 -->
兩者都會回傳以動畫方式趨近目標的數值，並在數值穩定後停止更新。`easings` 包含 `linear`、`easeOutCubic`、`easeInOutCubic`、`easeOutExpo` 等緩動函式。

<!-- s:de4c9b6297 -->
`useMeasure`

<!-- s:97430a02ce -->
版面配置在 React 提交後執行，因此尺寸會晚一個影格才取得。只有尺寸改變時才會重新渲染。

<!-- s:bf30354376 -->
`useBreakpoint`

<!-- s:7a09c8535c -->
| Breakpoint | 欄數 |
| :-- | :-- |
| `xs` | 0 |
| `sm` | 60 |
| `md` | 80 |
| `lg` | 110 |
| `xl` | 140 |

<!-- s:c1005c7ee2 -->
斷點以欄數為單位。將自訂門檻值作為引數傳入。

<!-- s:09d1859930 -->
`useLocalStorage`

<!-- s:cd8360f199 -->
`useLocalStorage` 將 JSON 儲存在 `localStorage` 中，在瀏覽器以外的環境則儲存在記憶體中。共用同一個鍵的 Hook 會保持同步，跨分頁也一樣。

<!-- s:9bf5fe6a8b -->
`useClipboard`

<!-- s:4ad3c688f3 -->
`<FocusScope>`

<!-- s:b57f3d6ddc -->
`<FocusScope>` 是不可見的焦點邊界。啟用 `trap` 時，`Tab` 與 `useInput` 都會限制在邊界內，行為與沒有覆蓋層的 `<Modal>` 完全相同。
