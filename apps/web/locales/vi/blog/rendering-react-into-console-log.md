<!-- s:16c98cd381 -->
Text.js render ứng dụng React trong console của Chrome DevTools. Ngoài một ô nhập ẩn, trang không có giao diện. Mỗi frame của ứng dụng là một lệnh gọi `console.log`.

<!-- s:fe9cd991d4 -->
Console làm màn hình hiển thị

<!-- s:5ae20a07fc -->
`console.log` nhận một chuỗi định dạng. Mỗi `%c` áp dụng CSS trong đối số tiếp theo cho phần văn bản phía sau nó, cho đến `%c` tiếp theo:

<!-- s:2822a0243c -->
Các kiểu này có thể đặt màu chữ, màu nền, chữ đậm, chữ nghiêng và gạch chân, còn phông chữ của console là phông đơn cách (Menlo trên macOS). Với phông đơn cách và màu sắc có thể thay đổi theo từng đoạn ký tự, console hoạt động như một lưới ô ký tự có định dạng. Có thể vẽ đường viền, bảng, ô nhập và biểu đồ trên đó.

<!-- s:585742694b -->
Một frame là một lưới ô

<!-- s:04a12244bc -->
Bộ render lưu mỗi frame trong một `CellBuffer`. Ký tự nằm trong một mảng định kiểu, màu chữ và màu nền nằm trong hai mảng khác, còn các thuộc tính như chữ đậm và gạch chân nằm trong mảng thứ tư. Các mảng chỉ cấp phát một lần cho một kích thước nhất định và tái sử dụng cho mọi frame.

<!-- s:2ff86351b3 -->
Để ghi một frame vào console, driver duyệt từng dòng và nhóm các ô liền kề có cùng kiểu thành từng đoạn. Mỗi đoạn trở thành một span `%c`, và các dòng nối với nhau bằng `\n`. Bảng tổng quan thử nghiệm 100×32 của chúng tôi, gồm 3.200 ô, mã hóa thành khoảng 200 span.

<!-- s:48a9b4f008 -->
Một lệnh gọi cho mỗi frame

<!-- s:aa2cafe395 -->
Ghi từng dòng thành một thông báo riêng không hiệu quả. Mỗi thông báo có đường viền và liên kết mã nguồn riêng trong DevTools, và DevTools thu gọn các thông báo liên tiếp giống nhau sau một bộ đếm số lần lặp, nên hai dòng giống nhau trong bảng sẽ gộp thành một. Một frame ghi dưới dạng một thông báo duy nhất sẽ giữ nguyên thành một khối.

<!-- s:ea38228d16 -->
Trước hết cần escape hai thứ trong văn bản. Ký tự `%` được viết thành `%%`, để văn bản như `100%` không dùng mất một đối số định dạng. DevTools cũng biến URL thành liên kết và vẽ lại chúng bằng màu riêng, nên `://` và `www.` có thêm một word joiner (U+2060), một ký tự không có độ rộng:

<!-- s:ec8783435a -->
Frame nhàn rỗi không ghi gì vào console

<!-- s:8b7f1f9d06 -->
Mỗi dòng trong bộ đệm đều có giá trị băm. Nếu không có giá trị băm nào thay đổi kể từ frame trước, driver trả về trước khi tạo chuỗi và không đụng đến console. Ứng dụng đang chờ dữ liệu nhập không thực hiện lệnh gọi nào.

<!-- s:43c3523265 -->
Khi một dòng thay đổi, driver xóa console và ghi frame mới:

<!-- s:5b584e930a -->
Chỉ những dòng có giá trị băm thay đổi mới mã hóa lại. Các dòng còn lại tái sử dụng span từ frame trước.

<!-- s:99a3c4d459 -->
Nhập liệu

<!-- s:e95aae4719 -->
Console không nhận thao tác gõ phím, nên trang thu nhận chúng. Một `<textarea>` ẩn nhận thao tác nhấn phím, dán và soạn thảo qua IME rồi chuyển chúng thành sự kiện phím cho ứng dụng. Nhấp vào trang sẽ đưa tiêu điểm vào đó.

<!-- s:88cae4fc43 -->
Tiếp theo

<!-- s:cb5f6bd294 -->
Các bản mẫu `@textjs/core` 0.0.x trên npm chứa mọi thứ trong một gói. Text.js 0.1 chuyển bộ render mô tả ở đây vào `@textjs/core`, bộ reconciler của React vào `@textjs/react`, và thêm App Router.
