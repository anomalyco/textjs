<!-- s:329a4263b5 -->
`@textjs/app/testing` render ứng dụng ngoài màn hình, nhấn phím và trả về frame dưới dạng văn bản thuần. Kiểm thử chạy mà không cần trình duyệt hay DevTools.

<!-- s:22ea22bed4 -->
Kiểm thử đầu tiên

<!-- s:79e830f1ed -->
Trang gọi `/api/deployments`, nhưng không có máy chủ khi chạy `bun test`, nên `beforeEach` tạo stub cho `fetch` bằng cùng dữ liệu đó. `render` mặc định dùng lưới 80×24. `lastFrame()` trả về toàn bộ frame dưới dạng văn bản, `lines()` trả về từng dòng, còn `cell(x, y)` cho bạn ký tự và màu sắc của một ô.

<!-- s:e8fdbe8cac -->
Nhấn phím

<!-- s:8db83c740c -->
`press` nhận cùng chuỗi phím như `useKeymap`. Mỗi lệnh gọi chạy trong `act()` và xử lý hết các frame phát sinh, nên phép khẳng định tiếp theo thấy trạng thái cập nhật.

<!-- s:7c6ee6548f -->
Bảng vẽ `›` trước dòng đang tô sáng, nên kiểm thử ↓ tìm dòng đó và kiểm tra commit của dòng. Các phím số sắp xếp theo cột, và cột thứ tư là Build.

<!-- s:5350d592a4 -->
Chạy kiểm thử

<!-- s:88993d5c83 -->
Công cụ này hoạt động với mọi trình chạy hỗ trợ kiểm thử `async`: Bun, Vitest hoặc Jest. Trong console, nhấn `Enter` để chạy bộ kiểm thử và `f` để làm một kiểm thử thất bại và xem lỗi trông như thế nào.

<!-- s:26f93acae3 -->
Snapshot

<!-- s:b458212c22 -->
`toAnsi()` trả về frame dưới dạng ANSI truecolor, tạo snapshot phát hiện cả lỗi hồi quy màu sắc:
