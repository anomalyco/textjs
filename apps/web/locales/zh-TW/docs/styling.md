<!-- s:581711536b -->
使用 `className` 工具類別或具型別的 props 設定元件樣式。Text.js 應用程式沒有樣式表。

<!-- s:e0ac1db626 -->
工具類別

<!-- s:2de571e2bf -->
`className` 接受 Tailwind 風格的工具類別。1 個單位就是 1 個儲存格。

<!-- s:785b2c3db0 -->
| 類別 | 範例 |
| :-- | :-- |
| 版面配置 | `flex-row` `grow` `items-center` `gap-1` |
| 間距 | `p-1` `px-2` `mt-1` |
| 邊框 | `border` `rounded` `border-accent` |
| 色彩 | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
具型別的 props

<!-- s:4963259a42 -->
每個工具類別都有對應的 prop。Props 的優先順序高於 `className`。

<!-- s:15a3834a24 -->
色彩

<!-- s:d333dad27a -->
使用十六進位色碼、Tailwind 名稱或主題 Token，例如 `fg`、`muted`、`surface`、`accent`、`success` 和 `danger`。Token 會隨目前的主題變動。

<!-- s:087abce968 -->
主題

<!-- s:abba2a3188 -->
內建 5 種預設主題：`geistDark`、`geistLight`、`opencodeDark`、`tokyoNight` 和 `amberCrt`。

<!-- s:5dc490305b -->
響應式檢視區

<!-- s:419fb844db -->
應用程式預設會填滿停駐的 DevTools 主控台（`viewport.responsive`），並隨著你拖曳面板調整大小。使用 flex 配置版面，並在需要時讀取尺寸：

<!-- s:3d847eadf9 -->
頁面只能偵測停駐的面板。頁面無法偵測未停駐的 DevTools、DevTools 縮放比例及主控台側邊欄，因此應用程式會使用 `viewport.width × viewport.height`（預設為 `120×36`）或你固定的尺寸：
