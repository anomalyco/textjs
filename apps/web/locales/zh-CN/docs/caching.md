<!-- s:5b67b32177 -->
缓存路由处理程序的响应和数据，然后定时或按需重新验证。立即返回过期条目，同时在后台执行一次刷新。

<!-- s:be697310c8 -->
路由处理程序

<!-- s:e85fc29fe2 -->
`GET` 路由处理程序默认为动态。通过路由段配置启用缓存：

<!-- s:e4ccf65c67 -->
| 导出 | 行为 |
| :-- | :-- |
| *（无）* | 每次请求都运行 |
| `dynamic = "force-static"` | 缓存直到重新验证 |
| `revalidate = N` | 缓存；`N` 秒后过期 |
| `revalidate = 0` 或 `dynamic = "force-dynamic"` | 每次请求都运行 |

<!-- s:274c053db6 -->
其他 `dynamic` 值会触发 `TX031` 错误。其中包括 Next.js 的 `"error"`，因为 Text.js 无法检测处理程序何时读取请求。

<!-- s:0fae4045f6 -->
缓存的处理程序为每个路径名保留一个条目，其 `request` 与构建时一样：没有查询字符串、请求头、Cookie 或请求体。请在动态处理程序中读取这些内容。仅缓存 `GET` 和 `HEAD`。状态为 `5xx`、带有 `Set-Cookie` 响应头或 `Cache-Control: private` / `no-store` 的响应会返回，但绝不存储。

<!-- s:b618d4732f -->
响应头

<!-- s:c0a6cf7351 -->
缓存的响应包含：

<!-- s:b5f8cfecb4 -->
| 响应头 | 值 |
| :-- | :-- |
| `x-textjs-cache` | `MISS`、`HIT` 或 `STALE` |
| `Cache-Control` | `s-maxage=N, stale-while-revalidate=<1 year − N>`，或在使用 `force-static` 时为 `s-maxage=31536000` |

<!-- s:c1fb73c64a -->
当[中间件](/docs/middleware)为请求设置 cookie、执行重写或覆盖请求头时，生成的响应头会变为 `private, no-cache, no-store, max-age=0, must-revalidate`，因此共享缓存不会复用针对单个访客的处理结果。处理程序设置的 `Cache-Control` 响应头会保留。

<!-- s:ae27ba22c7 -->
在 `text dev` 中，路由段配置生效，但不存储任何内容，因此每次请求都会运行处理程序。

<!-- s:64841df645 -->
数据缓存

<!-- s:2187e2262b -->
使用 `@textjs/app/cache` 中的 `unstable_cache` 缓存任意异步函数：

<!-- s:4c26e099ff -->
缓存键由键片段和参数组成，按值编码（`undefined` 和 `null`、`Map`、`Set`、`Date` 和 `URL` 参数仍可相互区分）。没有键片段时，使用函数源码及其创建位置标识函数；只要函数通过闭包引用了值，就应传入键片段，例如在每次请求中或循环中创建函数时。结果会序列化为 JSON，因此每次调用都返回一个新副本（`Date` 对象会以字符串形式返回）；无法序列化的结果会抛出异常。`cache(fn, { key, tags, revalidate })` 通过选项对象接受相同的设置。

<!-- s:608eee0e9b -->
在缓存的路由处理程序中，数据条目会将标签及最短的 `revalidate` 向上传递给路由：重新验证 `"posts"` 也会刷新 `/api/posts`。带有 `revalidate: 0` 的数据调用会使路由变为动态。

<!-- s:5537f337ee -->
返回过期值并重新验证

<!-- s:7d23e84252 -->
当条目的存续时间超过 `revalidate` 时：

<!-- s:d4dd1966dd -->
1. 下一个请求立即收到过期值（`STALE`）。
2. 后台执行一次刷新；并发请求共用这次刷新。
3. 如果刷新抛出异常，则继续返回过期值并记录错误。

<!-- s:e6db7819cc -->
在 Vercel 和 Cloudflare 上，后台刷新通过 `waitUntil()` 注册。超过一年的条目始终在前台重新计算。

<!-- s:5854b096d2 -->
按需重新验证

<!-- s:686aa7f2f3 -->
| 调用 | 失效范围 |
| :-- | :-- |
| `revalidateTag("posts")` | 所有带有 `posts` 标签的内容；下一个请求重新计算 |
| `revalidateTag("posts", "max")` | 标记为过期；下一个请求在刷新期间收到过期值 |
| `revalidatePath("/api/feed")` | 该路径 |
| `revalidatePath("/api/posts/[id]")` | 动态路由的每个路径 |
| `revalidatePath("/api", "layout")` | `/api` 下的所有内容 |

<!-- s:b132bd50eb -->
两者都返回 Promise。使用内存存储时，失效立即生效；当[自定义存储](#custom-cache-stores)为异步时，使用 `await` 等待。

<!-- s:2aab4b4d00 -->
自定义缓存存储

<!-- s:7bee24a364 -->
默认存储是每个服务器实例独立的内存 LRU（1000 个条目，约 50 MB）。要在实例间共享缓存，请将 `cacheHandler` 指向一个默认导出 `CacheStore` 的模块：

<!-- s:593c57fca5 -->
条目为纯 JSON。也可以通过 `setCacheStore(store)` 在运行时安装存储。

<!-- s:fe2404de51 -->
平台说明

<!-- s:5418a08901 -->
- 每个 serverless 实例（Vercel 函数、Cloudflare 隔离实例）都有自己的内存缓存。`Cache-Control: s-maxage` 也允许平台 CDN 缓存响应；按需重新验证不会清除 CDN 缓存。当 `revalidateTag` 必须作用于每个实例时，使用共享的 `cacheHandler`。
- Cloudflare 需要启用 `nodejs_compat` 标志（缓存使用了 `AsyncLocalStorage`）。参见[部署](/docs/deploying)。
