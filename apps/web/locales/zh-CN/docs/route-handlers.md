<!-- s:da329a4f1b -->
路由处理程序使用 Web `Request` 和 `Response` API 在 `app` 目录中定义 API 端点。

<!-- s:895d99d1b5 -->
约定

<!-- s:ac1d1b9fcb -->
导出 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD` 或 `OPTIONS`。处理程序在 `text dev`、`text start` 和所有服务器[部署适配器](/docs/deploying)上运行，在[中间件](/docs/middleware)之后执行。使用[路由段配置](/docs/caching)缓存 `GET` 处理程序。

<!-- s:53eeba0ff3 -->
动态处理程序

<!-- s:bfa759b36e -->
`params` 的值会被解码。包含编码后的斜杠或反斜杠（`%2F`、`%5C`）的路径会收到 `400` 响应，因此，对于可能包含 `/` 的 ID，请通过查询参数传递，或将其编码为 base64url。

<!-- s:6c694827e4 -->
流式传输

<!-- s:734a652dda -->
返回 `ReadableStream` 以发送服务器发送事件：

<!-- s:9ff4b304cc -->
重写

<!-- s:7ca1bb6854 -->
外部目标由服务器代理，因此浏览器不会发起跨源请求。

<!-- s:82320e9df7 -->
本地守护进程代理

<!-- s:7730eaa5fb -->
使用 `proxy` 访问本机上的进程：

<!-- s:c00af013ff -->
[OpenCode 模板](/docs/opencode)通过这种方式连接到本地服务器。
