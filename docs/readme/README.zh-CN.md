<!-- Built from README.md by apps/web/scripts/i18n/readme.ts. Edit README.md, then run `bun run i18n:translate` in apps/web. -->

<div align="center">

# ▼ Text.js

Text.js 是一个 React 框架，用于构建在浏览器控制台中渲染的应用。

<!-- i18n:languages -->
[English](../../README.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · 简体中文 · [繁體中文](README.zh-TW.md) · [⁨العربية⁩](README.ar.md) · [⁨עברית⁩](README.he.md) · [⁨فارسی⁩](README.fa.md) · [⁨اردو⁩](README.ur.md)
<!-- /i18n:languages -->

[文档](https://textjs.org/zh-cn/docs) · [学习](https://textjs.org/zh-cn/learn) · [Playground](https://textjs.org/zh-cn/playground) · [OpenCode](https://textjs.org/zh-cn/opencode)

<img src="../../brand/share/2-console-frame.png" alt="A Text.js app rendered in the Chrome DevTools console" width="720" />

</div>

## 快速开始

```bash
bunx create-text-app@latest
cd my-app && bun install && bun dev
```

打开 [localhost:3000](http://localhost:3000)，并[打开浏览器控制台](https://textjs.org/zh-cn/docs/installation#open-the-console)。Text.js 需要 Bun 1.2+ 或 Node.js 22+，以及桌面版 Chrome、Edge、Firefox 或 Safari。

## 示例

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

每一帧都使用 Yoga 布局，通过游程编码转换为 `%c` span，并通过一次 `console.log` 写入。没有单元格变化的帧不会输出日志。[`ARCHITECTURE.md`](../../ARCHITECTURE.md) 介绍了渲染流水线。

## 包

| 包 | 版本 | 描述 |
| --- | --- | --- |
| [`@textjs/app`](../../packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router、`text` CLI 和路由处理程序 |
| [`@textjs/react`](../../packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | 协调器、组件和 Hook |
| [`@textjs/core`](../../packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | 单元格缓冲区、布局和 `%c` 控制台驱动 |
| [`@textjs/font`](../../packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet 字体解析器和渲染器 |
| [`@textjs/opencode`](../../packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode 与 OpenCode 服务器之间的本地桥接 |
| [`create-text-app`](../../packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | 项目生成器 |
| [`eslint-plugin-textjs`](../../packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js 应用的 ESLint 规则 |

编辑器和浏览器扩展也在此仓库中：

- [`packages/vscode-textjs`](../../packages/vscode-textjs)：[VS Code 扩展](https://textjs.org/zh-cn/docs/vscode)，提供实时预览、App Router 脚手架和错误代码链接
- [`packages/devtools-extension`](../../packages/devtools-extension)：[Chrome DevTools 扩展](https://textjs.org/zh-cn/docs/devtools-extension)，提供组件树、帧检查器和时间线

## 开发

```bash
bun install
bun test packages/
bun run typecheck
bun run --cwd apps/web dev
```

网站运行在 [localhost:3000](http://localhost:3000)。[CONTRIBUTING.md](../../CONTRIBUTING.md) 介绍了其他应用、端到端脚本和发布流程。

## 参与贡献

欢迎提交错误报告和拉取请求。请先阅读 [CONTRIBUTING.md](../../CONTRIBUTING.md)，并按照 [SECURITY.md](../../SECURITY.md) 中的说明报告安全问题。

## 许可证

[MIT](../../LICENSE)。捆绑的第三方文件保留各自的许可证：[`packages/font`](../../packages/font/NOTICE) 中的 FIGlet 字体（BSD 3-Clause），以及 `apps/web` 和 `merch/fonts` 下的字体（SIL Open Font License 1.1）。
