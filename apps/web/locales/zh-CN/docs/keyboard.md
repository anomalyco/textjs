<!-- s:3bfcfe41ce -->
用 `useKeymap` 声明一次快捷键。Text.js 负责路由这些快捷键，在 `?` 浮层中列出，在页脚中显示，并支持在命令面板中搜索。

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| 语法 | 含义 |
| :-- | :-- |
| `ctrl+k` | 修饰键：`ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` 或 `Ctrl`，取决于按住哪一个 |
| `j, down` | 可选按键 |
| `g g` | 按键序列（按键间隔为 1 秒） |
| `G` | 大写隐含 `Shift` |
| `?` | 可打印按键按字符匹配 |

<!-- s:ef55b4b9de -->
值可以是处理函数，也可以是带有 `label`、`group`、`hint`、`disabled` 和 `noRepeat` 的绑定。没有标签的绑定仍然生效，但不会显示在帮助浮层中。

<!-- s:01f344cdbe -->
`useKeymapBindings()` 返回当前生效且带有标签的绑定，供你在自定义页脚和菜单中使用。

<!-- s:dd8af5eb69 -->
按键映射通过 `useInput` 运行，因此遵循常规规则：获得焦点的输入框优先，匹配的按键会停止传播，打开的 `<Modal>` 会禁用其外部的绑定。传入 `{ priority, global, isActive }` 可更改这些行为。

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
按 `?` 可按分组查看所有带标签的绑定。列表显示浮层打开位置当前生效的绑定。

<!-- s:3cebb95bfc -->
`<KeyHints>` 和 `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` 显示标记为 `hint: true` 的绑定，或显式指定的 `items`。`<StatusBar>` 是带有 `right` 插槽的单行页脚。

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` 渲染单个按键。`formatKeys("ctrl+shift+p")` 在 macOS 上返回 `⌃⇧P`，在其他平台上返回 `ctrl+shift+P`。

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K`（或 `Ctrl+P`）打开支持模糊搜索的启动器，涵盖你的命令和所有带标签的绑定，并高亮匹配的字母。

<!-- s:e88bab4eab -->
| Prop | 说明 |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | 打开快捷键（默认为 `ctrl+k, ctrl+p`；设为 `null` 可禁用） |
| `includeKeymap` | 列出按键映射绑定（默认为 `true`） |
| `open` / `onOpenChange` | 受控状态 |

<!-- s:ddd093fe85 -->
命令面板会在执行命令前关闭，因此命令可以打开自己的模态框。`fuzzyMatch` 和 `fuzzyFilter` 均已导出，可用于你自己的列表。
