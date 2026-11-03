<!-- s:5a6798e6a5 -->
今天我们发布 Text.js 1.0，这是面向 Web 的控制台框架。

<!-- s:e4787165f5 -->
Text.js 在 Chrome DevTools 控制台中渲染 React 19 应用，通过 `console.log` 绘制布局、路由、焦点、输入、表单、图表和流式 Markdown。

<!-- s:48b184a262 -->
1.0 的功能

<!-- s:7f7f2a9a76 -->
- **App Router。** `layout.tsx`、`page.tsx`、`[param]`、`loading.tsx`、`error.tsx`、`not-found.tsx` 和 `api/*/route.ts`，与 `window.location` 同步。遵循 Next.js App Router 约定。
- **Turbolog。** Yoga flexbox 负责单元格网格布局，类型化数组 `CellBuffer` 存储网格，游程编码器将其转换为一次 `console.log(format, ...css)` 调用。空闲帧不调用控制台。
- **组件库。** `Box`、`Text`、`ScrollBox`、`Input`、`Select`、`Tabs`、`Markdown`、`Diff`、虚拟化 `List`、`Table`、`Tree`、图表、对话框、提示消息，以及基于 `useKeymap` 的 `Ctrl+K` 命令面板。
- **追加帧。** 每一帧都追加在上一帧下方，因此控制台不会在帧间闪现空白。详情见 [Turbolog：消除闪烁](/blog/turbolog-eliminating-the-flash)。
- **从右到左的文本。** 基于通过全部 770,241 个 `BidiTest.txt` 测试用例的 UAX #9 实现，希伯来语和阿拉伯语按视觉顺序渲染，并支持阿拉伯文字形塑造。参见[控制台中的从右到左文本](/blog/right-to-left-text)。
- **响应式控制台。** Text.js 适配停靠的 DevTools 面板，支持页面缩放和工具栏换行。取消停靠后，回退为 `120×36`。
- **`text run`。** 同一个 App Router 应用可在真正的终端中渲染。
- **智能体和编辑器工具。** `text mcp` 通过模型上下文协议向编程智能体提供你的应用，Text.js DevTools 扩展则在控制台旁添加一个面板。`eslint-plugin-textjs` 和 VS Code 扩展也包含在 1.0 中。

<!-- s:b71c4a16bc -->
一次更名

<!-- s:b47aa37902 -->
框架包现已更名为 `@textjs/next`。`textjs` 这个名称在 npm 上已被占用。请更新导入：

<!-- s:e4005009f1 -->
**1.0.2 更新：** 包现已更名为 `@textjs/app`，`@textjs/next` 已弃用。要切换，请运行 `bun remove @textjs/next && bun add @textjs/app`，并从 `@textjs/app` 导入。

<!-- s:5b35a47b90 -->
性能数据

<!-- s:2ee54da34c -->
在密集的 `100×32` 仪表盘上（46 个文本节点、149 个 `%c` span），使用 `packages/core/test/perf.test.ts` 测得：

<!-- s:9729def172 -->
| 帧 | 平均值 |
| :-- | --: |
| 完整重绘（布局、绘制、编码） | 0.163 ms |
| 单行编辑（输入） | 0.011 ms |
| 空闲 | 0.000 ms，0 次控制台调用 |

<!-- s:2fee8c4c3d -->
未发生变化的帧在分配字符串之前就会返回，因此空闲帧的测量结果为 0.000 ms。

<!-- s:a0fa47c98f -->
试用

<!-- s:aeb9cc2b5d -->
打开 [textjs.org](/)，按 ⌘⌥J（Windows 和 Linux 上按 Ctrl+Shift+J）。网站会在你的控制台中运行 Text.js 应用，每个页面对应一个视图。[Playground](/playground) 提供仪表盘、流式 Markdown 和贪吃蛇。[OpenCode](/opencode) 可连接到你本地的 OpenCode 服务器。

<!-- s:31dd2e762c -->
完整变更列表见[更新日志](/changelog)，源代码位于 [GitHub](https://github.com/anomalyco/textjs)。
