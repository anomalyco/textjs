<!-- s:3bfcfe41ce -->
Khai báo phím tắt một lần với `useKeymap`. Text.js định tuyến chúng, liệt kê chúng trong lớp phủ `?`, hiển thị chúng ở chân trang và cho phép tìm kiếm chúng trong bảng lệnh.

<!-- s:b084dfc727 -->
`useKeymap`

<!-- s:f944f97e4b -->
| Cú pháp | Ý nghĩa |
| :-- | :-- |
| `ctrl+k` | Phím bổ trợ: `ctrl` `alt` `shift` `meta` `mod` |
| `mod+k` | `⌘` hoặc `Ctrl`, tùy phím đang giữ |
| `j, down` | Các lựa chọn thay thế |
| `g g` | Một chuỗi phím (1 giây giữa các phím) |
| `G` | Chữ hoa ngụ ý `Shift` |
| `?` | Phím in được khớp theo ký tự |

<!-- s:ef55b4b9de -->
Giá trị là một handler, hoặc một liên kết phím có `label`, `group`, `hint`, `disabled` và `noRepeat`. Liên kết phím không có nhãn vẫn hoạt động nhưng không xuất hiện trong lớp phủ trợ giúp.

<!-- s:01f344cdbe -->
`useKeymapBindings()` trả về các liên kết phím có nhãn đang hoạt động, để bạn dùng cho chân trang và menu riêng.

<!-- s:dd8af5eb69 -->
Keymap chạy qua `useInput`, nên các quy tắc thông thường vẫn áp dụng: ô nhập đang có tiêu điểm được ưu tiên, phím khớp sẽ ngừng lan truyền sự kiện, và `<Modal>` đang mở sẽ vô hiệu hóa liên kết phím bên ngoài nó. Truyền `{ priority, global, isActive }` để thay đổi hành vi đó.

<!-- s:da19075700 -->
`<KeyHelp>`

<!-- s:907e2eedda -->
Nhấn `?` để xem mọi liên kết phím có nhãn, chia theo nhóm. Nó liệt kê những liên kết đang hoạt động tại nơi nó mở.

<!-- s:3cebb95bfc -->
`<KeyHints>` và `<StatusBar>`

<!-- s:04fa34bd49 -->
`<KeyHints />` hiển thị liên kết phím có đánh dấu `hint: true`, hoặc `items` chỉ định tường minh. `<StatusBar>` là chân trang một dòng có một vị trí `right`.

<!-- s:b9ded39a0a -->
`<Kbd>mod+k</Kbd>` render một phím đơn. `formatKeys("ctrl+shift+p")` cho ra `⌃⇧P` trên macOS và `ctrl+shift+P` trên các hệ thống khác.

<!-- s:8b6afd6178 -->
`<CommandPalette>`

<!-- s:65192cd436 -->
`Ctrl+K` (hoặc `Ctrl+P`) mở trình khởi chạy có tìm kiếm gần đúng trên các lệnh của bạn và mọi liên kết phím có nhãn, với các chữ cái khớp được tô sáng.

<!-- s:e88bab4eab -->
| Prop | Mô tả |
| :-- | :-- |
| `commands` | `{ id, label, group?, keys?, keywords?, run }[]` |
| `keys` | Phím tắt mở bảng (mặc định `ctrl+k, ctrl+p`; dùng `null` để vô hiệu hóa) |
| `includeKeymap` | Liệt kê liên kết phím của keymap (mặc định `true`) |
| `open` / `onOpenChange` | Có kiểm soát |

<!-- s:ddd093fe85 -->
Bảng lệnh đóng trước khi chạy lệnh, nên lệnh có thể mở hộp thoại riêng. `fuzzyMatch` và `fuzzyFilter` được xuất để bạn dùng cho danh sách riêng.
