<!-- s:d7ae3c23f0 -->
每個儲存格都有一個字元、前景色、背景色和一組屬性。Text.js 將這些編譯成 `%c` CSS span，讓主控台顯示實際的色彩、粗體和斜體。

<!-- s:45433c474e -->
文字屬性

<!-- s:32c37753d8 -->
`<Text>` 接受 `bold`、`dim`、`italic`、`underline` 和 `strikethrough`。巢狀的 `<Text>` 元素會成為同一行內帶有樣式的 span。

<!-- s:661b7c60b6 -->
主題 token

<!-- s:f312d78237 -->
`color` prop 接受十六進位值、一般色彩名稱（`emerald`）和主題 token；Tailwind 調色盤的色階則透過 class（`text-emerald-400`）設定。Token 會隨目前的主題變化，因此有語意用途的色彩應優先使用 token。新增一個狀態元件：

<!-- s:4d4d36a0bd -->
部署卡片

<!-- s:108bb076c9 -->
`bg-surface` 讓卡片從背景中浮現。部署 ID 使用狀態色彩，建置時顯示為斜體，發生錯誤時加上刪除線。

<!-- s:a28d99a8eb -->
`wrap="truncate-end"` 會以 `…` 結束過長的提交訊息，避免換到第二列。

<!-- s:087abce968 -->
主題

<!-- s:8f993e0ab8 -->
Text.js 內建五種主題：Geist Dark、OpenCode Dark、Tokyo Night、Amber CRT 和 Geist Light。在主控台按 `t` 即可依序切換。整個影格會以新的調色盤重繪，因為上方每個顏色都使用主題 token。
