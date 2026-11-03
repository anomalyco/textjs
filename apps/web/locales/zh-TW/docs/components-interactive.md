<!-- s:06b0e11de4 -->
這些輸入元件以鍵盤操作，並自行管理焦點。

<!-- s:1d0d345c65 -->
焦點

<!-- s:bc06482880 -->
`Tab` 和 `Shift+Tab` 會循環切換焦點。`autoFocus` 會在掛載時取得焦點。

<!-- s:fca23dd943 -->
取得焦點的編輯器會攔截按鍵，因此輸入 `1` 不會觸發全域快速鍵。

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
支援 readline 風格編輯的單行輸入元件。

<!-- s:88cdcfc0ea -->
| Prop | 說明 |
| :-- | :-- |
| `value` / `onChange` | 受控值 |
| `onSubmit` | 按下 `Enter` 時呼叫 |
| `placeholder` | 空白時顯示的提示文字 |
| `mask` | 用於隱藏機密內容的遮罩字元 |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
多行文字編輯元件。`Enter` 送出，`Shift+Enter` 換行。

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
以鍵盤操作的選項清單，可選擇啟用模糊搜尋。

<!-- s:70fe7d6c9b -->
| Prop | 說明 |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | 按下 `Enter` 時呼叫 |
| `searchable` | 輸入文字時篩選選項 |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
失去焦點時的游標

<!-- s:f0552feed5 -->
頁面失去焦點時，游標會凍結，影格也會停止更新，方便你選取並複製主控台文字。
