<!-- s:b3d5e86364 -->
Text.js là một framework React dành cho ứng dụng render trong console của DevTools bằng `console.log`.

<!-- s:34bf1ea7dd -->
Bản xem trước đang chạy trực tiếp. Nhấp vào đó và nhấn `↑`.

<!-- s:0bccbd98be -->
Các tính năng có sẵn

<!-- s:d3708efc68 -->
- **React 19**: render đồng thời, Suspense và ranh giới lỗi.
- **App Router**: layout, trang, phân đoạn động và route handler.
- **Layout Yoga**: flexbox trong WebAssembly, căn theo ô có kích thước nguyên.
- **Turbolog**: một lần gọi `console.log` cho mỗi frame thay đổi.
- **Giao diện console**: trang chỉ chứa một vùng focus và một ô nhập ẩn.

<!-- s:5ae438610c -->
Cách hoạt động

<!-- s:75f47f9f8c -->
Trạng thái truyền xuống: React, rồi đến layout, rồi bộ đệm ô, rồi console.

<!-- s:25c55610d2 -->
Các frame không thay đổi sẽ bị bỏ qua, nên ứng dụng nhàn rỗi không ghi gì vào console.

<!-- s:3a5d9cbc49 -->
Bước tiếp theo

<!-- s:b849362c77 -->
- [Cài đặt](/docs/installation): tạo ứng dụng đầu tiên của bạn.
- [Định tuyến](/docs/routing): trang, layout và điều hướng.
- [Turbolog](/docs/turbolog-engine): cách mã hóa frame.
- [OpenCode](/docs/opencode): giao diện TUI cho agent xây dựng bằng Text.js.
