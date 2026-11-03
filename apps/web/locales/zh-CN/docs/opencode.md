<!-- s:ef79513d57 -->
[OpenCode](https://opencode.ai) 是一个开源编程智能体。**OpenCode Lite** 是用 Text.js 构建的 OpenCode 控制台客户端。

<!-- s:a0fa47c98f -->
试用

<!-- s:8b5f5ed2de -->
- 在本站：访问 [OpenCode](/opencode) 并打开 DevTools。
- 在本地：`bunx create-text-app my-app --template opencode`。

<!-- s:db57075dd8 -->
本站运行的沙箱内置了按脚本响应的智能体。输入任意提示词。

<!-- s:867840c638 -->
结构

<!-- s:7b522f9378 -->
| 区域 | 组件 |
| :-- | :-- |
| 对话记录 | `<ScrollBox stickyScroll>` + `<Markdown>` |
| 工具卡片 | `<Code>` 和 `<Diff>` |
| 提示词 | `<Textarea>` |
| 命令面板 | `<Modal>` + `<Select searchable>` |

<!-- s:ae25d36239 -->
快捷键

<!-- s:9bda94e125 -->
| 按键 | 操作 |
| :-- | :-- |
| `Enter` | 发送 |
| `Shift+Tab` | 切换智能体（build / plan） |
| `Ctrl+P` | 打开命令面板 |
| `Ctrl+X` 然后 `L` | 查看会话 |
| `Ctrl+X` 然后 `N` | 新建会话 |
| 按两次 `Esc` | 中断正在运行的会话 |

<!-- s:b2700ea8eb -->
连接本地服务器

<!-- s:a98495bd7f -->
保持桥接程序运行。在 [OpenCode 页面](/opencode)输入 `http://127.0.0.1:4096`，点击**连接**，如果 Chrome 询问是否允许访问本地网络，请允许。然后输入桥接程序打印的配对码。页面会保持配对状态，直到桥接程序重启或你点击**断开连接**。使用桥接程序的 URL，不要使用服务端口：桥接程序会提供服务凭据和 CORS 标头。使用完毕后，按 Ctrl+C 停止桥接程序。

<!-- s:7c6a89edc5 -->
如果前台服务器已在端口 4096 上运行，运行 `bunx @textjs/opencode@latest proxy --port 4097 --target http://127.0.0.1:4096`，并将页面连接到端口 **4097**。如果前台服务器受密码保护，在运行桥接程序的 shell 中导出其 `OPENCODE_PASSWORD`；不要在浏览器 URL 中放入密码。

<!-- s:951b1ef5cb -->
桥接程序由 `@textjs/opencode` 包提供。它没有依赖，也可以在 Node 22 或更高版本上通过 `npx` 运行。在 Text.js 项目中，`text proxy` 会启动同一个桥接程序。
