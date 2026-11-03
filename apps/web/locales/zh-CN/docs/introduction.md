<!-- s:b3d5e86364 -->
Text.js 是一个 React 框架，用于构建通过 `console.log` 在 DevTools 控制台中渲染的应用。

<!-- s:34bf1ea7dd -->
预览可实时交互。点击预览并按 `↑`。

<!-- s:0bccbd98be -->
包含的功能

<!-- s:d3708efc68 -->
- **React 19**：并发渲染、Suspense 和错误边界。
- **App Router**：布局、页面、动态段和路由处理程序。
- **Yoga 布局**：在 WebAssembly 中运行的 flexbox，对齐到整数单元格。
- **Turbolog**：每个发生变化的帧调用一次 `console.log`。
- **控制台 UI**：页面仅包含一个焦点捕获区和一个隐藏的输入框。

<!-- s:5ae438610c -->
工作原理

<!-- s:75f47f9f8c -->
状态向下流动：从 React 到布局，再到单元格缓冲区，最后到控制台。

<!-- s:25c55610d2 -->
未发生变化的帧会跳过，因此空闲应用不输出任何日志。

<!-- s:3a5d9cbc49 -->
后续步骤

<!-- s:b849362c77 -->
- [安装](/docs/installation)：创建你的第一个应用。
- [路由](/docs/routing)：页面、布局和导航。
- [Turbolog](/docs/turbolog-engine)：帧的编码方式。
- [OpenCode](/docs/opencode)：使用 Text.js 构建的智能体 TUI。
