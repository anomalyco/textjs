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

<!-- s:195573d803 -->
按控制台使用意图加载（实验性）

<!-- s:97014ecad1 -->
`@textjs/core/experimental` 导出 `onConsoleIntent`，供页面仅在访客有使用意图时下载控制台应用。它会调用你的函数一次，并传入触发原因：

<!-- s:444b1ebdd7 -->
| 原因 | 触发时机 |
| :-- | :-- |
| `dock` | DevTools 在页面加载时已停靠，或在之后停靠。Text.js 通过窗口大小判断停靠状态 |
| `shortcut` | 访客按下 F12 或 Ctrl+Shift+J、I、C 或 K，或在 Mac 上按下 ⌘⌥J、I、C 或 K。浏览器仍会打开 DevTools |
| `engage` | 使用主按钮点击匹配 `engageSelector` 的元素，在 `[data-textjs-engage]` 按钮上按 Enter 或 Space，或在应用启动前通过 `<ViewportControl>` 选择尺寸。点击匹配元素内部的链接、按钮和表单字段不计入，除非它们也带有 `data-textjs-engage` |
| `session` | 当前标签页中已发生上述任一操作，因此重新加载时会立即启动 |
| `manual` | 你在返回的句柄上调用了 `trigger()` |

<!-- s:894b97fac4 -->
从浏览器菜单在独立窗口中打开的 DevTools 不会反映在窗口大小中。这些访客通过 `engage` 元素启动应用，`session` 则确保在该标签页重新加载时继续启动应用。

<!-- s:06cdcf713e -->
触摸屏上不会自动触发任何操作。从你自己的控件调用 `trigger()`。

<!-- s:d7006796c2 -->
| 选项 | 描述 |
| :-- | :-- |
| `engageSelector` | 点击后启动应用的元素（默认值为 `[data-textjs-engage], [data-textjs-focus-pad], text-console`）。设为 `false` 时不添加监听器 |
| `persist` | 在 `sessionStorage` 中以 `CONSOLE_INTENT_KEY` 为键记录当前标签页的使用意图（默认值为 `true`） |
| `prefetch` | 指针或焦点进入 `engageSelector` 元素时调用，最多调用一次 |
| `idlePrefetch` | 在 `load` 之后浏览器空闲时也调用 `prefetch`（默认值为 `false`） |

<!-- s:4460da3205 -->
在触摸屏上、开启流量节省模式时或连接速度低于 4G 时，`prefetch` 都不会运行。`canPrefetchConsole()` 返回相同检查的结果。句柄的 `dispose()` 会移除所有监听器。

<!-- s:9128a9d98f -->
`<ViewportControl>` 在控制台根节点创建前即可使用。选择尺寸会保存该尺寸，触发 `engage` 以便 `onConsoleIntent` 启动应用，并在设置 `root` 后应用该尺寸。有关实验性导出的版本管理方式，请参阅[破坏性变更](/docs/support-policy#breaking-changes)。
