<!-- s:19797c0276 -->
這些基礎元件使用 Yoga flexbox 配置儲存格網格。

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
版面配置容器。

<!-- s:b2726c7ef5 -->
| Prop | 說明 |
| :-- | :-- |
| `className` | 儲存格工具類別 |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | 嵌入頂部框線的文字 |
| `bg` / `fg` | 背景與文字顏色 |
| `overflow` | `hidden` 或 `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
行內文字。巢狀的 `<Text>` 會成為帶有樣式的 span。

<!-- s:d078a242d3 -->
| Prop | 說明 |
| :-- | :-- |
| `color` | 文字顏色 |
| `bold` `italic` `underline` `dim` | 屬性 |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
可捲動的直欄。`stickyScroll` 會在內容增加時固定捲動位置於底部。

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
置中的覆蓋層，會調暗下方內容，並將焦點限制在覆蓋層內。

<!-- s:7a128a8b11 -->
Spacer、Divider 與 Badge

<!-- s:72e5d35050 -->
版面配置輔助元件

<!-- s:e76299d593 -->
常見 flex 排列的簡寫方式。

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
兩個窗格與一條分隔線。啟用 `resizable` 後，分隔線會加入 `Tab` 焦點順序，並可用 `←` `→` 調整窗格大小（按住 `Shift` 時每次調整 5 個儲存格）。

<!-- s:2143924860 -->
`size` 可以是比例（`0.3`）或儲存格數量（`24`）。`direction="column"` 會將窗格垂直堆疊。
