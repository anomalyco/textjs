<!-- s:d2d5ef69d7 -->
本页介绍 Text.js 各发布分支接收修复的时长，以及哪些变更属于破坏性变更。

<!-- s:80371443b7 -->
发布分支

<!-- s:19aa9fdfd3 -->
| 状态 | 接收内容 | 持续时间 |
| :-- | :-- | :-- |
| 活跃 | 新功能、修复、安全补丁 | 直到下一个主版本发布 |
| 维护期 LTS | 关键修复和安全补丁 | 下一个主版本发布后 12 个月 |
| 生命周期结束 | 无 | — |

<!-- s:d5987f6ecf -->
每个主版本只为最新的次版本提供补丁：`1.5.0` 发布后，修复会进入 `1.5.x`，而非 `1.4.x`。`2.0.0` 发布后，`1.x` 的最后一个次版本会成为维护期 LTS 分支，并使用 `lts` 和 `v1-lts` 分发标签发布。

<!-- s:6a7ba75ff1 -->
| 版本 | 状态 | 支持截止时间 |
| :-- | :-- | :-- |
| 1.x | 活跃 | 2.0.0 发布后 12 个月 |

<!-- s:d71377bf9c -->
LTS 修复范围

<!-- s:043b92b499 -->
- Text.js 包中的安全漏洞
- 没有变通方案的崩溃、数据丢失和构建失败
- 导致控制台渲染异常的 Chrome、Edge、Firefox 和 Safari 新版本的兼容性问题
- 受支持的运行时和部署目标的兼容性问题

<!-- s:e01d1121d2 -->
新功能、性能优化和重构只进入活跃分支。

<!-- s:d1c69ba9bc -->
破坏性变更

<!-- s:82596fcd52 -->
以下内容只会在主版本中变更，且至少提前一个次版本发出弃用警告：

<!-- s:4ca9fd7807 -->
- `@textjs/app`、`@textjs/react` 和 `@textjs/core` 的公共导出，包括 `@textjs/app/server` 和 `@textjs/app/cache`
- `text.config.ts` 选项、`text` CLI 命令和标志
- `app/` 中的文件约定、`middleware.ts` 和路由段配置
- 适配器输出布局（`.vercel/output`、`_worker.js`、`dist/server.js`）

<!-- s:883f3eeb26 -->
不在保障范围内：标记为实验性或 `unstable_` 的 API，包括 `@textjs/core/experimental`、`@textjs/react/experimental` 和 `@textjs/app/experimental` 下的所有 API（可能在次要版本中变更，并在更新日志中说明）；内部实现，如 `@textjs/core/internal`、`x-middleware-*` 标头和 `.text/` 构建元数据；canary 版本；以及 `console.log` 格式字符串和 CSS 的具体内容（帧的视觉效果保持不变，编码速度可能提升）。

<!-- s:5c7d9aae9b -->
运行时支持

<!-- s:30122ce1bb -->
| 运行时 | 支持范围 |
| :-- | :-- |
| Chrome / Edge DevTools | 当前及之前两个稳定版本 |
| Firefox 和 Safari 控制台 | 当前稳定版本 |
| Node.js | 活跃期和维护期 LTS 版本（`text start`、Vercel 函数） |
| Bun | 最新的 1.x 版本 |
| Cloudflare Workers | `compatibility_date` 为 2025-01-01 或更晚，`nodejs_compat` |

<!-- s:509c18536b -->
停止支持已结束自身生命周期的运行时版本不属于破坏性变更。

<!-- s:52543dba9b -->
安全

<!-- s:2aff0514c5 -->
通过 [security@textjs.org](mailto:security@textjs.org) 或 [GitHub 安全公告](https://github.com/anomalyco/textjs/security/advisories/new) 私下报告漏洞。所有受支持的分支会同时发布修复，补丁版本在 npm 上发布后再公开安全公告。

<!-- s:b933131934 -->
有关版本和分发标签的生成方式，请参阅[发布渠道](/docs/release-channels)。
