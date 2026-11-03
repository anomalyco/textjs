<!-- s:510651334f -->
Trạng thái tải và ranh giới lỗi render trong console. Định nghĩa chúng cho từng đoạn route bằng `loading.tsx` và `error.tsx`.

<!-- s:28d65d04f2 -->
Giao diện khi tải

<!-- s:d64d19effc -->
Thêm `loading.tsx` để hiển thị giao diện dự phòng khi trang tạm dừng render.

<!-- s:4445f6cf6c -->
Lỗi

<!-- s:3834711277 -->
Thêm `error.tsx` để bắt lỗi render. Component này nhận lỗi và hàm `reset`.

<!-- s:5b439d0e88 -->
Không tìm thấy

<!-- s:c01c20f824 -->
Gọi `notFound()` để render `not-found.tsx` gần nhất.

<!-- s:dc40d65e00 -->
Redbox trong console

<!-- s:2ec3bf8f2e -->
Trong quá trình phát triển, lỗi chưa xử lý sẽ mở một lớp phủ trong console với thông báo và vị trí mã nguồn. Sửa tệp sẽ đóng lớp phủ này.

<!-- s:35c9c3ef6b -->
Dev Overlay

<!-- s:e2a34a83d6 -->
Trong quá trình phát triển, nút hình viên thuốc `[▼]` ở góc dưới bên trái console là Dev Overlay. Nhấn `F2` hoặc `` Ctrl+` `` để mở và kiểm tra route, thời gian frame và layout. Tắt bằng `devIndicators: false`.
