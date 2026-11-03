<!-- s:19797c0276 -->
这些基础组件使用 Yoga flexbox 布局单元格网格。

<!-- s:00be928124 -->
`<Box>`

<!-- s:cdedc6ec73 -->
布局容器。

<!-- s:b2726c7ef5 -->
| Prop | 说明 |
| :-- | :-- |
| `className` | 单元格工具类 |
| `border` | `single` `rounded` `double` `heavy` `dashed` |
| `title` | 嵌在顶部边框中的文本 |
| `bg` / `fg` | 背景色和文本颜色 |
| `overflow` | `hidden` 或 `scroll` |

<!-- s:a83221d138 -->
`<Text>`

<!-- s:ea0876c03f -->
行内文本。嵌套的 `<Text>` 会变成带样式的 span。

<!-- s:d078a242d3 -->
| Prop | 说明 |
| :-- | :-- |
| `color` | 文本颜色 |
| `bold` `italic` `underline` `dim` | 样式属性 |
| `wrap` | `wrap` `nowrap` `truncate-end` |

<!-- s:e9a9218253 -->
`<ScrollBox>`

<!-- s:51162fc3b2 -->
可滚动的列。`stickyScroll` 在内容增加时保持滚动位置位于底部。

<!-- s:9029b4d81b -->
`<Modal>`

<!-- s:3804dec517 -->
居中的覆盖层，调暗下方内容，并将焦点限制在层内。

<!-- s:7a128a8b11 -->
Spacer、Divider 和 Badge

<!-- s:72e5d35050 -->
布局辅助组件

<!-- s:e76299d593 -->
常见 flex 排列的简写组件。

<!-- s:0f066fb217 -->
`<SplitPane>`

<!-- s:20cd99b8e7 -->
两个窗格和一条分隔线。启用 `resizable` 后，分隔线加入 `Tab` 焦点顺序，可用 `←` `→` 调整窗格大小（按住 `Shift` 时每次调整 5 个单元格）。

<!-- s:2143924860 -->
`size` 可以是比例（`0.3`）或单元格数量（`24`）。`direction="column"` 将窗格纵向堆叠。
