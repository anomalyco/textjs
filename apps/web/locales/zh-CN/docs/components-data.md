<!-- s:d3c8cb679e -->
`<List>`、`<Table>` 和 `<Tree>` 用于显示大型数据集。仅渲染可见行。

<!-- s:44ffd1d0a7 -->
导航

<!-- s:e3dca4574c -->
`<List>`、`<Table>` 和 `<Tree>` 使用同一套键盘操作方式。

<!-- s:cdac0643be -->
| 按键 | 操作 |
| :-- | :-- |
| `↑` `↓` / `j` `k` | 移动 |
| `PgUp` `PgDn`, `Ctrl+U` `Ctrl+D` | 翻页、翻半页 |
| `Home` `End` / `g` `G` | 跳到首行、末行 |
| `↵` | `onSelect` |
| 滚轮 | 移动光标 |

<!-- s:1c65c42a4d -->
这些组件默认填满父容器。传入 `height` 可设置固定行数。

<!-- s:3a828804bb -->
`<List>`

<!-- s:2603a57dc8 -->
虚拟化列表。每行高度为一个单元格。

<!-- s:3408e68b29 -->
| Prop | 说明 |
| :-- | :-- |
| `items` | 任意数组 |
| `renderItem` | `(item, { highlighted, focused }) => ReactNode` |
| `isItemDisabled` | 光标跳过的项 |
| `height` | 可见行数（默认填满） |
| `highlightedIndex` / `onHighlight` | 受控光标 |
| `vimKeys` | `j` `k` `g` `G`（默认为 `true`） |

<!-- s:55759482eb -->
`<Table>`

<!-- s:ff77c49577 -->
未设置 `width` 的列共享剩余宽度。表头和单元格使用相同的 flex 规则，因此始终对齐。

<!-- s:e9719839f0 -->
| 列字段 | 说明 |
| :-- | :-- |
| `key` | 标识符和默认取值字段 |
| `width` / `grow` | 固定单元格数或剩余宽度的份额 |
| `align` | `left` `right` `center` |
| `value` | 显示和排序使用的值 |
| `render` | 自定义单元格内容 |
| `compare` | 自定义排序 |

<!-- s:045ee40857 -->
排序

<!-- s:d04de39344 -->
启用 `sortable` 后，按列序号可按该列排序（再次按下可反转方向），按 `s` 循环切换列，按 `S` 反转排序方向。排序是稳定的。使用 `sort` 和 `onSortChange` 控制排序。

<!-- s:6d625a19ed -->
选择

<!-- s:2132bc20a2 -->
`selectionMode="multiple"` 会添加复选框列；按 `Space` 切换高亮行的选中状态。使用 `selectedKeys` 和 `onSelectionChange` 控制选择状态，使用 `getRowKey` 提供稳定的键。

<!-- s:3bd95f58e2 -->
`<Tree>`

<!-- s:ec4c582ab8 -->
带引导线的可展开树。

<!-- s:eeb148154f -->
`→` 展开或进入分支。`←` 折叠或跳到父节点。`Space` 切换展开状态。如果需要自定义渲染器，`flattenTree(data, expanded)` 可提供可见行。
