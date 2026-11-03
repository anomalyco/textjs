<!-- s:d3c8cb679e -->
`<List>`、`<Table>` 和 `<Tree>` 顯示大型資料集。只渲染可見的列。

<!-- s:44ffd1d0a7 -->
導覽

<!-- s:e3dca4574c -->
`<List>`、`<Table>` 和 `<Tree>` 共用同一套鍵盤操作方式。

<!-- s:cdac0643be -->
| 按鍵 | 動作 |
| :-- | :-- |
| `↑` `↓` / `j` `k` | 移動 |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | 翻頁、翻半頁 |
| `Home` `End` / `g` `G` | 移至首列、末列 |
| `↵` | `onSelect` |
| 滾輪 | 移動游標 |

<!-- s:1c65c42a4d -->
預設會填滿父元件。傳入 `height` 可設定固定列數。

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
虛擬化清單。每列高度為一個儲存格。

<!-- s:3408e68b29 -->
| Prop | 說明 |
| :-- | :-- |
| `items` | 任意陣列 |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | 游標略過的項目 |
| `height` | 可見列數（預設：填滿） |
| `highlightedIndex` / `onHighlight` | 受控游標 |
| `vimKeys` | `j` `k` `g` `G`（預設為 `true`） |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
欄位會分配剩餘寬度，除非已設定 `width`。標頭和儲存格使用相同的 flex 規則，因此始終對齊。

<!-- s:e9719839f0 -->
| 欄位屬性 | 說明 |
| :-- | :-- |
| `key` | 識別碼與預設存取鍵 |
| `width` / `grow` | 固定儲存格數或剩餘寬度的分配比例 |
| `align` | `left` `right` `center` |
| `value` | 顯示與排序值 |
| `render` | 自訂儲存格內容 |
| `compare` | 自訂排序 |

<!-- s:045ee40857 -->
排序

<!-- s:d04de39344 -->
設定 `sortable` 後，按下欄位編號即可依該欄排序（再按一次可反轉），按 `s` 可循環切換欄位，按 `S` 可反轉排序方向。排序為穩定排序。使用 `sort` 和 `onSortChange` 控制排序。

<!-- s:6d625a19ed -->
選取

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` 會新增勾選欄；`Space` 可切換反白列的選取狀態。使用 `selectedKeys` 和 `onSelectionChange` 控制選取，並透過 `getRowKey` 提供穩定的鍵值。

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
附有導引線的可展開樹狀結構。

<!-- s:eeb148154f -->
`→` 可展開或進入分支。`←` 可收合或跳至父節點。`Space` 可切換展開狀態。若需要自訂渲染器，`flattenTree(data, expanded)` 可提供可見的列。
