<!-- s:9f5667f5e7 -->
`@textjs/app/testing`（或 `@textjs/react/testing`）离屏渲染应用，模拟按键，并以文本形式返回帧。测试无需浏览器或 DevTools 即可运行。

<!-- s:9bc71b1ad2 -->
支持任何能运行 `async` 测试的测试运行器，包括 Bun、Vitest 和 Jest。

<!-- s:f7898e6b92 -->
渲染

<!-- s:fc969a7928 -->
| 方法 | 描述 |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | 离屏挂载（默认 80×24） |
| `lastFrame()` | 纯文本形式的帧 |
| `lines()` | 行数组形式的帧 |
| `frames` | 到目前为止所有不同的帧 |
| `toAnsi()` | 用于快照的真彩色 ANSI |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | 首个匹配项的 `{ x, y }` |
| `rerender(el)` / `unmount()` | 更新或卸载 |

<!-- s:893f22353a -->
`renderToString(el, options)` 渲染一次并返回文本。

<!-- s:99a3c4d459 -->
输入

<!-- s:105149560b -->
每次调用都在 `act()` 内运行，并刷新生成的帧，因此下一条断言能看到更新。

<!-- s:1f65c071dc -->
时间

<!-- s:ab365d9403 -->
动画、加载指示器和提示消息使用真实计时器，因此使用 `wait` 和 `waitFor` 可以可靠地观察这些变化。

<!-- s:26f93acae3 -->
快照

<!-- s:05724c9883 -->
帧右侧和底部的空白会被裁剪，因此快照不会因空白而反复变化。
