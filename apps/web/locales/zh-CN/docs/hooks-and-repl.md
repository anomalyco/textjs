<!-- s:674f346b70 -->
Hook 将组件连接到输入、焦点和视口。

<!-- s:6296c02ab3 -->
`useInput`

<!-- s:b326ab5213 -->
| 字段 | 说明 |
| :-- | :-- |
| `key` | `"up"` `"return"` `"escape"` `"tab"`… |
| `input` | 按键产生的文本 |
| `ctrl` `meta` `shift` `alt` | 修饰键 |
| `stopPropagation()` | 阻止较低优先级的处理函数执行 |

<!-- s:0764796164 -->
`⌘⌥J` 和 `⌘R` 等浏览器快捷键始终会透传。

<!-- s:550c6a7dd5 -->
`usePaste` 和 `useWheel` 接受相同的选项。`ambient` 对 `useWheel` 无效。

<!-- s:9248f9b147 -->
| 选项 | 说明 |
| :-- | :-- |
| `isActive` | `false` 会停用处理函数，但不卸载组件（默认值为 `true`） |
| `priority` | 优先级越高，越先执行（默认值为 `0`）。获得焦点的组件使用 `FOCUSED_INPUT_PRIORITY`（`10`） |
| `global` | 当前组件外部的 `<Modal>` 打开时，继续接收输入（默认值为 `false`） |
| `ambient` | 不将此处理函数计入[焦点提示](#usepagefocus)的判定（默认值为 `false`） |

<!-- s:e4e842287a -->
开发叠加层的快捷键（`F2` 或 `` Ctrl+` ``）标记为 ambient，因此没有其他键盘输入的页面不会显示提示。

<!-- s:617ae1bfe8 -->
`usePaste` 和 `useWheel`

<!-- s:61e72f6177 -->
`useKeyState`（实验性）

<!-- s:a63d1753a1 -->
`@textjs/react/experimental` 导出 `useKeyState`，通过 `KeyboardEvent.code`（`"KeyW"`、`"ArrowUp"`、`"ControlLeft"`）跟踪按住的物理按键。轮询 `keys.isDown(code)` 或读取 `keys.pressed` 不会触发 React 重新渲染。传入回调即可在按键按下和松开时即时响应。

<!-- s:d9e1465ae0 -->
页面失去焦点时，按住的按键会自动释放。实验性导出的版本管理方式参见[破坏性变更](/docs/support-policy#breaking-changes)。

<!-- s:c34856de19 -->
`useViewport`

<!-- s:1bb49ffa96 -->
`usePageFocus`

<!-- s:8dae4284ef -->
`usePageFocus()` 返回页面是否拥有焦点。只有页面拥有焦点时，按键输入才会传递给应用。返回值与 `useViewport().focused` 相同，但只在焦点变化时触发重新渲染。

<!-- s:e1075d4220 -->
当页面没有焦点，且应用具有 `useInput` 或 `usePaste` 处理函数、`useKeyState` Hook 或可通过 Tab 到达的焦点目标时，控制台帧的最后一行会变为琥珀色提示条，显示“点击页面以使用键盘”。标记为 [`ambient`](#useinput) 的处理函数不计入判定。此提示不会出现在终端、测试或内联镜像中。每次出现时，提示会闪烁约 6 秒，除非系统已开启减少动态效果设置。要自行决定显示时机，在 `text.config.ts` 或 `createConsoleRoot` 中设置 `focusHint: false`，并渲染 `<FocusHint>`：

<!-- s:a537976ab1 -->
`useConsoleStats`

<!-- s:99bae1bb0c -->
`useApp`

<!-- s:e3bd46f1e5 -->
`window.text` REPL

<!-- s:420cc7f125 -->
每个应用都会向 `window.text` 添加辅助函数。在 DevTools 提示符中输入这些函数。
