<!-- s:04615ef523 -->
`text build` 生成可移植的 `dist/`。适配器将其转换为平台要求的输出。

<!-- s:087f8d3137 -->
适配器

<!-- s:04908c6c09 -->
| 适配器 | 输出 | 运行方式 |
| :-- | :-- | :-- |
| *（无）* | `dist/` + `dist/.text/server` | `text start`（Node） |
| `static` | `dist/` | 任意静态托管平台 |
| `bun` | `dist/server.js` | `bun dist/server.js` |
| `vercel` | `.vercel/output` | Vercel（Build Output API v3） |
| `cloudflare` | `dist/` + `_worker.js` | Cloudflare Pages |

<!-- s:7e755a5c9f -->
也可以通过 `TEXTJS_ADAPTER` 指定适配器。当 `text build` 在 Vercel（`VERCEL=1`）或 Cloudflare Pages（`CF_PAGES=1`）上运行时，会自动选择对应的适配器。

<!-- s:9d8df946e5 -->
服务端适配器（`bun`、`vercel` 和 `cloudflare`）运行与 `text start` 相同的处理流程：[中间件](/docs/middleware)、`rewrites`、使用[路由缓存](/docs/caching)的[路由处理程序](/docs/route-handlers)、静态资源，最后为页面 URL 提供控制台文档。curl 等终端客户端则会收到以 ANSI 文本表示的页面首帧。在 `vercel` 和 `cloudflare` 上，这仅适用于静态页面（参见 [curl 和终端客户端](/docs/curl)）。服务端适配器为 `/assets/` 下带哈希的文件提供 `Cache-Control: public, max-age=31536000, immutable`。

<!-- s:1a5ee098c6 -->
静态部署

<!-- s:9ebd0d2866 -->
适用于不提供服务器的托管平台，例如 GitHub Pages、S3 或 CDN。设置了 `dynamic = "force-static"` 或 `revalidate` 的 `GET` 路由处理程序会预渲染为文件：`app/api/feed.json/route.ts` 会变为 `dist/api/feed.json`。`index.html` 的副本会写入 `404.html`，使深层链接能打开控制台应用。静态托管平台无法区分 curl 和浏览器，因此 curl 会收到 HTML 页面。

<!-- s:1e90536a2a -->
如果应用需要服务器，构建会失败并列出所有原因：`middleware.ts`、[服务端渲染的路由](/docs/server-rendering)、动态路由处理程序、带动态片段的路由处理程序或非 `GET` 方法。请改为在托管平台上配置 `rewrites`。

<!-- s:2c3ddc9047 -->
Bun

<!-- s:d451f14e30 -->
`bun` 适配器生成单个自包含的服务器，运行时不需要 `node_modules`。它读取 `PORT`（默认值为 `3000`）和 `HOSTNAME`（默认值为 `0.0.0.0`），并且绝不对外提供 `server.js` 或 `.text/`。这是一个长期运行的进程，因此也像 `text start` 一样，托管[服务端渲染的路由](/docs/server-rendering)（`export const runtime = "server"`）及其实时会话。在容器中使用：

<!-- s:0c6d59947b -->
Vercel

<!-- s:b9d1e3b495 -->
也可以推送到已连接 Vercel 的 Git 仓库：构建会运行 `text build`，检测到 Vercel 后写入 `.vercel/output`。

<!-- s:3ee6894582 -->
| 输出 | 内容 |
| :-- | :-- |
| `static/` | 客户端构建产物（位于 `basePath` 下） |
| `functions/_textjs/server.func` | 一个支持流式传输的 Node.js 22 函数，为所有路由处理程序提供服务 |
| `functions/_middleware.func` | Edge 路由中间件：`middleware.ts`，以及每个应用的规范路径 |
| `config.json` | 资源响应头、中间件匹配器、重写规则、处理程序路由和控制台文档 |

<!-- s:3f3ba93b7d -->
边缘中间件使用 `x-middleware-next` / `x-middleware-rewrite` 协议，因此请求头覆盖和重写会在请求到达函数或 CDN 前，在 Vercel 路由器中完成。所有匹配器共用一个路由 `src` 模式。没有匹配器覆盖的请求会跳过中间件，除非其路径可能不是规范形式（百分号转义、URL 解析器会编码的字符、`//`、`.` 或 `..` 片段、末尾斜杠）。中间件随后匹配规范路径，检查 `has` / `missing`，并将请求重写到该路径，使 Vercel 以相同方式路由请求。没有 `middleware.ts` 的应用也会获得相同的边缘函数，但该函数仅执行重写。由于每次构建都包含一个 Edge 函数，请使用已登录的 Vercel 账户部署：匿名部署（`vercel deploy --temporary`）不接受 Edge 函数。

<!-- s:b5af065e25 -->
处理程序函数仅供内部使用。每条处理程序路由通过 `x-textjs-path` 请求头将匹配的路径传递给该函数。每个请求在经过中间件前后都会移除此请求头，且边缘中间件从不转发该请求头（无论来自客户端还是 `middleware.ts`），因此只有处理程序路由能设置它。在中间件和重写前后，对 `/_textjs/*` 的请求都会返回 `404`，而不运行函数。生成的路由区分大小写，与其他所有托管平台上的匹配器和重写规则一致。

<!-- s:5e18b8a450 -->
适配器测试会在本地模拟的 Vercel 路由器上运行此输出。`src` 匹配、`dest` 捕获、请求头转换和 `status` 路由的行为已通过实际部署验证；Edge 中间件未经此验证，因为它无法匿名部署。

<!-- s:14e7957486 -->
Cloudflare Pages

<!-- s:6109800459 -->
输出使用 Pages 高级模式：

<!-- s:9f0923168f -->
| 文件 | 用途 |
| :-- | :-- |
| `_worker.js` | 中间件、重写规则、路由处理程序和控制台文档 |
| `_routes.json` | 将每个请求发送到 worker。没有中间件或 `basePath` 时，`/assets/*` 仍由 Pages 的静态 CDN 提供服务 |
| `_headers` | 为 `/assets/*` 提供不可变缓存（追加到你已有的配置） |
| `404.html` | 使 Pages 在文件缺失时返回 `404`，而非应用（如果你已有此文件，则保留） |

<!-- s:9bc2b010d1 -->
`.text/`（服务端打包文件和构建清单）会从 `dist/` 中移除，因为 Pages 会原样发布该目录。

<!-- s:1200dbc88d -->
在 Pages 项目（设置 → 运行时）或 `wrangler.toml` 中启用 `nodejs_compat` 兼容性标志；数据缓存使用 `AsyncLocalStorage`。静态文件通过 `ASSETS` 绑定提供服务，后台重新验证使用 `ctx.waitUntil()`。

<!-- s:0bb76cfebb -->
使用中间件时，每个请求都会运行 worker，包括带哈希的资源，以便中间件检查可访问文件的每条路径。每个运行 worker 的请求都算作一次 Functions 调用，并计入你的 Workers 请求配额。一次页面加载包括文档及其获取的每个文件（对于只有一个 JavaScript 打包文件的小型测试应用，是 2 次；文件更多的应用会有更多次）。在 Workers Free 计划中，每日配额用尽后，Pages 会不经过 worker 直接提供静态文件，从而跳过中间件。如果中间件保护 `dist/` 中的任何内容，请将设置 → 运行时 → 失败时开放 / 关闭设为**失败时关闭**。

<!-- s:600050383d -->
升级

<!-- s:e8733a2bfb -->
只有重新构建并部署后，`@textjs/app` 中的安全修复才会应用到部署：

<!-- s:c74adc728a -->
- Vercel：部署新的 `.vercel/output`。
- Cloudflare Pages：部署新的 `dist/`，包含 `_worker.js` 和 `_routes.json`。
- Bun：部署完整的新 `dist/`（`server.js`、资源和实时会话打包文件），然后重启服务器。
- `text start`：运行 `text build` 并重启。

<!-- s:8047727085 -->
旧部署仍可通过各自的 URL 访问（例如 Vercel 和 Cloudflare Pages 的预览 URL）。请删除旧部署，或为其启用平台的访问保护。

<!-- s:f5e077273b -->
服务端渲染的路由

<!-- s:049ef31493 -->
[服务端渲染的路由](/docs/server-rendering)为每个打开的标签页维护一个会话，因此需要长期运行的服务器：`text start` 或 `bun` 适配器。当页面导出 `runtime = "server"` 时，`static`、`vercel` 和 `cloudflare` 适配器会使构建失败，并报出 `TX030`。

<!-- s:eb19728e6b -->
在代理后运行

<!-- s:21a17d0b45 -->
`text start` 绑定到 `127.0.0.1`，绑定到回环地址时，仅响应 `localhost`、`*.localhost` 和 IP 地址主机（DNS 重绑定保护）。其他主机会收到 `403` 和 `TX028`。将对外服务的配置放入 `text.config.ts`：

<!-- s:43bd5471c8 -->
未设置 `origin` 或 `trustProxy` 时，`request.url` 使用 `http` 协议，根据已验证的 `Host` 请求头构建。

<!-- s:689cebe287 -->
注意事项

<!-- s:f45e3fb003 -->
- `text.config.ts` 中的 `proxy` 仅在 `text dev` 和 `text start` 中运行；适配器不包含它。请使用所有服务端适配器都支持的 `rewrites`。
- 每个无服务器实例都有独立的内存缓存。参见[缓存](/docs/caching#platform-notes)。
- 使用原始正则表达式分组的 `rewrites` 会尽可能转换为 Vercel 路由；命名参数（`:slug`、`:path*`）则能精确转换。
