<!-- s:5c16c8b17b -->
`app/` 中的文件夹定义路由，特殊文件定义各路由的 UI。

<!-- s:11f7d9178c -->
文件夹

<!-- s:8bda4d61c2 -->
| 文件夹 | 用途 |
| :-- | :-- |
| `app` | 路由、布局和路由处理程序 |
| `lib` | 不参与路由的共享模块 |
| `public` | 静态资源 |

<!-- s:25756fa68d -->
路由文件

<!-- s:8d1e739d99 -->
| 文件 | 用途 |
| :-- | :-- |
| `layout.tsx` | 路由段的共享 UI |
| `page.tsx` | 可通过路由访问的页面 |
| `loading.tsx` | Suspense 后备界面 |
| `error.tsx` | 错误边界 |
| `not-found.tsx` | 未匹配的 URL |
| `route.ts` | API 端点 |

<!-- s:ed4806a616 -->
动态路由

<!-- s:7f3bfd19e0 -->
| 文件夹 | URL | `params` |
| :-- | :-- | :-- |
| `[id]` | `/sessions/42` | `{ id: "42" }` |
| `[...slug]` | `/docs/a/b` | `{ slug: ["a", "b"] }` |

<!-- s:854c967567 -->
text.config.ts

<!-- s:1baaf058bb -->
| 选项 | 默认值 | 描述 |
| :-- | :-- | :-- |
| `title` | `""` | 页面和 FocusPad 的标题 |
| `viewport` | 适配控制台，否则为 `120×36` | `responsive`（默认为 `true`）、回退尺寸 `width × height`、`theme` |
| `hints` | `[]` | 页面 FocusPad 上显示的两个或三个按键 |
| `action` | `press <first hint>` | 获得焦点后要执行的操作，例如 `"type a prompt"` |
| `devIndicators` | `true` | 控制台内的开发浮层（`[▼]`） |
| `focusHint` | `true` | 页面未获得焦点时，在控制台最后一行上方显示“点击页面以使用键盘” |
| `rewrites` | `[]` | 重写和代理 |
| `ansi` | `{ cols: 80, rows: 24 }` | [curl 和终端客户端](/docs/curl)的帧尺寸，或设为 `false` 以向其提供 HTML |
| `embed` | `false` | 构建应用，供其他网站通过一个 script 标签添加（[嵌入](/docs/embedding)，实验性功能） |

<!-- s:04e1df190e -->
CLI

<!-- s:86e6dffb86 -->
| 命令 | 说明 |
| :-- | :-- |
| `text dev` | 支持快速刷新的开发服务器 |
| `text build` | 生产构建 |
| `text start` | 提供构建产物和路由处理程序服务 |
| `text run` | 在终端中渲染应用（[终端](/docs/terminal)） |
| `text mcp` | 向编程智能体提供应用服务（[MCP](/docs/mcp)） |
