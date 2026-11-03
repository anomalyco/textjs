<!-- s:3ddc060411 -->
`text run` 在终端中运行同一个应用。布局、组件、按键映射和路由处理程序共用，输出为真彩色 ANSI，而非 `%c` CSS span。

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:7cd876942b -->
添加一个脚本并运行：

<!-- s:ad1db08664 -->
`text run` 导入 `app/` 中的所有文件，使用内存中的历史记录挂载 App Router，并全屏绘制。`<Link>`、`useRouter()`、`notFound()` 和 `redirect()` 的用法不变，同源 `fetch("/api/…")` 调用会在进程内运行你的路由处理程序。`Ctrl+C` 退出并恢复终端的回滚缓冲区。此命令需要 Bun。

<!-- s:86d6034750 -->
按 `q` 退出

<!-- s:f06966bd5c -->
终端用户习惯按 `q` 退出。`useApp().exit()` 卸载应用并恢复终端；在浏览器中则卸载控制台应用。

<!-- s:62111506f4 -->
自己的 CLI

<!-- s:e5f8a30037 -->
对于单个组件，使用 `renderToTerminal`。它无需 App Router 即可挂载一个元素，而 `fetch("/api/…")` 只有在 `text run` 下才能调用路由处理程序，因此要将数据传给组件：

<!-- s:718df08aaf -->
使用 `bun cli.tsx` 运行。`DeploymentsPage` 会获取行数据，因此需要 `text run`。

<!-- s:76d0fa5082 -->
差异

<!-- s:505bd1bfa2 -->
终端重绘更快（最高 60 fps，而非约 15 fps），网格尺寸随窗口调整，而非随停靠的控制台调整。图像需要像素数据，而非 URL。其余部分，包括这个仪表盘，都使用相同的代码。
