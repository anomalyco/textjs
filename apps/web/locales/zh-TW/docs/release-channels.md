<!-- s:b808ed6cd6 -->
Text.js 透過三個 npm dist-tag 發布。所有套件（`@textjs/app`、`@textjs/react`、`@textjs/core`、`@textjs/font`、`@textjs/opencode`、`create-text-app` 和 `eslint-plugin-textjs`）的版本同步更新，因此一個版本號碼就能代表整個框架。

<!-- s:a2c3664770 -->
發布管道

<!-- s:6b5c5ba172 -->
| 管道 | dist-tag | 版本 | 安裝 |
| :-- | :-- | :-- | :-- |
| 穩定版 | `latest` | `1.0.x` | `bun add @textjs/app` |
| Canary | `canary` | `1.0.x-canary.N` | `bun add @textjs/app@canary` |
| LTS | `lts`, `v1-lts` | 在 `2.0.0` 推出後發布 | `bun add @textjs/app@lts` |

<!-- s:27e8b81dc6 -->
正式環境請使用穩定版。若要在修正與功能合併至 `dev` 當天就試用，請使用 canary。LTS 版本線推出後，若你每年升級一次，請使用 LTS。

<!-- s:abc686bd76 -->
穩定版

<!-- s:df32c144c0 -->
穩定版遵循[語意化版本](https://semver.org)：修訂版修正錯誤，次版本新增向下相容的功能，主版本則可能在棄用期結束後引入不相容的 API 變更。穩定版由通過完整測試套件的 canary 升格而來，並附帶 npm 來源證明發布。

<!-- s:7307c50761 -->
Canary

<!-- s:db409040ca -->
每次推送至官方儲存庫的 `dev`，都會經過型別檢查與測試，並以下一個修訂版加上 `-canary.N` 後綴發布：

<!-- s:d8b8cffefe -->
| `latest` | `dev` 推送 | 發布版本 |
| :-- | :-- | :-- |
| `1.0.0` | 第一次 | `1.0.1-canary.0` |
| `1.0.0` | 第二次 | `1.0.1-canary.1` |
| `1.0.1` | 下一次 | `1.0.2-canary.0` |

<!-- s:dd9c67b1f5 -->
`N` 從 npm 上現有最高的 canary 編號接續遞增，因此編號不會重複。Canary 版本不會提交至儲存庫。在提交訊息中加入 `[skip canary]` 即可略過發布。

<!-- s:762894d754 -->
Canary 是 `dev` 的建置版本，所有提取請求都會合併至這個分支。Canary 可能在未另行通知的情況下變更或移除尚未發布的 API。若你依賴某個 canary 版本，請鎖定確切的版本號碼。

<!-- s:6999c4e986 -->
來源證明

<!-- s:18722b1d6c -->
版本透過 GitHub Actions 使用 `npm publish --provenance` 發布，將每個 tarball 連結至建置該檔案的確切提交與工作流程。使用以下指令驗證套件：

<!-- s:57d2e7b18d -->
發布版本

<!-- s:a3217d58a6 -->
維護者使用發布指令碼同步提升所有工作區套件的版本：

<!-- s:614a1ea872 -->
`release:version` 會重寫每個 `package.json` 及其對應的版本常數（`VERSION`、reconciler 的 `rendererVersion`），在套件版本不一致時拒絕執行，並以 `--dry-run` 印出執行計畫。`release:publish` 會建置、打包（解析 `workspace:*`）、套用 `publishConfig`，拒絕將預發行版本發布至 `latest` 或將穩定版本發布至 `canary`，並略過 npm 上已存在的版本。

<!-- s:ec6955472a -->
各版本線的維護期限請參閱[支援政策](/docs/support-policy)。
