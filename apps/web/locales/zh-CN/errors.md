<!-- s:c88a0b9074 -->
成功

<!-- s:232761cbc8 -->
未发生错误。

<!-- s:0dbfdefc62 -->
无需操作。

<!-- s:5278892fa4 -->
Yoga 尚未初始化

<!-- s:3cc543df2e -->
布局运行在 Yoga 上，Yoga 以 WebAssembly 形式提供，必须在第一帧之前实例化。在 `initYoga()` 完成之前，有代码同步创建了场景节点或根节点。

<!-- s:08db9c8a11 -->
使用异步根节点辅助函数，它们会为你初始化 Yoga：

<!-- s:0cc02c96a3 -->
如果需要使用 `createConsoleRootSync()` 或直接操作核心场景图，在启动时等待一次 `initYoga()` 完成：

<!-- s:0f5cc351a1 -->
通过 `text dev` 启动的应用不会出现此错误。

<!-- s:cebca37b05 -->
在控制台根节点之外渲染

<!-- s:c3b259f977 -->
Text.js Hook 或组件（`useInput`、`<ScrollBox>` 等）在非控制台根节点的 React 根节点下渲染，最常见的情况是用 `react-dom` 渲染了面向控制台的组件。

<!-- s:6f1ee54e3e -->
通过 `renderToConsole`（或 `createConsoleRoot`）渲染控制台组件，不要使用 `react-dom`：

<!-- s:c7cb019122 -->
要在页面上显示相同的 UI，使用 `@textjs/react/dom` 中的 `<TextCanvas>`，它会创建自己的控制台根节点。

<!-- s:b657e4704a -->
未知宿主元素

<!-- s:a8bb5bc9a5 -->
协调器只识别两种内置元素：`tx-box` 和 `tx-text`。它收到了 `<div>` 或 `<span>` 这样的小写元素。

<!-- s:407e421c11 -->
改用导出的组件：

<!-- s:2381168639 -->
<Box> 嵌套在 <Text> 内

<!-- s:2e17219271 -->
`<Text>` 用于布局一段行内文本，不能包含 Flexbox 容器。`<Box>`（或渲染 `<Box>` 的组件，如 `<Spacer>` 或 `<Divider>`）在 `<Text>` 内渲染了。

<!-- s:cd12727fb7 -->
将 `<Box>` 移到外部，把同级文本并排放在一行中：

<!-- s:0346a73e37 -->
可以嵌套 `<Text>`，它会渲染为行内 span。

<!-- s:32864d644a -->
卸载后渲染

<!-- s:c194b81d64 -->
在控制台根节点调用 `root.unmount()` 后，又调用了 `root.render()`。已卸载的根节点已释放其渲染器和输入监听器。

<!-- s:4d43c601c1 -->
创建新的根节点，或保持根节点挂载并渲染另一棵树：

<!-- s:41d1a6160d -->
在测试中，从异步回调触发渲染前，检查 `root.unmounted`。

<!-- s:c5d7700094 -->
组合键中存在未知修饰键

<!-- s:7729dd7762 -->
组合键中最后一个 `+` 之前的每一部分都必须是修饰键：`ctrl`、`alt`（`option`）、`shift`、`meta`（`cmd`）或 `mod`（Apple 平台上为 `⌘`，其他平台上为 `Ctrl`）。

<!-- s:d5ba2b08ed -->
组合键中存在未知按键

<!-- s:a68eb32bc2 -->
组合键的最后一部分必须是单个字符、具名按键（`enter`、`escape`、`tab`、`up`、`pagedown`、`space` 等）或功能键（`f1`–`f12`）。

<!-- s:69f231367c -->
按键序列用空格分隔每次击键（`"g g"`）。备选按键用逗号分隔（`"j, down"`）。

<!-- s:92663abe8d -->
空组合键

<!-- s:aa16466cb6 -->
组合键结束时缺少按键，例如 `"ctrl+"` 或 `""`。

<!-- s:13284de673 -->
指定按键。要绑定加号键本身，写成 `"ctrl++"`：

<!-- s:f329e5f580 -->
应为单次击键

<!-- s:95712ddbf5 -->
一次按键操作对应一次具体的击键。`keyEventFromCombo()` 收到了 `"g g"` 这样的序列，或 MCP `press` 工具收到了 `"a,b"` 这样的备选按键。

<!-- s:0348879743 -->
为每次击键构建一个事件。测试中的 `app.press()` 和 MCP `press` 工具会为你拆分以空格分隔的序列：

<!-- s:467193a3d5 -->
renderToTerminal 缺少 stdout

<!-- s:76fa9d629b -->
`renderToTerminal()` 默认将 ANSI 帧写入 `process.stdout`。当前运行环境（浏览器、worker）没有 `process.stdout`，也未传入 `stdout` 选项。

<!-- s:90c3d0ac1f -->
在 Bun 或 Node 下运行，或传入可写流：

<!-- s:d3a77e5829 -->
在浏览器中，改用 `renderToConsole`。

<!-- s:f201fe8e80 -->
<Image src> 缺少 DOM

<!-- s:b9f409f560 -->
`<Image src>` 通过 `<img>` 和 canvas 解码图像。当前环境（终端、服务器、测试）没有 `document`，因此无法加载该 URL。

<!-- s:3c284cd278 -->
自行解码图像并传入 RGBA 像素：

<!-- s:775d3d31e6 -->
<Image> 无法使用 2D 画布

<!-- s:7da15f3e88 -->
浏览器拒绝提供 `2d` 画布上下文，通常是因为策略或防指纹追踪功能禁用了画布，或页面的 GPU 内存已耗尽。

<!-- s:59ad35999f -->
传入在其他地方解码的 `pixels`，或渲染 `alt` 备用文本。`<Image>` 在加载失败时会显示 `alt` 文本：

<!-- s:ca446b6432 -->
<Image> 加载失败

<!-- s:f11b7bffe8 -->
图像请求失败：可能是 404、网络错误，或跨源服务器未发送 `Access-Control-Allow-Origin`。像素从画布中读取，因此跨源图像需要 CORS。

<!-- s:5e5daf0ad8 -->
从同源位置（`public/`）提供图像，或在图像服务器上启用 CORS：

<!-- s:aca80fe237 -->
在 <AppRouter> 外部使用

<!-- s:0fca8db90b -->
`useRouter`、`usePathname`、`useParams`、`useSearchParams`、`useAppTheme` 和 `<Link>` 读取 `<AppRouter>` 提供的状态。组件在 `<AppRouter>` 外部渲染，通常发生在独立的 `renderToConsole` 调用或单元测试中。

<!-- s:0dd134139b -->
使用 `text dev`、`text start` 或 `text run` 运行应用，这些命令会挂载 `<AppRouter>`。手动渲染时（测试、嵌入场景），挂载路由器而非页面：

<!-- s:f72dd41076 -->
路由文件没有默认组件

<!-- s:bb105b223b -->
`page`、`layout`、`loading`、`error` 和 `not-found` 文件必须通过 `export default` 导出 React 组件。此文件没有默认导出，或导出的值不是函数。

<!-- s:737da9f930 -->
路由处理程序未返回 Response

<!-- s:cb8f799843 -->
`route.ts` 处理程序返回了 `undefined`（或其他非 `Response` 值），通常是某个分支缺少 `return`。

<!-- s:ec7e161fb3 -->
在每个分支中返回 `Response`：

<!-- s:62e5198b56 -->
没有生产构建

<!-- s:6668a2f9b4 -->
`text start` 提供 `text build` 的输出，但输出目录（`outDir`，默认为 `dist`）中没有构建产物。

<!-- s:498f1313ed -->
如果你在 `text.config.ts` 中更改了 `outDir`，请在同一项目根目录下运行这两个命令。

<!-- s:dfda64bc1d -->
没有 app/ 目录

<!-- s:38ac920023 -->
`text run` 在终端中渲染 App Router，但未能找到路由目录。

<!-- s:6853e006ef -->
从项目根目录运行，或传入项目目录：

<!-- s:5a6362131f -->
text run / text mcp 需要 Bun

<!-- s:773405124b -->
`text run` 和 `text mcp` 直接导入 `.tsx` 路由文件，这需要 Bun 的原生 TypeScript 加载器。使用 Node 启动时，如果 `PATH` 中有 `bun`，CLI 会使用 Bun 重新运行自身；此错误表示未找到 `bun`。

<!-- s:6f7a84fdc6 -->
安装 [Bun](https://bun.sh)，或直接使用 Bun 运行命令：

<!-- s:c6dc53e7c3 -->
`text dev`、`text build` 和 `text start` 可在 Node 上运行。

<!-- s:89a2fef8aa -->
未知的 CLI 命令

<!-- s:eba41925ed -->
`text` CLI 有 6 个命令：`dev`、`build`、`start`、`run`、`proxy` 和 `mcp`。

<!-- s:8399f0df32 -->
没有 `text deploy` 命令。使用 `text build --adapter <name>` 为目标平台构建，再通过该平台的 CLI 部署输出。参见[部署](/docs/deploying)。

<!-- s:ca76fd96a5 -->
无效的 OpenCode 服务器 URL

<!-- s:486a7eb67b -->
`--target`（或 `OPENCODE_SERVER_URL`）必须是纯 HTTP(S) 源地址。提供的地址包含路径、查询、片段或凭据。URL 中的凭据会进入日志和浏览器历史记录。

<!-- s:a2f7bb7ff8 -->
改用 `OPENCODE_PASSWORD` 设置服务器密码。

<!-- s:f606233e6c -->
桥接端口与 OpenCode 冲突

<!-- s:8780127b8f -->
桥接程序配置的本地监听端口与其代理的 OpenCode 服务器端口相同。

<!-- s:0b359d8121 -->
桥接程序已在运行

<!-- s:76e9990092 -->
另一个桥接程序（`bunx @textjs/opencode@latest proxy` 或 `text proxy`）已在监听此端口。你可以连接到该程序，无需再启动一个。

<!-- s:d5c7dd3e92 -->
连接到正在运行的桥接程序，或在其他端口启动第二个桥接程序：

<!-- s:20a5f0b929 -->
桥接端口已被占用

<!-- s:4fb3fcf34c -->
请求的端口正由 Text.js 桥接程序以外的程序监听。

<!-- s:4a35b098e4 -->
或查找占用端口的进程：`lsof -i :4096`。

<!-- s:f694899be6 -->
未知模板

<!-- s:13309ae8df -->
`--template` 必须指定一个内置模板：`starter`、`dashboard` 或 `opencode`。

<!-- s:162e762178 -->
目标目录不为空

<!-- s:24518256d0 -->
create-text-app 只在新目录或空目录中创建项目，因此不会覆盖你的文件。目录中可以有 `.git` 目录和编辑器文件夹（`.vscode`、`.idea`）。

<!-- s:2d505908ff -->
选择一个新的目录名：

<!-- s:0c1a816fb9 -->
项目名称无效

<!-- s:46e6e56ab7 -->
目录名会成为 `package.json` 中的名称，必须是有效的 npm 包名：使用小写字母、适用于 URL、最多 214 个字符，且不能是 `textjs`、`react`、`react-dom`、`node_modules` 或 `favicon.ico`。

<!-- s:5aa32a2677 -->
主机被阻止

<!-- s:7c7e94bc6b -->
`text dev` 以及绑定到回环地址（默认设置）的 `text start`，只响应发往 `localhost`、`*.localhost` 名称或 IP 地址的请求。这可防止 DNS 重绑定攻击。收到的请求使用了其他 `Host` 请求头，通常来自隧道、反向代理或局域网主机名。

<!-- s:8caece973a -->
在 `text.config.ts` 中允许该主机。`text dev` 读取 Vite 的 `vite.server.allowedHosts`，`text start` 读取 `server.allowedHosts`。开头的 `.` 表示允许子域名：

<!-- s:2c7d7369a1 -->
`text start --host` 使用回环地址以外的任何地址时都会跳过此检查。参见[使用代理](/docs/deploying#behind-a-proxy)。

<!-- s:5bb33b3415 -->
未知的 text.config 选项

<!-- s:5117146873 -->
`text.config.ts` 导出了 Text.js 不读取的键，通常是拼写错误（将 `basePath` 写成 `basepath`），或将 Vite 选项放在了顶层。

<!-- s:31ae46d91d -->
修正拼写，或将 Vite 选项移到 `vite` 下：

<!-- s:7f45c35d94 -->
`defineConfig` 会对配置进行类型检查，在编辑器中发现这些问题。

<!-- s:d1de5d5931 -->
服务端渲染的路由需要持续运行的服务器

<!-- s:d06541fc12 -->
某个页面导出了 `runtime = "server"`：页面在服务器上渲染，并通过会话向每个打开的标签页流式传输帧，会话的存续时间与标签页相同。静态托管服务、Vercel Functions 和 Cloudflare Workers 无法维持这些会话，因此 `text build --adapter static|vercel|cloudflare` 会拒绝构建该应用，避免发布无法渲染的路由。

<!-- s:27f8e0c99e -->
使用持续运行的服务器部署：

<!-- s:3ba9e63872 -->
或者移除该导出，在浏览器中渲染路由：

<!-- s:b39194c0e6 -->
无效的 dynamic 导出

<!-- s:218844a290 -->
某个路由处理程序导出的 `dynamic` 值不受 Text.js 支持。Next.js 还接受 `"error"`，该值会静态渲染路由，并在路由读取请求数据时使构建失败。Text.js 无法检测请求读取，因此拒绝接受 `"error"`。

<!-- s:78a6bdcb90 -->
使用 `"force-static"` 缓存处理程序。缓存的处理程序收到的请求不包含查询字符串、请求头、Cookie 或请求体：

<!-- s:95d0435b57 -->
如果处理程序读取请求，使用 `"force-dynamic"`，或移除该导出。参见[缓存](/docs/caching)。
