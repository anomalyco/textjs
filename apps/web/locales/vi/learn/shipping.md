<!-- s:09c9709272 -->
`text build` tạo bản client tĩnh và, nếu có route handler, một máy chủ cho `text start`.

<!-- s:b09ff23eb8 -->
Biên dịch

<!-- s:34d9f1bf54 -->
`text start` phục vụ bản build và chạy các route handler của bạn. Lệnh này chạy trên bất kỳ máy chủ nào có Bun 1.2+ hoặc Node.js 22+.

<!-- s:5f36ef31f1 -->
Metadata

<!-- s:c6b213e15a -->
Đặt tiêu đề thẻ trình duyệt trong layout gốc. Các trang có thể ghi đè tiêu đề này.

<!-- s:0467501ecc -->
Lưu trữ tĩnh

<!-- s:f5f06a38ae -->
Khi không có route handler, bản build là một trang web tĩnh thông thường. Mỗi route tĩnh có tệp HTML riêng. `index.html` phục vụ các route động như `/deployments/[id]`.

<!-- s:c33282e322 -->
Trên Vercel và Cloudflare Pages, `text build` nhận diện nền tảng và tự ghi cấu hình dự phòng đó. Các dịch vụ lưu trữ tĩnh khác cần quy tắc rewrite. Trên Netlify, thêm tệp `_redirects` vào `public/`:

<!-- s:ec502dd4e6 -->
Netlify phục vụ các tệp hiện có trước khi áp dụng quy tắc, nên tài nguyên và các route đã prerender không bị ảnh hưởng.

<!-- s:0b1dc034aa -->
Trước khi triển khai

<!-- s:463de18e39 -->
- Tắt **Lưu giữ nhật ký** trong cài đặt console. Người dùng của bạn cũng cần tắt tùy chọn này.
- Kiểm tra kích thước hẹp như 80×24. DevTools neo ở bên cạnh tạo ra lưới hẹp.
- Chạy `bun test`.

<!-- s:c5fa27231d -->
Nhấn `Enter` trong console để triển khai. Sau đó nhận chứng chỉ của bạn.
