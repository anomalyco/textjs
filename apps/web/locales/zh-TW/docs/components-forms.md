<!-- s:7929eb6998 -->
Text.js 包含表單控制項、對話方塊與浮動通知。每個控制項都會加入 `Tab` 切換順序，並回應 `Space` 或 `Enter`。

<!-- s:0c4878f82e -->
控制項

<!-- s:920d5e74e5 -->
| 元件 | 按鍵 | 值 |
| :-- | :-- | :-- |
| `<Button>` | `↵` `Space` | `onPress` |
| `<Checkbox>` | `Space` `↵` | `checked` / `onChange` |
| `<Switch>` | `Space` `←` `→` | `checked` / `onChange` |
| `<RadioGroup>` | `↑` `↓`（或 `←` `→`） | `value` / `onChange` |
| `<Slider>` | `←` `→`、`Shift` ×5、`Home` `End` | `value` / `onChange` |

<!-- s:1c3c5ba8fd -->
所有控制項都接受 `autoFocus`、`focused`、`id` 與 `disabled`。受控與非受控（`defaultChecked`、`defaultValue`）模式皆可使用。

<!-- s:0a2857b66b -->
按鈕

<!-- s:1981291f42 -->
`variant` 可設為 `primary`、`secondary`、`ghost` 或 `danger`。取得焦點時，按鈕會填滿強調色，尺寸不變。

<!-- s:56be122300 -->
`<Dialog>`

<!-- s:30940c6b5c -->
附有說明與操作列的 `<Modal>`。

<!-- s:7cfec2b258 -->
`<Confirm>`

<!-- s:7e0406516a -->
是或否。`y` 和 `n` 可直接回答；`←` `→` 可在按鈕之間移動。`destructive` 會設定確認按鈕的樣式，並優先將焦點放在「取消」。

<!-- s:fecae30a60 -->
浮動通知

<!-- s:76abda6137 -->
渲染一個 `<Toaster />`，再於同一個根節點內的任意位置呼叫 `useToast()`。

<!-- s:d5c6b1208e -->
| 選項 | 說明 |
| :-- | :-- |
| `duration` | 毫秒數（預設為 `4000`；載入中的浮動通知會持續顯示） |
| `id` | 重複使用可原地更新浮動通知 |
| `position` | 在 `<Toaster>` 上設定：`bottom-right`（預設）、`top-center`、… |
| `max` | 在 `<Toaster>` 上設定：同時顯示的數量（預設為 `3`） |

<!-- s:476f42f2b3 -->
浮動通知會渲染在模態視窗上方，且不會取得焦點。
