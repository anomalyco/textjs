<!-- s:b808ed6cd6 -->
Text.js 通过三个 npm dist-tag 发布。所有包（`@textjs/app`、`@textjs/react`、`@textjs/core`、`@textjs/font`、`@textjs/opencode`、`create-text-app` 和 `eslint-plugin-textjs`）的版本同步更新，因此一个版本号就能表示整个框架的版本。

<!-- s:a2c3664770 -->
发布渠道

<!-- s:6b5c5ba172 -->
| 渠道 | dist-tag | 版本 | 安装 |
| :-- | :-- | :-- | :-- |
| 稳定版 | `latest` | `1.0.x` | `bun add @textjs/app` |
| 金丝雀版 | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| 长期支持版 | `lts`, `v1-lts` | `2.0.0` 发布后发布 | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
生产环境使用稳定版。要在修复和功能合入 `dev` 的当天试用，使用金丝雀版。长期支持版本线推出后，如果你每年升级一次，就使用该版本线。

<!-- s:abc686bd76 -->
稳定版

<!-- s:df32c144c0 -->
稳定版遵循[语义化版本](https://semver.org)：补丁版本修复错误，次版本添加向后兼容的功能，主版本可能在弃用期后引入不兼容的 API 变更。稳定版由通过完整测试套件的金丝雀版晋升而来，并附带 npm 来源证明发布。

<!-- s:7307c50761 -->
金丝雀版

<!-- s:db409040ca -->
官方仓库中每次向 `dev` 推送后，都会执行类型检查和测试，并以下一个补丁版本号加上 `-canary.N` 后缀发布：

<!-- s:d8b8cffefe -->
| `latest` | 向 `dev` 推送 | 发布版本 |
| :-- | :-- | :-- |
| `1.0.0` | 首次 | `1.0.1-canary.0` |
| `1.0.0` | 第二次 | `1.0.1-canary.1` |
| `1.0.1` | 下一次 | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` 从 npm 上已有的最高金丝雀版本序号继续递增，因此序号不会重复。金丝雀版本号不会提交到仓库。要跳过一次发布，在提交消息中添加 `[skip canary]`。

<!-- s:762894d754 -->
金丝雀版从 `dev` 构建，所有拉取请求都合并到这个分支。金丝雀版可能更改或移除尚未发布的 API，恕不另行通知。如果依赖金丝雀版，请固定到一个确切版本。

<!-- s:6999c4e986 -->
来源证明

<!-- s:18722b1d6c -->
版本通过 GitHub Actions 使用 `npm publish --provenance` 发布，将每个 tarball 关联到构建它的确切提交和工作流。使用以下命令验证包：

<!-- s:57d2e7b18d -->
发布版本

<!-- s:a3217d58a6 -->
维护者使用发布脚本同步更新所有工作区包的版本：

<!-- s:614a1ea872 -->
`release:version` 会重写每个 `package.json` 及其对应的版本常量（`VERSION`、reconciler 的 `rendererVersion`），在各包版本不一致时拒绝运行，使用 `--dry-run` 可打印执行计划。`release:publish` 会构建、打包（解析 `workspace:*`）、应用 `publishConfig`，拒绝将预发布版本发布到 `latest` 或将稳定版发布到 `canary`，并跳过 npm 上已存在的版本。

<!-- s:ec6955472a -->
各版本线的维护期限见[支持政策](/docs/support-policy)。
