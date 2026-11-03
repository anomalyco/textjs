<!-- s:cf6b8fc694 -->
Trước đây, ứng dụng Text.js xử lý phím trong `useInput` rồi liệt kê lại chúng theo cách thủ công trong chân trang `<KeyHint>`. `useKeymap` thay thế cả hai bằng một khai báo.

<!-- s:8ec88859eb -->
Nhấn `j` sẽ chạy `next`. Trên macOS, `<KeyHints>` hiển thị `j/↓ Next` và `⌃S Save` trong chân trang, vì các liên kết phím đó đặt `hint`. `?` mở màn hình trợ giúp với cả bốn liên kết phím, thuộc nhóm Navigation, và `Ctrl+K` mở bảng lệnh có thể tìm kiếm chúng.

<!-- s:c7c1123a0d -->
Cú pháp phím

<!-- s:e9843726ad -->
| Cú pháp | Ý nghĩa |
| :-- | :-- |
| `ctrl+k` | Phím bổ trợ: `ctrl`, `alt`, `shift`, `meta` và `mod` |
| `mod+k` | `⌘` hoặc `Ctrl`, tùy phím đang giữ |
| `j, down` | Các phím thay thế nhau |
| `g g` | Chuỗi phím, với khoảng cách tối đa 1 giây giữa các phím |
| `G` | Chữ hoa ngầm định `Shift` |
| `?` | Phím tạo ký tự khớp theo ký tự |

<!-- s:5d4b81956d -->
Liên kết phím là một handler, hoặc một đối tượng có `label`, `group`, `hint`, `command`, `disabled` và `noRepeat`. `command: false` loại liên kết phím có nhãn khỏi bảng lệnh. Liên kết phím không có nhãn vẫn hoạt động, nhưng không xuất hiện trong màn hình trợ giúp và bảng lệnh.

<!-- s:7beff5bd29 -->
Định tuyến

<!-- s:5f000bf949 -->
Mỗi keymap đăng ký một handler `useInput`, nên các quy tắc nhập liệu hiện có vẫn áp dụng. `<Input>` đang có tiêu điểm xử lý phím trước, vì trình soạn thảo lắng nghe ở mức ưu tiên 10 và keymap ở mức 0. Phím khớp sẽ dừng lan truyền. `<Modal>` đang mở vô hiệu hóa liên kết phím bên ngoài nó, trừ khi keymap truyền `global: true`.

<!-- s:a6076c8127 -->
Các chuỗi phím khớp bên trong handler đó. Phím bắt đầu một chuỗi sẽ chờ xử lý và dừng lan truyền, và chuỗi sẽ đặt lại khi phím tiếp theo đến sau khoảng thời gian vượt quá `sequenceTimeout` (mặc định 1.000 ms):

<!-- s:aa0a9c8615 -->
Một sổ đăng ký cho mỗi gốc

<!-- s:8a689d7ce6 -->
Liên kết phím có nhãn được công bố vào một sổ đăng ký thuộc gốc console. `<KeyHelp>`, `<KeyHints>` và `<CommandPalette>` đọc từ đó, và component của bạn cũng có thể đọc qua `useKeymapBindings()`. Khi modal đang mở, sổ đăng ký chỉ trả về liên kết phím bên trong nó, nên màn hình trợ giúp liệt kê các phím đang hoạt động.

<!-- s:ab5f364d60 -->
Keymap thường được viết nội tuyến, tạo một đối tượng mới mỗi lần render. Để giảm chi phí này, keymap chỉ công bố lại nhãn khi dạng hiển thị của chúng thay đổi:

<!-- s:fa6b5ba7b8 -->
Handler được đọc từ ref khi có phím đến, nên closure mới ở mỗi lần render không bao giờ bị lỗi thời.

<!-- s:1b173acf33 -->
Màn hình trợ giúp và bảng lệnh

<!-- s:15201cd425 -->
`<KeyHelp>` mở khi nhấn `?` và liệt kê mọi liên kết phím có nhãn đang hoạt động theo nhóm. `keys` và `title` thay đổi phím kích hoạt và tiêu đề.

<!-- s:8a5c3a3297 -->
`<CommandPalette>` mở khi nhấn `Ctrl+K` hoặc `Ctrl+P`. Nó tìm kiếm khớp gần đúng trong `commands` của bạn và mọi liên kết phím có nhãn, đồng thời tô sáng các chữ cái khớp. Nó đóng trước khi chạy lệnh, nên lệnh có thể mở modal riêng.

<!-- s:bea7ebdffb -->
`formatKeys` render liên kết phím để hiển thị. `formatKeys("ctrl+shift+p")` trả về `⌃⇧P` trên macOS và `ctrl+shift+P` trên nền tảng khác, và `<Kbd>` render một phím với cùng định dạng.

<!-- s:d068dd2764 -->
`useKeymap`, `<KeyHelp>`, `<KeyHints>`, `<StatusBar>` và `<CommandPalette>` có trong Text.js 1.0. Tài liệu tham chiếu nằm trong [Bàn phím](/docs/keyboard).
