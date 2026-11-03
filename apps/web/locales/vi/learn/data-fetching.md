<!-- s:23fef6717c -->
Acme Deploys cần dữ liệu thực. Route handler nằm cạnh các trang trong `app/`, dùng API Web `Request` và `Response`, và chạy trên `text dev` và `text start`. Chúng dùng chung origin với ứng dụng nên các yêu cầu không cần cấu hình CORS.

<!-- s:c6876ef862 -->
Một route handler

<!-- s:b226d3ca25 -->
Gọi route handler từ prompt của console khi `text dev` đang chạy:

<!-- s:9ce3eb974c -->
Lấy dữ liệu trong trang

<!-- s:c02131685f -->
Lấy dữ liệu trong một effect và hiển thị `<Spinner>` cho đến khi có dữ liệu. `r` lấy lại dữ liệu; `n` gửi yêu cầu tạo bản triển khai mới, bản này xuất hiện với trạng thái đang dựng và chuyển sang sẵn sàng khi quá trình dựng hoàn tất.

<!-- s:34de603227 -->
Trạng thái tải và lỗi

<!-- s:8b95fe08be -->
Thay vì xử lý `loading` thủ công, `loading.tsx` nằm cạnh trang sẽ hiển thị khi trang tạm dừng, còn `error.tsx` bắt mọi lỗi trang ném ra. Cả hai đều là component thông thường:

<!-- s:6c694827e4 -->
Truyền dữ liệu theo luồng

<!-- s:c16e24a117 -->
Handler có thể trả về một `ReadableStream`, qua đó nhật ký dựng truyền vào bảng tổng quan từng dòng. Xem [Route handler](/docs/route-handlers) để biết về sự kiện do máy chủ gửi và chuyển tiếp qua proxy đến một daemon cục bộ.
