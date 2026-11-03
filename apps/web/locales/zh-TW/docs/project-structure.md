<!-- s:5c16c8b17b -->
`app/` 中的資料夾定義路由，特殊檔案則定義各路由的 UI。

<!-- s:11f7d9178c -->
資料夾

<!-- s:8bda4d61c2 -->
| 資料夾 | 用途 |
| :-- | :-- |
| `app` | 路由、版面配置與路由處理常式 |
| `lib` | 共用模組，不參與路由 |
| `public` | 靜態資源 |

<!-- s:25756fa68d -->
路由檔案

<!-- s:8d1e739d99 -->
| 檔案 | 用途 |
| :-- | :-- |
| `layout.tsx` | 路由區段的共用 UI |
| `page.tsx` | 可透過路由存取的畫面 |
| `loading.tsx` | Suspense 後備畫面 |
| `error.tsx` | 錯誤邊界 |
| `not-found.tsx` | 未匹配的網址 |
| `route.ts` | API 端點 |

<!-- s:ed4806a616 -->
動態路由

<!-- s:7f3bfd19e0 -->
| 資料夾 | 網址 | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:144c0672ce -->
| 選項 | 預設值 | 說明 |
| :-- | :-- | :-- |
| `title` | `""` | 頁面與 FocusPad 的標題 |
| `viewport` | 配合主控台大小，否則為 `120×36` | `responsive`（預設為 `true`）、備援尺寸 `width × height`、`theme` |
| `hints` | `[]` | 頁面 FocusPad 上顯示的兩個或三個按鍵 |
| `action` | `press <first hint>` | 取得焦點後要執行的動作，例如 `"type a prompt"` |
| `devIndicators` | `true` | 主控台內的開發浮層（`[▼]`） |
| `focusHint` | `true` | 頁面未取得焦點時，在主控台最後一列上方顯示「點選頁面以使用鍵盤」 |
| `rewrites` | `[]` | 重寫規則與代理 |
| `ansi` | `{ cols: 80, rows: 24 }` | [curl 與終端機用戶端](/docs/curl)的影格大小，或設為 `false` 以向這些用戶端提供 HTML |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| 指令 | 說明 |
| :-- | :-- |
| `text dev` | 支援 Fast Refresh 的開發伺服器 |
| `text build` | 正式環境建置 |
| `text start` | 提供建置產物與路由處理常式服務 |
| `text run` | 在終端機中渲染應用程式（[終端機](/docs/terminal)） |
| `text mcp` | 向程式碼代理提供應用程式服務（[MCP](/docs/mcp)） |
