<!-- s:32f8804e6b -->
Text.js 是一个 React 框架，用于构建在浏览器控制台中渲染的应用。

<!-- s:814ee9e9d7 -->
[文档](https://textjs.org/docs) · [学习](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:9535b10be9 -->
快速开始

<!-- s:c7a467af05 -->
打开 [localhost:3000](http://localhost:3000)，并[打开浏览器控制台](https://textjs.org/docs/installation#open-the-console)。Text.js 需要 Bun 1.2+ 或 Node.js 22+，以及桌面版 Chrome、Edge、Firefox 或 Safari。

<!-- s:9bf34f44c9 -->
示例

<!-- s:3f1f0605f9 -->
每一帧都使用 Yoga 布局，通过游程编码转换为 `%c` span，并通过一次 `console.log` 写入。没有单元格变化的帧不会输出日志。[`ARCHITECTURE.md`](ARCHITECTURE.md) 介绍了渲染流水线。

<!-- s:8b78543399 -->
包

<!-- s:cf0456d221 -->
| 包 | 版本 | 描述 |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router、`text` CLI 和路由处理程序 |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | 协调器、组件和 Hook |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | 单元格缓冲区、布局和 `%c` 控制台驱动 |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet 字体解析器和渲染器 |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode 与 OpenCode 服务器之间的本地桥接 |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | 项目生成器 |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js 应用的 ESLint 规则 |

<!-- s:8b249e49fa -->
编辑器和浏览器扩展也在此仓库中：

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs)：[VS Code 扩展](https://textjs.org/docs/vscode)，提供实时预览、App Router 脚手架和错误代码链接
- [`packages/devtools-extension`](packages/devtools-extension)：[Chrome DevTools 扩展](https://textjs.org/docs/devtools-extension)，提供组件树、帧检查器和时间线

<!-- s:08b48c3d0b -->
开发

<!-- s:5facd29c1d -->
网站运行在 [localhost:3000](http://localhost:3000)。[CONTRIBUTING.md](CONTRIBUTING.md) 介绍了其他应用、端到端脚本和发布流程。

<!-- s:47964f2d9e -->
参与贡献

<!-- s:b236bea0a4 -->
欢迎提交错误报告和拉取请求。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，并按照 [SECURITY.md](SECURITY.md) 中的说明报告安全问题。

<!-- s:6c549a56db -->
许可证

<!-- s:a950c8684e -->
[MIT](LICENSE)。捆绑的第三方文件保留各自的许可证：[`packages/font`](packages/font/NOTICE) 中的 FIGlet 字体（BSD 3-Clause），以及 `apps/web` 和 `merch/fonts` 下的字体（SIL Open Font License 1.1）。
