<!-- s:7e7d3cb07e -->
`text build --embed` 构建应用后，其他网站就能用一个 script 标签添加应用，例如营销页面、文档站点、WordPress 或 Webflow 页面，或 React 18 应用。打开 DevTools 的访客会在控制台中看到你的应用。其他访客只下载 `embed.js`（gzip 压缩后约 3 kB），除非页面中有 `<text-console>`。

<!-- s:2aa1d07d89 -->
嵌入功能处于实验阶段。`text build --embed`、`embed` 选项、`<text-console>` 和 `@textjs/app/experimental` 的导出可能在次要版本中更改。参见[破坏性变更](/docs/support-policy#breaking-changes)。

<!-- s:6d2aa784de -->
将应用添加到网站

<!-- s:f296ccaeef -->
构建应用：

<!-- s:2198c52791 -->
将 `dist/` 上传到任意静态托管服务或 CDN，或复制到网站的 `public/` 文件夹，然后在网站页面中添加一个标签：

<!-- s:aa94ef1985 -->
`embed.js` 相对于自身 URL 加载其他文件，因此 `dist/` 可用于任意路径或源。其中只有 `embed.js` 和 `assets/`，没有可能覆盖网站自身文件的 `index.html` 或 `404.html`。包含[服务端渲染的路由](#server-rendered-routes)、路由处理程序或中间件的应用需要服务器，不能只上传静态文件。`vercel` 和 `cloudflare` 适配器可运行路由处理程序和中间件，而服务端渲染的路由需要 `text start` 或 `bun` 适配器。

<!-- s:5c139759a2 -->
要向访客展示应用的位置，在页面任意位置添加 [`<text-console>`](#text-console)。按下任何带有 `data-textjs-engage` 的元素也会启动应用：

<!-- s:6a70ec16e1 -->
要在本地试用，运行 `text dev --embed`。它提供 `/embed.js`，每次请求都会生成新的首帧，并在 `/`（使用 `standalone` 时为 `/__textjs/embed`）提供预览页面，以其他网站的方式加载它。其他本地端口上的网站也可以加载 `http://localhost:3000/embed.js`。

<!-- s:37f210b46a -->
配置

<!-- s:aa9630bf92 -->
`text build --embed` 等同于在 `text.config.ts` 中设置 `embed: true`。传入对象可更改默认值：

<!-- s:fbe8efc9f4 -->
| 选项 | 默认值 | 说明 |
| :-- | :-- | :-- |
| `initialPath` | `"/"` | 控制台打开时的路由。必须以 `/` 开头 |
| `globalName` | `"text"` | 应用启动后用于挂载控制台 API 的全局变量。设为 `false` 则不挂载 |
| `initialClear` | `false` | 在首帧之前清空页面的控制台。默认情况下，页面之前的日志保留在应用上方 |
| `standalone` | `false` | 同时构建应用自身的页面（`index.html`），与不带 `embed` 的 `text build` 一致 |
| `allowOrigins` | `[]` | 允许其页面运行此服务器上服务端渲染的路由的网站。参见[服务端渲染的路由](#server-rendered-routes) |
| `credentials` | `false` | 在来自 `allowOrigins` 的实时会话请求中发送此服务器的浏览器凭据，而不丢弃 cookie 和 `Authorization`。需要精确指定源 |

<!-- s:12a3d28167 -->
`viewport.width × viewport.height`（默认为 120 × 36）是首帧的尺寸。`title`、`hints` 和 `action` 是 `<text-console>` 的默认值。设置 `ppr: false` 或 `middleware.ts` 可能匹配 `initialPath` 时，`embed.js` 不包含预渲染的首帧，因为任何人都能下载 `embed.js`。镜像会保持空白，直到应用绘制。

<!-- s:7ca27066c7 -->
运行行为

<!-- s:1fe89ec57c -->
- **在出现[控制台使用意图](/docs/hooks-and-repl#loading-on-console-intent-experimental)之前，不加载其他内容。** `embed.js` 输出预渲染的首帧，然后等待。当 DevTools 停靠时（在加载时或之后）、访客在页面上按下 DevTools 快捷键时（F12、Ctrl+Shift+J、I、C 或 K，Mac 上为 ⌘⌥J、I、C 或 K），或按下 `<text-console>` 或 `[data-textjs-engage]` 元素时，应用才会加载。此后，在同一标签页中重新加载会立即启动应用。独立窗口中的 DevTools 不会改变页面尺寸，因此从菜单打开 DevTools 的访客会一直看到首帧，直到按下上述元素之一。
- **在触摸屏上，应用不会启动。** 在匹配 `(hover: none) and (pointer: coarse)` 的设备上，`embed.js` 不输出日志，也不添加监听器。它只会为镜像加载 `<text-console>` 的文件。
- **只有访客激活应用后，按键才会传给应用。** 要激活应用，访客可按下 `<text-console>` 或 `[data-textjs-engage]` 元素，或点击页面（链接、按钮和字段除外），将焦点从 DevTools 移回页面。在页面自身的字段或 `[data-textjs-bypass]` 元素中输入的内容不会传给应用，滚轮始终滚动页面。
- **页面的 URL、历史记录和标题始终不变。** 路由、`<Link>` 和 `useRouter()` 在控制台内部导航。在客户端渲染的应用中，绝对 URL 会在新标签页中打开。
- **页面上的 Text.js 应用优先。** 它启动时，正在运行的嵌入应用会卸载、停止读取按键并移除其全局变量。如果嵌入应用加载时另一个应用正占用控制台，它会输出一条警告且不启动。
- **嵌入应用打包了自己的 React 19。** 它没有 `react-dom` 或裸导入，因此页面的 React 版本、`react` 的导入映射和 React DevTools 都不会影响它。

<!-- s:5bd6dcbe49 -->
文件加载时机

<!-- s:631a37c837 -->
| 文件 | 加载时机 | gzip |
| :-- | :-- | --: |
| `embed.js` | 随页面加载 | 2.9 kB |
| `assets/text-console-[hash].js` | 页面包含 `<text-console>` 时 | 4.0 kB |
| `assets/embed-client-[hash].js` 和 `assets/yoga-[hash].wasm` | 出现控制台使用意图时 | 112.8 kB + 29.0 kB |
| `assets/embed-player-[hash].js` | 出现控制台使用意图时，为[服务端渲染的路由](#server-rendered-routes)加载，替代客户端 | 22.7 kB |
| `assets/bidi-[hash].js` | 应用首次显示从右到左的文本时（参见[加载 bidi 引擎](/docs/internationalization#loading-the-bidi-engine)） | 10.1 kB |

<!-- s:d86aa9b2e1 -->
这些大小对应 120 × 36 的带边框状态框。`text build --embed` 会输出你的应用的大小。`assets/embed-[hash].js` 是 `embed.js` 的副本，使用一个永不改变的名称（参见[部署](#deploys)）。

<!-- s:c6266b6378 -->
`<text-console>`

<!-- s:7156621f10 -->
`embed.js` 定义 `<text-console>`，且仅在页面包含该元素时加载其文件。它使用 Shadow DOM，因此页面的 CSS 不会影响其内部，也无需更改 `style-src 'self'` 策略。

<!-- s:9ceead3eca -->
不带属性时，它是一个单行栏。它先显示浏览器打开控制台的快捷键，然后提示点击，再列出应用的按键；按键传给应用时会亮起。在 Safari 中，第一步会提示在 Safari 设置中打开“显示网页开发者功能”。

<!-- s:899e0c7fe3 -->
带有 `mirror` 时，它会在页面上显示应用的帧：在其他内容加载之前显示预渲染的首帧，之后显示运行中的应用。按下它会启动应用并将访客的按键传给应用，因此关闭 DevTools 时应用也能运行。`chrome` 会在镜像周围绘制 DevTools 窗口，并隐含启用 `mirror`。

<!-- s:fefcb3e495 -->
| 属性 | 说明 |
| :-- | :-- |
| `mirror` | 显示应用的帧 |
| `chrome` | 在 DevTools 窗口中显示帧 |
| `title` | 栏的标题（默认值：`text.config.ts` 中的 `title`） |
| `hints` | 要列出的按键，格式为 `"← →:switch region, Enter:open"`（默认值：`text.config.ts` 中的 `hints`） |
| `action` | 首先要执行的操作，显示为“点击这里并…”（默认值：`text.config.ts` 中的 `action`，或按下第一条提示中的按键） |

<!-- s:392012169b -->
在触摸屏上，镜像显示首帧但不启动应用，单行栏则隐藏。该元素的文本为英文。

<!-- s:13ff4ec1f4 -->
预留空间

<!-- s:0f4e2c234d -->
`text build --embed` 会为应用的网格输出一行 CSS。将其粘贴到页面的样式表中。它会在元素文件加载之前设置 `<text-console>` 的尺寸，因此文件加载完成时页面内容不会移动。对于默认的 120 × 36 网格，这行 CSS 为：

<!-- s:a2d2741417 -->
单行栏高 58 px。镜像保持网格的宽高比，最大为其自然宽度（120 列时为 885 px），`chrome` 则增加 43 px 高度。尺寸不依赖字体。`@textjs/app/experimental` 中的 `reserveCss(cols, rows)` 返回同一行 CSS。

<!-- s:a1260c10c3 -->
首屏中的镜像通常是页面最大的元素，因此决定页面的最大内容绘制（LCP）。首帧在 `embed.js` 和元素文件依次加载后绘制。页面其余部分的绘制与没有嵌入应用时相同。页面下方的镜像不影响 LCP。对于有自身延迟脚本的页面，例如 React 应用，`<script type="module" async src="…">` 会运行 `embed.js` 而不等待这些脚本，因此首屏中的镜像会更早绘制。

<!-- s:4206a424a5 -->
样式

<!-- s:834fbf40e6 -->
要将镜像居中，将其行内方向的外边距设为自动：

<!-- s:6dde2b2766 -->
默认使用深色。设置 `color-scheme: light` 可使用浅色，或设置用于混合所有其他色阶的两种颜色。`::part(frame)` 用于设置帧本身的样式。`chrome` 保留 DevTools 自身的背景。

<!-- s:f5e077273b -->
服务端渲染的路由

<!-- s:eb293d9fb4 -->
当 `initialPath` 指向带有 `export const runtime = "server"` 的路由时，`embed.js` 会加载帧播放器，而非客户端运行时。它从提供 `embed.js` 的服务器流式接收帧，因此需运行 `text start` 或 `bun` 适配器。使用其他适配器会导致构建失败。参见[服务端渲染](/docs/server-rendering)。

<!-- s:e2bdd4dbb7 -->
其他网站的页面只有在其源位于 `allowOrigins` 中时，才能打开实时会话：

<!-- s:6ec7048857 -->
- 会话只响应打开它的源。
- 默认情况下，Text.js 会丢弃来自其他网站的会话的 cookie 和 `Authorization` 请求头，因此[中间件](/docs/middleware)看到的是未登录的访客。`credentials: true` 会保留这些凭据，并要求精确指定源。当页面和服务器共享可注册域名（`www.example.com` 和 `console.example.com`），且 cookie 覆盖该服务器（`Domain=example.com`，或在 `console.example.com` 上设置）时，浏览器会发送这些凭据。对于其他网站，浏览器只发送设置了 `SameSite=None; Secure` 的 cookie，而阻止第三方 cookie 的浏览器不会发送任何 cookie。
- 实时会话在连接和重新连接时，会立即向 `/__textjs/live` 发送 `OPTIONS` 预检请求。预检请求不携带 cookie 或 `Authorization`，因此匹配该路径的中间件必须允许 `OPTIONS` 请求在未登录时通过。
- 在反向代理或 CDN 后运行时，设置 `server.trustProxy`（参见[在代理后运行](/docs/deploying#behind-a-proxy)）。不设置时，每位访客的地址都是代理的地址，因此所有访客共享同一个客户端会话数量限制。

<!-- s:f739524722 -->
除非设置了 `credentials`，否则 `text dev` 无需 `allowOrigins` 就接受 `localhost`、`127.0.0.1` 和 `[::1]` 任意端口上的页面。

<!-- s:d5df7bf60f -->
托管

<!-- s:4bef54c1c0 -->
`text start` 以及 `bun`、`vercel` 和 `cloudflare` 适配器会使用以下响应头提供嵌入构建。`static` 适配器会将这些响应头写入 `_headers`，供 Cloudflare Pages 和 Netlify 读取。在其他托管环境中，例如存储桶或网站自身的 `public/` 文件夹，需自行设置：

<!-- s:be81a4c5ec -->
| 路径 | 响应头 |
| :-- | :-- |
| `/embed.js` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` |
| 网站位于其他源时，以上两者 | `Access-Control-Allow-Origin: *` 和 `Cross-Origin-Resource-Policy: cross-origin` |

<!-- s:21eb7dc287 -->
浏览器使用 CORS 获取模块脚本和 WebAssembly，因此其他源上的文件需要 `Access-Control-Allow-Origin`。将 `yoga-[hash].wasm` 以 `application/wasm` 类型压缩后提供（参见 [WebAssembly](/docs/deploying#webassembly)）。

<!-- s:1bb976fcdc -->
部署

<!-- s:01b888e293 -->
每次页面加载时都会重新验证 `embed.js`，因此新访客会立即获取新部署的版本。已加载旧版 `embed.js` 的标签页，在访客打开控制台时仍会导入上一次构建的文件，这可能发生在数小时后。保留上一次部署的 `assets/` 在线：将新文件复制到旧文件所在位置，不要使用会删除旧文件的同步方式，一两天后再删除旧文件。要固定使用某次构建，将其 `assets/embed-[hash].js` 放入标签中。该次构建的文件也必须保持在线。

<!-- s:b748b07652 -->
文件不存在时，`embed.js` 会输出一条警告，提示访客重新加载，但不会启动应用，也不会自行重新加载页面。

<!-- s:fce19037b3 -->
内容安全策略

<!-- s:de8e30a920 -->
`embed.js` 不需要内联脚本或样式。将以下内容添加到宿主页面的策略中；当 `dist/` 与页面同源时，用 `'self'` 替换源地址：

<!-- s:2da4077ce0 -->
| 指令 | 值 | 用途 |
| :-- | :-- | :-- |
| `script-src` | `https://console.example.com` | `embed.js` 及其分块 |
| `script-src` | `'wasm-unsafe-eval'` | 客户端渲染应用中的 Yoga |
| `connect-src` | `https://console.example.com` | `yoga-[hash].wasm`，以及服务端渲染的路由所用的 `/__textjs/live` |
| `img-src` | `data:` | 仅用于应用绘制 `<Image>` 或 `<Pixels>` 的 `<text-console mirror>` |

<!-- s:4ce5dcc4cb -->
自行加载应用

<!-- s:03e56a60b4 -->
`@textjs/app/experimental` 导出了构成 `embed.js` 的各个部分，供需要自行加载应用的页面使用：

<!-- s:238cbf53ee -->
| 导出 | 说明 |
| :-- | :-- |
| `startEmbed(paint, boot, src, element?)` | 执行 `embed.js` 的流程：输出第一帧，等待控制台使用意图，然后调用 `boot` |
| `bootEmbedClient(options)` | 启动客户端渲染的应用，使用内存路由，并按页面交互状态控制键盘输入 |
| `bootEmbedPlayer(options)` | 启动服务端渲染的路由的帧播放器 |
| `createHostInput(options)` | 遵循上述规则的键盘输入 |
| `createTextConsoleMount(config)` | 返回用于 `<text-console>` 的 `mount(element, shell?)` 函数 |
| `reserveCss(cols, rows)` | 为 `<text-console>` 预留空间的 CSS |

<!-- s:f15b990353 -->
`ENGAGE_SELECTOR` 和 `BYPASS_SELECTOR` 分别用于选择启动应用的元素和自行处理按键的元素。
