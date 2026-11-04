<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js 是用於建構在瀏覽器主控台中渲染的應用程式的 React 框架。

[文件](https://textjs.org/zh-tw/docs) · [學習](https://textjs.org/zh-tw/learn) · [Playground](https://textjs.org/zh-tw/playground) · [OpenCode](https://textjs.org/zh-tw/opencode)

<img src="../../brand/share/2-console-frame.png" alt="在 Chrome DevTools 主控台中渲染的 Text.js 應用程式" width="720" />

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [简体中文](README.zh-CN.md) · 繁體中文 · [<span dir="rtl">العربية</span>](README.ar.md) · [<span dir="rtl">עברית</span>](README.he.md) · [<span dir="rtl">فارسی</span>](README.fa.md) · [<span dir="rtl">اردو</span>](README.ur.md)
<!-- /i18n:languages -->

</div>

## 快速開始

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

開啟 [localhost:3000](http://localhost:3000) 並[開啟瀏覽器主控台](https://textjs.org/zh-tw/docs/installation#open-the-console)。Text.js 需要 Bun 1.2+ 或 Node.js 22+，以及桌面版 Chrome、Edge、Firefox 或 Safari。

## 範例

```tsx
// app/page.tsx
import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";

export default function Page() {
  const [count, setCount] = useState(0);

  useInput((e) => {
    if (e.key === "up") setCount((c) => c + 1);
    if (e.key === "down") setCount((c) => c - 1);
  });

  return (
    <Box className="flex-col border rounded p-1">
      <Text bold>▼ Hello, console</Text>
      <Text color="muted">count = {count}</Text>
    </Box>
  );
}
```

每個影格都透過 Yoga 計算版面配置，以遊程編碼轉為 `%c` span，再透過一次 `console.log` 寫入。沒有儲存格變更的影格不會輸出任何記錄。[`ARCHITECTURE.md`](../../ARCHITECTURE.md) 說明了渲染管線。

## 套件

| 套件 | 版本 | 說明 |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router、`text` CLI 與路由處理常式 |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | 協調器、元件與 Hook |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | 儲存格緩衝區、版面配置與 `%c` 主控台驅動程式 |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet 字型剖析器與渲染器 |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode 與 OpenCode 伺服器之間的本機橋接程式 |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | 專案產生器 |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js 應用程式的 ESLint 規則 |

編輯器與瀏覽器擴充功能也位於此儲存庫：

- [`packages/vscode-textjs`](../../packages/vscode-textjs)：[VS Code 擴充功能](https://textjs.org/zh-tw/docs/vscode)，提供即時預覽、App Router 骨架產生功能與錯誤代碼連結
- [`packages/devtools-extension`](../../packages/devtools-extension)：[Chrome DevTools 擴充功能](https://textjs.org/zh-tw/docs/devtools-extension)，提供元件樹、影格檢查器與時間軸

## 開發

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

網站在 [localhost:3000](http://localhost:3000) 執行。[CONTRIBUTING.md](../../CONTRIBUTING.md) 說明了其他應用程式、端對端指令碼與發布流程。

## 參與貢獻

歡迎回報錯誤與提交提取要求。請先閱讀 [CONTRIBUTING.md](../../CONTRIBUTING.md)，並依照 [SECURITY.md](../../SECURITY.md) 的說明回報安全性問題。

## 授權

[MIT](../../LICENSE)。隨附的第三方檔案保留各自的授權：[`packages/font`](../../packages/font/NOTICE) 中的 FIGlet 字型（BSD 3-Clause），以及 `apps/web` 和 `merch/fonts` 下的字型（SIL Open Font License 1.1）。
