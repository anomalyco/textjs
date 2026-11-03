<!-- s:8f3fd7167d -->
Text.js 的 VS Code 扩展在代码旁显示控制台帧。它会镜像 `text dev` 下运行的应用，或在没有应用运行时直接渲染打开的文件。它还提供 App Router 脚手架、代码片段和 `TX###` 错误代码链接。

<!-- s:98304b8243 -->
安装

<!-- s:80e247d2f7 -->
从 Visual Studio Marketplace 安装 [Text.js](https://marketplace.visualstudio.com/items?itemName=textjs.vscode-textjs)。在 VS Code 中，打开“扩展”视图（`⌘⇧X`）并搜索 `textjs.vscode-textjs`，或运行：

<!-- s:fd2344ec36 -->
扩展会在包含 Text.js 应用的任何文件夹中激活：其中有 `text.config.ts`，或有一个依赖 `@textjs/app` 且包含 `app/` 目录的包。包含多个应用的 Monorepo 也受支持。

<!-- s:74f1530aa8 -->
实时预览

<!-- s:d9807ea49d -->
打开 `page.tsx`、`layout.tsx` 或组件并运行 **Text.js: Open Preview**（`⌘K V`），或点击编辑器标题栏中的预览按钮。面板使用与浏览器控制台相同的 DevTools 界面和 Menlo 单元格绘制帧。

<!-- s:2f69f76b80 -->
预览从两个来源之一获取帧。工具栏中的标记显示当前使用的来源：

<!-- s:f81cef21bf -->
| 来源 | 使用条件 | 显示内容 |
| :-- | :-- | :-- |
| **实时** | `text dev` 正在运行，且浏览器标签页已打开应用 | 实际应用，包括状态、数据和网格大小 |
| **无头** | 没有开发服务器，或没有打开的标签页 | 由扩展按面板大小渲染的当前文件 |

<!-- s:f40888c2bb -->
`auto`（默认值）在可用时使用实时模式，否则使用无头模式。通过标记或 `textjs.preview.mode` 固定使用其中一种模式。

<!-- s:fd587df6f1 -->
键盘

<!-- s:9ce66a1aa7 -->
点击控制台即可向应用发送按键：方向键、`Tab`、快捷键、输入和粘贴都能使用，与浏览器中一样。点击控制台外部即可停止。`⌘P` 和 `⌘⇧P` 等编辑器快捷键仍由 VS Code 处理。在控制台上滚动会发送滚轮事件。

<!-- s:0910b5fd48 -->
在地址栏中输入路由，例如 `/deployments/dpl_a1`，即可在任一来源中导航。

<!-- s:4507d73bb4 -->
实时模式

<!-- s:787b87d328 -->
预览打开时，开发服务器会请求已连接的标签页持续发送帧。标签页只发送发生变化的行，并在预览关闭时停止发送，因此未打开预览的应用不会产生额外开销。保存文件会触发 Fast Refresh，预览随标签页一起更新。

<!-- s:86ae14b746 -->
开启**跟随**（`textjs.preview.followEditor`），即可将浏览器标签页切换到正在编辑的 `page.tsx` 对应的路由。

<!-- s:68839106d6 -->
后台标签页不会收到动画帧，因此通常会保持当前帧，直到再次可见。预览正在监听时，后台标签页一收到输入就会绘制一帧，因此在预览中输入仍会触发更新。后台标签页中的动画大约每秒更新一次。将应用放在独立窗口中，以保持动画流畅。

<!-- s:1ae6e7077f -->
无头模式

<!-- s:1cddf967be -->
扩展会在项目中启动一个小型运行器。它通过项目自身的 Vite 和 `@textjs/app` 加载路由文件，因此别名、TypeScript 和 JSX 的行为与 `text dev` 中一致。它使用内存历史记录，在打开文件对应的路由处挂载 App Router 及其布局：

<!-- s:23d9451fef -->
| 文件 | 预览 |
| :-- | :-- |
| `app/page.tsx` | `/` |
| `app/(shop)/items/[id]/page.tsx` | `/items/id`（动态路由段使用自身名称） |
| `app/blog/[[...slug]]/layout.tsx` | `/blog` |
| `components/Card.tsx` | 默认导出或第一个 PascalCase 命名的导出，不传入 props |

<!-- s:f111cbfc61 -->
同源 `fetch("/api/...")` 调用会在进程内运行 `route.ts` 处理程序，与 [`text run`](/docs/terminal) 一致。网格随面板大小调整，保存应用中的任何文件都会重新渲染。错误显示在帧上方，并附有对应 `TX###` 页面的链接。

<!-- s:36cd3f2bb4 -->
命令

<!-- s:d542a683ff -->
| 命令 | 说明 |
| :-- | :-- |
| Text.js: Start Dev Server | 在终端中运行 `dev` 脚本（或 `text dev`） |
| Text.js: Stop Dev Server | 停止从 VS Code 启动的开发服务器 |
| Text.js: Open Preview | 打开当前文件的实时预览 |
| Text.js: Open in Browser Console | 在开发服务器上打开当前路由。然后[打开浏览器控制台](/docs/installation#open-the-console) |
| Text.js: New Page | 包含元数据和带类型的 `params` 的 `app/<route>/page.tsx` |
| Text.js: New Layout | `app/<route>/layout.tsx` |
| Text.js: New Route Handler | 包含 `GET` 和 `POST` 的 `app/<route>/route.ts` |
| Text.js: New Loading UI / Error Boundary / Not Found Page | `loading.tsx`、`error.tsx`、`not-found.tsx` |

<!-- s:87b5f49afb -->
脚手架命令也位于资源管理器的文件夹右键菜单中。这些命令接受 `settings`、`blog/[slug]`、`docs/[...path]` 和 `(marketing)/about` 等 [App Router](/docs/routing) 段，且不允许将 `page` 和 `route.ts` 放在同一段中。JavaScript 项目（没有 `tsconfig.json`）会生成 `.jsx` 和 `.js` 文件。

<!-- s:9ba0c1b237 -->
代码片段

<!-- s:193db2a68e -->
| 前缀 | 插入内容 |
| :-- | :-- |
| `txpage`, `txlayout`, `txloading`, `txerror` | 以所在文件夹命名的路由文件 |
| `txc` | 以文件命名的控制台组件 |
| `txroute`, `txroutep` | 带参数或不带参数的路由处理程序 |
| `box`, `boxb`, `text`, `scrollbox`, `link`, `spinner` | 组件 |
| `input`, `select`, `tabs` | 交互组件 |
| `useInput`, `useKeymap`, `useFocus`, `useTheme`, `useViewport`, `useRouter`, `useInterval` | Hook |
| `metadata`, `txconfig` | 路由元数据和 `text.config.ts` |

<!-- s:a6e574a6aa -->
错误代码

<!-- s:5e9e2a4649 -->
将鼠标悬停在任意位置的 `TX###` 代码上：源代码、日志、“输出”面板或粘贴的堆栈跟踪中均可。悬停提示会显示标题、消息和所属包，并附上 textjs.org 对应页面的链接。每个代码本身也是链接（按住 `⌘` 点击）。

<!-- s:b67d013d7e -->
状态栏

<!-- s:be63ef7ae2 -->
`▼` 项显示开发服务器状态和控制台网格大小，例如 `▼ :3000  120×36`。标签页大小每次变化时都会向开发服务器报告，即使没有打开预览。点击该项可查看主要命令。

<!-- s:5b827aed4d -->
设置

<!-- s:457ec968c0 -->
| 设置 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `textjs.preview.mode` | `auto` | `auto`、`live` 或 `headless` |
| `textjs.preview.followEditor` | `false` | 实时模式：跟随正在编辑的路由 |
| `textjs.preview.fontSize` | `12` | 单元格字号（DevTools 使用 12） |
| `textjs.preview.runtime` | | 无头预览使用的 Node.js 二进制文件（默认：VS Code 自带的版本） |
| `textjs.devServer.url` | | 开发服务器 URL（默认：在端口 3000～3010 上发现）。仅使用 `http://` 回环地址 |
| `textjs.devServer.command` | | Start Dev Server 使用的命令 |

<!-- s:ea5e740ef1 -->
工作区信任

<!-- s:ddcdd0b053 -->
预览和开发服务器会运行项目代码（Vite 配置、`text.config.*` 和组件）。在受限模式下，扩展仅提供代码片段、脚手架和错误链接，并忽略工作区设置中的 `textjs.preview.runtime`、`textjs.devServer.command` 和 `textjs.devServer.url`。信任工作区即可开启预览。工作区文件夹以外的文件不会被预览。

<!-- s:5ae438610c -->
工作原理

<!-- s:857bac4692 -->
`text dev` 为编辑器提供 3 个端点。它们仅响应发往回环主机（`localhost`、`127.0.0.1`、`[::1]`）的回环连接，且请求必须不带 `Origin` 或与开发服务器同源。浏览器的跨站请求和 `no-cors` 请求会被拒绝：

<!-- s:2345c81baf -->
| 端点 | |
| :-- | :-- |
| `GET /__textjs/status` | 项目根目录、已连接的标签页、网格大小和当前路由 |
| `GET /__textjs/frames` | 服务器发送事件：每次变化发送一个 `frame` 事件，编码为行增量 |
| `POST /__textjs/input` | 发给标签页的按键、粘贴、输入法或死键文本（`text`）、滚轮或导航操作。要求使用 JSON 并携带 `x-textjs-mirror: 1` 请求头，因此其他网站无法发送按键 |

<!-- s:6693972af6 -->
标签页通过 Vite 的 HMR 套接字向开发服务器发送帧，该连接需要每个服务器独有的令牌。如果你想构建自己的查看器，可使用 `@textjs/app/frame-protocol` 导出的传输格式（`FrameEncoder`、`FrameDecoder`、`parseInputMessage`）。这些内容都不会出现在 `text build` 的输出中。
