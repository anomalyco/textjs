<!-- s:c351b288ae -->
`text mcp` 在进程内以无头模式运行你的 `app/` 目录，并通过 [模型上下文协议](https://modelcontextprotocol.io) 提供服务，让编码智能体无需 DevTools 即可使用应用。智能体可以导航、按键、以纯文本读取帧并调用路由处理程序。

<!-- s:c66b3eaae7 -->
`text mcp` 需要 Bun。使用 Node 启动时，如果 `PATH` 中有 `bun`，它会用 Bun 重新运行自身，否则会报错 `TX019`。MCP 客户端会替你启动它，因此很少需要手动运行。

<!-- s:0ecddf15e1 -->
配置

<!-- s:91bda9ef42 -->
每个客户端都从你的项目目录启动 `text mcp`。使用 `bunx --bun`，使路由文件以 TypeScript 运行。

<!-- s:b50f70c6a3 -->
OpenCode

<!-- s:b1662c02a3 -->
Claude Code

<!-- s:af84272153 -->
也可以将配置提交到仓库，供团队使用：

<!-- s:e9ea871e1a -->
Cursor

<!-- s:6be69e8aed -->
VS Code

<!-- s:25a196cf61 -->
如果项目位于子目录中，追加路径：`["--bun", "text", "mcp", "apps/console"]`。

<!-- s:0b27734b46 -->
工具

<!-- s:93ae76f73d -->
| 工具 | 说明 |
| :-- | :-- |
| `list_routes` | `app/` 中的页面和路由处理程序，以及当前位置 |
| `navigate` | 推入或替换路径，或执行 `back` / `forward` |
| `read_frame` | 文本形式的帧，包含路由、尺寸、焦点和光标。`styles: true` 为每个 span 添加颜色和属性 |
| `press` | 按键组合：`"down"`、`"ctrl+k"`、`"shift+tab"`、`"tab tab enter"`、`"down*3"` |
| `type` | 逐字符按键输入文本（最多 2000 个字符；更多内容请用 `paste`）。`submit: true` 会在输入后按 Enter |
| `paste` | 一次粘贴事件，类似 `⌘V` |
| `scroll` | 用鼠标滚轮滚动 `rows` 行（以及 `cols` 列）。`<ScrollBox>` 无需键盘焦点即可响应滚轮滚动 |
| `resize` | 设置网格的列数和行数 |
| `inspect_tree` | 带有屏幕边界的组件树，以及每个可聚焦元素的 id |
| `find` | 每个匹配项的边界及其所在的组件 |
| `wait_for` | 等待文本出现或消失，或等待应用空闲 |
| `logs` | 捕获的 `console.*` 输出和 React 错误 |
| `fetch` | 在进程内调用 `route.ts` 处理程序。响应体最多读取 `maxBytes`；事件流读取 `streamMs` 后取消 |
| `reload` | 编辑文件后重新导入应用 |

<!-- s:526235e5c5 -->
输入工具会返回新帧，因此智能体无需在每次按键后单独调用 `read_frame`。当前帧和路由列表也可以通过资源 `text://frame` 和 `text://routes` 获取。

<!-- s:c30236f97d -->
典型交互：

<!-- s:45e18bfa25 -->
帧与空闲状态

<!-- s:f2e8fe0f06 -->
任何工具在读取帧之前，都会等待应用空闲：没有已调度的帧，没有正在进行的 `fetch`，并且连续 50 ms 没有提交或帧。这样，智能体看到的是输入的结果，而非更新到一半的帧。

<!-- s:fbad6f5c1a -->
`<Spinner>` 或每秒更新一次的图表在两次更新之间仍视为空闲，因此带动画的页面依然可读。渲染间隔短于 50 ms 的应用永远不会空闲。读取会在 1.5 秒后停止等待（可通过 `settleMs` 调整），输出最新帧并将其标记为 `busy`。不指定文本的 `wait_for` 会使用自身的 `quietMs` 等待空闲，如果始终未进入空闲状态，则返回错误。

<!-- s:c5250c2f7a -->
坐标以单元格为单位，从 0 开始：`x` 是列，`y` 是行。CJK 字符和 emoji 等宽字符占两列。

<!-- s:7ff82431c5 -->
错误与日志

<!-- s:6e07cf8702 -->
stdout 用于传输协议。应用的 `console.*` 输出、额外的 `process.stdout.write` 调用和 React 错误会转入 `logs`，并附带编号，以便智能体通过 `since` 仅请求新条目。如果上次读取后记录了错误，下一帧的头部会注明。

<!-- s:9102068439 -->
失败会作为工具错误返回，绝不会导致崩溃。超时的工具会在下次调用运行前取消，因此缓慢的调用不会向下次调用的帧输入内容。带有 Text.js 错误码的错误会保留该错误码，例如未知按键对应的 `TX007`。如果应用加载失败，每个工具都会说明原因。修复文件后调用 `reload`。

<!-- s:d3ad6f781e -->
选项

<!-- s:c9c30c0da4 -->
| 选项 | 说明 |
| :-- | :-- |
| `--path <pathname>` | 初始路由（默认 `/`） |
| `--cols` / `--rows` | 网格尺寸（默认使用 `text.config.ts` 中的 `viewport`，否则为 100×32） |
| `--theme <name>` | 主题预设 |
| `--no-config` | 忽略 `text.config.ts` |
| `--verbose` | 同时将捕获的日志写入 stderr |

<!-- s:5ae438610c -->
工作原理

<!-- s:7c71219a13 -->
`text mcp` 与 [`text run`](/docs/terminal) 以相同方式运行应用：预先导入所有路由模块，App Router 使用内存历史记录，同源 `fetch("/api/…")` 调用在进程内运行你的处理程序。帧输出到离屏单元格网格，而非终端。服务端渲染的页面（`export const runtime = "server"`）及其 `async function` 组件与 `text dev` 一样在进程内渲染，待它们完成后再读取帧。

<!-- s:c965dcc0e4 -->
`reload` 会卸载应用，从 Bun 的模块缓存中清除所有项目模块（包括 `app/` 之外的文件），重新扫描 `app/`，并在当前位置重新挂载。

<!-- s:19d6f0da69 -->
要将服务器嵌入你自己的进程，或使用其他传输方式：

<!-- s:68c8d3995f -->
限制

<!-- s:910af21777 -->
- 应用在 Bun 中运行，不在浏览器中运行。与 `text run` 一样，`window` 和 `document` 均未定义。
- 每个服务器运行一个应用，使用一个网格。每个 MCP 客户端启动自己的服务器。
- `text mcp` 运行独立的应用无头副本。它无法连接到在 `text dev` 下打开的浏览器标签页。
