<!-- s:da329a4f1b -->
路由處理常式使用 Web `Request` 和 `Response` API，在 `app` 目錄中定義 API 端點。

<!-- s:895d99d1b5 -->
慣例

<!-- s:ac1d1b9fcb -->
匯出 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD` 或 `OPTIONS`。處理常式會在 `text dev`、`text start` 和所有伺服器[部署介面卡](/docs/deploying)上，於 [middleware](/docs/middleware) 之後執行。使用[路由區段設定](/docs/caching)快取 `GET` 處理常式。

<!-- s:53eeba0ff3 -->
動態處理常式

<!-- s:bfa759b36e -->
`params` 的值會經過解碼。含有編碼斜線或反斜線（`%2F`、`%5C`）的路徑會收到 `400`，因此，可能含有 `/` 的 ID 應透過查詢參數傳遞，或編碼為 base64url。

<!-- s:6c694827e4 -->
串流

<!-- s:734a652dda -->
回傳 `ReadableStream` 以傳送伺服器發送事件：

<!-- s:9ff4b304cc -->
Rewrite

<!-- s:7ca1bb6854 -->
外部目的地由伺服器代理，因此瀏覽器不會發出跨來源請求。

<!-- s:82320e9df7 -->
本機常駐程式代理

<!-- s:7730eaa5fb -->
使用 `proxy` 連線至你電腦上的處理程序：

<!-- s:c00af013ff -->
[OpenCode 範本](/docs/opencode)就是透過這種方式連線至本機伺服器。
