<!-- s:e580113c76 -->
Các component này render Markdown, mã, bản diff và chữ cỡ lớn trên lưới ô.

<!-- s:10d1e663ca -->
`<Markdown>`

<!-- s:842bba9c18 -->
Markdown an toàn khi streaming. Truyền vào một chuỗi tăng dần và frame vẫn ổn định.

<!-- s:f6f3074d02 -->
`<Code>`

<!-- s:e3dec08834 -->
Tô sáng cú pháp cho `ts`, `tsx`, `json`, `bash`, `python`, `rust`, `go` và nhiều ngôn ngữ khác.

<!-- s:e75addc84e -->
| Prop | Mô tả |
| :-- | :-- |
| `language` | Mã định danh ngôn ngữ |
| `showLineNumbers` | Lề số dòng |
| `highlightLines` | Các dòng cần tô màu |
| `maxHeight` | Cắt bớt kèm chân trang “còn dòng” |

<!-- s:14338ded97 -->
`<Diff>`

<!-- s:ec6578a933 -->
Bản diff hợp nhất, hoặc tính từ `{ before, after }`.

<!-- s:4fb43d4ba9 -->
`<Spinner>`

<!-- s:502520871a -->
Biến thể: `dots`, `pulse`, `matrix`, `line` và `braille` (cho terminal; Menlo không có ký tự braille). Bộ hẹn giờ dừng khi tạm dừng.

<!-- s:b252598191 -->
`<AsciiFont>`

<!-- s:2cf13f8260 -->
Chữ pixel cỡ lớn cho tiêu đề.

<!-- s:d3f90f7b9b -->
Dùng `font="compact"` cho biến thể 3 dòng. Truyền vào phông FIGlet từ [`@textjs/font`](/docs/fonts), như `font={slant}`, để tạo chữ figlet.
