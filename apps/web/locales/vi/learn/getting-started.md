<!-- s:b7512b6ff1 -->
Qua mười chương, bạn sẽ xây dựng **Acme Deploys**, một bảng điều khiển triển khai render trong console DevTools. Mỗi chương kết thúc với ứng dụng ở đúng trạng thái mà mã của bạn tạo ra, chạy trực tiếp trong console trên trang này.

<!-- s:630c586fd9 -->
Tạo ứng dụng

<!-- s:fd9f176938 -->
`create-text-app` tạo khung dự án với App Router, TypeScript và CLI `text`.

<!-- s:9eee556b8f -->
Mở `http://localhost:3000`, rồi [mở console trình duyệt](/docs/installation#open-the-console). Trang hiển thị một vùng focus. Ứng dụng của bạn render trong console.

<!-- s:7d69bcfbda -->
Trang đầu tiên của bạn

<!-- s:77df233a57 -->
Mỗi route là một tệp `page.tsx` trong `app/`. Thay trang khởi đầu bằng thẻ tiêu đề của bảng điều khiển:

<!-- s:efd190e3b6 -->
Lưu tệp. Fast Refresh vẽ lại frame và giữ nguyên trạng thái component của bạn.

<!-- s:f5e9f4301c -->
Phản hồi khi nhấn phím

<!-- s:a9111ae891 -->
`useInput` nhận mọi lần nhấn phím khi trang có focus. Đếm số lời chào:

<!-- s:c766a57c22 -->
Đó là một ứng dụng Text.js hoàn chỉnh. Ứng dụng có trạng thái React, một hộp layout và một lần gọi `console.log` cho mỗi frame thay đổi, và không ghi gì khi nhàn rỗi.
