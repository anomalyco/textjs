<!-- s:9f5667f5e7 -->
`@textjs/app/testing` (hoặc `@textjs/react/testing`) render ứng dụng ngoài màn hình, nhấn phím và trả về frame dưới dạng văn bản. Kiểm thử chạy không cần trình duyệt hay DevTools.

<!-- s:9bc71b1ad2 -->
Công cụ này hoạt động với mọi trình chạy hỗ trợ kiểm thử `async`, bao gồm Bun, Vitest và Jest.

<!-- s:f7898e6b92 -->
Render

<!-- s:fc969a7928 -->
| Phương thức | Mô tả |
| :-- | :-- |
| `render(el, { cols, rows, theme })` | Gắn ngoài màn hình (mặc định 80×24) |
| `lastFrame()` | Frame dưới dạng văn bản thuần |
| `lines()` | Frame dưới dạng mảng các dòng |
| `frames` | Mọi frame khác biệt tính đến hiện tại |
| `toAnsi()` | ANSI truecolor, dùng cho snapshot |
| `cell(x, y)` | `{ char, fg, bg, attrs }` |
| `locate(text)` | `{ x, y }` của kết quả khớp đầu tiên |
| `rerender(el)` / `unmount()` | Cập nhật hoặc tháo gỡ |

<!-- s:893f22353a -->
`renderToString(el, options)` render một lần và trả về văn bản.

<!-- s:99a3c4d459 -->
Đầu vào

<!-- s:105149560b -->
Mỗi lời gọi chạy bên trong `act()` và xử lý hết các frame sinh ra, nên phép kiểm tra tiếp theo thấy trạng thái cập nhật.

<!-- s:1f65c071dc -->
Thời gian

<!-- s:ab365d9403 -->
Hoạt ảnh, biểu tượng xoay và thông báo toast dùng bộ hẹn giờ thực, nên `wait` và `waitFor` là cách đáng tin cậy để quan sát chúng.

<!-- s:26f93acae3 -->
Snapshot

<!-- s:05724c9883 -->
Khoảng trắng ở bên phải và phía dưới frame bị cắt bỏ, nên snapshot không thay đổi liên tục vì khoảng trắng.
