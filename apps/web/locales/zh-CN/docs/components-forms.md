<!-- s:7929eb6998 -->
Text.js 提供表单控件、对话框和消息提示。每个控件都加入 `Tab` 焦点顺序，并响应 `Space` 或 `Enter`。

<!-- s:0c4878f82e -->
控件

<!-- s:920d5e74e5 -->
| 组件 | 按键 | 值 |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓`（或 `←` `→`） | `value` / `onChange` |
| `<Slider>` | `←` `→`、`Shift` ×5、`Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
所有控件都接受 `autoFocus`、`focused`、`id` 和 `disabled`。受控和非受控（`defaultChecked`、`defaultValue`）模式均可使用。

<!-- s:0a2857b66b -->
按钮

<!-- s:1981291f42 -->
`variant` 可设为 `primary`、`secondary`、`ghost` 或 `danger`。获得焦点时，按钮以强调色填充，尺寸保持不变。

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
带有描述和操作行的 `<Modal>`。

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
是或否。`y` 和 `n` 直接作答；`←` `→` 在按钮之间移动焦点。`destructive` 设置确认按钮的样式，并优先聚焦“取消”按钮。

<!-- s:fecae30a60 -->
消息提示

<!-- s:76abda6137 -->
渲染一个 `<Toaster />`，然后在同一根节点内的任意位置调用 `useToast()`。

<!-- s:d5c6b1208e -->
| 选项 | 说明 |
| :-- | :-- |
| `duration` | 毫秒数（默认 `4000`；加载中的消息提示持续显示） |
| `id` | 复用此值可原地更新消息提示 |
| `position` | 在 `<Toaster>` 上设置：`bottom-right`（默认）、`top-center`、… |
| `max` | 在 `<Toaster>` 上设置：同时显示的数量（默认 `3`） |

<!-- s:476f42f2b3 -->
消息提示渲染在模态框上方，且从不获取焦点。
