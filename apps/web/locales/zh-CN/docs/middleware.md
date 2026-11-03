<!-- s:88013af27d -->
中间件在请求完成前运行代码。它可以重定向、重写、设置标头和 Cookie，或直接返回响应。

<!-- s:895d99d1b5 -->
约定

<!-- s:9e6d75b727 -->
在项目根目录（或 `src/`）中创建 `middleware.ts`，与 `app/` 同级。导出一个 `middleware` 函数（或默认导出）和可选的 `config`。

<!-- s:a4d39cdaaf -->
在 `text dev`、`text start` 和每个服务器[部署适配器](/docs/deploying)上，中间件都先于[路由处理程序](/docs/route-handlers)、静态文件和控制台页面运行。它使用 Web `Request` 和 `Response`，因此同一个文件可在 Node、Bun、Vercel Edge 和 Cloudflare Workers 上运行。

<!-- s:dda0880da2 -->
路径匹配

<!-- s:1e1ec8c339 -->
未设置 `config.matcher` 时，中间件会为每个请求运行。匹配器使用与 Next.js 相同的语法：

<!-- s:473d472bc8 -->
| 匹配器 | 匹配内容 |
| :-- | :-- |
| `/about` | `/about` 和 `/about/` |
| `/blog/:slug` | `/blog/hello` |
| `/docs/:path*` | `/docs`、`/docs/a/b` |
| `/a/:rest+` | `/a/b`，不匹配 `/a` |
| `/user/:id(\\d+)` | `/user/42`，不匹配 `/user/ada` |
| `/((?!api/).*)` | 除 `/api/*` 之外的所有路径 |

<!-- s:256aeeefbc -->
使用 `has` 和 `missing` 添加条件（标头、Cookie、查询或主机）：

<!-- s:d756420343 -->
匹配器应用于不含 `basePath` 的路径名。在 `text dev` 中，Vite 自身的模块请求（`/@vite/*`、源文件）从不运行中间件。

<!-- s:75cd7297e6 -->
每个宿主都会在中间件运行前确定一个规范路径名，用于匹配、`request.nextUrl` 以及路由、处理程序和文件查找。百分号转义会先解码，再按 `new URL()` 的写入方式重新编码路径，同时解析 `.` 和 `..` 路径段，并移除重复斜杠和末尾斜杠。`/ad%6din//users/` 到达中间件时为 `/admin/users`，而 `/café` 则保持为 `/caf%C3%A9`。带有末尾斜杠的匹配器（如 `/admin/`）会匹配 `/admin`。路径中包含编码后的斜杠或反斜杠（`%2F`、`%5C`）、控制字符或无效百分号编码的请求会收到 `400`。路由区分大小写：`/Admin` 不匹配 `/admin`，静态文件也只通过完全一致的名称提供。

<!-- s:3f5746eb4e -->
匹配文件实际提供服务的 URL，不要只匹配文件名。Cloudflare Pages 也会在 `/report` 提供 `report.html`，因此 `/report.html` 的匹配器无法保护 `/report`。同时列出两者，即 `matcher: ["/report", "/report.html"]`，或将受保护文件放在一个目录中并匹配该目录，例如用 `/reports/:path*` 匹配 `public/reports/` 中的文件。

<!-- s:85d40f1c72 -->
NextResponse

<!-- s:880215c229 -->
| API | 效果 |
| :-- | :-- |
| `NextResponse.next()` | 继续执行路由 |
| `NextResponse.redirect(url, status?)` | 默认为 `307`；`url` 必须是绝对 URL |
| `NextResponse.rewrite(url)` | 提供另一个路径的内容；对外部源使用代理 |
| `NextResponse.json(body, init?)` | 返回 JSON 响应 |
| `new Response(...)` | 返回任意内容的响应 |

<!-- s:a8292924c3 -->
不返回任何内容即可保持原样继续执行。`next()` 和 `rewrite()` 接受 `{ status }`，用于更改最终响应的状态。只有通过 `NextResponse.next()` / `NextResponse.rewrite()` 创建的响应才会影响路由：其他任何 `Response`，包括 `fetch()` 返回的响应，都会移除 `x-middleware-*` 标头后原样发送给客户端。

<!-- s:583e778785 -->
`request.nextUrl` 的 `pathname` 不包含 `basePath`，而 `href` 和 `toString()` 包含它。要确保仍在应用内，请克隆该 URL：`const url = request.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);`。

<!-- s:b618d4732f -->
标头

<!-- s:37748fa2c3 -->
传入 `request.headers` 可更改下游处理程序收到的标头，传入 `headers` 可添加响应标头：

<!-- s:60bf4677c2 -->
中间件的响应标头会添加到最终响应中，除非路由处理程序设置了同名标头。

<!-- s:ef657b8fe3 -->
Cookie

<!-- s:5d3635224b -->
`request.cookies` 读取 `Cookie` 标头；`response.cookies` 写入 `Set-Cookie`。

<!-- s:4a7b6bbf62 -->
在 `next()` 或 `rewrite()` 响应上设置的 Cookie，对同一请求中的路由处理程序也可见。

<!-- s:a65a1ce099 -->
后台任务

<!-- s:de593dc070 -->
第二个参数提供 `waitUntil()`，可在响应发送后保持无服务器运行时存活：

<!-- s:63e13e87b3 -->
说明

<!-- s:971c06c875 -->
- 客户端渲染的页面在浏览器中渲染，因此重写到另一个页面会更改提供的文件，不会更改控制台应用渲染的路由。重写到路由处理程序、静态文件和外部源的行为符合预期。
- 中间件可以读取请求体；路由处理程序仍会收到请求体。匹配器排除的请求，其请求体始终不会被读取或修改。
- `request.url` 始终使用服务器的源：`//other.host/x` 这样的请求目标会规范化为只有一个前导斜杠的路径。
- [静态适配器](/docs/deploying#static)无法运行中间件。
