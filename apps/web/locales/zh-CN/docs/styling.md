<!-- s:581711536b -->
使用 `className` 工具类或带类型的 props 设置组件样式。Text.js 应用没有样式表。

<!-- s:e0ac1db626 -->
工具类

<!-- s:2de571e2bf -->
`className` 接受 Tailwind 风格的工具类。一个单位对应一个单元格。

<!-- s:785b2c3db0 -->
| 类别 | 示例 |
| :-- | :-- |
| 布局 | `flex-row` `grow` `items-center` `gap-1` |
| 间距 | `p-1` `px-2` `mt-1` |
| 边框 | `border` `rounded` `border-accent` |
| 颜色 | `bg-surface` `text-muted` |

<!-- s:0b98e5506b -->
带类型的 props

<!-- s:4963259a42 -->
每个工具类都有对应的 prop。props 的优先级高于 `className`。

<!-- s:15a3834a24 -->
颜色

<!-- s:d333dad27a -->
使用十六进制颜色值、Tailwind 颜色名称或主题 Token，例如 `fg`、`muted`、`surface`、`accent`、`success` 和 `danger`。Token 随当前主题变化。

<!-- s:087abce968 -->
主题

<!-- s:abba2a3188 -->
内置 5 个预设：`geistDark`、`geistLight`、`opencodeDark`、`tokyoNight` 和 `amberCrt`。

<!-- s:5dc490305b -->
响应式视口

<!-- s:419fb844db -->
应用默认填满停靠的 DevTools 控制台（`viewport.responsive`），并随面板拖动调整大小。使用 flex 布局，并在需要时读取尺寸：

<!-- s:3d847eadf9 -->
页面只能感知停靠的面板。页面无法感知独立窗口中的 DevTools、DevTools 缩放和控制台侧边栏，因此应用使用 `viewport.width × viewport.height`（默认 `120×36`）或你固定的尺寸：
