<!-- s:e9f791b208 -->
`text run` 在终端中渲染 App Router 应用。布局、组件、按键映射和路由处理程序与浏览器共用。输出使用真彩色 ANSI，而非 `%c` span。

<!-- s:7d8aa376e3 -->
按 `Ctrl+C` 退出。`text run` 需要 Bun。

<!-- s:eed3d00ac7 -->
`text run`

<!-- s:36358c3ead -->
`text run` 导入 `app/` 中的所有文件，使用内存中的历史记录挂载 App Router，并全屏绘制。`<Link>`、`useRouter()`、`notFound()` 和 `redirect()` 无需修改即可使用。

<!-- s:75b65c161d -->
同源 `fetch("/api/...")` 调用在进程内运行你的 `route.ts` 处理程序，与 `text dev` 提供服务时的行为完全一致。其他 URL 通过网络访问。

<!-- s:13fda297e2 -->
`renderToTerminal`

<!-- s:1bcde87690 -->
对于单个组件或你自己的 CLI：

<!-- s:e62e62bfaa -->
`useApp().exit()` 卸载应用并恢复终端。

<!-- s:082b75dda7 -->
| 选项 | 说明 |
| :-- | :-- |
| `stdin` / `stdout` | 默认为 `process.stdin` / `process.stdout` |
| `cols` / `rows` | 固定尺寸（默认随终端调整） |
| `altScreen` | 退出时恢复回滚缓冲区（默认为 `true`） |
| `mouse` | 滚轮滚动（默认为 `true`） |
| `exitOnCtrlC` | 默认为 `true` |
| `fps` | 帧率上限（默认为 `60`） |
| `patchConsole` | 暂存 `console.*` 输出，直到退出（默认为 `true`） |
| `theme` / `transparent` | 与 `createConsoleRoot` 相同 |

<!-- s:e34e364b9c -->
输出

<!-- s:2ac174afda -->
每一帧都逐行比较差异。只写入有变化的行，并用同步输出标记包裹，确保支持这些标记的终端不会显示只绘制了一半的帧。空闲应用不写入任何内容。

<!-- s:99a3c4d459 -->
输入

<!-- s:4a9817d820 -->
原始模式的标准输入会解析为与浏览器产生的相同事件：带修饰键的方向键和功能键、`Alt` 组合键、括号粘贴、SGR 鼠标滚轮和 kitty 键盘协议。`TerminalInputParser` 和 `parseTerminalInput` 均已导出，可在其他地方使用。

<!-- s:6b688e229b -->
差异

<!-- s:56ed51fed3 -->
| 功能 | DevTools | 终端 |
| :-- | :-- | :-- |
| 帧率 | 约 15 fps | 最高为 `fps` |
| 网格尺寸 | 停靠的控制台 | 终端窗口 |
| `<Image src>` | 通过 canvas 加载 | 使用 `pixels` |
| `console.log` | 你的帧 | 暂存直到退出 |
