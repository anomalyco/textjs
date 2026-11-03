<!-- s:06b0e11de4 -->
这些输入组件由键盘驱动，并自行管理焦点。

<!-- s:1d0d345c65 -->
焦点

<!-- s:bc06482880 -->
`Tab` 和 `Shift+Tab` 循环切换焦点。`autoFocus` 在挂载时获取焦点。

<!-- s:fca23dd943 -->
获得焦点的编辑器会拦截按键，因此输入 `1` 不会触发全局快捷键。

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
支持 readline 风格编辑的单行输入框。

<!-- s:88cdcfc0ea -->
| Prop | 说明 |
| :-- | :-- |
| `value` / `onChange` | 受控值 |
| `onSubmit` | 按 `Enter` 时调用 |
| `placeholder` | 为空时显示 |
| `mask` | 用于隐藏敏感内容的掩码字符 |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
多行输入框。`Enter` 提交，`Shift+Enter` 换行。

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
通过键盘操作的选项列表，可启用模糊搜索。

<!-- s:70fe7d6c9b -->
| Prop | 说明 |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | 按 `Enter` 时调用 |
| `searchable` | 输入时筛选选项 |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
失焦时的光标

<!-- s:f0552feed5 -->
页面失去焦点时，光标冻结并停止渲染帧，便于你选择和复制控制台文本。
