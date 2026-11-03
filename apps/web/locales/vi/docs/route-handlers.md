<!-- s:da329a4f1b -->
Route handler định nghĩa các endpoint API trong thư mục `app` bằng API `Request` và `Response` của Web.

<!-- s:895d99d1b5 -->
Quy ước

<!-- s:ac1d1b9fcb -->
Export `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` hoặc `OPTIONS`. Handler chạy trên `text dev`, `text start` và mọi [adapter triển khai](/docs/deploying) máy chủ, sau [middleware](/docs/middleware). Lưu cache cho handler `GET` bằng [cấu hình phân đoạn route](/docs/caching).

<!-- s:53eeba0ff3 -->
Handler động

<!-- s:bfa759b36e -->
Các giá trị `params` được giải mã. Đường dẫn có dấu gạch chéo hoặc gạch chéo ngược đã mã hóa (`%2F`, `%5C`) nhận mã `400`, nên truyền ID có thể chứa `/` qua tham số truy vấn hoặc mã hóa chúng dưới dạng base64url.

<!-- s:6c694827e4 -->
Truyền luồng

<!-- s:734a652dda -->
Trả về một `ReadableStream` cho sự kiện do máy chủ gửi:

<!-- s:9ff4b304cc -->
Rewrite

<!-- s:7ca1bb6854 -->
Máy chủ làm proxy cho các đích bên ngoài, nên trình duyệt không gửi yêu cầu khác nguồn.

<!-- s:82320e9df7 -->
Proxy cho daemon cục bộ

<!-- s:7730eaa5fb -->
Dùng `proxy` để truy cập một tiến trình trên máy của bạn:

<!-- s:c00af013ff -->
Đây là cách [mẫu OpenCode](/docs/opencode) kết nối với máy chủ cục bộ.
