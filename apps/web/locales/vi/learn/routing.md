<!-- s:ce06f5c491 -->
App Router ánh xạ các tệp trong `app/` tới URL, theo quy ước của Next.js App Router. Thanh địa chỉ và lịch sử của trình duyệt luôn đồng bộ, nên thao tác quay lại, tiến tới và liên kết sâu vẫn hoạt động khi giao diện render trong console.

<!-- s:00fe1aba85 -->
Tệp là route

<!-- s:8bae70ad43 -->
Chuyển danh sách sang route riêng và thêm trang cài đặt:

<!-- s:141a7c73d4 -->
Layout dùng chung

<!-- s:cffa0eef2d -->
`layout.tsx` bọc mọi trang và giữ trạng thái khi chuyển trang. Đặt thanh trên cùng và phần điều hướng vào đó.

<!-- s:9d98f5e58a -->
`shortcut` gán một phím cho liên kết. Nhấn `1`, `2` và `3` trong console; URL của ứng dụng thực tế sẽ thay đổi theo từng phím.

<!-- s:53af99b059 -->
Quay lại

<!-- s:d77cce0a86 -->
`useRouter()` điều hướng từ mã. Gắn `Backspace` với `router.back()` trong layout:

<!-- s:c2b3ba00ff -->
Phân đoạn động

<!-- s:6a1dcfdf25 -->
Thư mục `[id]` nhận giá trị trong `params`:

<!-- s:8294e77b63 -->
Trên máy chủ lưu trữ tĩnh, phân đoạn động như thế này cần quy tắc viết lại URL về `index.html`. Chương 10 trình bày nội dung này.
