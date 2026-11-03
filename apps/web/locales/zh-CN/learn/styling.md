<!-- s:d7ae3c23f0 -->
每个单元格都有一个字符、前景色、背景色和一组属性。Text.js 将它们编译成 `%c` CSS span，因此控制台能显示真实的颜色、粗体和斜体。

<!-- s:45433c474e -->
文本属性

<!-- s:32c37753d8 -->
`<Text>` 接受 `bold`、`dim`、`italic`、`underline` 和 `strikethrough`。嵌套的 `<Text>` 元素会成为同一行内带样式的 span。

<!-- s:661b7c60b6 -->
主题令牌

<!-- s:f312d78237 -->
`color` prop 接受十六进制值、普通颜色名称（`emerald`）和主题令牌；Tailwind 调色板的色阶通过类名（`text-emerald-400`）指定。令牌随当前主题变化，因此涉及语义的颜色应优先使用令牌。添加一个状态组件：

<!-- s:4d4d36a0bd -->
部署卡片

<!-- s:108bb076c9 -->
`bg-surface` 让卡片在背景上凸显出来。部署 ID 使用状态颜色，构建时显示为斜体，出错时添加删除线。

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` 用 `…` 截断过长的提交信息，而不换到第二行。

<!-- s:087abce968 -->
主题

<!-- s:8f993e0ab8 -->
Text.js 内置五种主题：Geist Dark、OpenCode Dark、Tokyo Night、Amber CRT 和 Geist Light。在控制台中按 `t` 循环切换主题。整帧会使用新的调色板重绘，因为上面的每种颜色都是主题 Token。
