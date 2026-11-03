<!-- s:b7512b6ff1 -->
你将在 10 章中构建 **Acme Deploys**，一个在 DevTools 控制台中渲染的部署仪表盘。每章结束时，应用都会以你的代码所定义的状态，在本页的控制台中实时运行。

<!-- s:630c586fd9 -->
创建应用

<!-- s:fd9f176938 -->
`create-text-app` 会生成包含 App Router、TypeScript 和 `text` CLI 的项目骨架。

<!-- s:9eee556b8f -->
打开 `http://localhost:3000`，然后[打开浏览器控制台](/docs/installation#open-the-console)。页面会显示一个焦点区。你的应用在控制台中渲染。

<!-- s:7d69bcfbda -->
你的第一个页面

<!-- s:77df233a57 -->
每个路由都是 `app/` 中的一个 `page.tsx`。将初始页面替换为仪表盘的标题卡片：

<!-- s:efd190e3b6 -->
保存文件。Fast Refresh 会重绘帧，并保留组件状态。

<!-- s:f5e9f4301c -->
响应按键

<!-- s:a9111ae891 -->
页面获得焦点时，`useInput` 会接收每次按键。统计问候次数：

<!-- s:c766a57c22 -->
这就是一个完整的 Text.js 应用。它包含 React 状态和布局框，每个发生变化的帧调用一次 `console.log`，空闲时不输出日志。
