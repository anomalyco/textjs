<!-- s:98c33b0a07 -->
环境要求

<!-- s:16d53f1055 -->
- [Bun](https://bun.sh) 1.2+ 或 Node.js 22+
- 桌面版 Chrome、Edge、Firefox 或 Safari

<!-- s:d7f4dad213 -->
创建应用

<!-- s:b32738e24d -->
选择模板（`starter`、`dashboard` 或 `opencode`），然后启动开发服务器：

<!-- s:21fb743289 -->
打开控制台

<!-- s:14e4fdc5be -->
访问 `http://localhost:3000` 并打开控制台。

<!-- s:a370660339 -->
| 浏览器 | macOS | Windows / Linux |
| :-- | :-- | :-- |
| Chrome、Edge、Arc、Brave | `⌘` `⌥` `J` | `Ctrl` `Shift` `J` |
| Firefox | `⌘` `⌥` `K` | `Ctrl` `Shift` `K` |
| Safari | `⌘` `⌥` `C` | 仅限 macOS |

<!-- s:de7134a591 -->
在 Safari 中，先在“设置”→“高级”中开启**“显示网页开发者功能”**。

<!-- s:8f6c6cf39e -->
点击页面使其获得焦点，然后输入。将 DevTools 停靠在底部可获得最宽的网格。

<!-- s:9807a8b582 -->
控制台设置

<!-- s:803094bd72 -->
在控制台设置中关闭**“保留日志”**。Text.js 每帧追加一条消息，并清空控制台以释放旧帧。开启“保留日志”后，DevTools 会忽略清空操作，旧帧会不断累积。

<!-- s:35e7d1d33e -->
手动配置

<!-- s:ff78ccae69 -->
不使用框架

<!-- s:26f8520062 -->
从现有网站将任意 React 树挂载到控制台：
