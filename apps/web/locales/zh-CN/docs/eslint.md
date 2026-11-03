<!-- s:df706c7a4d -->
`eslint-plugin-textjs` 在编辑器中检测 Text.js 错误：控制台组件中的 DOM 标签、文本中的盒子、Menlo 缺少的字形、多余的 `console.log` 调用，以及被静默忽略的 App Router 导出。

<!-- s:0ecddf15e1 -->
设置

<!-- s:5d60a92733 -->
插件支持使用扁平配置的 ESLint 9 和 10。规则基于语法检查，不需要类型信息或 `parserOptions.project`。任何能解析 TypeScript 和 JSX 的解析器都可使用。

<!-- s:b69abcef52 -->
配置

<!-- s:9cfe4adde3 -->
| 配置 | 启用的规则 |
| :-- | :-- |
| `textjs.configs.recommended` | 所有正确性规则设为错误；控制台、定时器和帧节奏规则设为警告 |
| `textjs.configs.strict` | 所有规则设为错误，另将 `prefer-use-keymap` 设为警告 |

<!-- s:6c9781312c -->
也可以单独选择规则：

<!-- s:ec6eb92cf0 -->
控制台文件

<!-- s:04573fe453 -->
大多数规则只适用于渲染到控制台的文件：从 `@textjs/app` 或 `@textjs/react` 导入组件或 Hook（`Box`、`Text`、`useInput` 等）的文件。导入 `react-dom` 或 `@textjs/react/dom` 的文件属于页面代码，不受这些规则检查，因此网站可以在同一项目中混用 DOM 页面和控制台应用。导入 `tokenize` 或 `parseMarkdown` 这类工具函数不会使文件成为控制台文件。

<!-- s:96e9c86b58 -->
App Router 规则根据任意 `app/` 目录中的文件名（`page.tsx`、`layout.tsx`、`route.ts` 等）判断，也包括 `src/app/`。如果你的目录使用其他名称，请向 `valid-route-module`、`valid-metadata` 和 `route-handler-exports` 传入 `{ appDir: "routes" }`。

<!-- s:b66542635d -->
规则

<!-- s:c1b57ad8e2 -->
| 规则 | 推荐配置 | 修复 |
| :-- | :-- | :-- |
| [`no-dom-elements`](#no-dom-elements) | 错误 | 建议 |
| [`no-box-in-text`](#no-box-in-text) | 错误 | |
| [`no-unsupported-glyphs`](#no-unsupported-glyphs) | 错误 | 自动修复、建议 |
| [`no-console-in-components`](#no-console-in-components) | 警告 | 建议 |
| [`prefer-use-interval`](#prefer-use-interval) | 警告 | 建议 |
| [`no-sub-frame-timers`](#no-sub-frame-timers) | 警告 | |
| [`prefer-use-keymap`](#prefer-use-keymap) | 仅严格配置 | |
| [`valid-route-module`](#valid-route-module) | 错误 | |
| [`valid-metadata`](#valid-metadata) | 错误 | |
| [`route-handler-exports`](#route-handler-exports) | 错误 | 建议 |

<!-- s:a565f817ed -->
`no-dom-elements`

<!-- s:deb9e3c0ec -->
控制台中不存在 `<div>`、`<span>`、自定义元素及其他 DOM 标签。reconciler 只识别自身的宿主节点，遇到其他节点就会抛出 `TX003`。

<!-- s:bd7c3e0318 -->
修复建议会将标签替换为最接近的组件（`div` → `Box`、`span`/`p` → `Text`、`strong` → `Text bold`、`a` → `Link`、`input` → `Input`、`hr` → `Divider` 等），并添加导入。

<!-- s:a40be5da85 -->
`no-box-in-text`

<!-- s:4ec768c301 -->
`<Text>` 是一串带样式的 span，不能包含盒子。嵌套 `<Box>` 或任何以盒子为根节点的组件（`<ScrollBox>`、`<Input>`、`<Code>`、`<ProgressBar>`、`<Divider>` 等）会在渲染时抛出 `TX004`。这条规则会提前在编辑器中发现问题，包括 `&&`、三元表达式、片段和 `.map()` 中的问题。

<!-- s:9390fe5b6b -->
`no-unsupported-glyphs`

<!-- s:bf8fe52c9e -->
Text.js 在固定的单元格网格中布局每个字符。macOS 上的 DevTools 控制台字体 Menlo 缺少的字形会使用后备字体渲染，其宽度超过一个单元格，导致后续所有单元格偏移。

<!-- s:a58a59c2f8 -->
- **盲文**（U+2800–U+28FF，经典终端加载动画帧）：使用块字符或象限字符（`▘▝▗▖`）、`<Spinner variant="dots">`，或为图表设置 `marker="quadrant"`。对于仅通过 `text run` 在终端运行的应用，设置 `{ allowBraille: true }`。
- **杂项符号和箭头**（U+2B00–U+2BFF，例如小方块 U+2B1D）：修复建议会提供 Menlo 中的对应字符（`·`、`●`、`←`）。
- **单单元格符号的表情符号显示形式**（`▶` 或 `↩` 后跟 U+FE0F）：变体选择符会将其变为占两个单元格的表情符号，而网格只预留了一个单元格。自动修复会移除该选择符。

<!-- s:8c0c49dfb7 -->
宽表情符号（`🚀`、`✅`）没有问题：Text.js 将其计为两个单元格。

<!-- s:f838b005d1 -->
`no-console-in-components`

<!-- s:593ea6ea72 -->
每一帧都是一次 `console.log`。你自己的日志会出现在帧之间，被下一帧滚出视野，并在固定到底部的视图中隐藏。`console.clear()` 会清除应用本身。

<!-- s:0011d5dcff -->
使用 `useToast()` 或日志 `<ScrollBox>` 在 UI 中显示消息，或在 `[▼]` 开发浮层（`` Ctrl+` ``）中检查状态。配置 `logger` 后，修复建议会将 `console.warn(…)` 改写为 `log.warn(…)`。测试文件和 `@textjs/app/testing` 渲染会跳过检查。

<!-- s:6838ca349d -->
`prefer-use-interval`

<!-- s:7d34b88f36 -->
在组件中直接使用 `setInterval`，需要副作用、清理函数和 ref 来避免读取过期状态。`useInterval` 处理这三项工作，传入 `null` 即可停止。

<!-- s:894ec09a45 -->
对于动画，`useAnimationFrame` 会遵循渲染器的帧节奏，并在输出暂停时停止。参见[工具 Hook](/docs/utility-hooks)。

<!-- s:0d541fb900 -->
`no-sub-frame-timers`

<!-- s:a27426b886 -->
Text.js 每 66 ms 最多输出一帧（约 15 fps）。16 ms 的定时器会在每个输出帧内渲染四次；多余的帧会被合并，只会消耗 CPU。此规则会报告延迟低于 `minInterval`（默认 `66`）的 `setInterval`/`useInterval`，以及 `fps` 高于 15 的 `useAnimationFrame`。

<!-- s:bc8950c5dd -->
`prefer-use-keymap`

<!-- s:fbcb0ae458 -->
手动比较 `e.key` 可以工作，但快捷键不会显示出来。`useKeymap` 将带标签的绑定放入 `<KeyHelp>`、`<KeyHints>`（带有 `hint: true` 的绑定）和命令面板，处理 `g g` 这样的按键序列，并阻止匹配按键的事件传播。此规则会报告比较两个或更多按键字面量（`minKeys`）的 `useInput` 处理程序，并跳过读取 `e.input` 来处理文本输入的处理程序。

<!-- s:05d39412dc -->
参见[键盘快捷键](/docs/keyboard)。

<!-- s:3ee3017e0f -->
`valid-route-module`

<!-- s:d470bf26bc -->
- `page`、`layout`、`loading`、`error` 和 `not-found` 文件必须默认导出一个组件（`TX015`）。
- `export const dynamic` 必须为 `"auto"`、`"force-static"` 或 `"force-dynamic"`（`TX031`）。Text.js 不支持 Next.js 的 `"error"`。该值从页面、布局和路由处理程序中读取。在页面和布局中，请将其写为普通字符串字面量：`text build` 会从源码中读取，不会运行模块。

<!-- s:263d4a01aa -->
`valid-metadata`

<!-- s:1d3a134d04 -->
Metadata 先从布局合并，再从页面（或 `not-found`）合并。此规则会报告路由器会静默忽略的情况：

<!-- s:fe9ebcbc0c -->
- `loading` 或 `error` 文件中的 `metadata` 或 `generateMetadata`
- 同一文件中同时存在这两种导出
- `async generateMetadata`：调用是同步的，因此 Promise 不会设置标题
- 既不是字符串也不是 `{ default, template?, absolute? }` 的 `title`，或拼写错误的键
- 不含 `%s` 的 `title.template`，或位于页面中、不起作用的 `title.template`
- 非字符串的 `description`

<!-- s:c8c401c5e0 -->
`route-handler-exports`

<!-- s:877bcc12b1 -->
`route.ts` 文件只响应其导出的 HTTP 方法：`GET`、`HEAD`、`POST`、`PUT`、`PATCH`、`DELETE` 和 `OPTIONS`。小写的 `get` 或 `Post` 永远不会被调用（请求会收到 `405`）；修复建议会将其重命名。默认导出、非函数处理程序和其他导出都会被报告，但 `dynamic` 和 `revalidate` [路由段配置](/docs/caching)除外。将共享代码移至 `lib/`，或使用 `{ allow: [...] }` 列出额外允许的名称。
