<!-- s:f70688822a -->
本文件记录 Text.js 的所有重要变更。

<!-- s:1ab5f276ed -->
格式基于[维护更新日志](https://keepachangelog.com/en/1.1.0/)，本项目遵循[语义化版本](https://semver.org/spec/v2.0.0.html)。0.1.0 至 0.4.0 版本仅在 git 中打了标签，未发布到 npm。

<!-- s:5b88618770 -->
变更

<!-- s:f7da7bb6d2 -->
- `@textjs/core`：Chromium 和 Firefox 控制台在动画精灵输出达到 16 MB 时清空，不再是 4 MB，因此 textjs.org/doom 约每 19 秒显示一次“控制台已清空”，而非每 4.5 秒。Safari 和以 `▀` 半块绘制的精灵仍保留 4 MB 限制。textjs.org/doom 页面的堆内存峰值从 10.8 MB 增至约 12–13 MB。

<!-- s:2e16922cfc -->
新增

<!-- s:125517f5e0 -->
- textjs.org/doom 播放 Doom 音效，使用 Doom 自带的立体声声像和距离衰减。首次在页面上点击或按键后开始播放声音，随游戏暂停，音量遵循 Doom 的 Options → Sound Volume 菜单中的 Sfx Volume 设置。没有音乐。

<!-- s:144aa59e73 -->
- `@textjs/react`、`@textjs/app`：焦点提示（“点击页面以使用键盘”）在所有主题中均为琥珀色条，配以黑色粗体文字。此前使用主题的反转配色。每次出现时，会在约 6 秒内闪烁 4 次，然后保持琥珀色。开启减少动态效果时不会闪烁。每轮闪烁周期最多额外记录 8 个控制台帧。
- textjs.org：Doom 已移至 textjs.org/doom。textjs.org/playground/doom 会重定向到该地址。

<!-- s:afe76b8d59 -->
修复

<!-- s:b91de36548 -->
- `@textjs/core`、`@textjs/react`：Chrome 的“问题”面板不再在每个页面上报告“表单字段元素应具有 id 或 name 属性”。隐藏的键盘 `<textarea>` 命名为 `textjs-input`，`ViewportControl` 的控制台尺寸 `<select>`（也用于 `FocusPad` 的 `sizeControl`）具有 `id` 和名称 `textjs-console-size`。键盘 `<textarea>` 也禁用了 1Password、LastPass、Bitwarden 和 Dashlane 的处理。
- textjs.org：textjs.org/doom 上的控制台标题改为“Text.js / doom”，不再是“Text.js / playground / doom”。
- textjs.org/doom：窄窗口中，“查看源码”后不再残留多余的“·”。
- textjs.org：窄窗口中，Playground 的演示选择器会在仍有更多演示可滚动查看的边缘渐隐，不再从单词中间截断最后一项。
- textjs.org/doom 以 Doom 每秒 35 个 tic 的速度运行。此前在关卡中，60 Hz 显示器上运行速度为正常的 3.8 倍（每秒 131 个 tic），120 Hz 下为 5.5 倍（192），因为页面将 Doom 绘制关卡时额外读取时钟的操作误判为忙等待，并在每次动画帧和定时器回调时将 Doom 时钟向前推进一个 tic。

<!-- s:14d523690c -->
- `@textjs/react`：`<Image renderMode="halfblock">` 在所有环境中绘制 `▀` 半块，与 1.3 中的 `<Image>` 相同。
- `@textjs/core/experimental`：`drawPixels` 支持 `encoding: "rgba"`，用于具有柔和 alpha 透明度且超过 256 色的无损精灵，还支持 `fallback` 函数，在无法显示精灵的地方绘制单元格。
- `@textjs/app`：在 `text dev`、`text start` 以及 `bun`、`vercel` 和 `cloudflare` 适配器上，curl、Wget、HTTPie 和 xh 会以真彩色 ANSI 文本获取页面的首帧，而非 HTML 页面。`text build` 为静态页面预渲染帧。`text start` 和 `bun` 按请求渲染动态页面及服务端渲染的页面，并对未知路径返回应用的未找到页面和 `404`。帧的默认尺寸为 80 × 24。使用 `text.config.ts` 中的 `ansi` 或页面中的 `export const ansi` 更改尺寸或关闭帧。`static` 适配器向 curl 返回 HTML 页面。参见 [curl 和终端客户端](https://textjs.org/docs/curl)。
- `@textjs/app/ansi` 导出 `wantsAnsi` 和 `ansiResponse`，供不使用 `text start` 或适配器的服务器使用，`@textjs/react` 导出 `frameToAnsi`。
- textjs.org：textjs.org/ja 提供日语草稿版，先涵盖简介、安装和路由文档以及网站界面。尚未翻译的段落显示为英语。目前尚未建立索引，也未在语言选择器中提供。

<!-- s:f489f8e451 -->
- `@textjs/react`：`<Image>` 现在在 Chromium 和 Firefox 控制台中绘制像素精灵，像素画每个单元格最多使用 8 × 16 像素，照片使用 4 × 8 像素。此项有意打破[支持政策](https://textjs.org/docs/support-policy)中次要版本之间帧外观保持一致的承诺。传入 `renderMode="halfblock"` 可保留 1.3 的半块。Safari、终端（包括 `text run`）、ANSI 和纯文本输出，以及服务端渲染的页面（`runtime = "server"`）仍绘制半块。
- `@textjs/app`：使用 curl、Wget、HTTPie 或 xh 获取页面的脚本和可用性检查现在会收到 ANSI 文本。要继续获取 HTML，请发送 `Accept: text/html`，或在 `text.config.ts` 中设置 `ansi: false`。
- `@textjs/app`：`text build` 预渲染页面外壳时不再运行异步服务端组件。它们仍像以前一样显示 `<Suspense>` 后备内容，但不会在构建时发起数据请求。
- `@textjs/app`：服务端渲染页面的帧播放器缩小了 3 KB，`examples/dashboard` 的 gzip 大小从 25.4 KB 降至 22.4 KB。不再包含 `CellBuffer` 的绘制方法、框边框或文本截断功能。

<!-- s:ba0b1ea778 -->
- `@textjs/core`：图表和加载指示器在 Windows 10 上保持网格对齐。其控制台字体为 Consolas，缺少 ▁▂▃▅▆▇ 八分之一块、象限块、盲文、▶ 和 ✓，这些字符的后备字形会使行超出帧的右边缘。`CssConsoleDriver` 现在会测量一次，找出控制台字体绘制偏差超过五分之一单元格的字形，并以 Consolas 中最接近的字形绘制：八分之一块使用 `_` `▄` `▌` `█`，象限块和盲文使用半块，箭头、勾和叉使用 `►` `◄` `√` `×`。能够正确容纳这些字形的字体，如 Windows 11 上的 Cascadia Mono 和 macOS 上的 Menlo，仍绘制原字形。`measureText: false` 可关闭此行为。
- `@textjs/core`：Chrome 和 Edge DevTools 中相邻背景之间不再出现 1 px 的垂直细线，例如 textjs.org/coffee 中“account”和“qty”旁的细线。Chromium 会将每个 `%c` span 分别对齐到设备像素，可能使两个 span 交界处的像素不属于任何一方。`CssConsoleDriver` 现在将 span 的背景向右侧不透明相邻项下方延伸 1 px（`padding-right:1px;margin-right:-1px`）。Firefox 和 Safari 的帧不变。
- `@textjs/core`：Chrome 和 Edge 中的 `<Image>` 精灵遵循与文本相同的 1 px 规则。透明精灵左侧的文本不再将 1 px 宽的背景条绘制到精灵左边缘上，精灵也会与右侧不透明文本紧密衔接，包括反色文本。独占所在行的精灵现在会延伸到帧的右边缘，与其上下的文本行一致。
- `@textjs/react`：`<ConsoleMirror>` 现在像控制台一样，将文本旁的照片绘制为半块，而非直接显示图像。

<!-- s:757b866128 -->
- `@textjs/react/experimental` 导出用于实时帧缓冲区的 `<Pixels>` 和用于持续按键的 `useKeyState`；`@textjs/core/experimental` 导出 `drawPixels`。这些 API 可能在次要版本中变更。
- textjs.org/playground/doom：在 DevTools 控制台中游玩 Doom 共享软件版章节。
- `@textjs/react`、`@textjs/app`：页面失去焦点时，控制台帧的最后一行会显示“点击页面以使用键盘”，让在控制台中点击应用的访客知道按键为何停止响应。应用具有 `useInput` 或 `usePaste` 处理程序或焦点目标时会显示此提示，仅在浏览器控制台中显示，也包括服务端渲染的路由。内嵌镜像和 VS Code 预览不会显示。在 `text.config.ts` 或 `createConsoleRoot` 中设置 `focusHint: false` 可将其关闭。
- `@textjs/react`：`usePageFocus()` 返回页面是否具有焦点。要自行决定应用何时需要键盘，请设置 `focusHint: false` 并渲染 `<FocusHint active={…}>`。`useInput(handler, { ambient: true })` 标记始终启用的快捷键，其本身不会触发提示。

<!-- s:c96685f5e0 -->
- `@textjs/core`：`<Pixels>` 精灵播放动画时，`ConsoleRenderer` 在 Chromium 中每 51 ms 批量处理关键帧，在 Safari 中将帧间隔设为 33 ms，并在 `CssConsoleDriver` 中于追加输出达到 4 MB（`SPRITE_MAX_BYTES`）时清空。静态精灵和纯文本应用保留原有的帧节奏和 300 帧清空限制。

<!-- s:34e1835d0a -->
- `@textjs/core`：`bindTextSink(element, onText)` 从隐藏的 textarea 或 input 中读取输入法或死键提交的文本，每次提交读取一次，不会在组字过程中读取。`engine.bindTextSink(element)` 将你自行渲染的 textarea 连接到 `InputEngine`。两者均返回用于移除监听器的函数。
- `@textjs/app`：`POST /__textjs/input` 接受 `{ type: "text", text }`，用于输入法和死键文本。`@textjs/app/frame-protocol` 中的 `InputMessage` 和 `parseInputMessage` 已包含此类型。

<!-- s:60239a49b7 -->
- `@textjs/app`：中间件和路由处理程序接收规范路径。`/docs/` 和 `/docs//intro` 会以 `/docs` 和 `/docs/intro` 传入，因此通过重定向添加末尾斜杠的中间件现在会无限重定向。请移除该重定向。动态段不能包含编码后的斜杠：`/files/a%2Fb` 返回 `400`。
- `@textjs/app`：使用中间件时，`--adapter cloudflare` 将所有请求发送到 worker，包括带哈希的资源；设置 `basePath` 时，还会发送基础路径之外的请求。每个运行 worker 的请求都算一次 Functions 调用，并计入你的 Workers 请求配额。在 Workers Free 套餐中，将 Pages 项目设为失败时关闭（Settings → Runtime → Fail open / closed），否则每日配额耗尽后，Pages 将绕过中间件提供文件。

<!-- s:cb257a7494 -->
- 中文、日文和韩文输入法及死键现在可在 textjs.org 的内嵌控制台中使用。此前控制台会在组字过程中清空 textarea，导致应用收到原始字母或错误字符。
- `<FocusPad>` 在点击后会将键盘焦点保持在应用上。此前会立即丢失焦点，导致中文、日文和韩文输入法无法组字。
- 隐藏的 textarea 获得焦点时，未组合成字符的死键输入（Windows，以及未使用输入法的 Linux）现在能传递到应用。在 US-International 键盘布局中，先按 `'` 再按 `e` 得到 `é`，先按 `'` 再按 `t` 得到 `'t`。`InputEngine` 此前拦截了完成死键输入的 keydown，导致浏览器未插入任何内容。`@textjs/core` 中的 `DeadKeyTracker` 现在放行该 keydown，VS Code 预览也使用它。
- VS Code 预览现在会传递此前丢弃的输入法和死键文本，并且不再将死键或输入法组字按键转发给应用。连接 `@textjs/app` 1.1.0 或更早版本的 `text dev` 服务器时，会以按键或粘贴形式发送文本。
- `@textjs/core`：`shouldCapture` 返回 `false` 时，`InputEngine.handleTextInput` 会忽略文本，与按键和粘贴输入的现有行为一致。
- `text dev` 预打包 `@textjs/app/live-stub` 和 `@textjs/app/live-player`。含有 `runtime = "server"` 页面的应用此前仅在首次页面加载后才发现它们，因此 Vite 会在加载过程中再次打包，导致旧分块返回 404，并因存在两份 React 而报出“无效的 Hook 调用”。
- 图表和加载指示器在 Windows 上不会超出帧。Consolas 缺少 ▁▂▃▅▆▇ 块、象限块、盲文、▶ 和 ✓，因此 Windows 使用后备字体绘制，宽度最高达 1.8 个单元格，导致图表行超出帧的右边缘。控制台字体栈现在为 `"SF Mono",Menlo,"Cascadia Mono",Consolas,monospace`，Windows 11 使用 Cascadia Mono 绘制整个帧。`<ConsoleMirror>`、VS Code 预览和 DevTools 扩展的帧视图也将 Cascadia Mono 放在 Consolas 之前。
- `@textjs/opencode`：在 Windows 的 Node 环境中，桥接程序现在能找到通过 `npm i -g opencode-ai` 安装的 OpenCode。Node 无法按名称启动 npm 的 `opencode.cmd` 垫片，因此桥接程序此前会认为 OpenCode 未安装。现在会使用每个 `PATHEXT` 扩展名搜索 `PATH`，并通过 `cmd.exe` 运行 `.cmd` 垫片。在 Bun（`bunx`）下此前已可正常运行。
- `text build` 现在可在 Windows 上运行。此前所有模板都会失败，报出 `Could not resolve entry module "virtual:textjs/api"`，或不显示错误消息。
- `text build` 在预渲染控制台外壳或构建服务端渲染的路由失败时会打印错误。此前仅在 Vite 的“构建失败”一行后以退出码 1 退出，不显示原因。
- Windows 上的 `text dev` 会在你编辑文件时重新渲染服务端渲染的路由，并在页面更改 `runtime` 导出时重新加载浏览器。
- Windows 上的 `text dev` 不再对 Vite 作为模块提供的源文件（如 `/app/page.tsx`）运行 `middleware.ts`，因此身份验证重定向不再破坏开发客户端。
- 项目路径包含 Windows 8.3 短文件名（如 `C:\Users\RUNNER~1`）时，`text run` 和 `text mcp` 现在可正常运行。此前因 CLI 和应用重复加载 `@textjs/app` 而显示“应用错误”。
- Windows 上构建的 `dist/` 现在可在 Linux 和 macOS 上提供预渲染页面。此前实时路由清单以反斜杠存储路径。
- 在 `text.config.ts` 的 `vite` 选项中设置 `build.rollupOptions.input` 时，`text build` 现在可正常运行。此前该输入会替换 API、服务端渲染路由和适配器打包的入口，导致构建失败。
- 在页面加载后的最初几秒内停止 `text dev` 时，现在会退出，`server.close()` 也会完成。此前在 Vite 优化新发现的依赖时关闭它会一直无法完成（vitejs/vite#22934）。

<!-- s:a4ff72c5e8 -->
安全

<!-- s:a3a674d458 -->
- `@textjs/app` 1.1.0 及更早版本允许请求通过改写受保护路径来跳过 `middleware.ts`，例如 `/ad%6din`、`/api//admin` 或 `/admin%2Fx`。中间件按收到的原始路径匹配，而页面、路由处理程序和静态文件则在解码后查找（路由处理程序会解码两次）。这影响 `text dev`、`text start` 以及 `--adapter bun`、`vercel` 和 `cloudflare` 构建。静态构建无法使用中间件，因此不受影响。升级到 1.2.0，然后重新构建并部署：Vercel 部署 `.vercel/output`，Cloudflare Pages 部署 `dist/`，Bun 部署整个 `dist/`（重启服务器）。删除仍可通过各自 URL 访问的旧部署，或为其添加保护。
- 每个宿主现在为每个请求计算一个规范路径名，并将其用于匹配器、`request.nextUrl` 和所有查找。它会解码百分号转义，并按 `new URL()` 的写法重新编码路径，解析 `.` 和 `..` 段，移除重复斜杠和末尾斜杠。含有 `%2F`、`%5C` 或无效百分号编码的路径会收到 `400`。`text dev`、`text start` 和 Bun 适配器仅按精确名称提供静态文件，因此在 macOS 和 Windows 上，`/ADMIN/report.txt` 不再返回 `public/admin/report.txt`。
- 匹配器、重写来源、路由段和 `basePath` 以与请求路径相同的编码形式比较，因此 `matcher: "/café/:path*"` 和 `"/caf%c3%a9/:path*"` 会保护 `/caf%C3%A9`，`"/ops%40corp/:path*"` 会保护 `/ops@corp`。没有匹配器的中间件不会在 `basePath` 之外运行。带末尾斜杠的匹配器（如 `/admin/`）会匹配 `/admin`，`host` 条件会忽略主机名末尾的点。
- `runtime = "server"` 路由的实时会话不会渲染由中间件重写到其他路径或查询的页面，例如从 `/restricted` 重写到 `/login`，也不会渲染中间件以错误状态响应的页面，例如 `NextResponse.next({ status: 403 })`。
- `--adapter vercel`：路由处理程序函数从仅由生成路由设置的请求头中获取路径，因此 `/api/x/%252e%252e/admin` 不再访问 `/api/admin`，任何写法的 `/_textjs/*` 也都不会运行该函数。生成的路由区分大小写，因此 `/LEGACY/x` 不再命中未经中间件检查的 `/legacy/:path*` 重写。所有可能不规范的路径，包括含有 `{` 等原始字符的路径，都会经过边缘中间件；现在每次 Vercel 构建都会包含该中间件，并将请求重写为规范路径。
- `--adapter cloudflare`：静态文件按编码后的路径查找，因此 `/x/%252e%252e/admin/report.txt` 不再返回 `/admin/report.txt`。设置 `basePath` 时，不再绕过 worker 提供其外部的文件。
- `text dev` 不再通过 `/public/…` 或 `/@fs/…` 提供 `public/` 文件；不再通过不同大小写、编码后的 `/@fs/` 路径、无扩展名模块请求（`/text.config?import`）或配置重写提供 `middleware.ts` 和 `text.config.ts` 等仅限服务端的源文件；也不再提供 `basePath` 之外的路由处理程序。

<!-- s:a0125c854e -->
- Text.js 支持在 Firefox 和 Safari 控制台中渲染。`CssConsoleDriver` 通过 CSS 特性检查检测浏览器。在 `%c` span 保持行内排列的环境中，使用无外边距的 14 px 行高，关闭软换行，并使用 `line-height: 100vh` 遮幕。
- 响应式尺寸会为 Firefox 的源码链接列留出空间。Safari 将 Menlo 放在字体栈首位：其页面无法使用用户安装的 SF Mono，但网页检查器可能使用该字体绘制。
- 向 `createConsoleRoot`、`ConsoleRenderer` 或 `CssConsoleDriver` 传入 `browser: "chromium" | "firefox" | "safari"` 可选择控制台。
- 预渲染外壳携带两类控制台的 CSS。
- `<FocusPad>` 显示访客浏览器对应的控制台快捷键：Firefox 为 ⌘⌥K 或 Ctrl+Shift+K，Safari 为 ⌘⌥C，并提示开启“显示网页开发者功能”。
- 预渲染的 `<FocusPad>` 会渲染所有浏览器的快捷键。在首次绘制前，为 `<html>` 设置 `data-browser`（`firefox` 或 `safari`）和 `data-os`（`mac`），即可仅显示访客对应的快捷键；未设置时，在水合完成前会显示 Chrome 的 Windows 和 Linux 快捷键。

<!-- s:74de7c87f7 -->
- ⌘⌥K 和 Ctrl+Shift+K（Firefox 的控制台快捷键）会直接传给浏览器，不再传入应用。
- 响应式尺寸会在 DevTools 关闭时获知高度低于 60 px 的浏览器工具栏（Safari 和 Firefox）的高度，使停靠在底部的控制台能容纳尽可能多的行。`<FocusPad>` 使用获知的高度判断 DevTools 是否已停靠。
- `<FocusPad>` 在等待点击状态中将 Windows 和 Linux 快捷键写为 `Ctrl+Shift+J`。

<!-- s:0e572baad1 -->
- `@textjs/opencode`：桥接程序启动时会打印配对码，textjs.org/opencode 在首次连接时要求输入该码。页面发送配对码之前，桥接程序返回 `428`，不会向 OpenCode 转发任何内容，即使来源已获允许。每个配对码仅在一次桥接程序运行期间有效，返回的令牌仅能由完成配对的来源使用，输入十次错误配对码后会锁定配对，直到桥接程序重启。
- `@textjs/opencode`：默认不再允许 textjs.org 的 Cloudflare Pages 预览部署。传入 `--allow-origin` 可使用预览部署。
- textjs.org/opencode 拒绝连接 `@textjs/opencode` 1.0.x 的桥接程序。运行 `bunx @textjs/opencode@latest proxy`。
- textjs.org 发送 Content-Security-Policy、`Strict-Transport-Security`、`Cross-Origin-Opener-Policy` 和 `Cross-Origin-Resource-Policy`。OpenCode 页面仅连接 `127.0.0.1` 或 `localhost` 上的服务器。

<!-- s:59f86c9edc -->
- OpenCode Lite：查看逐文件差异、浏览提示词历史、配置前导键快捷键，以及管理提供商账户和 MCP 服务器。沙盒包含一个按脚本运行的终端窗格。
- OpenCode Lite：输入 `/` 搜索命令，或输入 `@` 附加项目文件。Tab 可在文件菜单中打开目录。已连接的会话搜索服务器上的项目；沙盒搜索其示例仓库。
- textjs.org/coffee：terminal.shop 演示像 SSH 应用一样随控制台尺寸调整，提供小、中、大布局，在尺寸低于 20 × 10 时显示“你的终端太小”。账户新增支付方式、可编辑姓名的个人资料，以及订阅每周配送计划的调整。未登录时，无需登录即可打开购物车和账户中的常见问题、关于及调试信息。

<!-- s:d106fb27b3 -->
性能

<!-- s:f59d215740 -->
- `@textjs/react`：`Box` 和 `Text` 向协调器传递预先精简的场景 props，不再在挂载和更新时复制 props 对象。
- `@textjs/core`：`SceneNode.getTextModel()` 跳过单字符串 `<Text>` 叶节点的内联树遍历，并复用已缓存且已清零的 `Uint16Array` `runOf` 缓冲区。`CssConsoleDriver` 在内层循环中扫描样式相同的连续 BMP 单元格，`ConsoleRenderer` 则在帧未变化时跳过 `countYogaNodes()`。
- textjs.org：路由和控制台伴随面板标签页按路由拆分为 JS 和 CSS 分块。商店照片从 `photos/final` 原片重新编码，次要商品照片在悬停或切换幻灯片时加载。

<!-- s:6909c337fb -->
- `<ViewportControl>` 使用像素单位的 `minWidth` 代替 `20ch`，并与 `<FocusPad>` 一样列出度量匹配的后备字体，使尺寸选择器在 `Geist Mono` 加载后仍保持宽度。

<!-- s:517ba6caf6 -->
- `@textjs/opencode`：textjs.org/opencode 桥接程序独立为无依赖的包。运行 `bunx @textjs/opencode proxy`（或 `npx`）即可启动，无需安装 Vite、React 和 MCP SDK。`text proxy` 仍可使用，运行的是同一个桥接程序。

<!-- s:884a8abcf6 -->
- 框架和 CLI 包现已从 `@textjs/next` 更名为 `@textjs/app`，避免名称暗示其为官方 Next.js 集成。`@textjs/next` 已弃用，请改用 `@textjs/app`，旧包不再发布新版本。要切换，请运行 `bun remove @textjs/next && bun add @textjs/app`，并将导入中的 `@textjs/next` 替换为 `@textjs/app`，包括 `@textjs/app/link` 等子路径。CLI 仍为 `text`，create-text-app 模板依赖 `@textjs/app`。
- 控制台内的 `[▼]` 胶囊按钮和检查器统称为开发浮层，检查器标题为 `▼ Dev Overlay · Turbolog`。Text.js DevTools 仅指 Chrome 扩展。`<TextDevOverlay>` 及其 props 不变。
- 导出 `dynamic = "error"` 的路由处理程序会以 `TX031` 失败。Text.js 此前将其视为 `"force-static"`，未检查处理程序是否读取请求，而该检查正是此值在 Next.js 中的含义。请使用 `"force-static"`。

<!-- s:e21d3058df -->
- `text start` 与 `text dev` 一样，对被阻止的 `Host` 返回 `TX028`。每个服务器都会指出其读取的设置：`text dev` 为 `vite.server.allowedHosts`，`text start` 为 `server.allowedHosts`。
- textjs.org：学习部分的交付章节不再要求添加 `vercel.json` 重写。在 Vercel 和 Cloudflare Pages 上，`text build` 会自行写入 `index.html` 后备规则。重写示例现改用 Netlify 的 `_redirects`。
- `eslint-plugin-textjs`：`route-handler-exports` 允许在 `route.ts` 中导出 `dynamic` 和 `revalidate`，`valid-route-module` 会检查其中的 `dynamic` 值。

<!-- s:9fc693fec9 -->
- textjs.org：向下滚动越过正在播放的学习章节视频时，视频会移至角落的迷你播放器。每个视频下方的“字幕”按钮可开关字幕，并记住选择。
- `<TextDevOverlay>` 接受 `pill`、`shortcut` 和 `shell` props，使不使用 App Router 的应用也能使用自己的按键和主题控件挂载检查器。
- `<FocusPad>` 接受 `banner`，显示在消息首行（例如应用的文字标志），在触控设备上则显示在提示上方。

<!-- s:45920d8903 -->
- textjs.org：Playground 选择器列出仪表盘、流式输出、贪吃蛇、OpenCode 和咖啡（terminal.shop）。每个演示都有独立 URL：OpenCode 位于 `/opencode`，terminal.shop 位于 `/coffee`，各自的文字标志显示在消息顶部。计数器和表单已移出 Playground；文档仍将两者作为实时示例运行。
- `<FocusPad>` 采用新布局。每个状态显示三段式进度条、标题、一个大尺寸元素和一行文本。控制台打开前，大尺寸元素为 DevTools 快捷键。等待点击时，它是指针。运行后，它显示应用的 `hints` 键帽，按键传入时对应键帽亮起，没有提示的按键则回显在下方。步骤标签、独立的“运行中”徽标和“查看控制台。”一行已移除。各行仅在状态变化时淡入，首次绘制时不会淡入，并在 `prefers-reduced-motion` 下关闭动态效果。次要文本在两种外观中均满足 WCAG AA 对比度，使用键盘到达控制台尺寸选择器时会显示焦点环。
- textjs.org：Playground 使用新的 `<FocusPad>` 布局。选择器中的当前演示采用键帽表面样式，OpenCode 命令输入框的圆角和字号与 URL 输入框一致，terminal.shop 说明从三行改为两行，“查看源码”与尺寸控件的基线对齐，面板中的弱化文本满足 AA 对比度。

<!-- s:01075dcc87 -->
- `text dev` 对 `proxy` 路径的每个请求都通过代理处理。`fetch()` 发送 `Accept: */*`，此前开发服务器会先返回应用的 HTML，导致 opencode 模板首次运行时以“意外的标记 '<'”失败。
- Vite 的依赖扫描读取仅限服务端的文件时，`text dev` 不再加载第二份 React。此前扫描触发仅限服务端导入检查，打印堆栈跟踪，随后在控制台中报出“无效的 Hook 调用”，并导致 Fast Refresh 失效。
- `text dev` 支持带查询字符串的页面 URL，例如 `/?demo`。此前 Vite 将其视为项目文件夹并监视整个磁盘，导致 Linux 上页面始终无法加载。
- create-text-app：开发胶囊按钮不再遮挡任何模板首屏中的第一个按键提示，默认项目名改为 `my-app` 以与文档一致，模板通过 `eslint-plugin-textjs` 推荐配置检查，仪表盘 README 说明了 `--adapter static` 构建。
- `<FocusPad>` 和 `<ViewportControl>` 仅使用完整属性设置边框。此前开发环境中每次按键提示闪烁，React 都会警告“重新渲染时更新样式属性（border）”。
- 行末文本缩短后现在仍保持位置。此前在 `<Spacer>` 之后，文本会停留在最长文本所确定的位置，为适应溢出行而缩小的同级元素也会一直保持缩小状态。
- `action` 或 `hints` 变化时，`<FocusPad>` 会替换步骤、副标题和按键行，因此在同一面板中切换演示不会被报告为布局偏移。
- `@textjs/react/testing` 在导入时加载 Yoga，使测试可在首次 `render()` 前替换 `fetch`。

<!-- s:64f8dbac91 -->
首个稳定版本。`▼ Text.js 1.0.0 (Turbolog)`。

<!-- s:4841011fa5 -->
- **破坏性变更：**框架和 CLI 包现为 `@textjs/next`（npm 上的 `textjs` 已被占用）。请将导入从 `textjs` 更新为 `@textjs/next`。
- OpenCode 桥接命令为 `bunx @textjs/app proxy`，可从任意目录运行。
- 控制台默认适配停靠的 DevTools 面板（底部、左侧或右侧停靠、页面缩放、工具栏换行）。未停靠的 DevTools 回退为 `120×36`。面板新增尺寸控件。

<!-- s:dd18fee429 -->
- `useKeymap`，附带自动生成的 `?` 帮助界面、按键提示和 `Ctrl+K` 命令面板。
- 数据组件：`List`（虚拟化）、`Table`、`Tree`。
- 图表：`LineChart`、`BarChart`、`Sparkline`、`ProgressBar`，以及 `Gradient` 和 `Image`。
- 控件：`Button`、`Checkbox`、`Switch`、`RadioGroup`、`Slider`、`Dialog`、`Confirm` 和消息提示。
- 布局：`Center`、`Stack`、`Grid`、`SplitPane`、`FocusScope`。
- 用于定时器、动画、测量、断点、存储和剪贴板的 Hook。
- 从右到左的文本。Text.js 实现 Unicode 双向算法（UAX #9，Unicode 18.0），并通过全部 770,241 个 `BidiTest.txt` 和 91,707 个 `BidiCharacterTest.txt` 用例。支持阿拉伯文塑形，`<Text dir>` 可隔离 span。
- 稳定的 `TX###` 错误码。框架错误携带错误码和指向 `https://textjs.org/errors/<code>` 的链接。
- `@textjs/react/testing`，用于在测试中将组件渲染为文本。
- `@textjs/react/terminal` 和 `text run`，可在真实终端中渲染 App Router 应用。
- `text mcp`，通过模型上下文协议提供应用，使编码智能体无需浏览器即可导航、按键和读取帧。
- Text.js DevTools 扩展，在控制台旁提供包含组件树、帧检查器和时间线的面板。
- `eslint-plugin-textjs` 和带实时预览的 VS Code 扩展。
- `apps/terminal-shop`：控制台中的 terminal.shop 店面，连接真实 API（默认使用开发沙盒，生产环境设有双重锁定）。
- textjs.org：学习部分提供在控制台中运行的 10 章课程。支持构建时预渲染与水合、自托管的度量匹配字体、不带末尾斜杠的 `.html` 路由，以及带实时预览的新文档页面。

<!-- s:25c8658848 -->
- 打破清空后的 DevTools 节流相位锁定。清空帧之后，渲染器会单次等待 110 ms，使后续帧进入 DevTools 的即时处理路径。显示延迟 p50 从 63 ms 降至 10 ms。
- 损伤带局部绘制：仅重绘变更触及的行带。
- 缓存逐行哈希、整数样式 ID 和零分配空闲帧。
- 页面隐藏或失去焦点时，空闲定时器数量为零。

<!-- s:2f477ecf74 -->
- 换行处不再出现幽灵空绘制层 span，也不再出现双重遮幕。
- 遮幕独占一行，因此 DevTools 源码链接（`VM12:1`）不会使第 0 行换行。
- 默认加载指示器精确匹配单元格（Menlo 没有盲文字形）。`braille` 变体需主动启用。
- Node 上的 `text build` 不再打包 React 开发构建。
- textjs.org：每条路由的累积布局偏移均为 0。Playground 和 OpenCode 共用同一面板布局。
- textjs.org：文档和学习部分的侧边栏在长页面底部保持固定。
- textjs.org：文件标签页、代码块和正文表格仅横向滚动，因此 iOS Safari 不会截获页面的纵向滑动。
- textjs.org：`scrollbar-gutter: stable` 仅应用于鼠标设备。此前它会在 iOS Safari 上导致首次滚动跳动。
- textjs.org：关闭滚动锚定。此前它会在 iOS Safari 上将首屏区域固定在粘性页头下方。

<!-- s:986367c89f -->
无闪烁帧和服务端渲染。

<!-- s:f92fe85dce -->
- 帧改为追加，不再每帧执行 `console.clear()` + `console.log()`。DevTools 同步执行清空，但以 50 ms 节流绘制新消息，因此在 15 fps 下，清空会使 70.6% 的 DevTools 绘制呈现空白，在 60 fps 下为 81.1%。前置的零宽遮幕 span 会隐藏较早的帧。仅在首帧、`invalidate()` 之后、堆叠达到 100 帧后的空闲时刻，或达到 300 帧时清空控制台。
- 输出帧的间隔至少为 66 ms（约 15 fps）。更快的帧会重启 DevTools 节流并被丢弃：在 60 fps 下，DevTools 仅绘制了 295 个输出帧中的 67 个。
- Playground 和 OpenCode 采用全屏焦点面板。

<!-- s:79bc055b31 -->
- span CSS 仅使用完整属性，将 DevTools 复制到每行的属性从约 33 个减少到约 7 个。使用十六进制颜色，空白连续段仅以背景为键。
- 增量 Markdown 解析，以及记忆化的 `Markdown`、`Code` 和 `Diff` 行。
- 单遍处理宿主 props、稀疏 props 更新，以及文本尺寸不可能变化时不触发 Yoga 重新布局。
- 流式帧从 0.79 ms 降至 0.14 ms，加载指示器单次更新从 0.90 ms 降至 0.056 ms。输出逐位一致。

<!-- s:52e989e27d -->
- 服务端渲染。导出 `runtime = "server"` 的页面在服务器上渲染，支持 `async function` 组件，并通过服务器发送事件将行级单元格增量流式传输给 gzip 压缩后约 19 kB 的帧播放器。
- 部分预渲染。`text build` 将每个静态路由的首帧内联到 HTML 中，因此控制台在任何模块加载前就能绘制。
- `middleware.ts`、路由段配置（`dynamic`、`revalidate`）和 `textjs/cache`（`unstable_cache`、`revalidateTag`、`revalidatePath`）。
- `text build --adapter static|bun|vercel|cloudflare`。
- `bench/devtools`：驱动真实 DevTools 前端的测试工具，用于测量空白绘制、丢帧、显示延迟和 DevTools CPU 占用。

<!-- s:7932537f20 -->
- DevTools 不再将 `path:line`、`//host:port` 和 `data:` 文本转换为链接。
- OpenCode 桥接器会找到受管理的守护进程（临时端口、基本身份验证），在写入时发送 CSRF 标头，并用一行报告失败。

<!-- s:6dddbd2f6c -->
- 离散输入（按键、粘贴）在同一任务中同步渲染，不再等待下一个动画帧。
- 精简的 OpenCode TUI，与真实界面保持一致。
- 全面调整 textjs.org 的移动端和响应式适配。

<!-- s:1d66ad9bc5 -->
- `@textjs/font`：FIGlet 字体解析器和渲染器，内置 17 种字体，供 `<FigletText>` 和 `<AsciiFont>` 使用。输出与从 `figlet` 2.2.5 二进制文件记录的 273 份参考结果一致。
- `text proxy`：本地 CORS 桥接器，使 textjs.org 能与你的 OpenCode 服务器通信。

<!-- s:1331e4db42 -->
- `apps/opencode-console`：在 `console.log` 中渲染的联网 OpenCode 客户端，没有服务器运行时回退到演示模式。
- 用于 `create-text-app` 的 `opencode` 模板。
- textjs.org：新的首页、实时控制台伴随面板、Playground、OpenCode 页面和文档。
- 支持静态路由生成的 GitHub Pages 部署工作流。

<!-- s:a1b0bb2bf5 -->
第一个里程碑。

<!-- s:67e64392c2 -->
- `@textjs/core`：基于扁平类型化数组的 `CellBuffer`、Yoga WASM 布局、`Intl.Segmenter` 文本测量，以及 `%c` 游程编码驱动程序。每个脏帧调用一次 `console.log`，空闲时不调用。
- `@textjs/react`：React 19 协调器、PascalCase 组件（`Box`、`Text`、`ScrollBox`、`Input`、`Textarea`、`Select`、`Tabs`、`Code`、`Markdown`、`Diff`、`Modal`、`Spinner` 等）、单元格级 Tailwind 风格的 `className` 工具类、主题和 DOM `FocusPad`。
- `textjs`：基于文件系统的 App Router（`layout`、`page`、`loading`、`error`、`not-found`、动态段、路由处理程序）、`text dev`、`text build`、`text start` 和控制台内的 `[▼]` 检查器。
- `create-text-app`，附带 `starter` 和 `dashboard` 模板。
