<!-- s:d2d5ef69d7 -->
本頁說明各 Text.js 發行分支接收修正的期限，以及哪些變更屬於破壞性變更。

<!-- s:80371443b7 -->
發行分支

<!-- s:19aa9fdfd3 -->
| 狀態 | 接收內容 | 期間 |
| :-- | :-- | :-- |
| 活躍 | 功能、修正、安全性修補 | 直到下一個主要版本發布 |
| 維護 LTS | 重大問題修正與安全性修補 | 下一個主要版本發布後 12 個月 |
| 終止支援 | 無 | — |

<!-- s:d5987f6ecf -->
每個主要版本只會修補最新的次要版本：`1.5.0` 發布後，修正會加入 `1.5.x`，而非 `1.4.x`。`2.0.0` 發布後，`1.x` 的最後一個次要版本會成為維護 LTS 分支，並以 `lts` 和 `v1-lts` dist-tag 發布。

<!-- s:6a7ba75ff1 -->
| 版本 | 狀態 | 支援期限 |
| :-- | :-- | :-- |
| 1.x | 活躍 | 2.0.0 發布後 12 個月 |

<!-- s:d71377bf9c -->
LTS 修正範圍

<!-- s:043b92b499 -->
- Text.js 套件中的安全性漏洞
- 無替代解法的當機、資料遺失與建置失敗
- Chrome、Edge、Firefox 和 Safari 新版本導致主控台渲染失效的相容性問題
- 與支援的執行環境及部署目標的相容性問題

<!-- s:e01d1121d2 -->
新功能、效能改善與重構只會加入活躍分支。

<!-- s:d1c69ba9bc -->
破壞性變更

<!-- s:82596fcd52 -->
下列項目只會在主要版本中變更，且至少會先在一個次要版本中發出棄用警告：

<!-- s:4ca9fd7807 -->
- `@textjs/app`、`@textjs/react` 和 `@textjs/core` 的公開匯出項目，包括 `@textjs/app/server` 和 `@textjs/app/cache`
- `text.config.ts` 選項、`text` CLI 命令與旗標
- `app/` 中的檔案慣例、`middleware.ts` 與路由區段設定
- 配接器輸出版面配置（`.vercel/output`、`_worker.js`、`dist/server.js`）

<!-- s:3a8ad71311 -->
不涵蓋：標記為實驗性或 `unstable_` 的 API，包括 `@textjs/core/experimental` 和 `@textjs/react/experimental` 下的所有項目（可能在次要版本中變更，並在變更記錄中註明）、內部項目，例如 `@textjs/core/internal`、`x-middleware-*` 標頭與 `.text/` 建置中繼資料、canary 版本，以及 `console.log` 格式字串與 CSS 的確切內容（影格外觀維持一致；編碼速度可能提升）。

<!-- s:5c7d9aae9b -->
執行環境支援

<!-- s:30122ce1bb -->
| 執行環境 | 支援範圍 |
| :-- | :-- |
| Chrome / Edge DevTools | 目前及前兩個穩定版本 |
| Firefox 和 Safari 主控台 | 目前的穩定版本 |
| Node.js | 活躍與維護中的 LTS 版本（`text start`、Vercel 函式） |
| Bun | 最新的 1.x |
| Cloudflare Workers | `compatibility_date` 為 2025-01-01 或之後、`nodejs_compat` |

<!-- s:509c18536b -->
停止支援已達自身支援期限的執行環境版本，不屬於破壞性變更。

<!-- s:52543dba9b -->
安全性

<!-- s:2aff0514c5 -->
請透過 [security@textjs.org](mailto:security@textjs.org) 或 [GitHub 安全性公告](https://github.com/anomalyco/textjs/security/advisories/new) 私下回報漏洞。所有仍受支援的分支會同時發布修正，並在修補版本上架 npm 後發布公告。

<!-- s:b933131934 -->
版本與 dist-tag 的產生方式，請參閱[發行管道](/docs/release-channels)。
