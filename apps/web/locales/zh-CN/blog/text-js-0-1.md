<!-- s:00c66df67a -->
Text.js 0.1 已打标签。这是首个包含全部三层的版本：`@textjs/core` 将帧绘制到控制台，`@textjs/react` 将 React 19 渲染到这些帧中，`textjs` 则添加 App Router 和 CLI。

<!-- s:1aa5bba86a -->
App Router

<!-- s:4631fd1deb -->
路由是 `app/` 中的文件夹，遵循 Next.js App Router 的约定。这是 `create-text-app` 的 `dashboard` 模板：

<!-- s:18fa0019a3 -->
布局包裹其下的每个页面，并在导航时保留状态。`<Link>` 接受 `shortcut`，按一个键即可跳转，`activeClassName` 则为指向当前路由的链接设置样式：

<!-- s:5587be498a -->
动态路由段的工作方式与 Next.js 相同。`[id]` 成为参数，`[...slug]` 匹配路径的其余部分，`[[...slug]]` 还会匹配父路径。静态路由段优先于动态路由段，`(marketing)` 这样的路由分组可用于组织文件，不会增加 URL 层级。

<!-- s:3a9a93d850 -->
`loading.tsx` 和 `error.tsx` 分别用 Suspense 边界和错误边界包裹路由段。错误组件接收错误和一个 `reset` 函数：

<!-- s:142b529e3f -->
路由处理程序位于 `app/api` 中，返回标准的 `Response`：

<!-- s:fe0c29445c -->
路由器通过 `history.pushState` 保持 `window.location` 同步，因此后退、前进和深层链接均可使用，`metadata.title` 会写入 `document.title`。应用在控制台中绘制，页面则放置一个用于收集输入的焦点区。

<!-- s:6109f13d80 -->
CLI

<!-- s:bbc9d4be2d -->
- `text dev` 启动 Vite 并启用 React Fast Refresh。保存文件会原地更新控制台。
- `text build` 输出应用及其路由处理程序的生产构建。
- `text start` 提供构建产物和路由处理程序的服务。

<!-- s:1e1161891f -->
`create-text-app` 根据 `starter` 或 `dashboard` 模板生成项目骨架。

<!-- s:e2a33d088a -->
检查器

<!-- s:cdb3155210 -->
在运行中的应用里按 `` Ctrl+` `` 或 `F2`，即可在控制台内打开 `[▼]` 检查器。检查器显示匹配的路由及其参数、帧尺寸、span 数量、各阶段耗时，以及脏检查门控跳过的帧数。`W` 将 Yoga 布局绘制为线框图。

<!-- s:c2600ceabc -->
0.1 的其他内容

<!-- s:289b0a9973 -->
`@textjs/react` 提供 PascalCase 命名的组件（`Box`、`Text`、`ScrollBox`、`Input`、`Textarea`、`Select`、`Tabs`、`Code`、`Markdown`、`Diff`、`Modal`、`Spinner`）、以单元格为单位的 Tailwind 风格 `className` 工具类和主题。布局由 WebAssembly 中的 Yoga 处理。

<!-- s:8ad0f2154c -->
完整列表见[更新日志](/changelog#v0-1-0)。
