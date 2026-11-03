<!-- s:f0ba49aa8c -->
Text.js 0.4 bổ sung nơi thứ hai để trang render. Theo mặc định, cây React của trang chạy trong tab trình duyệt. Trang xuất `runtime = "server"` sẽ chạy trên máy chủ, còn trình duyệt nhận các frame của trang.

<!-- s:1a12ccffbb -->
`Load` là component `async function`. Trên máy chủ, nó tạm dừng tại `<Suspense>` hoặc `loading.tsx` gần nhất cho đến khi promise hoàn tất, và có thể đọc trực tiếp tệp, cơ sở dữ liệu và module `node:*`. Component bất đồng bộ tải dữ liệu và không thể dùng hook. Các component thông thường bao quanh chúng vẫn giữ hook, focus, `useInput`, `<Link>` và `useRouter()`, với hành vi giống nhau trong cả hai runtime.

<!-- s:f6c454b214 -->
Trình duyệt tải xuống những gì

<!-- s:6764f4bb25 -->
Trang được render phía máy chủ không gửi kèm React, Yoga hay các route của bạn. Trình duyệt tải trình phát frame có dung lượng gzip khoảng 21 kB, chứa một `CellBuffer` và cùng `CssConsoleDriver` mà bộ render phía máy khách sử dụng. Trình phát điều tiết frame ở cùng tốc độ 15 fps, nên frame được render phía máy chủ tạo ra lời gọi `console.log` giống như phía máy khách.

<!-- s:c1c4090983 -->
Giao thức

<!-- s:20c7e299b3 -->
Mỗi tab mở phiên riêng trên máy chủ: một gốc React, lịch sử router trong bộ nhớ và bộ đệm ô. Một endpoint truyền dữ liệu theo cả hai chiều:

<!-- s:0cce1c98cc -->
Máy chủ chỉ gửi những dòng có mã băm thay đổi kể từ frame cuối mà kết nối đó nhận được. Mỗi dòng được gửi dưới dạng các đoạn văn bản tham chiếu đến bảng kiểu chỉ cho phép nối thêm. Grapheme rộng, cụm emoji và màu bán trong suốt đều đến nơi nguyên vẹn.

<!-- s:bff22f361e -->
Các frame cách nhau ít nhất 66 ms, và mỗi frame được so sánh để tìm khác biệt với dữ liệu mà socket chấp nhận lần cuối. Khi kết nối chậm không tiếp tục tiêu thụ dữ liệu, các trạng thái trung gian sẽ bị bỏ qua, và frame tiếp theo chuyển thẳng đến trạng thái mới nhất.

<!-- s:f0809ea8c7 -->
Nếu luồng bị ngắt, trình phát kết nối lại với ID phiên trong header `x-textjs-live` và tiếp tục phiên đó từ một keyframe mới, giữ nguyên trạng thái. ID phiên là giá trị ngẫu nhiên 192 bit lưu trong bộ nhớ, không bao giờ nằm trong URL. Phiên không có kết nối sẽ ngừng render và bị unmount sau 30 giây.

<!-- s:2c75bd5d29 -->
Cả hai endpoint đều từ chối yêu cầu liên trang, và mọi sự kiện đầu vào đều được kiểm tra theo schema cố định. Một phiên chấp nhận tối đa 64 sự kiện mỗi POST và khoảng 240 sự kiện mỗi giây.

<!-- s:a36b73dab0 -->
Component bất đồng bộ và dữ liệu

<!-- s:2620366315 -->
Promise của mỗi component bất đồng bộ được lưu vào bộ nhớ đệm theo phiên, với khóa là component và props của nó, nên lần render thử lại sẽ dùng lại yêu cầu đang xử lý. Bộ nhớ đệm được xóa khi route thay đổi và khi bạn gọi `router.refresh()`:

<!-- s:64ce138e40 -->
Module chỉ dành cho máy chủ có tên dạng `*.server.ts`. Bản dựng sẽ thất bại nếu mã gửi đến trình duyệt import một module như vậy hoặc import module tích hợp `node:*`, đồng thời nêu tên module thực hiện import.

<!-- s:981308ad14 -->
Prerender từng phần

<!-- s:9142a7d770 -->
Prerender từng phần hoạt động mà không cần máy chủ. Giờ đây, `text build` render mỗi route tĩnh một lần và nhúng frame đầu tiên vào HTML của route dưới dạng một `<script>` cổ điển nhỏ, để console hiển thị trước khi bất kỳ module nào tải.

<!-- s:d51b081ec7 -->
Shell là toàn bộ nội dung render đồng bộ. Ranh giới `<Suspense>` vẫn đang chờ sẽ hiển thị fallback, bao gồm cả component bất đồng bộ, và `fetch()` không bao giờ hoàn tất trong lúc shell render.

<!-- s:33ba4145a3 -->
Khi JavaScript khởi động, bộ render phía máy khách hoặc trình phát frame truyền frame thực qua luồng. Vì 0.4 cũng nối thêm frame thay vì xóa, bộ render đang hydrate khởi động với `initialClear: false` và ghi bên dưới shell, còn màn che của nó đẩy shell ra khỏi vùng nhìn thấy trong cùng lần vẽ của DevTools. Shell xóa console đúng một lần.

<!-- s:f6986897ee -->
Shell được render theo kích thước `viewport` đã cấu hình, mặc định là `120 × 36`, vì quá trình dựng không thể biết kích thước console của khách truy cập. Khi bật `viewport.responsive`, frame trực tiếp đầu tiên đổi kích thước cho vừa console đang neo. Route động không render shell, và `ppr: false` trong `text.config.ts` tắt prerender.

<!-- s:c61865edfd -->
Chọn runtime

<!-- s:aa5baec7ef -->
Runtime phía máy khách vẫn là mặc định. Thao tác gõ phím hiển thị trong cùng tác vụ, và ứng dụng có thể triển khai lên bất kỳ dịch vụ lưu trữ tĩnh nào. Runtime phía máy chủ phù hợp với bảng tổng quan và giao diện quản trị đọc dữ liệu riêng tư, cũng như các route có phần phụ thuộc mà bạn không muốn đưa vào gói mã trình duyệt. Một ứng dụng có thể kết hợp cả hai, và điều hướng giữa chúng sẽ tải URL đích dưới dạng tài liệu mới.

<!-- s:68f8c75df7 -->
Tài liệu tham khảo đầy đủ nằm trong [Render phía máy chủ](/docs/server-rendering).
