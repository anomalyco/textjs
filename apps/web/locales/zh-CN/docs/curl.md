<!-- s:5f3abb073d -->
终端 HTTP 客户端获取页面的第一帧，格式为真彩色 ANSI 文本，而非 HTML 文档。无需任何配置。

<!-- s:f501ff55e0 -->
哪些请求会获取帧

<!-- s:3384141bb9 -->
请求满足以下所有条件时会获取帧：

<!-- s:05a334e510 -->
- 方法为 `GET` 或 `HEAD`；
- `User-Agent` 以 `curl/`、`Wget/`、`wget2/`、`HTTPie/` 或 `xh/` 开头；
- 缺少 `Accept` 标头，或该标头不包含 `text/html`。

<!-- s:4af297e372 -->
浏览器、爬虫和链接预览会获取 HTML 页面。要用 curl 获取 HTML，请显式请求：

<!-- s:03dba887a9 -->
是否返回帧在即将提供页面时决定：即在[中间件](/docs/middleware)、`rewrites` 和[路由处理程序](/docs/route-handlers)之后，且文件或最后一段包含点号的路径绝不会返回帧。中间件重定向、`401` 状态码、标头和重写对 curl 和浏览器同样生效。`/api/health` 仍会运行其处理程序，`/robots.txt` 仍会提供该文件。

<!-- s:e0c4f5f416 -->
帧的内容

<!-- s:50fa4581ec -->
帧是页面的首次渲染，与[预渲染外壳](/docs/server-rendering#partial-prerendering)一样：所有仍在等待的 `<Suspense>` 边界都会显示其回退内容。异步服务端组件不会运行，`fetch()` 也永远不会完成，因此在 effects 中加载的数据会保持加载状态。

<!-- s:08efeec61a -->
- **尺寸：**80 × 24 个单元格。使用固定视口（`viewport.responsive: false`）的应用则采用 `viewport.width × viewport.height`。
- **颜色：**使用应用的 `viewport.theme` 中的 24 位 SGR 转义码。每行以重置码结尾，帧以换行符结尾。
- **状态：**`200`，或在没有匹配页面或页面调用 `notFound()` 时返回 `404` 及应用的未找到页面。渲染时调用 `redirect()` 的页面会提供 HTML。

<!-- s:1125803eb1 -->
响应的类型为 `text/plain; charset=utf-8`，并带有 `Vary: User-Agent, Accept` 和 `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`，因此共享缓存不会存储帧并将其提供给浏览器。对于 curl 获取帧的路径，其 HTML 页面也带有相同的 `Vary` 标头。

<!-- s:0e2aba0a67 -->
支持的运行环境

<!-- s:d40234848f -->
| 托管环境 | 静态页面 | 动态页面、未知路径 |
| :-- | :-- | :-- |
| `text dev` | 按请求渲染 | 按请求渲染 |
| `text start`, `bun` | 由 `text build` 预渲染 | 按请求渲染 |
| `vercel`, `cloudflare` | 由 `text build` 预渲染 | HTML 页面 |
| `static` | HTML 页面 | HTML 页面 |

<!-- s:11c905d6a6 -->
服务端渲染的页面需要 `text start` 或 `bun`（参见[部署](/docs/deploying#server-rendered-routes)）。

<!-- s:2cdc6d454b -->
静态托管环境无法为不同客户端提供不同响应，因此 `static` 适配器不支持帧。在 Vercel 和 Cloudflare 上，静态页面的帧随构建产物一起发布。动态页面（`[id]`、`force-dynamic`）在那里提供 HTML，因为 `vercel` 和 `cloudflare` 适配器不部署渲染器。

<!-- s:022d3d5541 -->
`text start` 和 `bun dist/server.js` 使用 `.text/server/live.mjs` 按请求渲染其余页面，并将最近 128 帧保留 10 秒。每台服务器每 10 秒最多渲染 20 个未缓存的页面。超过此限额后，curl 会获取 HTML 页面，直到额度恢复。如果服务器无法加载 `live.mjs`，例如某个页面模块在顶层读取 `window`，这些页面就会提供 HTML。

<!-- s:2500855fbd -->
`text build` 会报告预渲染的帧：

<!-- s:37f210b46a -->
配置

<!-- s:ac46338e16 -->
更改整个应用的尺寸，或关闭帧：

<!-- s:36fb2e113c -->
页面可以更改自身尺寸，也可以向终端提供 HTML：

<!-- s:11c75396f6 -->
尺寸限制在 1–500 个单元格之间。在 `text.config.ts` 中设置 `ansi: false` 后，页面导出项会被忽略。

<!-- s:17ae9b44af -->
明文 HTTP

<!-- s:e9b0dd23eb -->
除非传入 `-L`，否则 curl 不会跟随重定向。Vercel 会将 `http://` 请求重定向到 `https://`，启用 **始终使用 HTTPS** 的 Cloudflare 也会如此，因此 `curl http://…` 会输出重定向响应而非帧。分享 `https://` URL。

<!-- s:740b32f53f -->
自定义服务器

<!-- s:144c78c64b -->
`@textjs/app/ansi` 导出检测和响应辅助函数，供不运行 `text start` 或适配器的服务器和函数使用：

<!-- s:ed621ccb22 -->
`wantsAnsi(request)` 也接受 `(method, headers)`，其中标头可使用 Web `Headers` 或 Node 的 `IncomingHttpHeaders`。`frameToAnsi(buffer, { theme })` 以与框架相同的方式编码已渲染的 `CellBuffer`。
