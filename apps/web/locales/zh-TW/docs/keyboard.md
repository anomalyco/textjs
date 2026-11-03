<!-- s:3bfcfe41ce -->
使用 `useKeymap` 宣告一次快速鍵。Text.js 會分派這些快速鍵，在 `?` 浮層中列出、在頁尾顯示，並支援在命令面板中搜尋。

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| 語法 | 意義 |
| :-- | :-- |
| `ctrl+k` | 修飾鍵：`ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` 或 `Ctrl`，依按住的鍵而定 |
| `j, down` | 替代按鍵 |
| `g g` | 按鍵序列（按鍵間隔 1 秒） |
| `G` | 大寫表示包含 `Shift` |
| `?` | 可列印按鍵依字元比對 |

<!-- s:ef55b4b9de -->
值可以是處理函式，或帶有 `label`、`group`、`hint`、`disabled` 和 `noRepeat` 的綁定。沒有標籤的綁定仍可使用，但不會出現在說明浮層中。

<!-- s:01f344cdbe -->
`useKeymapBindings()` 會回傳目前生效且帶有標籤的綁定，供自訂頁尾和選單使用。

<!-- s:dd8af5eb69 -->
按鍵對應透過 `useInput` 執行，因此適用相同規則：取得焦點的輸入欄位優先，符合的按鍵會停止事件傳遞，而開啟的 `<Modal>` 會停用外部綁定。傳入 `{ priority, global, isActive }` 可變更這些行為。

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
按下 `?`，即可依群組查看所有帶有標籤的綁定。清單會列出開啟位置目前生效的綁定。

<!-- s:3cebb95bfc -->
`<KeyHints>` 與 `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` 會顯示標記為 `hint: true` 的綁定，或明確指定的 `items`。`<StatusBar>` 是單列頁尾，提供 `right` 插槽。

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` 會渲染單一按鍵。`formatKeys("ctrl+shift+p")` 在 macOS 上會產生 `⌃⇧P`，在其他平台則產生 `ctrl+shift+P`。

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K`（或 `Ctrl+P`）會開啟支援模糊搜尋的啟動器，涵蓋你的命令與所有帶有標籤的綁定，並醒目顯示符合的字母。

<!-- s:e88bab4eab -->
| Prop | 說明 |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | 開啟快速鍵（預設為 `ctrl+k, ctrl+p`；設為 `null` 可停用） |
| `includeKeymap` | 列出按鍵對應綁定（預設為 `true`） |
| `open` / `onOpenChange` | 受控狀態 |

<!-- s:ddd093fe85 -->
面板會先關閉再執行命令，因此命令可以開啟自己的互動視窗。`fuzzyMatch` 和 `fuzzyFilter` 均有匯出，可用於自訂清單。
